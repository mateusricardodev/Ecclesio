import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'

const NAV_LINKS = [
  { label: 'Recursos', href: '/#recursos' },
  { label: 'Como funciona', href: '/#como-funciona' },
  { label: 'Dúvidas', href: '/#duvidas' },
]

export function LandingNavbar() {
  const [open, setOpen] = useState(false)
  const token = useAuthStore((s) => s.token)

  const cta = token
    ? { to: '/dashboard', label: 'Meu painel' }
    : { to: '/login', label: 'Entrar' }

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-10 h-[78px] sm:h-[92px] flex items-center justify-between gap-6">
        <Link to="/" className="shrink-0">
          <img src="/logo-horizontal.png" alt="Ecclesio" className="h-8 sm:h-9 object-contain" />
        </Link>

        <nav
          className="hidden md:flex items-center gap-7 rounded-full px-6 py-4 text-sm font-bold"
          style={{
            background: 'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            letterSpacing: '-0.025em',
          }}
        >
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="text-ecc-ink hover:text-ecc-navy transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          {!token && (
            <Link to="/login?modo=cadastro" className="ecc-btn text-ecc-ink hover:text-ecc-navy">
              Criar conta
            </Link>
          )}
          <Link to={cta.to} className="ecc-btn ecc-btn-primary">
            {cta.label}
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-full"
          style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(15px)' }}
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden mx-4 rounded-[20px] bg-white px-6 py-5 flex flex-col gap-4 border border-ecc-line">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-[15px] font-bold text-ecc-ink"
            >
              {l.label}
            </a>
          ))}
          <div className="h-px bg-ecc-line" />
          {!token && (
            <Link to="/login?modo=cadastro" onClick={() => setOpen(false)} className="ecc-btn ecc-btn-soft">
              Criar conta
            </Link>
          )}
          <Link to={cta.to} onClick={() => setOpen(false)} className="ecc-btn ecc-btn-primary">
            {cta.label}
          </Link>
        </div>
      )}
    </header>
  )
}
