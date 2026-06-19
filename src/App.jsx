import Header from './components/Header'
import HeroSection from './components/HeroSection'
import Aliados from './components/Aliados'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <Aliados />
      </main>
      <Footer />
    </div>
  )
}
