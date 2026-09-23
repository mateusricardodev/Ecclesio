import { useCallback, useEffect, useState } from 'react'
import { Wallet as WalletIcon, Clock, ArrowDownToLine, CheckCircle2 } from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import api from '../api/axios'
import { formatBRL } from '../lib/money'

interface Summary {
  available: number
  pending: number
  totalEarned: number
  totalPaidOut: number
  minPayout: number
}

interface LedgerEntry {
  id: string
  type: string
  amount: string
  description: string | null
  availableAt: string
  createdAt: string
  event: { id: string; title: string } | null
}

interface PixAccount {
  pixKey: string | null
  pixKeyType: string | null
  pixHolderName: string | null
  pixHolderDocument: string | null
}

interface Payout {
  id: string
  amount: string
  status: 'requested' | 'processing' | 'paid' | 'rejected'
  pixKey: string
  pixKeyType: string
  notes: string | null
  receiptUrl: string | null
  processedAt: string | null
  createdAt: string
}

const ENTRY_LABELS: Record<string, string> = {
  sale: 'Inscrição paga',
  payout: 'Resgate solicitado',
  payout_reversal: 'Resgate estornado',
  refund: 'Reembolso',
  adjustment: 'Ajuste',
}

const PAYOUT_BADGE: Record<Payout['status'], { label: string; bg: string; color: string }> = {
  requested: { label: 'Solicitado', bg: '#FFFBEB', color: '#92400E' },
  processing: { label: 'Em processamento', bg: '#EFF6FF', color: '#1E40AF' },
  paid: { label: 'Pago', bg: '#F0FDF4', color: '#166534' },
  rejected: { label: 'Recusado', bg: '#FEF2F2', color: '#991B1B' },
}

const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Celular' },
  { value: 'random', label: 'Chave aleatória' },
]

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(0,24,109,0.08)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
} as const

const inputStyle = {
  width: '100%',
  borderRadius: '0.75rem',
  border: '1px solid rgba(0,24,109,0.12)',
  padding: '0.6rem 0.85rem',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-sans)',
  color: '#0A0A09',
  outline: 'none',
} as const

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function Wallet() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [account, setAccount] = useState<PixAccount | null>(null)
  const [loading, setLoading] = useState(true)

  const [accountForm, setAccountForm] = useState({
    pixKeyType: 'cpf',
    pixKey: '',
    pixHolderName: '',
    pixHolderDocument: '',
  })
  const [savingAccount, setSavingAccount] = useState(false)
  const [accountMsg, setAccountMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [payoutAmount, setPayoutAmount] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [payoutMsg, setPayoutMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    const [s, e, p, a] = await Promise.all([
      api.get<Summary>('/wallet/summary'),
      api.get<{ items: LedgerEntry[] }>('/wallet/entries'),
      api.get<Payout[]>('/wallet/payouts'),
      api.get<PixAccount>('/wallet/pix-account'),
    ])
    setSummary(s.data)
    setEntries(e.data.items)
    setPayouts(p.data)
    setAccount(a.data)
    if (a.data.pixKey) {
      setAccountForm({
        pixKeyType: a.data.pixKeyType ?? 'cpf',
        pixKey: a.data.pixKey,
        pixHolderName: a.data.pixHolderName ?? '',
        pixHolderDocument: a.data.pixHolderDocument ?? '',
      })
    }
  }, [])

  useEffect(() => {
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
  }, [load])

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault()
    setSavingAccount(true)
    setAccountMsg(null)
    try {
      await api.put('/wallet/pix-account', accountForm)
      await load()
      setAccountMsg({ ok: true, text: 'Chave PIX salva.' })
    } catch (err: unknown) {
      setAccountMsg({ ok: false, text: apiError(err, 'Não foi possível salvar a chave.') })
    } finally {
      setSavingAccount(false)
    }
  }

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault()
    setRequesting(true)
    setPayoutMsg(null)
    try {
      await api.post('/wallet/payouts', { amount: Number(payoutAmount) })
      setPayoutAmount('')
      await load()
      setPayoutMsg({ ok: true, text: 'Resgate solicitado. O PIX é enviado após a conferência.' })
    } catch (err: unknown) {
      setPayoutMsg({ ok: false, text: apiError(err, 'Não foi possível solicitar o resgate.') })
    } finally {
      setRequesting(false)
    }
  }

  const hasAccount = !!account?.pixKey
  const hasOpenPayout = payouts.some((p) => p.status === 'requested' || p.status === 'processing')

  return (
    <DashboardLayout active="financeiro">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.12em] mb-1"
            style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
          >
            Carteira
          </p>
          <h1
            className="leading-tight"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 600, color: '#00186D' }}
          >
            Financeiro
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            As inscrições pagas online entram aqui como saldo. O valor fica retido até alguns dias
            depois do evento e então pode ser resgatado para a sua chave PIX.
          </p>
        </div>

        {/* Saldos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<WalletIcon size={16} />}
            label="Disponível para resgate"
            value={loading ? null : formatBRL(summary?.available)}
            highlight
          />
          <StatCard
            icon={<Clock size={16} />}
            label="A liberar"
            value={loading ? null : formatBRL(summary?.pending)}
            hint="Liberado após o evento"
          />
          <StatCard
            icon={<CheckCircle2 size={16} />}
            label="Total já resgatado"
            value={loading ? null : formatBRL(summary?.totalPaidOut)}
          />
        </div>

        {/* Resgate */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <h2 className="font-semibold text-sm mb-1" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
            Resgatar saldo
          </h2>
          <p className="text-xs mb-4" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            {summary ? `Valor mínimo de ${formatBRL(summary.minPayout)}.` : ''} O PIX é enviado
            manualmente pela equipe após conferir os dados da conta.
          </p>

          {!hasAccount && (
            <p
              className="text-sm rounded-xl px-4 py-3 mb-4"
              style={{ color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', fontFamily: 'var(--font-sans)' }}
            >
              Cadastre a sua chave PIX abaixo antes de solicitar um resgate.
            </p>
          )}

          {hasOpenPayout && (
            <p
              className="text-sm rounded-xl px-4 py-3 mb-4"
              style={{ color: '#1E40AF', background: '#EFF6FF', border: '1px solid #BFDBFE', fontFamily: 'var(--font-sans)' }}
            >
              Você já tem um resgate em andamento. Aguarde a conclusão para pedir outro.
            </p>
          )}

          <form onSubmit={handleRequestPayout} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                Valor do resgate
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}
                >
                  R$
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="0,00"
                  required
                  style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPayoutAmount(String(summary?.available ?? 0))}
              className="text-xs font-medium px-3 py-2.5 rounded-xl transition-all shrink-0"
              style={{ color: '#00186D', background: 'rgba(0,24,109,0.06)', fontFamily: 'var(--font-sans)' }}
            >
              Usar tudo
            </button>
            <button
              type="submit"
              disabled={requesting || !hasAccount || hasOpenPayout}
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shrink-0"
              style={{
                background: '#00186D',
                color: '#FFFFFF',
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 2px 12px rgba(0,24,109,0.20)',
                opacity: requesting || !hasAccount || hasOpenPayout ? 0.5 : 1,
              }}
            >
              <ArrowDownToLine size={15} />
              {requesting ? 'Solicitando...' : 'Solicitar resgate'}
            </button>
          </form>

          {payoutMsg && <Message {...payoutMsg} />}
        </div>

        {/* Chave PIX */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <h2 className="font-semibold text-sm mb-1" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
            Conta de recebimento
          </h2>
          <p className="text-xs mb-4" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            O repasse só é enviado para uma conta no nome do titular cadastrado.
          </p>

          <form onSubmit={handleSaveAccount} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                  Tipo de chave
                </label>
                <select
                  value={accountForm.pixKeyType}
                  onChange={(e) => setAccountForm((f) => ({ ...f, pixKeyType: e.target.value }))}
                  style={inputStyle}
                >
                  {PIX_KEY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                  Chave PIX
                </label>
                <input
                  type="text"
                  value={accountForm.pixKey}
                  onChange={(e) => setAccountForm((f) => ({ ...f, pixKey: e.target.value }))}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                  Nome do titular
                </label>
                <input
                  type="text"
                  value={accountForm.pixHolderName}
                  onChange={(e) => setAccountForm((f) => ({ ...f, pixHolderName: e.target.value }))}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                  CPF ou CNPJ do titular
                </label>
                <input
                  type="text"
                  value={accountForm.pixHolderDocument}
                  onChange={(e) =>
                    setAccountForm((f) => ({ ...f, pixHolderDocument: e.target.value.replace(/\D/g, '') }))
                  }
                  placeholder="Somente números"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingAccount}
                className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
                style={{
                  background: 'rgba(0,24,109,0.06)',
                  color: '#00186D',
                  fontFamily: 'var(--font-sans)',
                  opacity: savingAccount ? 0.5 : 1,
                }}
              >
                {savingAccount ? 'Salvando...' : 'Salvar chave'}
              </button>
            </div>
          </form>

          {accountMsg && <Message {...accountMsg} />}
        </div>

        {/* Extrato */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <h2 className="font-semibold text-sm mb-4" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
            Extrato
          </h2>

          {loading ? (
            <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>Carregando...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              Nenhuma movimentação ainda. Inscrições pagas online aparecem aqui.
            </p>
          ) : (
            <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(0,24,109,0.07)' }}>
              {entries.map((entry) => {
                const amount = Number(entry.amount)
                const isRetained = new Date(entry.availableAt) > new Date()
                return (
                  <div key={entry.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                        {entry.description || ENTRY_LABELS[entry.type] || entry.type}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}>
                        {formatDate(entry.createdAt)}
                        {isRetained && ` · liberado em ${formatDate(entry.availableAt)}`}
                      </p>
                    </div>
                    <span
                      className="text-sm font-semibold shrink-0"
                      style={{
                        color: amount < 0 ? '#991B1B' : isRetained ? '#92400E' : '#166534',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {amount > 0 ? '+' : ''}{formatBRL(amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Histórico de resgates */}
        {payouts.length > 0 && (
          <div className="rounded-2xl p-5" style={cardStyle}>
            <h2 className="font-semibold text-sm mb-4" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
              Resgates
            </h2>
            <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(0,24,109,0.07)' }}>
              {payouts.map((payout) => {
                const badge = PAYOUT_BADGE[payout.status]
                return (
                  <div key={payout.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                        {formatBRL(payout.amount)}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}>
                        {formatDate(payout.createdAt)} · {payout.pixKey}
                      </p>
                      {payout.notes && (
                        <p className="text-xs mt-1" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                          {payout.notes}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full shrink-0 font-medium"
                      style={{ background: badge.bg, color: badge.color, fontFamily: 'var(--font-sans)' }}
                    >
                      {badge.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
  hint?: string
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        ...cardStyle,
        ...(highlight ? { border: '1px solid rgba(212,177,106,0.5)' } : {}),
      }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color: highlight ? '#D4B16A' : '#6B7280' }}>
        {icon}
        <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-sans)' }}>{label}</span>
      </div>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#00186D',
        }}
      >
        {value ?? '-'}
      </p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}>{hint}</p>
      )}
    </div>
  )
}

function Message({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p
      className="text-sm rounded-xl px-4 py-3 mt-4"
      style={{
        color: ok ? '#166534' : '#991B1B',
        background: ok ? '#F0FDF4' : '#FEF2F2',
        border: `1px solid ${ok ? '#BBF7D0' : '#FECACA'}`,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {text}
    </p>
  )
}

/** Extrai a mensagem de erro da API, com fallback legível. */
function apiError(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message
  if (Array.isArray(message)) return message[0] ?? fallback
  return message ?? fallback
}
