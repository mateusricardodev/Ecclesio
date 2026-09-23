import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Plus, MapPin, Users, Pencil, Trash2, ScanLine } from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import api from '../api/axios'

interface EventItem {
  id: string
  title: string
  date: string
  endDate: string | null
  location: string | null
  isPublished: boolean
  _count: { registrations: number }
}

export function Events() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let active = true
    api
      .get<EventItem[]>('/events')
      .then(({ data }) => { if (active) setEvents(data) })
      .catch(() => { if (active) setEvents([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function handleDelete() {
    if (!confirmId) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/events/${confirmId}`)
      setEvents((prev) => prev.filter((e) => e.id !== confirmId))
      setConfirmId(null)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setDeleteError(e?.response?.data?.message ?? 'Erro ao excluir evento')
    } finally {
      setDeleting(false)
    }
  }

  const now     = new Date()
  const ongoing = events.filter((e) => new Date(e.endDate ?? e.date) >= now)
  const ended   = events.filter((e) => new Date(e.endDate ?? e.date) < now)

  return (
    <DashboardLayout active="eventos">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p
            className="ecc-eyebrow mb-1"
            style={{ color: '#00186D' }}
          >
            Gestão
          </p>
          <h1
            className="leading-tight"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', fontSize: '2.5rem', fontWeight: 400, color: '#0A0A09' }}
          >
            Eventos
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
            Gerencie todos os seus eventos em um só lugar.
          </p>
        </div>

        <Link
          to="/events/new"
          className="shrink-0 inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full transition-all"
          style={{
            background: '#00186D',
            color: '#FFFFFF',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <Plus size={16} />
          Novo evento
        </Link>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : events.length === 0 ? (
        <div
          className="rounded-[20px] p-10 text-center max-w-xl mx-auto"
          style={{ background: '#FFFFFF', border: '1px solid #E9E9E9' }}
        >
          <span
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(0,24,109,0.06)' }}
          >
            <Calendar size={20} style={{ color: '#00186D' }} />
          </span>
          <h2
            className="mb-2"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', fontSize: '1.875rem', fontWeight: 400, color: '#0A0A09' }}
          >
            Nenhum evento ainda
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
            Crie seu primeiro evento e comece a receber inscrições.
          </p>
          <Link
            to="/events/new"
            className="inline-flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-full transition-all"
            style={{ background: '#00186D', color: '#FFFFFF', fontFamily: 'var(--font-sans)' }}
          >
            <Plus size={16} />
            Criar evento
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {ongoing.length > 0 && (
            <Section title="Em andamento" count={ongoing.length}>
              {ongoing.map((e) => (
                <EventCard key={e.id} event={e} onDelete={() => setConfirmId(e.id)} />
              ))}
            </Section>
          )}
          {ended.length > 0 && (
            <Section title="Encerrados" count={ended.length} muted>
              {ended.map((e) => (
                <EventCard key={e.id} event={e} muted onDelete={() => setConfirmId(e.id)} />
              ))}
            </Section>
          )}
        </div>
      )}

      {/* Modal de confirmação */}
      {confirmId && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
          <div
            className="w-full max-w-sm rounded-[20px] p-7"
            style={{ background: '#FFFFFF' }}
          >
            <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', fontSize: '1.25rem', color: '#0A0A09' }}>
              Excluir evento
            </h3>
            <p className="text-sm mb-5" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
              Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
            </p>
            {deleteError && (
              <p className="text-sm rounded-xl px-4 py-3 mb-4" style={{ background: '#FEF2F2', color: '#991B1B', fontFamily: 'var(--font-sans)' }}>
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmId(null); setDeleteError('') }}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-full transition-all"
                style={{ border: '1px solid #E9E9E9', color: '#0A0A09', fontFamily: 'var(--font-sans)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold rounded-full transition-all"
                style={{ background: '#DC2626', color: '#FFFFFF', fontFamily: 'var(--font-sans)', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

// Componentes auxiliares

function Section({ title, count, muted, children }: { title: string; count: number; muted?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2
          className="ecc-eyebrow"
          style={{ color: muted ? '#9CA3AF' : '#6B7280' }}
        >
          {title}
        </h2>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: muted ? 'rgba(0,0,0,0.04)' : 'rgba(0,24,109,0.06)', color: muted ? '#9CA3AF' : '#00186D', fontFamily: 'var(--font-sans)' }}
        >
          {count}
        </span>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  )
}

function EventCard({ event, muted, onDelete }: { event: EventItem; muted?: boolean; onDelete: () => void }) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-[20px] transition-all"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E9E9E9',
        opacity: muted ? 0.65 : 1,
      }}
    >
      {/* Linha 1 no mobile: ícone + info, com as ações descendo pra linha
          própria. Em sm+ o sm:contents dissolve este agrupamento e os dois
          voltam a ser células da linha única. */}
      <div className="flex items-center gap-3 sm:contents">
        {/* Ícone */}
        <span
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,24,109,0.06)' }}
        >
          <Calendar size={19} style={{ color: '#00186D' }} />
        </span>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className="font-semibold truncate text-sm"
              style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}
            >
              {event.title}
            </h3>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={
                event.isPublished
                  ? { background: '#F0FDF4', color: '#166534' }
                  : { background: 'rgba(0,0,0,0.05)', color: '#6F6F6F' }
              }
            >
              {event.isPublished ? 'Publicado' : 'Rascunho'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
              <Calendar size={12} />
              {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
                <MapPin size={12} />
                {event.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
              <Users size={12} />
              {event._count.registrations} inscritos
            </span>
          </div>
        </div>
      </div>

      {/* Ações: linha própria no mobile, encostadas à direita */}
      <div className="flex items-center gap-2 justify-end shrink-0">
        {/* Atalho para o credenciamento deste evento no app do voluntário */}
        <Link
          to={`/app/evento/${event.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
          style={{
            background: 'rgba(0,24,109,0.06)',
            color: '#00186D',
            fontFamily: 'var(--font-sans)',
          }}
          title="Abrir o credenciamento deste evento no app"
        >
          <ScanLine size={13} />
          Ir para o App
        </Link>
        <Link
          to={`/events/${event.id}`}
          className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
          style={{
            border: '1px solid rgba(0,24,109,0.2)',
            color: '#00186D',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Ver
        </Link>
        <Link
          to={`/events/${event.id}/edit`}
          className="p-2 rounded-full transition-all"
          style={{ color: '#6F6F6F' }}
          title="Editar"
        >
          <Pencil size={15} />
        </Link>
        <button
          onClick={onDelete}
          className="p-2 rounded-full transition-all"
          style={{ color: '#EF4444' }}
          title="Excluir"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div
      className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-[20px] animate-pulse"
      style={{ background: '#FFFFFF', border: '1px solid #E9E9E9' }}
    >
      <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: 'rgba(0,24,109,0.06)' }} />
      <div className="min-w-0 flex-1">
        <div className="h-4 w-48 max-w-full rounded-lg mb-2" style={{ background: 'rgba(0,24,109,0.06)' }} />
        <div className="h-3 w-64 max-w-full rounded" style={{ background: 'rgba(0,24,109,0.04)' }} />
      </div>
    </div>
  )
}
