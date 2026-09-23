import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import api, { API_BASE_URL } from '../api/axios'

interface FeedbackForm {
  eventTitle: string
  eventDate: string
  bannerUrl: string | null
  items: string[]
  participantName: string | null
  alreadyAnswered: boolean
}

/** Estado de um item: nota ('' = não respondido, 'skip' = não sei avaliar) + comentário. */
interface ItemAnswer {
  score: string
  comment: string
}

const SCORES = Array.from({ length: 11 }, (_, i) => i)

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
  padding: '0.625rem 0.75rem',
  outline: 'none',
}

export function PublicFeedback() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const registrationId = searchParams.get('r') ?? undefined

  const [form, setForm]       = useState<FeedbackForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({})
  const [name, setName]         = useState('')
  const [improvements, setImprovements] = useState('')
  const [negatives, setNegatives]       = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!slug) return
    api
      .get<FeedbackForm>(`/public/events/${slug}/feedback`, {
        params: registrationId ? { r: registrationId } : undefined,
      })
      .then(({ data }) => {
        setForm(data)
        setAnswers(
          Object.fromEntries(data.items.map((item) => [item, { score: '', comment: '' }])),
        )
      })
      .catch((err) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Não foi possível carregar a avaliação.',
        )
      })
      .finally(() => setLoading(false))
  }, [slug, registrationId])

  function setAnswer(item: string, patch: Partial<ItemAnswer>) {
    setAnswers((prev) => ({ ...prev, [item]: { ...prev[item], ...patch } }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form || !slug) return

    const ratings = form.items
      .map((item) => {
        const answer = answers[item] ?? { score: '', comment: '' }
        const hasScore = answer.score !== '' && answer.score !== 'skip'
        return {
          item,
          ...(hasScore ? { score: Number(answer.score) } : {}),
          ...(answer.comment.trim() ? { comment: answer.comment.trim() } : {}),
        }
      })
      // Item sem nota e sem comentário não precisa viajar
      .filter((r) => 'score' in r || 'comment' in r)

    if (ratings.length === 0 && !improvements.trim() && !negatives.trim()) {
      setSubmitError('Responda pelo menos um item antes de enviar.')
      return
    }

    setSending(true)
    setSubmitError('')
    try {
      await api.post(`/public/events/${slug}/feedback`, {
        ...(registrationId ? { registrationId } : {}),
        ...(!form.participantName && name.trim() ? { respondentName: name.trim() } : {}),
        ratings,
        ...(improvements.trim() ? { improvements: improvements.trim() } : {}),
        ...(negatives.trim() ? { negatives: negatives.trim() } : {}),
      })
      setSent(true)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setSubmitError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Não foi possível enviar sua avaliação. Tente novamente.',
      )
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F2E8' }}>
        <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
          Carregando avaliação...
        </p>
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: '#F5F2E8' }}>
        <p className="text-lg font-semibold" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
          Avaliação indisponível
        </p>
        <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
          {error || 'O endereço pode estar incorreto ou a pesquisa foi encerrada.'}
        </p>
      </div>
    )
  }

  if (sent || form.alreadyAnswered) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: '#F5F2E8' }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,24,109,0.08)' }}
        >
          <CheckCircle2 size={30} style={{ color: '#00186D' }} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: '#00186D' }}>
          {sent ? 'Obrigado pela sua avaliação!' : 'Você já respondeu'}
        </h1>
        <p className="text-sm max-w-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
          {sent
            ? 'Sua resposta foi registrada e vai ajudar a organização a preparar o próximo encontro.'
            : 'A sua resposta para este evento já está registrada. Obrigado!'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F2E8' }}>
      {/* Banner / cabeçalho */}
      <div className="w-full" style={{ maxHeight: '260px', overflow: 'hidden' }}>
        {form.bannerUrl ? (
          <img
            src={`${API_BASE_URL}${form.bannerUrl}`}
            alt={form.eventTitle}
            className="w-full object-cover"
            style={{ maxHeight: '260px' }}
          />
        ) : (
          <div
            className="w-full flex flex-col items-center justify-center gap-2 py-9 px-6"
            style={{ background: '#00186D', minHeight: '150px' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
            >
              Avaliação do evento
            </p>
            <h1
              className="text-center"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.2 }}
            >
              {form.eventTitle}
            </h1>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-5 py-5 flex flex-col gap-3 pb-16">

        {/* Intro */}
        <div className="rounded-2xl p-5" style={CARD}>
          {form.bannerUrl && (
            <>
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em] mb-1"
                style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
              >
                Avaliação do evento
              </p>
              <h1
                className="mb-2"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 600, color: '#00186D', lineHeight: 1.2 }}
              >
                {form.eventTitle}
              </h1>
            </>
          )}
          <p className="text-sm leading-relaxed" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
            {form.participantName ? `Olá, ${form.participantName}! ` : ''}
            Dê uma nota de <strong>0 a 10</strong> para cada parte do evento e comente o que quiser.
            Leva poucos minutos e ajuda muito na preparação do próximo.
          </p>
        </div>

        {/* Itens avaliados */}
        {form.items.map((item) => {
          const answer = answers[item] ?? { score: '', comment: '' }
          return (
            <div key={item} className="rounded-2xl p-5 flex flex-col gap-3" style={CARD}>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor={`score-${item}`}
                  className="text-sm font-semibold"
                  style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}
                >
                  {item}
                </label>
                {answer.score !== '' && answer.score !== 'skip' && (
                  <span
                    className="text-sm font-bold px-2.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(0,24,109,0.07)', color: '#00186D', fontFamily: 'var(--font-sans)' }}
                  >
                    {answer.score}/10
                  </span>
                )}
              </div>

              <select
                id={`score-${item}`}
                value={answer.score}
                onChange={(e) => setAnswer(item, { score: e.target.value })}
                style={{ ...FIELD, cursor: 'pointer' }}
              >
                <option value="">Selecione uma nota</option>
                {SCORES.map((s) => (
                  <option key={s} value={String(s)}>{s}</option>
                ))}
                <option value="skip">Não participei / não sei avaliar</option>
              </select>

              <textarea
                rows={2}
                value={answer.comment}
                onChange={(e) => setAnswer(item, { comment: e.target.value })}
                maxLength={2000}
                placeholder="Quer dizer algo sobre isso? (opcional)"
                style={{ ...FIELD, resize: 'none' }}
              />
            </div>
          )
        })}

        {/* Perguntas abertas */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={CARD}>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="improvements"
              className="text-sm font-semibold"
              style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}
            >
              O que podemos melhorar para o próximo retiro?
            </label>
            <textarea
              id="improvements"
              rows={4}
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              maxLength={4000}
              placeholder="Sugestões, ideias, o que faria diferença..."
              style={{ ...FIELD, resize: 'none' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="negatives"
              className="text-sm font-semibold"
              style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}
            >
              Ponto negativo
            </label>
            <textarea
              id="negatives"
              rows={4}
              value={negatives}
              onChange={(e) => setNegatives(e.target.value)}
              maxLength={4000}
              placeholder="O que não funcionou bem?"
              style={{ ...FIELD, resize: 'none' }}
            />
          </div>

          {/* Só no link genérico; pelo link do e-mail já sabemos quem respondeu */}
          {!form.participantName && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="name"
                className="text-sm font-semibold"
                style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}
              >
                Seu nome <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                placeholder="Deixe em branco para responder anonimamente"
                style={FIELD}
              />
            </div>
          )}
        </div>

        {submitError && (
          <p className="text-sm px-1" style={{ color: '#DC2626', fontFamily: 'var(--font-sans)' }}>
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: '#00186D',
            color: '#FFFFFF',
            fontFamily: 'var(--font-sans)',
            cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending ? 0.7 : 1,
            boxShadow: '0 4px 14px rgba(0,24,109,0.25)',
          }}
        >
          {sending ? 'Enviando...' : 'Enviar avaliação'}
        </button>
      </form>
    </div>
  )
}
