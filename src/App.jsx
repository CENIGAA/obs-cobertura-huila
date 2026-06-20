import { lazy, Suspense } from 'react'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import Aliados from './components/Aliados'
import Footer from './components/Footer'

// Carga diferida: recharts es pesado y se separa en su propio chunk.
const SeriesTemporales = lazy(() => import('./components/SeriesTemporales'))

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <Suspense fallback={
          <div className="bg-gray-50 py-16 text-center text-sm text-gray-400">
            Cargando series temporales...
          </div>
        }>
          <SeriesTemporales />
        </Suspense>
        <Aliados />
      </main>
      <Footer />
    </div>
  )
}
