/**
 * ============================================================================
 * CENIGAA · Observatorio de Coberturas de la Tierra del Huila (ROGAA Nodo 4)
 * Modulo 1 · Pipeline de series temporales pentadales (5 dias) 2017-2025
 * ============================================================================
 *
 * Objetivo:
 *   Generar una serie temporal pentadal (ventanas de 5 dias) de indices
 *   espectrales promediados para el departamento del Huila, 2017-2025, y
 *   exportarla a CSV para alimentar la visualizacion frontend (Recharts).
 *
 * Metodologia (aprobada 2026-06-20):
 *   - Coleccion: COPERNICUS/S2_SR_HARMONIZED, nubosidad < 30%.
 *   - Mascara de nubes con la banda QA60.
 *   - Mascara NBR del Modulo 0 (excluir cicatrices de incendio).
 *   - Indices por imagen:
 *       NDVI = (B08 - B04) / (B08 + B04)                       (vigor vegetal)
 *       NSMI = (B08 - B11) / (B08 + B11)               (humedad superf. suelo)
 *       BSI  = ((B11 + B04) - (B08 + B02)) /
 *              ((B11 + B04) + (B08 + B02))                  (suelo descubierto)
 *   - Composicion pentadal: mediana de las imagenes dentro de cada ventana
 *     de 5 dias.
 *   - Unidad de reporte: MEDIA del departamento por pentada.
 *   - Campos de salida: fecha_inicio_pentada, ndvi_mean, nsmi_mean, bsi_mean,
 *     n_imagenes, cobertura_nubosa_pct.
 *
 * Como ejecutar:
 *   Pegar en https://code.earthengine.google.com (cuenta cenigaa-rogaa) y Run.
 *   Revisar el grafico de consola y el panel Tasks para el export CSV.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. Parametros
// ----------------------------------------------------------------------------
var FECHA_INI = '2017-01-01';
var FECHA_FIN = '2026-01-01';   // exclusivo
var DIAS_PENTADA = 5;
var MAX_NUBOSIDAD = 30;          // % CLOUDY_PIXEL_PERCENTAGE
var ESCALA_REDUCCION = 100;      // m; media departamental (mas rapido que 30 m)

var PROYECTO = 'projects/cenigaa-rogaa/assets';
var ASSET_NBR = PROYECTO + '/Mod0_NBR_mask_Huila_2017_2025';
var USAR_MASCARA_NBR = true;

// ----------------------------------------------------------------------------
// 2. ROI Huila
// ----------------------------------------------------------------------------
var huila = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Colombia'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Huila'));
var roi = huila.geometry();
Map.centerObject(roi, 8);

// ----------------------------------------------------------------------------
// 3. Mascara de cicatrices (Modulo 0). Si el asset no existe aun, desactivar
//    USAR_MASCARA_NBR para correr el pipeline sin la mascara.
// ----------------------------------------------------------------------------
var noScar = ee.Image(1);
if (USAR_MASCARA_NBR) {
  // scar: 1 = cicatriz. Conservamos los pixeles donde scar == 0.
  noScar = ee.Image(ASSET_NBR).unmask(0).eq(0);
}

// ----------------------------------------------------------------------------
// 4. Preparacion de la coleccion: mascara de nubes + indices
// ----------------------------------------------------------------------------
function maskS2clouds(img) {
  var qa = img.select('QA60');
  var cloudBit = 1 << 10;
  var cirrusBit = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBit).eq(0)
    .and(qa.bitwiseAnd(cirrusBit).eq(0));
  return img.updateMask(mask)
    .copyProperties(img, ['system:time_start', 'CLOUDY_PIXEL_PERCENTAGE']);
}

function addIndices(img) {
  var s = img.divide(10000);
  var ndvi = s.normalizedDifference(['B8', 'B4']).rename('NDVI');
  var nsmi = s.normalizedDifference(['B8', 'B11']).rename('NSMI');
  var bsi = s.expression(
    '((B11 + B04) - (B08 + B02)) / ((B11 + B04) + (B08 + B02))', {
      B11: s.select('B11'), B04: s.select('B4'),
      B08: s.select('B8'),  B02: s.select('B2')
    }).rename('BSI');
  return ee.Image.cat([ndvi, nsmi, bsi])
    .updateMask(noScar)
    .copyProperties(img, ['system:time_start', 'CLOUDY_PIXEL_PERCENTAGE']);
}

var coleccion = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(roi)
  .filterDate(FECHA_INI, FECHA_FIN)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', MAX_NUBOSIDAD))
  .map(maskS2clouds)
  .map(addIndices);

// ----------------------------------------------------------------------------
// 5. Series pentadales
// ----------------------------------------------------------------------------
var inicio = ee.Date(FECHA_INI);
var fin = ee.Date(FECHA_FIN);
var nPentadas = fin.difference(inicio, 'day').divide(DIAS_PENTADA).floor();
var indices = ee.List.sequence(0, nPentadas.subtract(1));

var serie = ee.FeatureCollection(indices.map(function (i) {
  i = ee.Number(i);
  var ini = inicio.advance(i.multiply(DIAS_PENTADA), 'day');
  var fim = ini.advance(DIAS_PENTADA, 'day');

  var ventana = coleccion.filterDate(ini, fim);
  var n = ventana.size();

  var medianas = ventana.median();  // {NDVI, NSMI, BSI} o vacio

  var stats = ee.Dictionary(ee.Algorithms.If(
    n.gt(0),
    medianas.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: roi,
      scale: ESCALA_REDUCCION,
      maxPixels: 1e13,
      bestEffort: true
    }),
    ee.Dictionary({NDVI: null, NSMI: null, BSI: null})
  ));

  var nubes = ee.Number(ee.Algorithms.If(
    n.gt(0), ventana.aggregate_mean('CLOUDY_PIXEL_PERCENTAGE'), null));

  return ee.Feature(null, {
    fecha_inicio_pentada: ini.format('YYYY-MM-dd'),
    ndvi_mean: stats.get('NDVI'),
    nsmi_mean: stats.get('NSMI'),
    bsi_mean: stats.get('BSI'),
    n_imagenes: n,
    cobertura_nubosa_pct: nubes
  });
}));

// Conservar solo pentadas con al menos una imagen.
var serieConDatos = serie.filter(ee.Filter.gt('n_imagenes', 0));

// ----------------------------------------------------------------------------
// 6. Diagnostico en consola
// ----------------------------------------------------------------------------
print('Pentadas totales en el periodo:', nPentadas);
print('Pentadas con datos:', serieConDatos.size());
print('Muestra de la serie (primeras filas):', serieConDatos.limit(10));

print(
  ui.Chart.feature.byFeature(serieConDatos, 'fecha_inicio_pentada',
    ['ndvi_mean', 'nsmi_mean', 'bsi_mean'])
    .setOptions({
      title: 'Series pentadales Huila 2017-2025 (media departamental)',
      hAxis: {title: 'Pentada'},
      vAxis: {title: 'Indice', viewWindow: {min: -1, max: 1}},
      series: {
        0: {color: '#43B02A'},  // NDVI
        1: {color: '#0EA5E9'},  // NSMI
        2: {color: '#8B6914'}   // BSI
      }
    })
);

// ----------------------------------------------------------------------------
// 7. Export CSV a Drive
// ----------------------------------------------------------------------------
Export.table.toDrive({
  collection: serieConDatos,
  description: 'Mod1_Series_Pentadales_Huila_2017_2025',
  fileNamePrefix: 'Mod1_Series_Pentadales_Huila_2017_2025',
  folder: 'CENIGAA_GEE',
  fileFormat: 'CSV',
  selectors: ['fecha_inicio_pentada', 'ndvi_mean', 'nsmi_mean', 'bsi_mean',
              'n_imagenes', 'cobertura_nubosa_pct']
});
