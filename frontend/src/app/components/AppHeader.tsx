import { ArrowLeft, Menu } from 'lucide-react'
import type { ReactNode } from 'react'

interface AppHeaderProps {
  title: ReactNode
  onMenu?: () => void
  onBack?: () => void
  centerTitle?: boolean
  children?: ReactNode
}

export function AppHeader({
  title,
  onMenu,
  onBack,
  centerTitle,
  children,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-ecc-navy text-white pt-[env(safe-area-inset-top)] shadow-[0_2px_12px_rgba(0,24,109,0.20)]">
      <div className="flex items-center gap-3 px-4 h-14">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="-ml-1 rounded-full p-1 active:bg-white/15"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
        )}
        {onMenu && (
          <button
            onClick={onMenu}
            aria-label="Abrir menu"
            className="-ml-1 rounded-full p-1 active:bg-white/15"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <span
          className={
            'truncate text-lg font-semibold ' +
            (centerTitle ? 'flex-1 text-center' : '')
          }
        >
          {title}
        </span>
        {centerTitle && onBack && <span className="w-6" />}
      </div>
      {children}
    </header>
  )
}
