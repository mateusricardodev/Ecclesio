import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Settings, Search, Menu, X, LogOut, Bell,
  Wallet, Banknote,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store'

const NAV_ITEMS = [
  { label: 'Painel', icon: LayoutDashboard, to: '/dashboard', key: 'dashboard' },
  { label: 'Eventos', icon: Calendar, to: '/eventos', key: 'eventos' },
  { label: 'Inscrições', icon: Users, to: '/buscar-inscricoes', key: 'inscricoes' },
  { label: 'Financeiro', icon: Wallet, to: '/financeiro', key: 'financeiro' },
  { label: 'Configurações', icon: Settings, to: '/dashboard', key: 'config' },
]

/** Item exclusivo do admin da plataforma: a fila de resgates a pagar. */
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
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF' }}>

      {/* TOPBAR */}
      <header
        className="sticky top-0 z-30 flex items-center h-[68px] px-5 sm:px-8 gap-4"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(15px)',
          borderBottom: '1px solid #E9E9E9',
        }}
      >
        {/* Hamburger mobile */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-1.5 rounded-full transition-colors"
          style={{ color: '#0A0A09' }}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <Link to="/dashboard" className="shrink-0 flex items-center">
          <img src="/logo-horizontal.png" alt="Ecclesio" className="h-7 object-contain" />
        </Link>

        {/* Divisor */}
        <div className="hidden lg:block h-5 w-px mx-1" style={{ background: '#E9E9E9' }} />

        {/* Busca */}
        <form
          onSubmit={(e) => { e.preventDefault(); navigate('/buscar-inscricoes') }}
          className="hidden md:flex flex-1 max-w-md"
        >
          <div className="relative w-full">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#929292' }} />
            <input
              placeholder="Buscar inscrições"
              className="w-full text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:border-ecc-navy transition-all"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E9E9E9',
                color: '#0A0A09',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
        </form>

        {/* Direita */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            className="p-2 rounded-full transition-colors relative"
            style={{ color: '#6F6F6F' }}
            aria-label="Notificações"
          >
            <Bell size={18} />
          </button>

          {/* Avatar + nome */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-full pl-1.5 pr-3 py-1.5 transition-colors group hover:bg-ecc-navy-soft"
            style={{ color: '#0A0A09' }}
            title="Sair"
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: '#00186D', color: '#FFFFFF' }}
            >
              {initials || '?'}
            </span>
            <span className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-sans)' }}>
                {fullName}
              </span>
              <span className="ecc-eyebrow" style={{ fontSize: '11px', color: '#6F6F6F' }}>
                Organizador
              </span>
            </span>
            <LogOut size={14} className="hidden sm:block ml-1 opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* SIDEBAR desktop */}
        <aside
          className="hidden lg:flex flex-col w-[232px] shrink-0 min-h-[calc(100vh-68px)] sticky top-[68px] self-start"
          style={{
            background: '#FFFFFF',
            borderRight: '1px solid #E9E9E9',
          }}
        >
          <SidebarContent active={active} isAdmin={isAdmin} />
        </aside>

        {/* SIDEBAR mobile drawer */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside
              className="relative w-72 h-full shadow-2xl flex flex-col"
              style={{ background: '#FFFFFF' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E9E9E9' }}>
                <img src="/logo-horizontal.png" alt="Ecclesio" className="h-7 object-contain" />
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-full"
                  style={{ color: '#6F6F6F' }}
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarContent active={active} isAdmin={isAdmin} onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        {/* CONTEÚDO */}
        <main className="flex-1 min-w-0 px-4 sm:px-10 py-8 sm:py-12">
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
    <nav className="flex flex-col gap-1 p-4 flex-1">
      <p className="ecc-eyebrow px-3 pt-2 pb-2">
        Menu
      </p>

      {items.map((item) => {
        const isActive = item.key === active
        return (
          <Link
            key={item.key}
            to={item.to}
            onClick={onNavigate}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition-all hover:bg-[#F5F5F5]"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: isActive ? 700 : 500,
              background: isActive ? '#E6E9F3' : undefined,
              color: isActive ? '#00186D' : '#0A0A09',
            }}
          >
            <item.icon size={16} style={{ opacity: isActive ? 1 : 0.55 }} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
