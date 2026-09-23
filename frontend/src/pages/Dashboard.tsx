import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar, Users, Plus, CheckCircle, DollarSign,
  FileText, Mail, BarChart3, Ticket, ArrowRight, TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { DashboardLayout } from '../components/DashboardLayout'
import api from '../api/axios'

interface EventItem {
  id: string
  title: string
  date: string
  endDate: string | null
  location: string | null
  _count: { registrations: number }
}

interface RegItem {
  id: string
  status: 'pending' | 'confirmed' | 'canceled'
  createdAt: string
  user: { id: string; name: string; email: string }
  payment: { id: string; status: string; amount: string } | null
  eventTitle: string
}

const STATUS_BADGE: Record<RegItem['status'], { label: string; bg: string; color: string }> = {
  confirmed: { label: 'Confirmado', bg: '#F0FDF4', color: '#166534' },
  pending:   { label: 'Pendente',   bg: '#FFFBEB', color: '#92400E' },
  canceled:  { label: 'Cancelado',  bg: '#FEF2F2', color: '#991B1B' },
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [events, setEvents] = useState<EventItem[]>([])
  const [regs, setRegs] = useState<RegItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data: evs } = await api.get<EventItem[]>('/events')
        const regLists = await Promise.all(
          evs.map((e) =>
            api
              .get(`/events/${e.id}/registrations?limit=1000`)
              .then((r) =>
                (r.data.data as RegItem[])
                  .filter((reg) => reg.status !== 'canceled')
                  .map((reg) => ({ ...reg, eventTitle: e.title })),
              )
              .catch(() => [] as RegItem[]),
          ),
        )
        if (!active) return
        setEvents(evs)
        setRegs(regLists.flat())
      } catch {
        if (active) { setEvents([]); setRegs([]) }
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const totalEvents    = events.length
  const totalRegs      = regs.length
  const confirmedRegs  = regs.filter((r) => r.status === 'confirmed').length
  // Receita: apenas pagamentos efetivamente pagos (exclui pending/failed)
  const revenue        = regs.reduce((s, r) => s + (r.payment?.status === 'paid' ? Number(r.payment.amount) : 0), 0)

  const now      = new Date()
  const upcoming = [...events]
    .filter((e) => new Date(e.endDate ?? e.date) >= now)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 4)
  const latestRegs = [...regs]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 4)

  const firstName = (user?.name ?? 'Organizador').split(' ')[0]

  const metrics = [
    { label: 'Eventos',             value: String(totalEvents),   icon: Calendar,    to: '/eventos',           accent: '#00186D' },
    { label: 'Inscrições',          value: String(totalRegs),     icon: Users,       to: '/buscar-inscricoes', accent: '#33425C' },
    { label: 'Confirmadas',         value: String(confirmedRegs), icon: CheckCircle, to: '/buscar-inscricoes', accent: '#D4B16A' },
    { label: 'Total arrecadado',    value: brl(revenue),          icon: DollarSign,  to: '/eventos',           accent: '#00186D' },
  ]

  return (
    <DashboardLayout active="dashboard">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.12em] mb-1"
            style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
          >
            Bem-vindo de volta, {firstName}
          </p>
          <h1
            className="leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.85rem',
              fontWeight: 600,
              color: '#00186D',
            }}
          >
            Painel de controle
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            Acompanhe seus eventos e inscrições em um só lugar.
          </p>
        </div>

        <Link
          to="/events/new"
          className="shrink-0 inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
          style={{
            background: '#00186D',
            color: '#FFFFFF',
            fontFamily: 'var(--font-sans)',
            boxShadow: '0 2px 12px rgba(0,24,109,0.20)',
          }}
        >
          <Plus size={16} />
          Novo evento
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
          : metrics.map((m) => (
              <button
                key={m.label}
                onClick={() => navigate(m.to)}
                className="group text-left rounded-2xl p-5 transition-all"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,24,109,0.08)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${m.accent}12` }}
                >
                  <m.icon size={17} style={{ color: m.accent }} />
                </div>
                <p
                  className="text-xl font-bold mb-0.5"
                  style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}
                >
                  {m.value}
                </p>
                <p className="text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                  {m.label}
                </p>
              </button>
            ))}
      </div>

      {/* Estado vazio OU seções */}
      {loading ? null : totalEvents === 0 ? (
        <EmptyState onCreate={() => navigate('/events/new')} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Próximos eventos */}
          <Card title="Próximos eventos" onSeeAll={() => navigate('/eventos')}>
            {upcoming.length === 0 ? (
              <EmptyBlock icon={Calendar} text="Nenhum evento próximo." />
            ) : (
              <ul className="divide-y" style={{ borderColor: 'rgba(0,24,109,0.06)' }}>
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/events/${e.id}`}
                      className="flex items-center gap-3 py-3 px-1 rounded-xl transition-colors group"
                    >
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(0,24,109,0.06)' }}
                      >
                        <Calendar size={15} style={{ color: '#00186D' }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                          {e.title}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                          {new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {e.location && ` · ${e.location}`}
                        </p>
                      </div>
                      <span className="text-xs shrink-0 flex items-center gap-1" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                        <Users size={12} />
                        {e._count.registrations}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Últimas inscrições */}
          <Card title="Últimas inscrições" onSeeAll={() => navigate('/buscar-inscricoes')}>
            {latestRegs.length === 0 ? (
              <EmptyBlock icon={Users} text="Nenhuma inscrição ainda." />
            ) : (
              <ul className="divide-y" style={{ borderColor: 'rgba(0,24,109,0.06)' }}>
                {latestRegs.map((r) => {
                  const badge = STATUS_BADGE[r.status]
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-3 px-1">
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'rgba(0,24,109,0.06)', color: '#00186D' }}
                      >
                        {r.user.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                          {r.user.name}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                          {r.eventTitle}
                        </p>
                      </div>
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                        style={{ background: badge.bg, color: badge.color, fontFamily: 'var(--font-sans)' }}
                      >
                        {badge.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}

// Componentes auxiliares

function MetricSkeleton() {
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: '#FFFFFF', border: '1px solid rgba(0,24,109,0.08)' }}>
      <div className="w-9 h-9 rounded-xl mb-4" style={{ background: 'rgba(0,24,109,0.06)' }} />
      <div className="h-6 w-14 rounded-lg mb-2" style={{ background: 'rgba(0,24,109,0.06)' }} />
      <div className="h-3 w-20 rounded" style={{ background: 'rgba(0,24,109,0.04)' }} />
    </div>
  )
}

function Card({ title, onSeeAll, children }: { title: string; onSeeAll: () => void; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(0,24,109,0.08)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="font-semibold text-sm"
          style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}
        >
          {title}
        </h2>
        <button
          onClick={onSeeAll}
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
        >
          Ver todos <ArrowRight size={12} />
        </button>
      </div>
      {children}
    </div>
  )
}

function EmptyBlock({ icon: Icon, text }: { icon: typeof Calendar; text: string }) {
  return (
    <div className="flex flex-col items-center py-10 gap-2 text-center">
      <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,24,109,0.05)' }}>
        <Icon size={18} style={{ color: '#6B7280' }} />
      </span>
      <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>{text}</p>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const features = [
    { icon: FileText,  label: 'Formulários personalizados' },
    { icon: Ticket,    label: 'Controle de vagas em tempo real' },
    { icon: Mail,      label: 'Confirmação automática por e-mail' },
    { icon: BarChart3, label: 'Relatórios e exportações' },
  ]

  return (
    <div
      className="rounded-2xl p-10 max-w-2xl mx-auto text-center"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(0,24,109,0.08)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Ornamento */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="h-px w-10" style={{ background: '#D4B16A' }} />
        <TrendingUp size={18} style={{ color: '#D4B16A' }} />
        <div className="h-px w-10" style={{ background: '#D4B16A' }} />
      </div>

      <h2
        className="mb-2"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          fontWeight: 600,
          color: '#00186D',
        }}
      >
        Bem-vindo ao Ecclesio
      </h2>
      <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
        Crie seu primeiro evento e comece a receber inscrições online. É rápido e simples.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left">
        {features.map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ border: '1px solid rgba(0,24,109,0.08)', background: '#FAFAFA' }}
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,24,109,0.06)' }}
            >
              <f.icon size={15} style={{ color: '#00186D' }} />
            </span>
            <span className="text-sm" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
              {f.label}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition-all"
        style={{
          background: '#00186D',
          color: '#FFFFFF',
          fontFamily: 'var(--font-sans)',
          boxShadow: '0 2px 12px rgba(0,24,109,0.20)',
        }}
      >
        <Plus size={16} />
        Criar meu primeiro evento
      </button>
    </div>
  )
}
