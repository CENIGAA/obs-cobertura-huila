import HeroMap from './HeroMap'
import { Layers, TreePine, TrendingDown, Download } from 'lucide-react'

const stats = [
  { icon: Layers,       value: '19.900 km²', label: 'Dominio espacial' },
  { icon: TreePine,     value: '1985–2024',  label: 'Serie MapBiomas' },
  { icon: TrendingDown, value: '1987–2022',  label: 'Serie CLC/SIMCOT' },
  { icon: Download,     value: 'Abiertos',   label: 'Datos con DOI' },
]

export default function HeroSection() {
  return (
    <section className="bg-white pt-10 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#43B02A' }} />
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              ROGAA · Nodo 4
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-rogaa-navy leading-tight mb-3">
            Observatorio de Coberturas<br className="hidden sm:block" />
            de la Tierra del Huila
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl leading-relaxed">
            Monitoreo satelital de las coberturas y usos del suelo del departamento.
            Series históricas desde 1985 con Landsat y Sentinel-2, análisis
            comparativo CLC y MapBiomas, y datos abiertos con DOI.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <HeroMap />
            <p className="text-xs text-gray-400 mt-2 text-right">
              Mapa base: CartoDB Light · Datos: GEE / MapBiomas / SIMCOT-IDEAM
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label}
                   className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ backgroundColor: '#43B02A20' }}>
                  <Icon size={20} style={{ color: '#43B02A' }} />
                </div>
                <div>
                  <p className="font-bold text-rogaa-navy text-lg leading-tight">{value}</p>
                  <p className="text-gray-500 text-sm">{label}</p>
                </div>
              </div>
            ))}
            <div className="rounded-xl p-4 border-2 border-dashed mt-2"
                 style={{ borderColor: '#43B02A40' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                 style={{ color: '#43B02A' }}>
                En construcción
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Geodatabase Huila en proceso. Datos CLC y MapBiomas
                serán publicados con DOI en Zenodo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
