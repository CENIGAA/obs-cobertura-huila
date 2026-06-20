/**
 * ============================================================================
 * CENIGAA · Observatorio de Coberturas de la Tierra del Huila (ROGAA Nodo 4)
 * F0.4 · Estadisticas de cobertura MapBiomas para el Huila
 * ============================================================================
 *
 * Objetivo:
 *   Extraer el area (ha) por clase de cobertura en el departamento del Huila
 *   para los anios de referencia 1985, 2000, 2010, 2018, 2022 y 2023.
 *
 * Como ejecutar:
 *   1. Abrir https://code.earthengine.google.com con la cuenta cenigaa-rogaa.
 *   2. Pegar este script completo y presionar "Run".
 *   3. Revisar la tabla impresa en consola y el panel de Tasks para el
 *      Export a Google Drive (CSV).
 *
 * Notas de datos:
 *   - MapBiomas Colombia publica una imagen de "integration" con una banda por
 *     anio, nombrada classification_<anio> (p.ej. classification_2022).
 *   - El path del asset puede variar segun la coleccion publicada. Este script
 *     intenta la Coleccion 2 de MapBiomas Colombia y deja documentadas
 *     alternativas. Verificar en el catalogo si cambia el numero de coleccion.
 *   - Resolucion MapBiomas: 30 m -> 1 pixel = 0.09 ha.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. Parametros
// ----------------------------------------------------------------------------
var ANIOS = [1985, 2000, 2010, 2018, 2022, 2023];
var ESCALA = 30;            // m por pixel (MapBiomas)
var HA_POR_PIXEL = 0.09;    // 30 m x 30 m = 900 m2 = 0.09 ha

// Asset MapBiomas Colombia. Ajustar el numero de coleccion si es necesario.
// Alternativas conocidas (descomentar la que aplique tras verificar catalogo):
var MAPBIOMAS_ASSET =
  'projects/mapbiomas-public/assets/colombia/collection2/mapbiomas_colombia_collection2_integration_v1';
// var MAPBIOMAS_ASSET =
//   'projects/mapbiomas-public/assets/colombia/collection3/mapbiomas_colombia_collection3_integration_v1';
// var MAPBIOMAS_ASSET =
//   'projects/mapbiomas-raisg/public/collection5/mapbiomas_raisg_panamazonia_collection5_integration_v1';

// ----------------------------------------------------------------------------
// 2. Region de interes (ROI): departamento del Huila
// ----------------------------------------------------------------------------
// Opcion A (por defecto): FAO GAUL nivel 1 (departamentos). Devuelve el
// poligono del Huila directamente, sin subir ningun asset.
var huila = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Colombia'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Huila'));

// Opcion B (si ya subiste el GeoJSON departamental como asset al proyecto):
// var huila = ee.FeatureCollection('projects/cenigaa-rogaa/assets/huila_departamento');

var roi = huila.geometry();
Map.centerObject(roi, 8);
Map.addLayer(roi, {color: '43B02A'}, 'Huila ROI');

// ----------------------------------------------------------------------------
// 3. Imagen MapBiomas
// ----------------------------------------------------------------------------
var mapbiomas = ee.Image(MAPBIOMAS_ASSET);
print('Bandas disponibles en el asset MapBiomas:', mapbiomas.bandNames());

// ----------------------------------------------------------------------------
// 4. Leyenda (opcional). Codigos del nivel general MapBiomas.
//    VERIFICAR contra la leyenda oficial de la coleccion Colombia usada.
//    Si un codigo no esta aqui, se reporta como "clase_<id>".
// ----------------------------------------------------------------------------
var LEYENDA = ee.Dictionary({
  '1':  'Bosque',
  '3':  'Formacion boscosa',
  '4':  'Formacion de sabana',
  '5':  'Mangle',
  '9':  'Plantacion forestal',
  '10': 'Formacion natural no forestal',
  '11': 'Humedal/area inundable',
  '12': 'Formacion herbacea',
  '13': 'Otra formacion natural no forestal',
  '14': 'Agropecuario',
  '15': 'Pastos',
  '18': 'Agricultura',
  '19': 'Cultivos temporales',
  '21': 'Mosaico agropecuario',
  '22': 'Area sin vegetacion',
  '24': 'Infraestructura urbana',
  '25': 'Otra area sin vegetacion',
  '27': 'No observado',
  '29': 'Afloramiento rocoso',
  '30': 'Mineria',
  '33': 'Agua',
  '34': 'Glaciar'
});

// ----------------------------------------------------------------------------
// 5. Estadisticas por anio: frequencyHistogram -> features {anio, clase, ha}
// ----------------------------------------------------------------------------
var statsPorAnio = ANIOS.map(function (anio) {
  var banda = 'classification_' + anio;
  var img = mapbiomas.select(banda);

  var hist = ee.Dictionary(
    img.reduceRegion({
      reducer: ee.Reducer.frequencyHistogram(),
      geometry: roi,
      scale: ESCALA,
      maxPixels: 1e13,
      bestEffort: false
    }).get(banda)
  );

  var features = hist.keys().map(function (k) {
    k = ee.String(k);
    var count = ee.Number(hist.get(k));
    var nombre = ee.Algorithms.If(
      LEYENDA.contains(k), LEYENDA.get(k), ee.String('clase_').cat(k));
    return ee.Feature(null, {
      anio: anio,
      clase_id: ee.Number.parse(k),
      clase_nombre: nombre,
      pixeles: count,
      area_ha: count.multiply(HA_POR_PIXEL)
    });
  });

  return ee.FeatureCollection(features);
});

var tabla = ee.FeatureCollection(statsPorAnio).flatten();

// ----------------------------------------------------------------------------
// 6. Salida en consola
// ----------------------------------------------------------------------------
print('Estadisticas MapBiomas Huila (anio / clase / area_ha):', tabla);

// Resumen: area total por anio (control de consistencia ~ area del Huila).
var resumenAnio = ee.FeatureCollection(ANIOS.map(function (anio) {
  var total = tabla
    .filter(ee.Filter.eq('anio', anio))
    .aggregate_sum('area_ha');
  return ee.Feature(null, {anio: anio, area_total_ha: total});
}));
print('Area total por anio (ha):', resumenAnio);

// ----------------------------------------------------------------------------
// 7. Export CSV a Google Drive
// ----------------------------------------------------------------------------
Export.table.toDrive({
  collection: tabla,
  description: 'F04_MapBiomas_Huila_estadisticas',
  fileNamePrefix: 'F04_MapBiomas_Huila_estadisticas',
  folder: 'CENIGAA_GEE',
  fileFormat: 'CSV',
  selectors: ['anio', 'clase_id', 'clase_nombre', 'pixeles', 'area_ha']
});
