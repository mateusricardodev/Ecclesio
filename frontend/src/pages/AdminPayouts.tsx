import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Copy, Check } from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuthStore } from '../store/auth.store'
import api from '../api/axios'
import { formatBRL } from '../lib/money'

interface Payout {
  id: string
  amount: string
  status: 'requested' | 'processing' | 'paid' | 'rejected'
  pixKey: string
  pixKeyType: string
  pixHolderName: string
  pixHolderDocument: string
  notes: string | null
  receiptUrl: string | null
  processedAt: string | null
  createdAt: string
  user: { id: string; name: string; email: string }
}

interface Revenue {
  totalCollected: number
  organizersShare: number
  platformFees: number
  outstandingBalance: number
}

const BADGE: Record<Payout['status'], { label: string; bg: string; color: string }> = {
  requested: { label: 'Solicitado', bg: '#FFFBEB', color: '#92400E' },
  processing: { label: 'Em processamento', bg: '#EFF6FF', color: '#1E40AF' },
  paid: { label: 'Pago', bg: '#F0FDF4', color: '#166534' },
  rejected: { label: 'Recusado', bg: '#FEF2F2', color: '#991B1B' },
}

const KEY_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', phone: 'Celular', random: 'Aleatória',
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E9E9E9',
} as const

export function AdminPayouts() {
  const { user } = useAuthStore()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [revenue, setRevenue] = useState<Revenue | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      api.get<Payout[]>('/admin/payouts'),
      api.get<Revenue>('/admin/revenue'),
    ])
    setPayouts(p.data)
    setRevenue(r.data)
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') return
    let active = true
    async function init() {
      try {
        await load()
      } finally {
        if (active) setLoading(false)
      }
    }
    void init()
    return () => {
      active = false
    }
  }, [load, user?.role])

  // O backend também bloqueia; aqui é só para não mostrar uma tela vazia.
  if (user && user.role !== 'admin') return <Navigate to="/dashboard" replace />

  async function update(id: string, status: Payout['status'], notes?: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.patch(`/admin/payouts/${id}`, { status, ...(notes ? { notes } : {}) })
      await load()
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message ?? 'Não foi possível atualizar o resgate.')
    } finally {
      setBusyId(null)
    }
  }

  const open = payouts.filter((p) => p.status === 'requested' || p.status === 'processing')
  const closed = payouts.filter((p) => p.status === 'paid' || p.status === 'rejected')

  return (
    <DashboardLayout active="saques">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div>
          <p
            className="ecc-eyebrow mb-1"
            style={{ color: '#00186D' }}
          >
            Plataforma
          </p>
          <h1
            className="leading-tight"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', fontSize: '2.5rem', fontWeight: 400, color: '#0A0A09' }}
          >
            Saques
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
            Envie o PIX pela sua conta e marque como pago aqui. Confira sempre se o titular da chave
            bate com o nome cadastrado.
          </p>
        </div>

        {revenue && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Total arrecadado" value={formatBRL(revenue.totalCollected)} />
            <Stat label="Taxas da plataforma" value={formatBRL(revenue.platformFees)} highlight />
            <Stat label="Parte dos organizadores" value={formatBRL(revenue.organizersShare)} />
            <Stat
              label="Saldo a repassar"
              value={formatBRL(revenue.outstandingBalance)}
              hint="Retido + disponível"
            />
          </div>
        )}

        {error && (
          <p
            className="text-sm rounded-xl px-4 py-3"
            style={{ color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA', fontFamily: 'var(--font-sans)' }}
          >
            {error}
          </p>
        )}

        <Section title={`Na fila (${open.length})`}>
          {loading ? (
            <Empty>Carregando...</Empty>
          ) : open.length === 0 ? (
            <Empty>Nenhum resgate aguardando pagamento.</Empty>
          ) : (
            open.map((payout) => (
              <PayoutRow key={payout.id} payout={payout} busy={busyId === payout.id} onUpdate={update} />
            ))
          )}
        </Section>

        {closed.length > 0 && (
          <Section title="Finalizados">
            {closed.map((payout) => (
              <PayoutRow key={payout.id} payout={payout} busy={false} />
            ))}
          </Section>
        )}
      </div>
    </DashboardLayout>
  )
}

function PayoutRow({
  payout,
  busy,
  onUpdate,
}: {
  payout: Payout
  busy: boolean
  onUpdate?: (id: string, status: Payout['status'], notes?: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const badge = BADGE[payout.status]
  const isOpen = payout.status === 'requested' || payout.status === 'processing'

  function copyKey() {
    void navigator.clipboard.writeText(payout.pixKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div
      className="rounded-xl px-4 py-4 flex flex-col gap-3"
      style={{ background: 'rgba(0,24,109,0.03)', border: '1px solid #E9E9E9' }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-base font-bold" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
            {formatBRL(payout.amount)}
          </p>
          <p className="text-sm mt-0.5" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
            {payout.user.name} <span style={{ color: '#9CA3AF' }}>· {payout.user.email}</span>
          </p>
          <p className="text-xs mt-1" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
            Solicitado em {new Date(payout.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full shrink-0 font-medium"
          style={{ background: badge.bg, color: badge.color, fontFamily: 'var(--font-sans)' }}
        >
          {badge.label}
        </span>
      </div>

      <div
        className="rounded-lg px-3 py-2.5 flex items-start justify-between gap-3"
        style={{ background: '#FFFFFF', border: '1px solid #E9E9E9' }}
      >
        <div className="min-w-0">
          <p className="text-xs" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
            Chave {KEY_TYPE_LABELS[payout.pixKeyType] ?? payout.pixKeyType}
          </p>
          <p className="text-sm font-medium break-all" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
            {payout.pixKey}
          </p>
          <p className="text-xs mt-1" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
            Titular: {payout.pixHolderName} · {payout.pixHolderDocument}
          </p>
        </div>
        <button
          onClick={copyKey}
          className="p-2 rounded-full shrink-0 transition-all"
          style={{ color: copied ? '#166534' : '#00186D', background: 'rgba(0,24,109,0.05)' }}
          title="Copiar chave"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {payout.notes && (
        <p className="text-xs" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
          Observação: {payout.notes}
        </p>
      )}

      {isOpen && onUpdate && (
        <div className="flex gap-2 flex-wrap">
          {payout.status === 'requested' && (
            <ActionButton disabled={busy} onClick={() => onUpdate(payout.id, 'processing')}>
              Assumir
            </ActionButton>
          )}
          <ActionButton primary disabled={busy} onClick={() => onUpdate(payout.id, 'paid')}>
            Marcar como pago
          </ActionButton>
          <ActionButton
            danger
            disabled={busy}
            onClick={() => {
              const reason = window.prompt('Motivo da recusa (o organizador vê esta mensagem):')
              if (reason === null) return
              onUpdate(payout.id, 'rejected', reason || 'Recusado pela plataforma')
            }}
          >
            Recusar
          </ActionButton>
        </div>
      )}
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  primary,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  danger?: boolean
}) {
  const palette = primary
    ? { background: '#00186D', color: '#FFFFFF' }
    : danger
      ? { background: '#FEF2F2', color: '#991B1B' }
      : { background: 'rgba(0,24,109,0.06)', color: '#00186D' }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-sm font-semibold px-4 py-2 rounded-full transition-all"
      style={{ ...palette, fontFamily: 'var(--font-sans)', opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] p-5" style={cardStyle}>
      <h2 className="font-[family-name:var(--font-display)] text-[24px] leading-none mb-4" style={{ color: '#0A0A09' }}>
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
      {children}
    </p>
  )
}

function Stat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string
  value: string
  hint?: string
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-[20px] p-4"
      style={{ ...cardStyle, ...(highlight ? { border: '1px solid rgba(212,177,106,0.5)' } : {}) }}
    >
      <p
        className="text-xs font-medium mb-1"
        style={{ color: highlight ? '#D4B16A' : '#6B7280', fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </p>
      <p style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', fontSize: '1.25rem', fontWeight: 400, color: '#0A0A09' }}>
        {value}
      </p>
      {hint && (
        <p className="text-xs mt-0.5" style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}>{hint}</p>
      )}
    </div>
  )
}
