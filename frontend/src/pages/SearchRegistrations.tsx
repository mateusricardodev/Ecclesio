import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users, Pencil, Calendar } from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import api from '../api/axios'

interface RegItem {
  id: string
  status: 'pending' | 'confirmed' | 'canceled'
  createdAt: string
  cpf: string | null
  user: { name: string; email: string }
  payment: { amount: string } | null
  event: { id: string; title: string }
}

const STATUS: Record<RegItem['status'], { label: string; bg: string; color: string }> = {
  confirmed: { label: 'Confirmado', bg: '#F0FDF4', color: '#166534' },
  pending:   { label: 'Pendente',   bg: '#FFFBEB', color: '#92400E' },
  canceled:  { label: 'Cancelado',  bg: '#FEF2F2', color: '#991B1B' },
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function SearchRegistrations() {
  const [query, setQuery]   = useState('')
  const [regs, setRegs]     = useState<RegItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data: events } = await api.get<{ id: string; title: string }[]>('/events')
        const lists = await Promise.all(
          events.map((e) =>
            api
              .get(`/events/${e.id}/registrations?limit=1000`)
              .then((r) =>
                (r.data.data as Omit<RegItem, 'event'>[])
                  .filter((reg) => reg.status !== 'canceled')
                  .map((reg) => ({
                    ...reg,
                    event: { id: e.id, title: e.title },
                  })),
              )
              .catch(() => [] as RegItem[]),
          ),
        )
        if (!active) return
        setRegs(lists.flat().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)))
      } catch {
        if (active) setRegs([])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return regs
    const digits = q.replace(/\D/g, '')
    return regs.filter(
      (r) =>
        r.user.name.toLowerCase().includes(q) ||
        r.user.email.toLowerCase().includes(q) ||
        r.event.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (!!digits && (r.cpf ?? '').includes(digits)),
    )
  }, [query, regs])

  const colHeader = (label: string, cls: string) => (
    <span
      key={label}
      className={`ecc-eyebrow ${cls}`}
      style={{ color: '#6F6F6F' }}
    >
      {label}
    </span>
  )

  return (
    <DashboardLayout active="inscricoes">

      {/* Cabeçalho */}
      <div className="mb-8">
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
          Inscrições
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
          Todas as inscrições dos seus eventos. Use a busca para filtrar.
        </p>
      </div>

      {/* Campo de busca */}
      <div className="relative mb-6 max-w-xl">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#6F6F6F' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por nome, e-mail, CPF, evento ou código"
          className="w-full text-sm focus:outline-none transition-all"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E9E9E9',
            borderRadius: '12px',
            color: '#0A0A09',
            fontFamily: 'var(--font-sans)',
            padding: '0.65rem 0.875rem 0.65rem 2.5rem',
          }}
        />
      </div>

      {/* Resultados */}
      {loading ? (
        <div
          className="rounded-[20px] overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid #E9E9E9' }}
        >
          {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
        </div>
      ) : regs.length === 0 ? (
        <EmptyHint
          title="Nenhuma inscrição ainda"
          subtitle="Assim que seus eventos receberem inscrições, elas aparecerão aqui."
        />
      ) : filtered.length === 0 ? (
        <EmptyHint
          title={`Nenhum resultado para "${query}"`}
          subtitle="Verifique a ortografia ou tente outro termo."
        />
      ) : (
        <div
          className="rounded-[20px] overflow-hidden"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E9E9E9',
          }}
        >
          {/* Contagem */}
          <div
            className="px-5 py-3 text-xs"
            style={{ borderBottom: '1px solid #E9E9E9', color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}
          >
            {query.trim() ? `${filtered.length} de ${regs.length} inscrição(ões)` : `${regs.length} inscrição(ões)`}
          </div>

          {/* Cabeçalho colunas */}
          <div
            className="hidden sm:flex items-center gap-4 px-5 py-2.5"
            style={{ background: 'rgba(0,24,109,0.02)', borderBottom: '1px solid #E9E9E9' }}
          >
            <span className="w-9 shrink-0" />
            {colHeader('Participante', 'flex-1')}
            {colHeader('CPF', 'hidden lg:block w-32 shrink-0')}
            {colHeader('Evento', 'hidden md:block w-40 shrink-0')}
            {colHeader('Status', 'w-24 text-center shrink-0')}
            {colHeader('Valor', 'w-24 text-right shrink-0')}
            <span className="w-8 shrink-0" />
          </div>

          {/* Linhas */}
          <ul>
            {filtered.map((reg) => {
              const badge = STATUS[reg.status]
              return (
                <li
                  key={reg.id}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: '1px solid #E9E9E9' }}
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'rgba(0,24,109,0.07)', color: '#00186D', fontFamily: 'var(--font-sans)' }}
                  >
                    {initials(reg.user.name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                      {reg.user.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
                      {reg.user.email}
                    </p>
                  </div>

                  <span className="hidden lg:block text-xs w-32 shrink-0 truncate" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
                    {reg.cpf ? reg.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '-'}
                  </span>

                  <span
                    className="hidden md:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full w-40 shrink-0 truncate"
                    style={{ background: 'rgba(0,24,109,0.06)', color: '#00186D', fontFamily: 'var(--font-sans)' }}
                  >
                    <Calendar size={11} className="shrink-0" />
                    <span className="truncate">{reg.event.title}</span>
                  </span>

                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full w-24 text-center shrink-0"
                    style={{ background: badge.bg, color: badge.color, fontFamily: 'var(--font-sans)' }}
                  >
                    {badge.label}
                  </span>

                  <span className="hidden sm:block text-sm w-24 text-right shrink-0" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                    {reg.payment ? brl(Number(reg.payment.amount)) : brl(0)}
                  </span>

                  <Link
                    to={`/events/${reg.event.id}/registrations/${reg.id}/edit`}
                    className="p-1.5 rounded-full transition-all shrink-0"
                    style={{ color: '#6F6F6F' }}
                    title="Editar inscrição"
                  >
                    <Pencil size={14} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </DashboardLayout>
  )
}

function EmptyHint({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      className="rounded-[20px] p-12 text-center"
      style={{ background: '#FFFFFF', border: '1px solid #E9E9E9' }}
    >
      <span
        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ background: 'rgba(0,24,109,0.06)' }}
      >
        <Users size={20} style={{ color: '#00186D' }} />
      </span>
      <p className="font-semibold text-sm" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>{title}</p>
      <p className="text-xs mt-1" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>{subtitle}</p>
    </div>
  )
}

function RowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 animate-pulse"
      style={{ borderBottom: '1px solid #E9E9E9' }}
    >
      <div className="w-9 h-9 rounded-full shrink-0" style={{ background: 'rgba(0,24,109,0.06)' }} />
      <div className="flex-1">
        <div className="h-3.5 w-40 rounded-lg mb-2" style={{ background: 'rgba(0,24,109,0.06)' }} />
        <div className="h-3 w-56 rounded" style={{ background: 'rgba(0,24,109,0.04)' }} />
      </div>
      <div className="h-6 w-24 rounded-full shrink-0" style={{ background: 'rgba(0,24,109,0.05)' }} />
    </div>
  )
}
