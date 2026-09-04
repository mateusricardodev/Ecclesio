import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { ParticipantCard } from '../components/ParticipantCard'
import { useCheckinActions } from '../useCheckinActions'
import { groupByLetter } from '../grouping'
import { fetchCheckinList, type CheckinParticipant } from '../api'

export function SearchCheckin() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<CheckinParticipant[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { checkIn, undo, busyIds, errorMsg, clearError } = useCheckinActions(
    id,
    setItems,
  )

  const trimmed = query.trim()
  const showInitial = trimmed.length === 0

  // busca com debounce (em tempo real). setState ocorre dentro do timeout/promise.
  useEffect(() => {
    if (trimmed.length === 0) return
    const handle = setTimeout(() => {
      setSearching(true)
      setError(null)
      fetchCheckinList(id, 'all', trimmed)
        .then((data) => setItems(data))
        .catch(() => setError('Falha na busca. Tente novamente.'))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [id, trimmed])

  const groups = groupByLetter(items)

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-ecc-cream text-ecc-ink">
      <AppHeader title="Pesquisar" onBack={() => navigate(`/app/evento/${id}`)} />

      <div className="px-4 pb-1 pt-4">
        <div className="flex items-center gap-3 rounded-2xl border border-ecc-navy/10 bg-white px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] focus-within:border-ecc-navy/30">
          <Search className="h-5 w-5 shrink-0 text-ecc-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, documento ou inscrição"
            className="w-full bg-transparent text-[15px] text-ecc-ink outline-none placeholder:text-ecc-faint"
          />
        </div>
      </div>

      {errorMsg && (
        <button
          onClick={clearError}
          className="mx-4 mt-3 rounded-xl bg-ecc-red-soft px-4 py-2.5 text-left text-[13px] text-ecc-red"
        >
          {errorMsg} (toque para dispensar)
        </button>
      )}

      <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        {showInitial ? (
          <InitialState />
        ) : error ? (
          <Centered>
            <span className="text-ecc-red">{error}</span>
          </Centered>
        ) : searching && items.length === 0 ? (
          <Centered>Buscando…</Centered>
        ) : items.length === 0 ? (
          <Centered>Nenhum participante encontrado para “{trimmed}”.</Centered>
        ) : (
          groups.map((g) => (
            <section key={g.letter} className="mt-4">
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
          ))
        )}
      </main>
    </div>
  )
}

function InitialState() {
  return (
    <div className="mt-6 rounded-2xl border border-ecc-navy/10 bg-white p-8 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ecc-navy/[0.06]">
        <Search className="h-5 w-5 text-ecc-navy" />
      </span>
      <h3 className="mt-4 font-display text-[1.35rem] font-semibold text-ecc-navy">
        Pesquise para encontrar participantes
      </h3>
      <p className="mt-1.5 text-sm text-ecc-muted">
        É possível realizar check-ins por aqui
      </p>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-2 pt-20 text-center text-sm text-ecc-muted">
      {children}
    </div>
  )
}
