import type { ComponentType } from 'react'

interface FabProps {
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  /** 'primary' = ação principal (navy cheio); 'secondary' = apoio (branco). */
  variant?: 'primary' | 'secondary'
}

export function Fab({
  icon: Icon,
  label,
  onClick,
  variant = 'primary',
}: FabProps) {
  const primary = variant === 'primary'
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={
        'flex h-14 w-14 items-center justify-center rounded-full transition-transform active:scale-95 ' +
        (primary
          ? 'bg-ecc-navy text-white shadow-[0_6px_20px_rgba(0,24,109,0.35)] active:bg-ecc-navy-deep'
          : 'border border-ecc-navy/15 bg-white text-ecc-navy shadow-[0_4px_16px_rgba(0,24,109,0.12)] active:bg-ecc-cream-dark')
      }
    >
      <Icon className="h-6 w-6" />
    </button>
  )
}
