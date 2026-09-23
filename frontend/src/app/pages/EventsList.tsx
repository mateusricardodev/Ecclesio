import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ChevronRight, Search, Users } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { AppDrawer } from '../components/AppDrawer'
import { useAppUser } from '../useAppUser'
import { fetchMyEvents, type CheckinEvent } from '../api'
import { formatPeriod } from '../format'

type Tab = 'ongoing' | 'ended'

export function EventsList() {
  useAppUser()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('ongoing')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [events, setEvents] = useState<CheckinEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchMyEvents()
      .then((data) => active && setEvents(data))
      .catch(() => active && setError('Não foi possível carregar os eventos.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const ongoing = events.filter((e) => e.status === 'ongoing')
  const ended = events.filter((e) => e.status === 'ended')
  const list = tab === 'ongoing' ? ongoing : ended
  const organization = events[0]?.organization ?? 'Credenciamento'

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-white text-ecc-ink">
      <AppHeader title={organization} onMenu={() => setDrawerOpen(true)}>
        <div className="flex">
          <TabButton
            label="Em andamento"
            active={tab === 'ongoing'}
            onClick={() => setTab('ongoing')}
          />
          <TabButton
            label="Encerrados"
            active={tab === 'ended'}
            onClick={() => setTab('ended')}
          />
        </div>
      </AppHeader>

      <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        {loading && (
          <div className="mt-6 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <StateMessage>
            <span className="text-ecc-red">{error}</span>
          </StateMessage>
        )}

        {!loading && !error && (
          <>
            <div className="pt-6">
              <p className="ecc-eyebrow">
                Credenciamento
              </p>
              <h2 className="mt-3 font-display text-[2.25rem] leading-none tracking-[-0.02em] text-ecc-ink">
                Seus eventos
              </h2>
              <p className="mt-1 text-sm text-ecc-muted">
                {tab === 'ongoing'
                  ? 'Escolha um evento para credenciar participantes.'
                  : 'Consulte o histórico dos seus eventos.'}
              </p>
            </div>

            {list.length === 0 ? (
              <EmptyState tab={tab} onSeeEnded={() => setTab('ended')} />
            ) : (
              <ul className="mt-5 flex flex-col gap-3">
                {list.map((ev) => (
                  <li key={ev.id}>
                    <EventCard
                      event={ev}
                      muted={tab === 'ended'}
                      onClick={() => navigate(`/app/evento/${ev.id}`)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

function EventCard({
  event: ev,
  muted,
  onClick,
}: {
  event: CheckinEvent
  muted?: boolean
  onClick: () => void
}) {
  const pct = ev.total > 0 ? Math.round((ev.credentialed / ev.total) * 100) : 0

  return (
    <button
      onClick={onClick}
      className={
        'block w-full rounded-[20px] border border-ecc-line bg-white p-4 text-left ' +
        ' transition-transform active:scale-[0.99] ' +
        (muted ? 'opacity-70' : '')
      }
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ecc-navy/[0.06]">
          <Calendar className="h-[19px] w-[19px] text-ecc-navy" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-snug text-ecc-ink">
            {ev.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-ecc-muted">
            {formatPeriod(ev.startDate, ev.endDate)}
          </p>
        </div>

        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ecc-faint" />
      </div>

      {/* Progresso de credenciamento */}
      <div className="mt-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 text-ecc-muted">
            <Users className="h-3.5 w-3.5" />
            {ev.credentialed} de {ev.total} credenciados
          </span>
          <span className="font-semibold text-ecc-navy">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ecc-navy/[0.08]">
          <div
            className="h-full rounded-full bg-ecc-gold transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  )
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        'flex-1 border-b-2 pb-3 pt-2 text-center text-[15px] transition-colors ' +
        (active
          ? 'border-ecc-gold font-semibold text-white'
          : 'border-transparent text-white/55')
      }
    >
      {label}
    </button>
  )
}

function EmptyState({ tab, onSeeEnded }: { tab: Tab; onSeeEnded: () => void }) {
  if (tab === 'ended') {
    return <StateMessage>Você não possui eventos encerrados.</StateMessage>
  }
  return (
    <div className="mt-5 rounded-[20px] border border-ecc-line bg-white p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ecc-navy/[0.06]">
        <Search className="h-5 w-5 text-ecc-navy" />
      </span>
      <h3 className="mt-4 font-display text-[1.35rem] text-ecc-ink">
        Nenhum evento encontrado
      </h3>
      <p className="mt-1.5 text-sm text-ecc-muted">
        Você não possui nenhum evento em andamento no momento.
      </p>
      <button
        onClick={onSeeEnded}
        className="mt-5 w-full rounded-full border border-ecc-navy/20 py-3 text-sm font-semibold text-ecc-navy transition-colors active:bg-ecc-navy/5"
      >
        Ver eventos encerrados
      </button>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-[20px] border border-ecc-line bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 shrink-0 rounded-xl bg-ecc-navy/[0.06]" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded bg-ecc-navy/[0.08]" />
          <div className="h-2.5 w-2/5 rounded bg-ecc-navy/[0.06]" />
        </div>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-ecc-navy/[0.06]" />
    </div>
  )
}

function StateMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center pt-20 text-center text-sm text-ecc-muted">
      {children}
    </div>
  )
}
