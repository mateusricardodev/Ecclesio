import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Copy, Check, Mail, Plus, Trash2, Star, MessageSquare, Users,
} from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import { Toggle } from '../components/WizardShared'
import api from '../api/axios'

interface Rating {
  item: string
  score: number | null
  comment: string | null
}

interface Response {
  id: string
  createdAt: string
  name: string | null
  identified: boolean
  ratings: Rating[]
  improvements: string | null
  negatives: string | null
}

interface ItemSummary {
  item: string
  answers: number
  average: number | null
  distribution: number[]
  comments: { name: string | null; score: number | null; comment: string }[]
  active: boolean
}

interface Results {
  total: number
  overall: number | null
  items: string[]
  open: boolean
  summary: ItemSummary[]
  responses: Response[]
}

const CARD: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid rgba(0,24,109,0.08)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
}

const FIELD: React.CSSProperties = {
  width: '100%',
  background: '#FAFAFA',
  border: '1px solid rgba(0,24,109,0.15)',
  borderRadius: '10px',
  color: '#0A0A09',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.875rem',
  padding: '0.5rem 0.75rem',
  outline: 'none',
}

/** Verde a partir de 8, âmbar de 6 a 8, vermelho abaixo disso. */
function scoreColor(score: number | null): string {
  if (score === null) return '#9CA3AF'
  if (score >= 8) return '#166534'
  if (score >= 6) return '#92400E'
  return '#991B1B'
}

function formatAverage(value: number | null): string {
  return value === null ? '—' : value.toFixed(1).replace('.', ',')
}

export function EventFeedback() {
  const { id } = useParams<{ id: string }>()

  const [eventTitle, setEventTitle] = useState('')
  const [results, setResults]       = useState<Results | null>(null)
  const [publicUrl, setPublicUrl]   = useState<string | null>(null)
  const [open, setOpen]             = useState(false)
  const [items, setItems]           = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'resultados' | 'configuracao'>('resultados')

  const [savingItems, setSavingItems]   = useState(false)
  const [togglingOpen, setTogglingOpen] = useState(false)
  const [configError, setConfigError]   = useState('')
  const [copied, setCopied]             = useState(false)
  const [inviteModal, setInviteModal]   = useState(false)
  const [inviting, setInviting]         = useState(false)
  const [inviteError, setInviteError]   = useState('')
  const [toast, setToast]               = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.get(`/events/${id}`),
      api.get<Results>(`/events/${id}/feedback`),
      api.get<{ publicUrl: string | null }>(`/events/${id}/feedback/config`),
    ])
      .then(([evtRes, resultsRes, configRes]) => {
        setEventTitle(evtRes.data.title)
        setResults(resultsRes.data)
        setItems(resultsRes.data.items)
        setOpen(resultsRes.data.open)
        setPublicUrl(configRes.data.publicUrl)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  function errorMessage(err: unknown, fallback: string): string {
    return (
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
    )
  }

  async function handleToggleOpen() {
    if (!id) return
    const next = !open
    setTogglingOpen(true)
    setConfigError('')
    try {
      await api.put(`/events/${id}/feedback/config`, { open: next })
      setOpen(next)
      setToast(next ? 'Pesquisa aberta para respostas.' : 'Pesquisa fechada.')
    } catch (err) {
      setConfigError(errorMessage(err, 'Não foi possível alterar o status da pesquisa.'))
    } finally {
      setTogglingOpen(false)
    }
  }

  async function handleSaveItems() {
    if (!id) return
    const cleaned = items.map((i) => i.trim()).filter((i) => i !== '')
    if (cleaned.length === 0) {
      setConfigError('Informe pelo menos um item para avaliar.')
      return
    }
    setSavingItems(true)
    setConfigError('')
    try {
      const { data } = await api.put(`/events/${id}/feedback/config`, { items: cleaned })
      setItems(data.items)
      setToast('Itens da avaliação salvos.')
    } catch (err) {
      setConfigError(errorMessage(err, 'Não foi possível salvar os itens.'))
    } finally {
      setSavingItems(false)
    }
  }

  async function handleInvite() {
    if (!id) return
    setInviting(true)
    setInviteError('')
    try {
      const { data } = await api.post(`/events/${id}/feedback/invite`)
      setInviteModal(false)
      setToast(
        data.total === 0
          ? 'Todos os inscritos confirmados já responderam — nenhum e-mail enviado.'
          : `Convite enviado para ${data.sent} de ${data.total} participante(s).` +
              (data.failed > 0 ? ` ${data.failed} falhou(aram).` : ''),
      )
    } catch (err) {
      setInviteError(errorMessage(err, 'Não foi possível enviar os convites.'))
    } finally {
      setInviting(false)
    }
  }

  async function handleCopy() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setToast('Não foi possível copiar. Selecione o endereço manualmente.')
    }
  }

  const openAnswers = (results?.responses ?? []).filter((r) => r.improvements || r.negatives)

  return (
    <DashboardLayout active="eventos">

      {/* ── Cabeçalho ── */}
      <div className="mb-7">
        <Link
          to={`/events/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-3 transition-colors"
          style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}
        >
          <ArrowLeft size={14} />
          Voltar ao evento
        </Link>
        <p
          className="text-xs font-semibold uppercase tracking-[0.12em] mb-1"
          style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
        >
          Pesquisa pós-evento
        </p>
        <h1
          className="leading-tight"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 600, color: '#00186D' }}
        >
          Avaliação — {eventTitle || '...'}
        </h1>
      </div>

      {/* ── Status e envio ── */}
      <div className="rounded-2xl p-5 mb-6 flex flex-col gap-4" style={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
              Receber respostas
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              {open
                ? 'A pesquisa está aberta — quem tiver o link consegue responder.'
                : 'A pesquisa está fechada. Ative para liberar o formulário.'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs" style={{ color: open ? '#00186D' : '#9CA3AF', fontFamily: 'var(--font-sans)' }}>
              {togglingOpen ? 'Salvando...' : open ? 'Aberta' : 'Fechada'}
            </span>
            <Toggle enabled={open} onToggle={() => { if (!togglingOpen) void handleToggleOpen() }} />
          </div>
        </div>

        {publicUrl ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input readOnly value={publicUrl} style={{ ...FIELD, background: '#F5F2E8' }} />
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
                style={{ border: '1.5px solid rgba(0,24,109,0.25)', color: '#00186D', fontFamily: 'var(--font-sans)' }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
              <button
                onClick={() => { setInviteError(''); setInviteModal(true) }}
                disabled={!open}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
                style={{
                  background: '#00186D',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-sans)',
                  opacity: open ? 1 : 0.5,
                  cursor: open ? 'pointer' : 'not-allowed',
                  boxShadow: '0 2px 8px rgba(0,24,109,0.18)',
                }}
                title={open ? 'Enviar por e-mail aos inscritos confirmados' : 'Abra a pesquisa para enviar'}
              >
                <Mail size={13} />
                Enviar por e-mail
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs" style={{ color: '#92400E', fontFamily: 'var(--font-sans)' }}>
            Este evento ainda não tem uma URL pública. Defina o endereço do evento na edição para
            gerar o link da avaliação.
          </p>
        )}

        {configError && (
          <p className="text-xs" style={{ color: '#DC2626', fontFamily: 'var(--font-sans)' }}>
            {configError}
          </p>
        )}
      </div>

      {/* ── Abas ── */}
      <div className="flex gap-1 mb-5">
        {([['resultados', 'Resultados'], ['configuracao', 'Itens avaliados']] as const).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="text-xs font-semibold px-4 py-2 rounded-xl transition-all"
              style={{
                background: tab === key ? '#00186D' : 'transparent',
                color: tab === key ? '#FFFFFF' : '#6B7280',
                border: tab === key ? 'none' : '1.5px solid rgba(0,24,109,0.15)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <p className="text-center py-14 text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
          Carregando...
        </p>
      ) : tab === 'configuracao' ? (
        /* ── Configuração dos itens ── */
        <div className="rounded-2xl p-5 flex flex-col gap-3 max-w-2xl" style={CARD}>
          <p className="text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            Cada item vira uma nota de 0 a 10 no formulário, com espaço para comentário. As duas
            perguntas finais (o que melhorar e ponto negativo) são fixas.
          </p>

          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={item}
                onChange={(e) =>
                  setItems((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))
                }
                maxLength={120}
                style={FIELD}
              />
              <button
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                className="p-2 rounded-lg shrink-0 transition-all"
                style={{ color: '#DC2626' }}
                title="Remover item"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <button
              onClick={() => setItems((prev) => [...prev, ''])}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
              style={{ border: '1.5px solid rgba(0,24,109,0.25)', color: '#00186D', fontFamily: 'var(--font-sans)' }}
            >
              <Plus size={13} />
              Adicionar item
            </button>
            <button
              onClick={handleSaveItems}
              disabled={savingItems}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
              style={{
                background: '#00186D',
                color: '#FFFFFF',
                fontFamily: 'var(--font-sans)',
                opacity: savingItems ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(0,24,109,0.18)',
              }}
            >
              {savingItems ? 'Salvando...' : 'Salvar itens'}
            </button>
          </div>
        </div>
      ) : (
        /* ── Resultados ── */
        <div className="flex flex-col gap-6">
          {/* Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Respostas', value: String(results?.total ?? 0), icon: Users, accent: '#00186D' },
              { label: 'Média geral', value: formatAverage(results?.overall ?? null), icon: Star, accent: scoreColor(results?.overall ?? null) },
              { label: 'Comentários', value: String((results?.summary ?? []).reduce((sum, s) => sum + s.comments.length, 0) + openAnswers.length), icon: MessageSquare, accent: '#D4B16A' },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl p-5" style={CARD}>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${c.accent}12` }}
                >
                  <c.icon size={15} style={{ color: c.accent }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                  {c.value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                  {c.label}
                </p>
              </div>
            ))}
          </div>

          {results && results.total === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={CARD}>
              <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                Nenhuma resposta ainda. Abra a pesquisa e envie o link aos participantes.
              </p>
            </div>
          ) : (
            <>
              {/* Notas por item */}
              <div className="rounded-2xl overflow-hidden" style={CARD}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}>
                  <h2 className="font-semibold text-sm" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
                    Notas por item
                  </h2>
                </div>
                <ul>
                  {(results?.summary ?? []).map((s) => (
                    <li key={s.item} className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,24,109,0.05)' }}>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-sm font-semibold" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                          {s.item}
                          {!s.active && (
                            <span className="text-[10px] ml-2 font-normal" style={{ color: '#9CA3AF' }}>
                              (item removido da lista)
                            </span>
                          )}
                        </p>
                        <div className="flex items-baseline gap-2 shrink-0">
                          <span
                            className="text-lg font-bold"
                            style={{ color: scoreColor(s.average), fontFamily: 'var(--font-sans)' }}
                          >
                            {formatAverage(s.average)}
                          </span>
                          <span className="text-[11px]" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                            {s.answers} nota(s)
                          </span>
                        </div>
                      </div>

                      {/* Barra da média */}
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,24,109,0.07)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${((s.average ?? 0) / 10) * 100}%`,
                            background: scoreColor(s.average),
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>

                      {s.comments.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-2">
                          {s.comments.map((c, i) => (
                            <li
                              key={i}
                              className="rounded-xl px-3.5 py-2.5"
                              style={{ background: 'rgba(0,24,109,0.03)' }}
                            >
                              <p className="text-[11px] mb-0.5" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                                {c.name ?? 'Anônimo'}
                                {c.score !== null && ` · nota ${c.score}`}
                              </p>
                              <p className="text-sm whitespace-pre-line" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                                {c.comment}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Respostas abertas */}
              {openAnswers.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={CARD}>
                  <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}>
                    <h2 className="font-semibold text-sm" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
                      Melhorias e pontos negativos
                    </h2>
                  </div>
                  <ul>
                    {openAnswers.map((r) => (
                      <li key={r.id} className="px-5 py-4 flex flex-col gap-3" style={{ borderBottom: '1px solid rgba(0,24,109,0.05)' }}>
                        <p className="text-[11px]" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                          {r.name ?? 'Anônimo'} ·{' '}
                          {new Date(r.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                        {r.improvements && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}>
                              O que melhorar
                            </p>
                            <p className="text-sm whitespace-pre-line" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                              {r.improvements}
                            </p>
                          </div>
                        )}
                        {r.negatives && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: '#991B1B', fontFamily: 'var(--font-sans)' }}>
                              Ponto negativo
                            </p>
                            <p className="text-sm whitespace-pre-line" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                              {r.negatives}
                            </p>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modal de envio ── */}
      {inviteModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
        >
          <div className="w-full max-w-sm rounded-2xl p-7" style={{ background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#00186D' }}>
              Enviar avaliação
            </h3>
            <p className="text-sm mb-2" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              Cada inscrito confirmado que ainda não respondeu recebe um e-mail com o link
              individual da pesquisa. Quem já respondeu não recebe de novo — dá para reenviar
              quantas vezes precisar.
            </p>
            {inviteError && (
              <p className="text-sm mb-2" style={{ color: '#DC2626', fontFamily: 'var(--font-sans)' }}>
                {inviteError}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setInviteModal(false)}
                className="px-4 py-2 text-sm rounded-xl"
                style={{ border: '1px solid rgba(0,24,109,0.15)', color: '#33425C', fontFamily: 'var(--font-sans)' }}
              >
                Voltar
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="px-4 py-2 text-sm font-semibold rounded-xl"
                style={{ background: '#00186D', color: '#FFFFFF', fontFamily: 'var(--font-sans)', opacity: inviting ? 0.7 : 1 }}
              >
                {inviting ? 'Enviando...' : 'Enviar agora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-xs rounded-xl px-4 py-3 text-sm"
          style={{ background: '#00186D', color: '#FFFFFF', boxShadow: '0 12px 32px rgba(0,0,0,0.18)', fontFamily: 'var(--font-sans)' }}
        >
          {toast}
        </div>
      )}
    </DashboardLayout>
  )
}
