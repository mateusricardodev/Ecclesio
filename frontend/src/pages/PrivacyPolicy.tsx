import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LandingNavbar } from '../components/LandingNavbar'
import { Footer } from '../components/Footer'
import { PrivacyContent } from './PrivacyContent'

export function PrivacyPolicy() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF' }}>
      <LandingNavbar />
      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6">
        <article className="max-w-3xl mx-auto">
          <PrivacyContent />

          <p className="mt-12" style={{ fontSize: '0.95rem', lineHeight: 1.75 }}>
            <Link to="/" style={{ color: '#00186D', textDecoration: 'underline' }}>Voltar para o início</Link>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}
