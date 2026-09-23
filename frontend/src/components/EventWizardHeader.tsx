import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'

const steps = [
  { label: 'Informações', key: 'info' },
  { label: 'Pagamento',   key: 'payment' },
  { label: 'Formulário',  key: 'form' },
  { label: 'Página',      key: 'page' },
]

interface Props {
  active: 'info' | 'payment' | 'form' | 'page'
  eventId?: string
}

export function EventWizardHeader({ active, eventId }: Props) {
  const activeIndex = steps.findIndex((s) => s.key === active)

  function linkFor(key: string) {
    if (!eventId) return '#'
    if (key === 'info')    return `/events/${eventId}/edit`
    if (key === 'payment') return `/events/${eventId}/setup/payment`
    if (key === 'form')    return `/events/${eventId}/setup/form`
    if (key === 'page')    return `/events/${eventId}/setup/page`
    return '#'
  }

  return (
    <div
      className="mb-8"
      style={{ borderBottom: '1px solid #E9E9E9', paddingBottom: '1.5rem' }}
    >
      {/* Label superior */}
      <p
        className="ecc-eyebrow mb-4"
        style={{ color: '#00186D' }}
      >
        Configuração do evento
      </p>

      {/* Steps */}
      <div className="flex items-center gap-0">
        {steps.map((step, i) => {
          const isActive = step.key === active
          const isDone   = i < activeIndex
          const isLast   = i === steps.length - 1

          return (
            <div key={step.key} className="flex items-center flex-1">
              <Link
                to={eventId ? linkFor(step.key) : '#'}
                className="flex items-center gap-2.5 group"
              >
                {/* Círculo numerado */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                  style={{
                    background: isDone
                      ? '#00186D'
                      : isActive
                      ? '#D4B16A'
                      : 'rgba(0,24,109,0.06)',
                    color: isDone || isActive ? '#FFFFFF' : '#6B7280',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {isDone ? <Check size={13} /> : i + 1}
                </div>

                {/* Label */}
                <span
                  className="text-sm font-medium hidden sm:block"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    color: isActive ? '#00186D' : isDone ? '#33425C' : '#9CA3AF',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {step.label}
                </span>
              </Link>

              {/* Linha conectora */}
              {!isLast && (
                <div
                  className="flex-1 h-px mx-3"
                  style={{ background: isDone ? '#00186D' : 'rgba(0,24,109,0.1)' }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
