import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function LandingCTA() {
  return (
    <section className="py-24" style={{ background: '#F5F2E8' }}>
      <div className="max-w-3xl mx-auto px-6 text-center">

        {/* Ornamento */}
        <div className="flex justify-center mb-6">
          <div className="h-px w-16" style={{ background: '#D4B16A' }} />
        </div>

        <h2
          className="mb-4"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 600,
            color: '#00186D',
            lineHeight: 1.2,
          }}
        >
          Seu próximo evento merece<br />
          <span style={{ fontStyle: 'italic', color: '#D4B16A' }}>
            a melhor experiência.
          </span>
        </h2>

        <p className="text-base mb-8 max-w-md mx-auto" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
          Junte-se a organizadores que simplificaram a gestão de eventos na sua comunidade.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 text-sm font-semibold px-7 py-3.5 rounded-xl transition-all"
            style={{
              background: '#00186D',
              color: '#FFFFFF',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 16px rgba(0,24,109,0.22)',
            }}
          >
            Criar minha conta
            <ArrowRight size={15} />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold px-7 py-3.5 rounded-xl transition-all"
            style={{
              border: '1.5px solid rgba(0,24,109,0.25)',
              color: '#00186D',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Já tenho conta
          </Link>
        </div>
      </div>
    </section>
  )
}
