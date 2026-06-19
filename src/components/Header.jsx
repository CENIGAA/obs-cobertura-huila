import { Satellite } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <a href="https://www.cenigaa.org"
               className="text-sm text-gray-500 hover:text-rogaa-navy transition-colors font-medium">
              CENIGAA
            </a>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md flex items-center justify-center"
                   style={{ backgroundColor: '#43B02A' }}>
                <Satellite size={14} className="text-white" />
              </div>
              <span className="font-semibold text-rogaa-navy text-sm">
                Observatorio de Coberturas
              </span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#coberturas"
               className="text-sm text-gray-600 hover:text-rogaa-green transition-colors font-medium">
              Coberturas
            </a>
            <a href="#tendencias"
               className="text-sm text-gray-600 hover:text-rogaa-green transition-colors font-medium">
              Tendencias
            </a>
            <a href="#datos"
               className="text-sm text-gray-600 hover:text-rogaa-green transition-colors font-medium">
              Datos
            </a>
            <a href="#metodologia"
               className="text-sm text-gray-600 hover:text-rogaa-green transition-colors font-medium">
              Metodología
            </a>
            <a href="https://observatorios.cenigaa.org"
               className="text-sm px-4 py-1.5 rounded-full border font-medium transition-colors"
               style={{ borderColor: '#43B02A', color: '#43B02A' }}>
              Red ROGAA
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}
