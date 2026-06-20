import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'

/*
 * Series Temporales de Cobertura - Huila (ROGAA Nodo 4).
 *
 * Muestra NDVI, NSMI y BSI con frecuencia pentadal (5 dias), 2017-2025.
 * Mientras el CSV real del Modulo 1 (GEE) no este disponible, se generan
 * datos sinteticos representativos (media Huila NDVI ~0.64, variacion
 * estacional bimodal). Para usar datos reales, reemplazar generarSerie()
 * por una carga del CSV exportado (Mod1_Series_Pentadales_Huila_2017_2025).
 */

const INDICES = [
  { key: 'ndvi_mean', nombre: 'NDVI', color: '#43B02A', desc: 'Vigor vegetativo' },
  { key: 'nsmi_mean', nombre: 'NSMI', color: '#0EA5E9', desc: 'Humedad del suelo' },
  { key: 'bsi_mean', nombre: 'BSI', color: '#8B6914', desc: 'Suelo descubierto' },
]

const ANIOS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const Y_TICKS = [-1, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1]

const fmtMesAnio = (iso) =>
  new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' })
    .format(new Date(iso + 'T00:00:00'))

const fmtFechaLarga = (iso) =>
  new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(iso + 'T00:00:00'))

// PRNG determinista (mulberry32) para que los datos sinteticos sean estables.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generarSerie() {
  const rand = mulberry32(20260620)
  const datos = []
  const inicio = new Date('2017-01-01T00:00:00')
  const fin = new Date('2026-01-01T00:00:00')
  const MS_PENTADA = 5 * 24 * 3600 * 1000

  for (let t = inicio.getTime(); t < fin.getTime(); t += MS_PENTADA) {
    const fecha = new Date(t)
    const iso = fecha.toISOString().slice(0, 10)
    const doy = (t - new Date(fecha.getFullYear() + '-01-01T00:00:00').getTime())
      / (24 * 3600 * 1000)
    // Estacionalidad bimodal (dos temporadas secas/humedas al anio en Huila).
    const estacion = Math.sin((doy / 365) * 2 * Math.PI * 2 - 0.6)

    const ndvi = 0.64 + 0.15 * estacion + (rand() - 0.5) * 0.05
    const nsmi = 0.22 + 0.12 * estacion + (rand() - 0.5) * 0.04
    const bsi = -0.12 - 0.10 * estacion + (rand() - 0.5) * 0.04
    const clamp = (v) => Math.max(-1, Math.min(1, v))

    datos.push({
      fecha: iso,
      ndvi_mean: +clamp(ndvi).toFixed(3),
      nsmi_mean: +clamp(nsmi).toFixed(3),
      bsi_mean: +clamp(bsi).toFixed(3),
      n_imagenes: 1 + Math.floor(rand() * 6),
    })
  }
  return datos
}

function TooltipPersonalizado({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const punto = payload[0].payload
  return (
    <div className="bg-white border rounded-lg shadow-md px-3 py-2 text-xs"
         style={{ borderColor: '#43B02A' }}>
      <p className="font-semibold text-rogaa-navy mb-1">{fmtFechaLarga(label)}</p>
      {INDICES.map(({ key, nombre, color }) => (
        <p key={key} style={{ color }} className="font-medium">
          {nombre}: {punto[key]}
        </p>
      ))}
      <p className="text-gray-400 mt-1">{punto.n_imagenes} imagen(es) S2</p>
    </div>
  )
}

export default function SeriesTemporales() {
  const serieCompleta = useMemo(() => generarSerie(), [])
  const [periodo, setPeriodo] = useState('todo')

  const datos = useMemo(() => {
    if (periodo === 'todo') return serieCompleta
    return serieCompleta.filter((d) => d.fecha.startsWith(String(periodo)))
  }, [serieCompleta, periodo])

  const botonBase =
    'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors'

  return (
    <section className="bg-gray-50 py-16 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-rogaa-navy mb-1">
            Series Temporales de Cobertura
          </h2>
          <p className="text-gray-500 text-sm">
            NDVI, NSMI e Indice de Suelo Descubierto - Sentinel-2 2017-2025
          </p>
        </div>

        {/* Selector de periodo */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setPeriodo('todo')}
            className={botonBase}
            style={periodo === 'todo'
              ? { backgroundColor: '#43B02A', borderColor: '#43B02A', color: '#fff' }
              : { borderColor: '#d1d5db', color: '#374151' }}
          >
            Todo el periodo
          </button>
          {ANIOS.map((a) => (
            <button
              key={a}
              onClick={() => setPeriodo(a)}
              className={botonBase}
              style={periodo === a
                ? { backgroundColor: '#43B02A', borderColor: '#43B02A', color: '#fff' }
                : { borderColor: '#d1d5db', color: '#374151' }}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Grafico */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
             style={{ height: '440px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#eef0f2" vertical={false} />
              <XAxis
                dataKey="fecha"
                tickFormatter={fmtMesAnio}
                minTickGap={40}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
              />
              <YAxis
                domain={[-1, 1]}
                ticks={Y_TICKS}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<TooltipPersonalizado />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => {
                  const idx = INDICES.find((i) => i.nombre === value)
                  return (
                    <span style={{ color: '#374151', fontSize: 12 }}>
                      {value} · {idx ? idx.desc : ''}
                    </span>
                  )
                }}
              />
              {INDICES.map(({ key, nombre, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={nombre}
                  stroke={color}
                  strokeWidth={1.6}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Datos sinteticos representativos para desarrollo. Se reemplazaran por
          la salida del Modulo 1 (GEE) cuando el CSV este disponible.
        </p>
      </div>
    </section>
  )
}
