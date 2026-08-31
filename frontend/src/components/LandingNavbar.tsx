import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'

const NAV_LINKS = [
  { label: 'Recursos', href: '#recursos' },
  { label: 'Para quem é', href: '#para-quem' },
  { label: 'Planos', href: '#planos' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Contato', href: '#contato' },
]

export function LandingNavbar() {
  const [open, setOpen] = useState(false)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255,255,255,0.97)',
        borderBottom: '1px solid rgba(0,24,109,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">

        {/* Logo */}
        <Link to="/" className="shrink-0">
          <img src="/logo-ecclesio.png" alt="Ecclesio" className="h-8 object-contain" />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium transition-colors"
              style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#00186D')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#33425C')}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA desktop */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {token ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm font-semibold px-5 py-2 rounded-xl transition-all"
                style={{ background: '#00186D', color: '#FFFFFF', fontFamily: 'var(--font-sans)' }}
              >
                Meu painel
              </Link>
              <button
                onClick={() => logout()}
                className="text-sm font-medium px-4 py-2 rounded-xl transition-all"
                style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium px-4 py-2 rounded-xl transition-all"
                style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold px-5 py-2 rounded-xl transition-all"
                style={{
                  background: '#00186D',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-sans)',
                  boxShadow: '0 2px 10px rgba(0,24,109,0.18)',
                }}
              >
                Criar conta
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg"
          style={{ color: '#33425C' }}
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden px-6 py-5 flex flex-col gap-4"
          style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,24,109,0.08)' }}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium"
              style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}
            >
              {l.label}
            </a>
          ))}
          <div className="h-px" style={{ background: 'rgba(0,24,109,0.08)' }} />
          {token ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="text-center text-sm font-semibold py-3 rounded-xl"
                style={{ background: '#00186D', color: '#FFFFFF' }}
              >
                Meu painel
              </Link>
              <button
                onClick={() => { logout(); setOpen(false) }}
                className="text-sm font-medium text-left"
                style={{ color: '#33425C' }}
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="text-sm font-medium"
                style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}
              >
                Entrar
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="text-center text-sm font-semibold py-3 rounded-xl"
                style={{ background: '#00186D', color: '#FFFFFF', fontFamily: 'var(--font-sans)' }}
              >
                Criar conta
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
