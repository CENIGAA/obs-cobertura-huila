/**
 * ============================================================================
 * CENIGAA · Observatorio de Coberturas de la Tierra del Huila (ROGAA Nodo 4)
 * Modulo 0 · Mascara NBR de cicatrices de incendio acumuladas 2017-2025
 * ============================================================================
 *
 * Objetivo:
 *   Construir una imagen binaria de cicatrices de incendio acumuladas en el
 *   Huila (2017-2025): 1 = cicatriz confirmada, 0 = sin cicatriz. Esta mascara
 *   se usa en el Modulo 1 para excluir pixeles quemados de la serie temporal
 *   de vegetacion (evita confundir regeneracion post-incendio con dinamica
 *   real de cobertura).
 *
 * Metodologia (aprobada):
 *   - Coleccion: COPERNICUS/S2_SR_HARMONIZED.
 *   - NBR = (B08 - B12) / (B08 + B12).
 *   - dNBR = NBR_pre - NBR_post.
 *       cicatriz confirmada: dNBR >= 0.10 (umbral conservador)
 *       cicatriz severa:     dNBR >= 0.27
 *   - Referencia de eventos: puntos de calor FIRMS (MODIS C6.1) para
 *     identificar / confirmar actividad de fuego por anio en el Huila.
 *
 * Estrategia implementada (autocontenida y ejecutable sin edicion):
 *   En lugar de seleccionar manualmente cada par pre/post por evento VIIRS,
 *   se procesa un par pre/post ANUAL centrado en la temporada seca de mitad
 *   de anio (jun-ago), que es cuando se concentran los incendios en el valle
 *   del Magdalena (Huila). Para cada anio:
 *     1. Se cuenta la actividad FIRMS dentro del Huila; si supera el umbral
 *        MIN_HOTSPOTS el anio se procesa (gating de "evento significativo").
 *     2. Composicion pre  = mediana mayo-jun (vegetacion verde, pre-quema).
 *        Composicion post = mediana ago-sep (post temporada seca/fuego).
 *     3. dNBR -> umbral -> capa binaria del anio.
 *     4. (Opcional) confirmacion espacial con proximidad a hotspots FIRMS.
 *   Las capas anuales se acumulan con .max() -> mascara binaria 2017-2025.
 *
 *   Las ventanas y umbrales estan parametrizados abajo. Para la temporada
 *   seca de inicio de anio (dic-feb), desplazar VENTANA_PRE/VENTANA_POST.
 *
 * Como ejecutar:
 *   Pegar en https://code.earthengine.google.com (cuenta cenigaa-rogaa) y Run.
 *   Revisar el Map y el panel Tasks (export de asset + GeoTIFF a Drive).
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. Parametros
// ----------------------------------------------------------------------------
var ANIOS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

var DNBR_CONFIRMADA = 0.10;
var DNBR_SEVERA     = 0.27;

var MAX_NUBOSIDAD   = 20;     // % CLOUDY_PIXEL_PERCENTAGE para pre/post
var ESCALA          = 30;     // m

// Ventanas estacionales (mes-dia) dentro del mismo anio (temporada seca jun-ago)
var VENTANA_PRE  = {ini: '-05-01', fin: '-06-15'};
var VENTANA_POST = {ini: '-08-15', fin: '-09-30'};

// Gating por actividad de fuego FIRMS (proxy de "evento significativo")
var MIN_HOTSPOTS = 100;       // pixeles FIRMS con deteccion en el anio
var USAR_CONFIRMACION_VIIRS = true;  // exigir proximidad a hotspots
var RADIO_CONFIRMACION_M = 2000;     // buffer alrededor de hotspots (m)

var PROYECTO = 'projects/cenigaa-rogaa/assets';
var NOMBRE_ASSET = 'Mod0_NBR_mask_Huila_2017_2025';

// ----------------------------------------------------------------------------
// 2. ROI: departamento del Huila
// ----------------------------------------------------------------------------
var huila = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Colombia'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Huila'));
// Alternativa con asset propio:
// var huila = ee.FeatureCollection(PROYECTO + '/huila_departamento');
var roi = huila.geometry();
Map.centerObject(roi, 8);

// ----------------------------------------------------------------------------
// 3. Helpers Sentinel-2
// ----------------------------------------------------------------------------
function maskS2clouds(img) {
  var qa = img.select('QA60');
  var cloudBit = 1 << 10;
  var cirrusBit = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBit).eq(0)
    .and(qa.bitwiseAnd(cirrusBit).eq(0));
  return img.updateMask(mask).divide(10000)
    .copyProperties(img, ['system:time_start', 'CLOUDY_PIXEL_PERCENTAGE']);
}

function nbr(img) {
  // NBR = (B08 - B12) / (B08 + B12)
  return img.normalizedDifference(['B8', 'B12']).rename('NBR');
}

function composito(fechaIni, fechaFin) {
  var col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(roi)
    .filterDate(fechaIni, fechaFin)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', MAX_NUBOSIDAD))
    .map(maskS2clouds);
  return ee.Image(col.map(nbr).median()).clip(roi);
}

// ----------------------------------------------------------------------------
// 4. FIRMS: actividad de fuego por anio (gating + confirmacion espacial)
// ----------------------------------------------------------------------------
function firmsAnio(anio) {
  return ee.ImageCollection('FIRMS')
    .filterDate(anio + '-01-01', (anio + 1) + '-01-01')
    .filterBounds(roi)
    .select('T21');
}

function conteoHotspots(anio) {
  var fc = firmsAnio(anio);
  var presencia = fc.map(function (i) { return i.gt(0); }).sum().gt(0);
  var conteo = presencia.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 1000,
    maxPixels: 1e12,
    bestEffort: true
  }).get('T21');
  return ee.Number(conteo);
}

function mascaraProximidadHotspots(anio) {
  var presencia = firmsAnio(anio).map(function (i) { return i.gt(0); })
    .sum().gt(0).selfMask();
  // distancia euclidiana a hotspots; confirma dentro de RADIO_CONFIRMACION_M
  var dist = presencia.fastDistanceTransform(256).sqrt()
    .multiply(ee.Image.pixelArea().sqrt());  // aprox a metros
  return dist.lte(RADIO_CONFIRMACION_M);
}

// ----------------------------------------------------------------------------
// 5. Cicatriz binaria por anio (server-side, con gating FIRMS)
// ----------------------------------------------------------------------------
function cicatrizAnio(anio) {
  var pre  = composito(anio + VENTANA_PRE.ini,  anio + VENTANA_PRE.fin);
  var post = composito(anio + VENTANA_POST.ini, anio + VENTANA_POST.fin);

  var dnbr = pre.subtract(post).rename('dNBR');
  var confirmada = dnbr.gte(DNBR_CONFIRMADA);

  if (USAR_CONFIRMACION_VIIRS) {
    confirmada = confirmada.and(mascaraProximidadHotspots(anio));
  }

  // gating: si la actividad FIRMS del anio < MIN_HOTSPOTS, anular la capa
  var hot = conteoHotspots(anio);
  var habilitar = ee.Image.constant(hot.gte(MIN_HOTSPOTS));

  return confirmada.and(habilitar.gt(0))
    .unmask(0)
    .rename('scar')
    .set('anio', anio, 'hotspots', hot)
    .clip(roi);
}

var capasAnuales = ee.ImageCollection(ANIOS.map(cicatrizAnio));

// Mascara binaria acumulada: 1 = cicatriz confirmada en algun anio
var mascaraAcumulada = capasAnuales.max().unmask(0).rename('scar').clip(roi);

// ----------------------------------------------------------------------------
// 6. Visualizacion y diagnostico
// ----------------------------------------------------------------------------
Map.addLayer(roi, {color: '43B02A'}, 'Huila ROI', false);
Map.addLayer(
  mascaraAcumulada.selfMask(),
  {palette: ['#F4511E']},
  'Cicatrices acumuladas 2017-2025'
);

print('Hotspots FIRMS por anio (Huila):',
  ee.FeatureCollection(ANIOS.map(function (a) {
    return ee.Feature(null, {anio: a, hotspots: conteoHotspots(a)});
  }))
);

var areaCicatriz = mascaraAcumulada.selfMask()
  .multiply(ee.Image.pixelArea())
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: ESCALA,
    maxPixels: 1e13,
    bestEffort: true
  });
print('Area total de cicatriz acumulada (m2):', areaCicatriz);

// ----------------------------------------------------------------------------
// 7. Exports
// ----------------------------------------------------------------------------
// 7a. Asset GEE (mascara binaria), para uso en Modulo 1.
Export.image.toAsset({
  image: mascaraAcumulada.toByte(),
  description: NOMBRE_ASSET + '_asset',
  assetId: PROYECTO + '/' + NOMBRE_ASSET,
  region: roi,
  scale: ESCALA,
  maxPixels: 1e13
});

// 7b. GeoTIFF a Drive para inspeccion visual.
Export.image.toDrive({
  image: mascaraAcumulada.toByte(),
  description: NOMBRE_ASSET + '_drive',
  fileNamePrefix: NOMBRE_ASSET,
  folder: 'CENIGAA_GEE',
  region: roi,
  scale: ESCALA,
  maxPixels: 1e13
});
