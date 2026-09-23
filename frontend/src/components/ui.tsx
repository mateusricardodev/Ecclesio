/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Cabeçalho de página do painel: sobretítulo mono, título em serifa e ações. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
      <div className="flex flex-col gap-4 min-w-0">
        {eyebrow && <p className="ecc-eyebrow">{eyebrow}</p>}
        <h1 className="ecc-display text-[40px] sm:text-[52px]">{title}</h1>
        {subtitle && <p className="ecc-paragraph max-w-xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

/** Bloco branco com linha fina, raio de 20px e sem sombra. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] bg-white border border-ecc-line p-6 sm:p-7 ${className}`}>
      {children}
    </div>
  )
}

export function PanelTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-5">
      <h2 className="font-[family-name:var(--font-display)] text-[24px] leading-none text-ecc-ink">{children}</h2>
      {action}
    </div>
  )
}

/** Número em destaque, no estilo "Display Statistics" do design. */
export function Stat({ label, value, onClick }: { label: string; value: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <p className="ecc-eyebrow" style={{ color: '#6F6F6F' }}>{label}</p>
      <p className="text-[36px] sm:text-[44px] leading-none text-ecc-ink mt-6" style={{ letterSpacing: '-0.04em' }}>
        {value}
      </p>
    </>
  )
  const cls = 'text-left border-t border-ecc-line pt-5 pb-2 pr-4'
  return onClick
    ? <button onClick={onClick} className={`${cls} hover:border-ecc-navy transition-colors`}>{body}</button>
    : <div className={cls}>{body}</div>
}

export function EmptyNote({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center py-10 gap-3 text-center">
      <Icon size={20} strokeWidth={1.5} className="text-ecc-faint" />
      <p className="ecc-paragraph">{text}</p>
    </div>
  )
}

export const STATUS_STYLES = {
  confirmed: { label: 'Confirmada', className: 'bg-[#F0FDF4] text-ecc-green' },
  pending: { label: 'Pendente', className: 'bg-[#FFFBEB] text-ecc-amber' },
  canceled: { label: 'Cancelada', className: 'bg-ecc-red-soft text-ecc-red' },
  overbooked: { label: 'Sem vaga', className: 'bg-ecc-red-soft text-ecc-red' },
} as const

export function StatusPill({ status }: { status: keyof typeof STATUS_STYLES }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${s.className}`}>
      {s.label}
    </span>
  )
}
