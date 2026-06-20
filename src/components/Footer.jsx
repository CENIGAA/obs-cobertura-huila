export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-rogaa-navy text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <img
              src="/assets/images/logo/logo_cenigaa_T_Blanco.png"
              alt="CENIGAA"
              className="h-12 w-auto mb-3"
            />
            <p className="text-gray-400 text-sm leading-relaxed">
              Centro de Investigación en Ciencias<br />
              y Recursos GeoAgroAmbientales
            </p>
            <p className="text-xs text-gray-500 mt-3 italic">Desarrollo Sustentable.</p>
          </div>
          <div>
            <p className="font-semibold text-sm mb-3 text-gray-300">Red ROGAA · Huila</p>
            <ul className="space-y-1.5 text-sm text-gray-400">
              <li><a href="https://obs-clima-huila.cenigaa.org"
                     className="hover:text-white transition-colors">Observatorio Climático</a></li>
              <li><a href="https://museosuelos.cenigaa.org"
                     className="hover:text-white transition-colors">Museo de Suelos</a></li>
              <li><a href="https://obs-hidrico-huila.cenigaa.org"
                     className="hover:text-white transition-colors">Observatorio Hídrico</a></li>
              <li><span className="font-medium" style={{ color: '#43B02A' }}>
                Observatorio de Coberturas
              </span></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-sm mb-3 text-gray-300">Contacto</p>
            <ul className="space-y-1.5 text-sm text-gray-400">
              <li><a href="mailto:info@cenigaa.org"
                     className="hover:text-white transition-colors">info@cenigaa.org</a></li>
              <li>Neiva, Huila, Colombia</li>
              <li><a href="https://www.cenigaa.org"
                     className="hover:text-white transition-colors">www.cenigaa.org</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-gray-500 text-xs">
            © {year} CENIGAA · NIT 900345215-2 · Todos los derechos reservados
          </p>
          <p className="text-gray-600 text-xs">
            Observatorio de Coberturas de la Tierra del Huila · ROGAA Nodo 4
          </p>
        </div>
      </div>
    </footer>
  )
}
