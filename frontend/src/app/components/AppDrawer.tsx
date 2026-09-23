import { LogOut, Shield, Sun, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { APP_VERSION } from '../api'
import { formatSyncStamp } from '../format'

interface AppDrawerProps {
  open: boolean
  onClose: () => void
}

const items: { icon: typeof Users; label: string; to?: string }[] = [
  { icon: Users, label: 'Contas' },
  { icon: Shield, label: 'Política de privacidade', to: '/privacidade' },
  { icon: Sun, label: 'Mudar tema' },
]

export function AppDrawer({ open, onClose }: AppDrawerProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const fullName = user?.name ?? 'Voluntário'
  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* overlay */}
      <div
        onClick={onClose}
        className={
          'fixed inset-0 z-30 bg-ecc-ink/40 backdrop-blur-sm transition-opacity duration-200 ' +
          (open ? 'opacity-100' : 'pointer-events-none opacity-0')
        }
      />
      {/* painel */}
      <aside
        className={
          'fixed inset-y-0 left-0 z-40 flex w-[84%] max-w-[330px] flex-col ' +
          'bg-ecc-navy text-white shadow-2xl transition-transform duration-200 ease-out ' +
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ' +
          (open ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <div className="border-b border-white/10 px-5 pb-5 pt-6">
          <img
            src="/logo-ecclesio.png"
            alt="Ecclesio"
            className="h-7 object-contain"
          />
          <div className="mt-5 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ecc-gold text-sm font-bold text-ecc-navy">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight">
                {fullName}
              </p>
              <p className="mt-0.5 truncate text-xs text-white/50">
                {user?.email ?? 'Voluntário'}
              </p>
            </div>
          </div>
        </div>

        <nav className="mt-3 flex flex-col px-2">
          {items.map(({ icon: Icon, label, to }) => (
            <button
              key={label}
              onClick={to ? () => { onClose(); navigate(to) } : undefined}
              className="flex items-center gap-4 rounded-xl px-3 py-3.5 text-left transition-colors active:bg-white/10"
            >
              <Icon className="h-5 w-5 text-white/60" />
              <span className="text-[15px]">{label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto px-2 pb-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-xl px-3 py-3.5 text-left transition-colors active:bg-white/10"
          >
            <LogOut className="h-5 w-5 text-ecc-gold" />
            <span className="text-[15px]">Sair</span>
          </button>
          <div className="mt-2 flex items-center justify-between px-3 text-[11px] text-white/40">
            <span className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-ecc-gold" />
              Sincronizado em {formatSyncStamp(new Date())}
            </span>
            <span>v{APP_VERSION}</span>
          </div>
        </div>
      </aside>
    </>
  )
}
