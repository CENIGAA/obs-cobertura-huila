import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const HUILA_CENTER = [2.5359, -75.5277]
const HUILA_ZOOM = 8

const GREEN = '#43B02A'
const NAVY = '#162341'

const DEPTO_STYLE = {
  color: GREEN,
  weight: 2.5,
  opacity: 0.8,
  fillColor: GREEN,
  fillOpacity: 0.1,
  interactive: false,
}

const MPIO_STYLE = {
  color: NAVY,
  weight: 1,
  opacity: 0.5,
  fillOpacity: 0,
}

const MPIO_HOVER_STYLE = {
  color: GREEN,
  weight: 2.5,
  opacity: 1,
}

export default function HeroMap() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: HUILA_CENTER,
      zoom: HUILA_ZOOM,
      zoomControl: true,
      attributionControl: true,
    })
    mapInstance.current = map

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
          ' contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map)

    let cancelled = false

    async function loadGeoData() {
      try {
        const [deptoRes, mpioRes] = await Promise.all([
          fetch('/data/huila_departamento.geojson'),
          fetch('/data/huila_municipios.geojson'),
        ])
        if (!deptoRes.ok || !mpioRes.ok) {
          throw new Error('No se pudieron cargar los datos geográficos')
        }
        const [depto, mpios] = await Promise.all([
          deptoRes.json(),
          mpioRes.json(),
        ])
        if (cancelled || !mapInstance.current) return

        // Capa departamento - contorno de referencia, sin interactividad.
        const deptoLayer = L.geoJSON(depto, { style: DEPTO_STYLE }).addTo(map)

        // Capa municipios - borde fino, hover interactivo con tooltip.
        const mpioLayer = L.geoJSON(mpios, {
          style: () => ({ ...MPIO_STYLE }),
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {}
            const nombre = props.nombre ?? props.MPIO_CNMBR ?? 'Municipio'
            const area =
              props.area_km2 != null
                ? `${Number(props.area_km2).toLocaleString('es-CO')} km²`
                : null

            layer.bindTooltip(
              `<span class="font-semibold">${nombre}</span>` +
                (area ? `<br><span class="text-xs">${area}</span>` : ''),
              {
                sticky: true,
                direction: 'top',
                className: 'huila-mpio-tooltip',
              }
            )

            layer.on('mouseover', () => {
              layer.setStyle(MPIO_HOVER_STYLE)
              layer.bringToFront()
            })
            layer.on('mouseout', () => {
              mpioLayer.resetStyle(layer)
            })
          },
        }).addTo(map)

        // Encuadre automático al polígono departamental.
        map.fitBounds(deptoLayer.getBounds(), { padding: [16, 16] })

        if (!cancelled) setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Error al cargar el mapa')
          setLoading(false)
        }
      }
    }

    loadGeoData()

    return () => {
      cancelled = true
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full rounded-xl overflow-hidden shadow-lg border border-gray-200"
        style={{ height: '480px' }}
      />
      {(loading || error) && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm pointer-events-none">
          {error ? (
            <p className="text-sm text-rogaa-orange font-medium px-4 text-center">
              {error}
            </p>
          ) : (
            <div className="flex items-center gap-3 text-rogaa-navy">
              <span
                className="inline-block w-5 h-5 rounded-full border-2 border-gray-300 animate-spin"
                style={{ borderTopColor: GREEN }}
              />
              <span className="text-sm font-medium">Cargando mapa…</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
