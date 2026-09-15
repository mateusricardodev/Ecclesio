import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Settings, Search, Menu, X, LogOut, Bell,
  Wallet, Banknote,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', key: 'dashboard' },
  { label: 'Eventos', icon: Calendar, to: '/eventos', key: 'eventos' },
  { label: 'Inscrições', icon: Users, to: '/buscar-inscricoes', key: 'inscricoes' },
  { label: 'Financeiro', icon: Wallet, to: '/financeiro', key: 'financeiro' },
  { label: 'Configurações', icon: Settings, to: '/dashboard', key: 'config' },
]

/** Item exclusivo do admin da plataforma — a fila de resgates a pagar. */
const ADMIN_NAV_ITEM = {
  label: 'Saques', icon: Banknote, to: '/admin/saques', key: 'saques',
}

type NavKey = 'dashboard' | 'eventos' | 'inscricoes' | 'financeiro' | 'config' | 'saques'

export function DashboardLayout({
  active,
  children,
}: {
  active: NavKey
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isAdmin = user?.role === 'admin'
  const fullName = user?.name ?? 'Organizador'
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F2E8' }}>

      {/* ── TOPBAR ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center h-[60px] px-5 gap-4"
        style={{
          background: '#00186D',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Hamburger mobile */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <Link to="/dashboard" className="shrink-0 flex items-center">
          <img src="/logo-ecclesio.png" alt="Ecclesio" className="h-7 object-contain" />
        </Link>

        {/* Divisor */}
        <div className="hidden lg:block h-5 w-px mx-1" style={{ background: 'rgba(255,255,255,0.15)' }} />

        {/* Busca */}
        <form
          onSubmit={(e) => { e.preventDefault(); navigate('/buscar-inscricoes') }}
          className="hidden md:flex flex-1 max-w-md"
        >
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input
              placeholder="Buscar eventos, inscrições..."
              className="w-full text-sm rounded-lg pl-9 pr-3 py-1.5 focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.85)',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
        </form>

        {/* Direita */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            className="p-2 rounded-lg transition-colors relative"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            aria-label="Notificações"
          >
            <Bell size={18} />
          </button>

          {/* Avatar + nome */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors group"
            style={{ color: 'white' }}
            title="Sair"
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: '#D4B16A', color: '#00186D' }}
            >
              {initials || '?'}
            </span>
            <span className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-sans)' }}>
                {fullName}
              </span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-sans)' }}>
                Organizador
              </span>
            </span>
            <LogOut size={14} className="hidden sm:block ml-1 opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ── SIDEBAR desktop ────────────────────────────────────────────── */}
        <aside
          className="hidden lg:flex flex-col w-[220px] shrink-0 min-h-[calc(100vh-60px)] sticky top-[60px] self-start"
          style={{
            background: '#FFFFFF',
            borderRight: '1px solid rgba(0,24,109,0.08)',
          }}
        >
          <SidebarContent active={active} isAdmin={isAdmin} />
        </aside>

        {/* ── SIDEBAR mobile drawer ──────────────────────────────────────── */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside
              className="relative w-72 h-full shadow-2xl flex flex-col"
              style={{ background: '#FFFFFF' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(0,24,109,0.08)' }}>
                <img src="/logo-ecclesio.png" alt="Ecclesio" className="h-7 object-contain" />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg"
                  style={{ color: '#6B7280' }}
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarContent active={active} isAdmin={isAdmin} onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        {/* ── CONTEÚDO ───────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 px-5 sm:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  active,
  isAdmin,
  onNavigate,
}: {
  active: string
  isAdmin?: boolean
  onNavigate?: () => void
}) {
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS

  return (
    <nav className="flex flex-col gap-0.5 p-3 flex-1">
      <p
        className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.12em] uppercase"
        style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}
      >
        Principal
      </p>

      {items.map((item) => {
        const isActive = item.key === active
        return (
          <Link
            key={item.key}
            to={item.to}
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              fontFamily: 'var(--font-sans)',
              background: isActive ? 'rgba(0,24,109,0.06)' : 'transparent',
              color: isActive ? '#00186D' : '#33425C',
              borderLeft: isActive ? '3px solid #D4B16A' : '3px solid transparent',
            }}
          >
            <item.icon size={17} style={{ opacity: isActive ? 1 : 0.6 }} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
