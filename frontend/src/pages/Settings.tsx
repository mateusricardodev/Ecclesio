import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import api from '../api/axios'
import { useAuthStore } from '../store/auth.store'
import { formatBRL } from '../lib/money'

interface Me {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  hasPassword: boolean
  googleConnected: boolean
}

interface MyRegistration {
  id: string
  status: 'pending' | 'confirmed' | 'canceled' | 'overbooked'
  createdAt: string
  event: { id: string; title: string; date: string; location: string | null }
  ticket: { name: string } | null
  payment: { status: 'pending' | 'paid' | 'failed'; amount: string } | null
}

const PAGE_SIZE = 10

const STATUS_BADGE: Record<MyRegistration['status'], { label: string; bg: string; color: string }> = {
  confirmed: { label: 'Confirmada', bg: '#F0FDF4', color: '#166534' },
  pending: { label: 'Aguardando pagamento', bg: '#FFFBEB', color: '#92400E' },
  canceled: { label: 'Cancelada', bg: '#F5F5F5', color: '#6F6F6F' },
  overbooked: { label: 'Sem vaga · reembolso pendente', bg: '#FEF2F2', color: '#991B1B' },
}

// Mesma regra do cadastro e do ChangePasswordDto no backend.
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{8,}$/

const cardClass = 'rounded-[20px] p-5 sm:p-6 bg-white border border-ecc-line'
const inputClass =
  'w-full rounded-xl border border-ecc-line bg-white px-3.5 py-2.5 text-sm text-ecc-ink placeholder:text-ecc-faint focus:outline-none focus:border-ecc-navy transition-colors'

type Msg = { ok: boolean; text: string } | null

export function Settings() {
  const { token, setAuth } = useAuthStore()
  const [me, setMe] = useState<Me | null>(null)
  const [loadError, setLoadError] = useState('')

  const loadMe = useCallback(async () => {
    const { data } = await api.get<Me>('/auth/me')
    setMe(data)
    return data
  }, [])

  useEffect(() => {
    async function init() {
      try {
        await loadMe()
      } catch {
        setLoadError('Não foi possível carregar os seus dados.')
      }
    }
    void init()
  }, [loadMe])

  // Mantém o nome do topo (vem do store) em dia depois de editar.
  function syncStore(user: Me) {
    if (token) setAuth({ id: user.id, name: user.name, email: user.email, role: user.role }, token)
  }

  return (
    <DashboardLayout active="config">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <p className="ecc-eyebrow mb-1" style={{ color: '#00186D' }}>Conta</p>
          <h1
            className="leading-tight text-ecc-ink"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', fontSize: '2.5rem', fontWeight: 400 }}
          >
            Configurações
          </h1>
          <p className="text-sm mt-1 text-ecc-text">Seus dados de acesso e o histórico das suas inscrições.</p>
        </div>

        {loadError && <Feedback msg={{ ok: false, text: loadError }} />}

        {me && (
          <>
            <ProfileCard me={me} onSaved={(u) => { setMe(u); syncStore(u) }} />
            <PasswordCard me={me} onChanged={() => loadMe().catch(() => {})} />
          </>
        )}

        <RegistrationsCard />
      </div>
    </DashboardLayout>
  )
}

function ProfileCard({ me, onSaved }: { me: Me; onSaved: (user: Me) => void }) {
  const [name, setName] = useState(me.name)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const dirty = name.trim() !== me.name

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!name.trim()) {
      setMsg({ ok: false, text: 'Informe o nome.' })
      return
    }
    setSaving(true)
    try {
      const { data } = await api.patch<Me>('/auth/me', { name: name.trim() })
      setName(data.name)
      onSaved(data)
      setMsg({ ok: true, text: 'Dados salvos.' })
    } catch (err) {
      setMsg({ ok: false, text: apiError(err, 'Não foi possível salvar.') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cardClass}>
      <CardTitle title="Meus dados" />
      <div className="flex flex-col gap-4 mt-5">
        <Field label="Nome">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={120}
            className={inputClass}
          />
        </Field>
        <Field label="E-mail" hint="É o seu login. Para trocar, fale com o suporte.">
          <input value={me.email} readOnly className={`${inputClass} bg-[#F9F9F9] text-ecc-text cursor-not-allowed`} />
        </Field>
        <p className="text-xs text-ecc-faint">
          Conta criada em {new Date(me.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <CardFooter msg={msg}>
        <button type="submit" disabled={saving || !dirty} className="ecc-btn ecc-btn-primary disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </CardFooter>
    </form>
  )
}

function PasswordCard({ me, onChanged }: { me: Me; onChanged: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!PASSWORD_RULE.test(next)) {
      setMsg({ ok: false, text: 'A nova senha precisa de 8 caracteres, uma letra maiúscula e um número.' })
      return
    }
    if (next !== confirm) {
      setMsg({ ok: false, text: 'A confirmação não confere com a nova senha.' })
      return
    }
    setSaving(true)
    try {
      await api.post('/auth/password', {
        currentPassword: me.hasPassword ? current : undefined,
        newPassword: next,
      })
      setCurrent('')
      setNext('')
      setConfirm('')
      setMsg({ ok: true, text: me.hasPassword ? 'Senha alterada.' : 'Senha definida. Agora você também pode entrar com e-mail e senha.' })
      onChanged()
    } catch (err) {
      setMsg({ ok: false, text: apiError(err, 'Não foi possível alterar a senha.') })
    } finally {
      setSaving(false)
    }
  }

  const type = visible ? 'text' : 'password'

  return (
    <form onSubmit={handleSubmit} className={cardClass}>
      <CardTitle title="Senha e acesso" />

      <div className="flex items-center justify-between gap-4 mt-5 rounded-xl border border-ecc-line px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <GoogleMark />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ecc-ink">Conta Google</p>
            <p className="text-xs text-ecc-text truncate">
              {me.googleConnected ? `Conectada · ${me.email}` : 'Não conectada'}
            </p>
          </div>
        </div>
        {me.googleConnected
          ? <CheckCircle2 size={18} className="shrink-0" style={{ color: '#166534' }} aria-label="Conectada" />
          : <span className="text-xs text-ecc-faint text-right">Entre com o Google na tela de login para conectar</span>}
      </div>

      {!me.hasPassword && (
        <p className="text-sm mt-4 text-ecc-text">
          Sua conta foi criada com o Google e ainda não tem senha. Defina uma para poder entrar também com e-mail e senha.
        </p>
      )}

      <div className="flex flex-col gap-4 mt-5">
        {me.hasPassword && (
          <Field label="Senha atual">
            <input type={type} value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" className={inputClass} />
          </Field>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nova senha" hint="8+ caracteres, com maiúscula e número">
            <input type={type} value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" className={inputClass} />
          </Field>
          <Field label="Confirmar nova senha">
            <input type={type} value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className={inputClass} />
          </Field>
        </div>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="self-start inline-flex items-center gap-1.5 text-xs text-ecc-text hover:text-ecc-ink"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          {visible ? 'Ocultar senhas' : 'Mostrar senhas'}
        </button>
      </div>

      <CardFooter msg={msg}>
        <button type="submit" disabled={saving} className="ecc-btn ecc-btn-primary disabled:opacity-50">
          {saving ? 'Salvando...' : me.hasPassword ? 'Alterar senha' : 'Definir senha'}
        </button>
      </CardFooter>
    </form>
  )
}

function RegistrationsCard() {
  const [items, setItems] = useState<MyRegistration[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // `loading` começa true e é religado no clique de "Ver mais", antes de trocar a página.
  useEffect(() => {
    let active = true
    async function fetchPage() {
      try {
        const { data } = await api.get<{ data: MyRegistration[]; total: number }>('/my-registrations', {
          params: { page, limit: PAGE_SIZE },
        })
        if (!active) return
        setItems((prev) => (page === 1 ? data.data : [...prev, ...data.data]))
        setTotal(data.total)
      } catch {
        if (active) setError('Não foi possível carregar as suas inscrições.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void fetchPage()
    return () => { active = false }
  }, [page])

  return (
    <section className={cardClass}>
      <CardTitle title="Minhas inscrições" subtitle="Eventos em que você se inscreveu como participante." />

      {error && <div className="mt-4"><Feedback msg={{ ok: false, text: error }} /></div>}

      {!error && !loading && items.length === 0 && (
        <p className="text-sm text-ecc-text mt-5">Você ainda não se inscreveu em nenhum evento.</p>
      )}

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-ecc-line">
          {items.map((r) => {
            const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending
            return (
              <li key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ecc-ink truncate">{r.event.title}</p>
                  <p className="text-xs text-ecc-faint mt-0.5">
                    {formatDate(r.event.date)}
                    {r.event.location && ` · ${r.event.location}`}
                    {r.ticket && ` · ${r.ticket.name}`}
                    {r.payment && Number(r.payment.amount) > 0 && ` · ${formatBRL(r.payment.amount)}`}
                  </p>
                </div>
                <span
                  className="self-start sm:self-center shrink-0 text-xs font-medium rounded-full px-2.5 py-1"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  {badge.label}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {loading && <p className="text-sm text-ecc-faint mt-4">Carregando...</p>}

      {!loading && items.length < total && (
        <button
          type="button"
          onClick={() => { setLoading(true); setPage((p) => p + 1) }}
          className="ecc-btn ecc-btn-soft mt-3"
        >
          Ver mais
        </button>
      )}
    </section>
  )
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-[24px] leading-none text-ecc-ink">{title}</h2>
      {subtitle && <p className="text-xs mt-1.5 text-ecc-text">{subtitle}</p>}
    </div>
  )
}

function CardFooter({ msg, children }: { msg: Msg; children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 mt-6">
      {msg && <div className="sm:mr-auto"><Feedback msg={msg} /></div>}
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ecc-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ecc-faint">{hint}</span>}
    </label>
  )
}

function Feedback({ msg }: { msg: NonNullable<Msg> }) {
  return (
    <p
      className="text-sm rounded-xl px-3.5 py-2"
      style={msg.ok
        ? { color: '#166534', background: '#F0FDF4', border: '1px solid #BBF7D0' }
        : { color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA' }}
    >
      {msg.text}
    </p>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function apiError(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  if (Array.isArray(message)) return message[0] ?? fallback
  return message ?? fallback
}
