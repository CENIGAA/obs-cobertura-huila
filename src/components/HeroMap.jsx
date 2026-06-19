import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const HUILA_CENTER = [2.5359, -75.5277]
const HUILA_ZOOM = 8

export default function HeroMap() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (mapInstance.current) return

    mapInstance.current = L.map(mapRef.current, {
      center: HUILA_CENTER,
      zoom: HUILA_ZOOM,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
          ' contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(mapInstance.current)

    L.rectangle(
      [[1.50, -76.05], [3.80, -74.45]],
      {
        color: '#43B02A',
        weight: 2,
        fillColor: '#43B02A',
        fillOpacity: 0.08,
        dashArray: '6 4',
      }
    ).addTo(mapInstance.current)
    .bindTooltip(
      'Departamento del Huila — 19.900 km²<br><small>Cargando capa de coberturas...</small>',
      { permanent: false }
    )

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden shadow-lg border border-gray-200"
      style={{ height: '480px' }}
    />
  )
}
