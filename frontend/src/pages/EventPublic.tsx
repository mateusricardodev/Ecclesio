import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, MapPin } from 'lucide-react'
import api, { API_BASE_URL } from '../api/axios'

interface PaymentMethod {
  id: string
  type: string
  value: string
  installments: number
  description: string | null
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F2E8' }}>
        <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>Carregando evento...</p>
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: '#F5F2E8' }}>
        <p className="text-lg font-semibold" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
          Evento não encontrado
        </p>
        <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
          O endereço pode estar incorreto ou o evento não está publicado.
        </p>
      </div>
    )
  }

  const startDate = new Date(event.date)
  const endDate   = event.endDate ? new Date(event.endDate) : null
  const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  const hasPaymentMethods = event.paymentMethods.length > 0

  function handleRegister() {
    navigate(`/evento/${slug}/inscricao`)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F2E8' }}>
      {/* Banner / Hero */}
      <div className="w-full" style={{ maxHeight: '365px', overflow: 'hidden' }}>
        {event.bannerUrl ? (
          <img
            src={`${API_BASE_URL}${event.bannerUrl}`}
            alt={event.title}
            className="w-full object-cover"
            style={{ maxHeight: '365px' }}
          />
        ) : (
          <div
            className="w-full flex flex-col items-center justify-center gap-2 py-10 px-6"
            style={{ background: '#00186D', minHeight: '160px' }}
          >
            <h1
              className="text-center"
              style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.2 }}
            >
              {event.title}
            </h1>
            <div className="flex items-center gap-3">
              <div style={{ height: '1px', width: '48px', background: '#D4B16A' }} />
              <span style={{ color: '#D4B16A', fontSize: '1rem' }}>✦</span>
              <div style={{ height: '1px', width: '48px', background: '#D4B16A' }} />
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="max-w-lg mx-auto px-5 py-4 flex flex-col gap-3">

        {/* Título e ornamento */}
        <div className="flex flex-col items-center gap-2 text-center">
          {event.bannerUrl && (
            <h1
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: '#00186D', lineHeight: 1.2 }}
            >
              {event.title}
            </h1>
          )}
          <div className="flex items-center gap-3">
            <div style={{ height: '1px', width: '40px', background: '#D4B16A' }} />
            <span style={{ color: '#D4B16A', fontSize: '0.875rem' }}>✦</span>
            <div style={{ height: '1px', width: '40px', background: '#D4B16A' }} />
          </div>
        </div>

        {/* Info card */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,24,109,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,24,109,0.08)' }}
            >
              <Calendar size={16} style={{ color: '#00186D' }} />
            </div>
            <p className="text-sm font-semibold capitalize" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
              {formatDate(startDate)}{endDate && ` — ${formatDate(endDate)}`}
            </p>
          </div>
          {event.location && (
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(0,24,109,0.08)' }}
              >
                <MapPin size={16} style={{ color: '#00186D' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>{event.location}</p>
            </div>
          )}
        </div>

        {/* CTA */}
        {hasPaymentMethods ? (
          <button
            onClick={handleRegister}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: '#00186D',
              color:      '#FFFFFF',
              fontFamily: 'var(--font-sans)',
              cursor:     'pointer',
              boxShadow:  '0 4px 14px rgba(0,24,109,0.25)',
            }}
          >
            Inscreva-se agora →
          </button>
        ) : (
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,24,109,0.08)' }}
          >
            <p className="text-sm" style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}>Inscrições em breve</p>
          </div>
        )}

        {/* Sobre */}
        {event.about && (
          <div
            className="rounded-2xl p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,24,109,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}>
              Sobre o evento
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
              {event.about}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
