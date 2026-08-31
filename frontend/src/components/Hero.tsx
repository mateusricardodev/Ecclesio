import { Link } from 'react-router-dom'
import { ShieldCheck, ArrowRight } from 'lucide-react'

export function Hero() {
  return (
    <section
      className="min-h-screen flex items-center pt-16 overflow-hidden"
      style={{ background: '#F5F2E8' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-20 w-full grid lg:grid-cols-2 gap-16 items-center">

        {/* ── Esquerda ── */}
        <div className="flex flex-col gap-7">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full w-fit"
            style={{
              background: 'rgba(0,24,109,0.07)',
              border: '1px solid rgba(0,24,109,0.12)',
            }}
          >
            <span style={{ color: '#D4B16A', fontSize: '0.65rem' }}>✦</span>
            <span
              className="text-xs font-semibold tracking-[0.1em]"
              style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}
            >
              Gestão de eventos católicos
            </span>
          </div>

          {/* Headline */}
          <h1
            className="leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.6rem, 5vw, 4rem)',
              fontWeight: 600,
              color: '#00186D',
            }}
          >
            Organize eventos.<br />
            Conecte pessoas.<br />
            <span style={{ color: '#D4B16A', fontStyle: 'italic' }}>
              Fortaleça a missão.
            </span>
          </h1>

          {/* Descrição */}
          <p
            className="text-base leading-relaxed max-w-md"
            style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}
          >
            O Ecclesio é a plataforma completa para gestão de retiros, encontros, conferências e inscrições.
            Seus participantes se inscrevem pelo link —{' '}
            <strong style={{ color: '#00186D' }}>sem precisar criar conta.</strong>
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition-all"
              style={{
                background: '#00186D',
                color: '#FFFFFF',
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 16px rgba(0,24,109,0.22)',
              }}
            >
              Criar meu evento
              <ArrowRight size={15} />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition-all"
              style={{
                background: 'transparent',
                color: '#00186D',
                border: '1.5px solid rgba(0,24,109,0.25)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Ver como funciona
            </a>
          </div>

          {/* Micro-credenciais */}
          <div className="flex items-center gap-6 pt-2">
            {[
              '+ de 500 eventos realizados',
              '100% seguro',
              'Sem burocracia',
            ].map((text) => (
              <div key={text} className="flex items-center gap-1.5">
                <span style={{ color: '#D4B16A', fontSize: '0.7rem' }}>✦</span>
                <span className="text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Direita — imagem com card overlay ── */}
        <div className="hidden lg:block relative">
          {/* Imagem principal */}
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{ boxShadow: '0 24px 64px rgba(0,24,109,0.18)' }}
          >
            <img
              src="/interior-igreja.jpg"
              alt="Interior de catedral"
              className="w-full h-[520px] object-cover"
            />
            {/* Overlay sutil */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(0,24,109,0.12) 0%, rgba(0,24,109,0.35) 100%)' }}
            />

            {/* Card flutuante — Segurança */}
            <div
              className="absolute bottom-6 left-6 right-6 rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              }}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(0,24,109,0.08)' }}
              >
                <ShieldCheck size={20} style={{ color: '#00186D' }} />
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
                  Segurança e confiança
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                  Seus dados e os dos participantes sempre protegidos.
                </p>
              </div>
              <div
                className="ml-auto h-px w-8 shrink-0"
                style={{ background: '#D4B16A' }}
              />
            </div>
          </div>

          {/* Badge flutuante — nova inscrição */}
          <div
            className="absolute -top-4 -right-4 rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(0,24,109,0.14)',
              border: '1px solid rgba(0,24,109,0.08)',
            }}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: '#D4B16A', color: '#00186D', fontFamily: 'var(--font-sans)' }}
            >
              MR
            </span>
            <div>
              <p className="text-xs font-bold" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>Nova inscrição</p>
              <p className="text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>Maria R. — Retiro de Jovens</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
