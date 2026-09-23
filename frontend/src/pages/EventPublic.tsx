import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api, { API_BASE_URL } from '../api/axios'
import { formatBRL } from '../lib/money'

interface PaymentMethod {
  id: string
  type: string
  value: string
  installments: number
  description: string | null
  totalAmount?: number | string
}

interface EventData {
  id: string
  title: string
  slug: string
  date: string
  endDate: string | null
  location: string | null
  about: string | null
  isPublished: boolean
  category: string | null
  bannerUrl: string | null
  paymentMethods: PaymentMethod[]
  user?: { name: string } | null
}

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  cash: 'Dinheiro',
}

export function EventPublic() {
  const { slug }   = useParams<{ slug: string }>()
  const navigate   = useNavigate()
  const [event, setEvent]           = useState<EventData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)

  useEffect(() => {
    if (!slug) return
    api.get(`/public/events/${slug}`)
      .then(({ data }) => setEvent(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="ecc-paragraph">Carregando evento...</p>
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-white px-4 text-center">
        <p className="ecc-eyebrow">Página não encontrada</p>
        <h1 className="ecc-display text-[44px] sm:text-[60px]">Evento não encontrado</h1>
        <p className="ecc-paragraph max-w-md">O endereço pode estar incorreto ou o evento ainda não foi publicado.</p>
      </div>
    )
  }

  const startDate = new Date(event.date)
  const endDate   = event.endDate ? new Date(event.endDate) : null
  const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const dateLabel = `${formatDate(startDate)}${endDate ? ` a ${formatDate(endDate)}` : ''}`

  const hasPaymentMethods = event.paymentMethods.length > 0
  const eyebrow = [event.category, event.user?.name].filter(Boolean).join(' · ')

  function handleRegister() {
    navigate(`/evento/${slug}/inscricao`)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-10">
        {/* Navegação */}
        <nav className="h-[78px] sm:h-[92px] flex items-center justify-between gap-4">
          <p className="ecc-eyebrow truncate" style={{ color: '#6F6F6F' }}>{event.user?.name ?? 'Inscrições'}</p>
          {hasPaymentMethods && (
            <button onClick={handleRegister} className="ecc-btn ecc-btn-primary shrink-0">Inscrever-se</button>
          )}
        </nav>

        {/* Cabeçalho */}
        <header className="pt-8 sm:pt-14 pb-14 sm:pb-20 flex flex-col gap-8">
          {eyebrow && <p className="ecc-eyebrow">{eyebrow}</p>}
          <h1 className="ecc-display text-[52px] sm:text-[88px] lg:text-[120px] max-w-[1200px]">{event.title}</h1>
        </header>

        {event.bannerUrl && (
          <div className="rounded-[30px] overflow-hidden mb-16 sm:mb-24 bg-ecc-cream">
            <img
              src={`${API_BASE_URL}${event.bannerUrl}`}
              alt={event.title}
              className="w-full max-h-[620px] object-cover"
            />
          </div>
        )}

        {/* Conteúdo */}
        <main className="grid lg:grid-cols-[1fr_420px] gap-10 lg:gap-20 pb-24">
          <section className="border-t border-ecc-line pt-10 flex flex-col gap-10 min-w-0">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="flex flex-col gap-3">
                <p className="ecc-eyebrow" style={{ color: '#6F6F6F' }}>Data</p>
                <p className="font-[family-name:var(--font-display)] text-[26px] leading-tight first-letter:uppercase">{dateLabel}</p>
              </div>
              {event.location && (
                <div className="flex flex-col gap-3">
                  <p className="ecc-eyebrow" style={{ color: '#6F6F6F' }}>Local</p>
                  <p className="font-[family-name:var(--font-display)] text-[26px] leading-tight">{event.location}</p>
                </div>
              )}
            </div>

            {event.about && (
              <div className="border-t border-ecc-line pt-10 flex flex-col gap-5">
                <p className="ecc-eyebrow">Sobre o evento</p>
                <p className="text-[17px] leading-[1.6] text-ecc-ink whitespace-pre-line max-w-2xl">{event.about}</p>
              </div>
            )}
          </section>

          {/* Inscrição */}
          <aside className="lg:sticky lg:top-8 self-start w-full">
            <div className="rounded-[20px] border border-ecc-line p-6 sm:p-7 flex flex-col gap-6">
              <p className="font-[family-name:var(--font-display)] text-[28px] leading-none">Inscrição</p>
              {hasPaymentMethods ? (
                <>
                  <ul className="flex flex-col border-t border-ecc-line">
                    {event.paymentMethods.map((m) => (
                      <li key={m.id} className="flex items-start justify-between gap-4 py-4 border-b border-ecc-line">
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-ecc-ink">{METHOD_LABELS[m.type] ?? m.type}</p>
                          {m.description && <p className="text-sm text-ecc-text mt-0.5">{m.description}</p>}
                        </div>
                        <p className="text-[15px] font-bold text-ecc-ink shrink-0">
                          {Number(m.totalAmount ?? m.value) > 0 ? formatBRL(Number(m.totalAmount ?? m.value)) : 'Gratuito'}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <button onClick={handleRegister} className="ecc-btn ecc-btn-primary w-full">Inscrever-se</button>
                </>
              ) : (
                <p className="ecc-paragraph">As inscrições ainda não foram abertas.</p>
              )}
            </div>
          </aside>
        </main>

        <footer className="border-t border-ecc-line py-6 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="ecc-eyebrow" style={{ color: '#6F6F6F' }}>Inscrições por</span>
            <img src="/logo-horizontal.png" alt="Ecclesio" className="h-6 object-contain" />
          </Link>
          <Link to="/privacidade" className="ecc-eyebrow" style={{ color: '#6F6F6F' }}>Privacidade</Link>
        </footer>
      </div>
    </div>
  )
}
