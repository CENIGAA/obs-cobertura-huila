const aliados = [
  {
    src: '/assets/images/logo/Gobernacion_Huila.png',
    alt: 'Gobernación del Huila',
  },
  {
    src: '/assets/images/logo/CAM.svg',
    alt: 'Corporación Autónoma Regional del Alto Magdalena (CAM)',
  },
]

export default function Aliados() {
  return (
    <section className="bg-white py-16 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
          Con el apoyo de
        </p>
        <h2 className="text-2xl font-bold text-rogaa-navy mb-10">
          Aliados institucionales
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-12 sm:gap-20">
          {aliados.map(({ src, alt }) => (
            <img
              key={src}
              src={src}
              alt={alt}
              className="h-[60px] w-auto object-contain grayscale opacity-70 transition duration-300 hover:grayscale-0 hover:opacity-100"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
