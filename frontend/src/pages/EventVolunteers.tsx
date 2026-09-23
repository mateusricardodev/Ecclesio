import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, UserPlus, Trash2, AlertTriangle, ScanLine } from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import api from '../api/axios'

interface Volunteer {
  id: string
  userId: string
  name: string
  email: string
  /** Conta criada por inscrição pública: a pessoa ainda não tem senha própria. */
  needsActivation: boolean
  createdAt: string
}

interface EventInfo {
  title: string
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E9E9E9',
} as const

const inputStyle = {
  width: '100%',
  borderRadius: '0.75rem',
  border: '1px solid #E9E9E9',
  padding: '0.6rem 0.85rem',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-sans)',
  color: '#0A0A09',
  outline: 'none',
} as const

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function apiError(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message
  if (Array.isArray(message)) return message[0] ?? fallback
  return message ?? fallback
}

export function EventVolunteers() {
  const { id } = useParams<{ id: string }>()

  const [event, setEvent] = useState<EventInfo | null>(null)
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const [ev, vol] = await Promise.all([
      api.get<EventInfo>(`/events/${id}`),
      api.get<Volunteer[]>(`/events/${id}/volunteers`),
    ])
    setEvent(ev.data)
    setVolunteers(vol.data)
  }, [id])

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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    setAdding(true)
    setMessage(null)
    try {
      const { data } = await api.post<Volunteer>(`/events/${id}/volunteers`, { email })
      setEmail('')
      await load()
      setMessage(
        data.needsActivation
          ? {
              ok: true,
              text: `${data.name} foi adicionado, mas ainda não consegue entrar: a conta dessa pessoa foi criada automaticamente numa inscrição e nunca teve senha. Peça para ela abrir o site, ir em "Criar conta" e cadastrar com este mesmo e-mail.`,
            }
          : { ok: true, text: `${data.name} agora pode credenciar neste evento.` },
      )
    } catch (err: unknown) {
      setMessage({ ok: false, text: apiError(err, 'Não foi possível adicionar.') })
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(volunteer: Volunteer) {
    if (!id) return
    if (!window.confirm(`Remover ${volunteer.name} da equipe deste evento?`)) return
    setRemovingId(volunteer.userId)
    setMessage(null)
    try {
      await api.delete(`/events/${id}/volunteers/${volunteer.userId}`)
      await load()
      setMessage({ ok: true, text: `${volunteer.name} foi removido da equipe.` })
    } catch (err: unknown) {
      setMessage({ ok: false, text: apiError(err, 'Não foi possível remover.') })
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <DashboardLayout active="eventos">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        {/* Cabeçalho */}
        <div>
          <Link
            to={`/events/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-3 transition-colors"
            style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}
          >
            <ArrowLeft size={14} />
            Voltar ao evento
          </Link>

          <h1
            className="leading-tight"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', fontSize: '2.5rem', fontWeight: 400, color: '#0A0A09' }}
          >
            Equipe de credenciamento
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
            {event?.title ?? '...'}
          </p>
        </div>

        {/* O que o voluntário pode fazer */}
        <div
          className="rounded-xl px-4 py-3 flex gap-3"
          style={{ background: 'rgba(0,24,109,0.04)', border: '1px solid #E9E9E9' }}
        >
          <ScanLine size={16} className="shrink-0 mt-0.5" style={{ color: '#00186D' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
            Quem está na equipe usa o app de credenciamento <strong>apenas neste evento</strong>:
            conferir a lista, buscar inscrito e ler QR Code. Não vê o financeiro, não edita o evento
            e não alcança seus outros eventos. Assim ninguém precisa do seu login.
          </p>
        </div>

        {/* Adicionar */}
        <div className="rounded-[20px] p-5" style={cardStyle}>
          <h2 className="font-[family-name:var(--font-display)] text-[24px] leading-none mb-1" style={{ color: '#0A0A09' }}>
            Adicionar à equipe
          </h2>
          <p className="text-xs mb-4" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
            A pessoa precisa ter uma conta no site. Se ainda não tiver, peça para criar em
            &ldquo;Criar conta&rdquo; antes.
          </p>

          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@dapessoa.com"
              required
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center justify-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full transition-all shrink-0"
              style={{
                background: '#00186D',
                color: '#FFFFFF',
                fontFamily: 'var(--font-sans)',
                opacity: adding ? 0.5 : 1,
              }}
            >
              <UserPlus size={15} />
              {adding ? 'Adicionando...' : 'Adicionar'}
            </button>
          </form>

          {message && (
            <p
              className="text-sm rounded-xl px-4 py-3 mt-4 leading-relaxed"
              style={{
                color: message.ok ? '#166534' : '#991B1B',
                background: message.ok ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${message.ok ? '#BBF7D0' : '#FECACA'}`,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {message.text}
            </p>
          )}
        </div>

        {/* Lista */}
        <div className="rounded-[20px] p-5" style={cardStyle}>
          <h2 className="font-[family-name:var(--font-display)] text-[24px] leading-none mb-4" style={{ color: '#0A0A09' }}>
            Na equipe {volunteers.length > 0 && `(${volunteers.length})`}
          </h2>

          {loading ? (
            <p className="text-sm" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
              Carregando...
            </p>
          ) : volunteers.length === 0 ? (
            <p className="text-sm" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
              Ninguém na equipe ainda. Só você pode credenciar neste evento.
            </p>
          ) : (
            <div className="flex flex-col divide-y" style={{ borderColor: '#E9E9E9' }}>
              {volunteers.map((volunteer) => (
                <div key={volunteer.id} className="flex items-center gap-3 py-3">
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'rgba(0,24,109,0.07)', color: '#00186D' }}
                  >
                    {initials(volunteer.name) || '?'}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}
                    >
                      {volunteer.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}>
                      {volunteer.email}
                    </p>
                    {volunteer.needsActivation && (
                      <p
                        className="inline-flex items-center gap-1 text-xs mt-1"
                        style={{ color: '#92400E', fontFamily: 'var(--font-sans)' }}
                      >
                        <AlertTriangle size={12} />
                        Precisa criar a conta com este e-mail para conseguir entrar
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemove(volunteer)}
                    disabled={removingId === volunteer.userId}
                    className="p-2 rounded-full transition-all shrink-0"
                    style={{ color: '#EF4444', opacity: removingId === volunteer.userId ? 0.4 : 1 }}
                    title="Remover da equipe"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
