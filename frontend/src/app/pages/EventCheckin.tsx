import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, QrCode } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { Fab } from '../components/Fab'
import { ParticipantCard } from '../components/ParticipantCard'
import { useCheckinActions } from '../useCheckinActions'
import { groupByLetter } from '../grouping'
import {
  fetchCheckinList,
  fetchCheckinStats,
  type CheckinFilter,
  type CheckinParticipant,
  type CheckinStats,
} from '../api'

type Tab = { key: CheckinFilter; label: string; count: number }

export function EventCheckin() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [stats, setStats] = useState<CheckinStats | null>(null)
  const [items, setItems] = useState<CheckinParticipant[]>([])
  const [filter, setFilter] = useState<CheckinFilter>('all')
  // a qual filtro a lista carregada pertence (null = ainda carregando)
  const [dataFilter, setDataFilter] = useState<CheckinFilter | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loading = dataFilter !== filter

  const { checkIn, undo, busyIds, errorMsg, clearError } = useCheckinActions(
    id,
    setItems,
    setStats,
  )

  // stats (título + contadores), uma vez
  useEffect(() => {
    let active = true
    fetchCheckinStats(id)
      .then((s) => active && setStats(s))
      .catch(() => active && setError('Não foi possível carregar o evento.'))
    return () => {
      active = false
    }
  }, [id])

  // lista por filtro
  useEffect(() => {
    let active = true
    fetchCheckinList(id, filter)
      .then((data) => {
        if (!active) return
        setItems(data)
        setDataFilter(filter)
      })
      .catch(() => active && setError('Não foi possível carregar os inscritos.'))
    return () => {
      active = false
    }
  }, [id, filter])

  // displayed reflete o filtro mesmo após toggles otimistas
  const displayed = items.filter((p) =>
    filter === 'done' ? p.checkedIn : filter === 'pending' ? !p.checkedIn : true,
  )
  const groups = groupByLetter(displayed)

  const tabs: Tab[] = [
    { key: 'all', label: 'Todos', count: stats?.total ?? 0 },
    { key: 'done', label: 'Realizados', count: stats?.done ?? 0 },
    { key: 'pending', label: 'Restantes', count: stats?.pending ?? 0 },
  ]

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-ecc-cream text-ecc-ink">
      <AppHeader
        title={stats?.title ?? 'Evento'}
        centerTitle
        onBack={() => navigate('/app/eventos')}
      >
        <p className="pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-ecc-gold">
          Inscritos
        </p>
        <div className="flex">
          {tabs.map((t) => (
            <FilterTab
              key={t.key}
              label={t.label}
              count={t.count}
              active={filter === t.key}
              onClick={() => setFilter(t.key)}
            />
          ))}
        </div>
      </AppHeader>

      {errorMsg && (
        <button
          onClick={clearError}
          className="border-b border-ecc-red/15 bg-ecc-red-soft px-4 py-2.5 text-left text-[13px] text-ecc-red"
        >
          {errorMsg} (toque para dispensar)
        </button>
      )}

      <main className="relative flex-1 px-4 pb-32">
        {loading && (
          <div className="mt-5 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <Centered>
            <span className="text-ecc-red">{error}</span>
          </Centered>
        )}

        {!loading && !error && displayed.length === 0 && (
          <Centered>Nenhum inscrito nesta lista.</Centered>
        )}

        {!loading &&
          !error &&
          groups.map((g) => (
            <section key={g.letter} className="mt-5">
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ecc-gold-dark">
                {g.letter}
              </h2>
              <ul className="divide-y divide-ecc-navy/[0.07] overflow-hidden rounded-2xl border border-ecc-navy/10 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                {g.items.map((p) => (
                  <li key={p.id}>
                    <ParticipantCard
                      participant={p}
                      busy={busyIds.has(p.id)}
                      onCheckIn={() => checkIn(p)}
                      onUndo={() => undo(p)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </main>

      {/* FABs fixos, alinhados ao container mobile */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px]">
        <div className="pointer-events-auto absolute bottom-6 right-4 flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
          <Fab
            icon={Search}
            label="Pesquisar"
            variant="secondary"
            onClick={() => navigate(`/app/evento/${id}/pesquisar`)}
          />
          <Fab
            icon={QrCode}
            label="Ler QR Code"
            onClick={() => navigate(`/app/evento/${id}/qrcode`)}
          />
        </div>
      </div>
    </div>
  )
}

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        'flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 pb-2.5 pt-1 transition-colors ' +
        (active ? 'border-ecc-gold' : 'border-transparent')
      }
    >
      <span
        className={
          'text-[14px] ' + (active ? 'font-semibold text-white' : 'text-white/55')
        }
      >
        {label}
      </span>
      <span
        className={
          'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ' +
          (active
            ? 'bg-ecc-gold text-ecc-navy'
            : 'bg-white/15 text-white/70')
        }
      >
        {count}
      </span>
    </button>
  )
}

function RowSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-ecc-navy/10 bg-white p-4">
      <div className="h-3.5 w-1/2 rounded bg-ecc-navy/[0.08]" />
      <div className="mt-2.5 h-2.5 w-1/3 rounded bg-ecc-navy/[0.06]" />
      <div className="mt-2 h-2.5 w-2/5 rounded bg-ecc-navy/[0.06]" />
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center pt-20 text-center text-sm text-ecc-muted">
      {children}
    </div>
  )
}
