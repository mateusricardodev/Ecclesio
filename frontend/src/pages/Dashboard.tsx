import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Users, Plus, ArrowUpRight } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { DashboardLayout } from '../components/DashboardLayout'
import api from '../api/axios'
import { PageHeader, Panel, PanelTitle, Stat, EmptyNote, StatusPill } from '../components/ui'

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
    { label: 'Eventos', value: String(totalEvents), to: '/eventos' },
    { label: 'Inscrições', value: String(totalRegs), to: '/buscar-inscricoes' },
    { label: 'Confirmadas', value: String(confirmedRegs), to: '/buscar-inscricoes' },
    { label: 'Arrecadado', value: brl(revenue), to: '/financeiro' },
  ]

  const seeAll = (to: string) => (
    <Link to={to} className="text-sm font-bold text-ecc-navy inline-flex items-center gap-1" style={{ letterSpacing: '-0.025em' }}>
      Ver todos <ArrowUpRight size={13} />
    </Link>
  )

  return (
    <DashboardLayout active="dashboard">
      <PageHeader
        eyebrow={`Olá, ${firstName}`}
        title="Painel"
        subtitle="Seus eventos e as inscrições mais recentes."
        actions={
          <Link to="/events/new" className="ecc-btn ecc-btn-primary">
            <Plus size={15} /> Novo evento
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-8 mb-14">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-t border-ecc-line pt-5 animate-pulse">
                <div className="h-3 w-16 rounded bg-[#F2F2F2]" />
                <div className="h-10 w-24 rounded-lg bg-[#F2F2F2] mt-6" />
              </div>
            ))
          : metrics.map((m) => (
              <Stat key={m.label} label={m.label} value={m.value} onClick={() => navigate(m.to)} />
            ))}
      </div>

      {loading ? null : totalEvents === 0 ? (
        <EmptyState onCreate={() => navigate('/events/new')} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel>
            <PanelTitle action={seeAll('/eventos')}>Próximos eventos</PanelTitle>
            {upcoming.length === 0 ? (
              <EmptyNote icon={Calendar} text="Nenhum evento próximo." />
            ) : (
              <ul className="divide-y divide-ecc-line border-t border-ecc-line">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <Link to={`/events/${e.id}`} className="flex items-center gap-4 py-4 group">
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-[26px] leading-none text-ecc-ink" style={{ letterSpacing: '-0.04em' }}>
                          {new Date(e.date).getUTCDate().toString().padStart(2, '0')}
                        </p>
                        <p className="ecc-eyebrow mt-1" style={{ color: '#6F6F6F' }}>
                          {new Date(e.date).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium truncate text-ecc-ink group-hover:text-ecc-navy">{e.title}</p>
                        <p className="text-sm truncate text-ecc-text mt-0.5">{e.location ?? 'Local a definir'}</p>
                      </div>
                      <span className="text-sm shrink-0 flex items-center gap-1.5 text-ecc-text">
                        <Users size={13} /> {e._count.registrations}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelTitle action={seeAll('/buscar-inscricoes')}>Últimas inscrições</PanelTitle>
            {latestRegs.length === 0 ? (
              <EmptyNote icon={Users} text="Nenhuma inscrição ainda." />
            ) : (
              <ul className="divide-y divide-ecc-line border-t border-ecc-line">
                {latestRegs.map((r) => (
                  <li key={r.id} className="flex items-center gap-4 py-4">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-ecc-navy-soft text-ecc-navy">
                      {r.user.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium truncate text-ecc-ink">{r.user.name}</p>
                      <p className="text-sm truncate text-ecc-text mt-0.5">{r.eventTitle}</p>
                    </div>
                    <StatusPill status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </DashboardLayout>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const steps = [
    'Informe data, local e limite de vagas.',
    'Escolha as formas de pagamento e os campos do formulário.',
    'Publique a página e compartilhe o link.',
  ]

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="rounded-[30px] bg-ecc-navy text-white p-8 sm:p-12 flex flex-col justify-between gap-12 min-h-[360px]">
        <p className="ecc-eyebrow" style={{ color: '#D4B16A' }}>Primeiro evento</p>
        <div className="flex flex-col gap-6">
          <h2 className="font-[family-name:var(--font-display)] text-[44px] sm:text-[56px] leading-[0.9]" style={{ letterSpacing: '-0.03em' }}>
            Crie seu primeiro evento.
          </h2>
          <button onClick={onCreate} className="ecc-btn ecc-btn-gold self-start">
            <Plus size={15} /> Criar evento
          </button>
        </div>
      </div>
      <ol className="flex flex-col justify-center">
        {steps.map((step, i) => (
          <li key={step} className="border-t border-ecc-line py-6 flex gap-8 text-[15px]">
            <span className="font-bold text-ecc-text">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-ecc-ink">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
