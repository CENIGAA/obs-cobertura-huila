const infraestructura = [
  {
    src: '/assets/images/logos/google-earth-engine.png',
    alt: 'Google Earth Engine',
    href: 'https://earthengine.google.com',
  },
  {
    src: '/assets/images/logos/copernicus-sentinel.png',
    alt: 'Copernicus Sentinel-2 ESA',
    href: 'https://sentinel.esa.int/web/sentinel/missions/sentinel-2',
  },
]

export default function InfraestructuraCientifica() {
  return (
    <section className="bg-white py-16 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
          Procesamiento satelital y datos geoespaciales
        </p>
        <h2 className="text-2xl font-bold text-rogaa-navy mb-10">
          Infraestructura cientifica
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-20">
          {infraestructura.map(({ src, alt, href }) => (
            <a
              key={src}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <img
                src={src}
                alt={alt}
                className="h-12 w-auto max-w-[78vw] sm:max-w-none object-contain grayscale opacity-70 transition duration-300 hover:grayscale-0 hover:opacity-100"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
