import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Search, Plus, Pencil, ArrowLeft, Calendar, MapPin, Users, CheckCircle, Clock, XCircle, Download, FileDown, Mail } from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuthStore } from '../store/auth.store'
import api from '../api/axios'
import { downloadTicketPdf } from '../lib/ticketPdf'

interface Registration {
  id: string
  status: 'pending' | 'confirmed' | 'canceled'
  createdAt: string
  code: string | null
  cpf: string | null
  phone: string | null
  birthDate: string | null
  user: { id: string; name: string; email: string }
  ticket: { id: string; name: string; price: string } | null
  payment: { id: string; status: string; amount: string; method: string | null } | null
}

/** Modalidade escolhida pelo participante (EventPaymentMethod.type). */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix:         'Pix',
  credit_card: 'Crédito',
  debit_card:  'Débito',
  cash:        'Dinheiro',
}

function paymentMethodLabel(reg: Registration): string {
  const method = reg.payment?.method
  if (!method) return '—'
  return PAYMENT_METHOD_LABELS[method] ?? method
}

interface Event {
  id: string
  title: string
  date: string
  location: string | null
  description: string | null
  createdBy: string
  _count: { registrations: number }
}

const STATUS: Record<Registration['status'], { label: string; bg: string; color: string }> = {
  confirmed: { label: 'Confirmado', bg: '#F0FDF4', color: '#166534' },
  pending:   { label: 'Pendente',   bg: '#FFFBEB', color: '#92400E' },
  canceled:  { label: 'Cancelado',  bg: '#FEF2F2', color: '#991B1B' },
}

function formatCpf(cpf: string) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [event, setEvent]             = useState<Event | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [canceling, setCanceling]     = useState(false)
  const [confirmPaymentModal, setConfirmPaymentModal] = useState<string | null>(null)
  const [confirmingPayment, setConfirmingPayment]      = useState(false)
  const [confirmError, setConfirmError]                = useState('')
  const [exporting, setExporting]     = useState(false)
  const [resendModal, setResendModal] = useState<string | null>(null)
  const [resending, setResending]     = useState(false)
  const [resendError, setResendError] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [toast, setToast]             = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([api.get(`/events/${id}`), api.get(`/events/${id}/registrations?limit=1000`)])
      .then(([evtRes, regRes]) => {
        setEvent(evtRes.data)
        setRegistrations(regRes.data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  async function handleCancel(regId: string) {
    setCanceling(true)
    try {
      await api.patch(`/registrations/${regId}/cancel`)
      setRegistrations((prev) => prev.map((r) => (r.id === regId ? { ...r, status: 'canceled' } : r)))
    } finally {
      setCanceling(false)
      setCancelConfirm(null)
    }
  }

  async function handleConfirmPayment(regId: string) {
    setConfirmingPayment(true)
    setConfirmError('')
    try {
      await api.patch(`/payments/registrations/${regId}/confirm-manual`)
      setRegistrations((prev) => prev.map((r) => (r.id === regId ? { ...r, status: 'confirmed' } : r)))
      setConfirmPaymentModal(null)
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Não foi possível confirmar o pagamento.'
      setConfirmError(message)
    } finally {
      setConfirmingPayment(false)
    }
  }

  // O aviso de sucesso some sozinho — nada aqui exige confirmação do usuário.
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  /** Gera o mesmo ingresso em PDF que o participante baixa ao se inscrever. */
  async function handleDownloadTicket(reg: Registration) {
    if (!event) return
    setDownloadingId(reg.id)
    try {
      await downloadTicketPdf({
        code: reg.code,
        registrationId: reg.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
        participantName: reg.user.name,
        participantCpf: reg.cpf ? formatCpf(reg.cpf) : null,
        email: reg.user.email,
        // "Valor pago" no ingresso só faz sentido com o pagamento quitado —
        // inscrição pendente sai sem a linha de valor.
        amount: reg.payment?.status === 'paid' ? Number(reg.payment.amount) : null,
      })
    } catch {
      setToast('Não foi possível gerar o PDF do ingresso.')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleResend(regId: string) {
    setResending(true)
    setResendError('')
    try {
      const { data } = await api.post(`/registrations/${regId}/resend-confirmation`)
      setResendModal(null)
      setToast(`E-mail de confirmação reenviado para ${data.email}.`)
    } catch (err) {
      setResendError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Não foi possível reenviar o e-mail.',
      )
    } finally {
      setResending(false)
    }
  }

  async function handleExport() {
    if (!id) return
    setExporting(true)
    try {
      const params: Record<string, string> = {}
      if (search)       params.search   = search
      if (statusFilter) params.status   = statusFilter
      if (dateFrom)     params.dateFrom = dateFrom
      if (dateTo)       params.dateTo   = dateTo
      if (methodFilter) params.method   = methodFilter

      const res = await api.get(`/events/${id}/registrations/export`, { params, responseType: 'blob' })
      const disposition = res.headers['content-disposition'] as string | undefined
      const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? `inscritos-${id}.xlsx`

      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      // silencioso: o botão volta ao estado normal e o usuário pode tentar de novo
    } finally {
      setExporting(false)
    }
  }

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.user.name.toLowerCase().includes(q) || r.user.email.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || (r.cpf ?? '').includes(q)
    const created = new Date(r.createdAt)
    const matchFrom   = !dateFrom || created >= new Date(dateFrom)
    const matchTo     = !dateTo   || created <= new Date(dateTo + 'T23:59:59')
    const matchStatus = statusFilter ? r.status === statusFilter : r.status !== 'canceled'
    // 'none' cobre inscrição sem Payment e Payment sem modalidade gravada —
    // mesmo critério que o backend aplica na exportação.
    const matchMethod = !methodFilter
      || (methodFilter === 'none' ? !r.payment?.method : r.payment?.method === methodFilter)
    return matchSearch && matchFrom && matchTo && matchStatus && matchMethod
  })

  const counts = {
    confirmed: registrations.filter((r) => r.status === 'confirmed').length,
    pending:   registrations.filter((r) => r.status === 'pending').length,
    canceled:  registrations.filter((r) => r.status === 'canceled').length,
  }

  const statCards = [
    { label: 'Total',       value: counts.confirmed + counts.pending, icon: Users,       accent: '#00186D' },
    { label: 'Confirmados', value: counts.confirmed,     icon: CheckCircle, accent: '#166534' },
    { label: 'Pendentes',   value: counts.pending,       icon: Clock,       accent: '#92400E' },
    { label: 'Cancelados',  value: counts.canceled,      icon: XCircle,     accent: '#991B1B' },
  ]

  const inputStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid rgba(0,24,109,0.15)',
    borderRadius: '10px',
    color: '#0A0A09',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.8125rem',
    padding: '0.5rem 0.75rem',
    outline: 'none',
    width: '100%',
  }

  return (
    <DashboardLayout active="eventos">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="min-w-0">
          <Link
            to="/eventos"
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-3 transition-colors"
            style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}
          >
            <ArrowLeft size={14} />
            Voltar aos eventos
          </Link>

          <h1
            className="leading-tight truncate"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 600, color: '#00186D' }}
          >
            {event?.title ?? '...'}
          </h1>

          {event && (
            <div className="flex flex-wrap items-center gap-4 mt-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                <Calendar size={13} style={{ color: '#00186D', opacity: 0.5 }} />
                {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              {event.location && (
                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                  <MapPin size={13} style={{ color: '#00186D', opacity: 0.5 }} />
                  {event.location}
                </span>
              )}
            </div>
          )}
        </div>

        {event && user?.id === event.createdBy && (
          <Link
            to={`/events/${id}/edit`}
            className="shrink-0 inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
            style={{
              border: '1.5px solid rgba(0,24,109,0.25)',
              color: '#00186D',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Pencil size={15} />
            Editar evento
          </Link>
        )}
      </div>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl p-5"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,24,109,0.08)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `${c.accent}12` }}
            >
              <c.icon size={15} style={{ color: c.accent }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
              {c.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              {c.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tabela de inscrições ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(0,24,109,0.08)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* Toolbar */}
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}
        >
          <h2 className="font-semibold text-sm" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
            Inscrições
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all"
              style={{
                border: '1.5px solid rgba(0,24,109,0.25)',
                color: '#00186D',
                fontFamily: 'var(--font-sans)',
                opacity: exporting ? 0.7 : 1,
              }}
            >
              <Download size={13} />
              {exporting ? 'Exportando...' : 'Exportar planilha'}
            </button>
            <Link
              to={`/events/${id}/registrations/new`}
              className="inline-flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all"
              style={{ background: '#00186D', color: '#FFFFFF', fontFamily: 'var(--font-sans)', boxShadow: '0 2px 8px rgba(0,24,109,0.18)' }}
            >
              <Plus size={13} />
              Nova inscrição
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div
          className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
          style={{ borderBottom: '1px solid rgba(0,24,109,0.07)', background: 'rgba(0,24,109,0.02)' }}
        >
          <div className="relative sm:col-span-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
            <input
              type="text"
              placeholder="Nome, CPF, e-mail ou código"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '2.25rem' }}
            />
          </div>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
          <input type="date" value={dateTo}   onChange={(e) => setDateTo(e.target.value)}   style={inputStyle} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">Todos os status</option>
            <option value="confirmed">Confirmado</option>
            <option value="pending">Pendente</option>
            <option value="canceled">Cancelado</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">Todas as formas de pagamento</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
            <option value="none">Não informada</option>
          </select>
        </div>

        {/* Cabeçalho das colunas */}
        {!loading && filtered.length > 0 && (
          <div
            className="hidden sm:flex items-center gap-4 px-5 py-2.5"
            style={{ background: 'rgba(0,24,109,0.02)', borderBottom: '1px solid rgba(0,24,109,0.06)' }}
          >
            <span className="w-9 shrink-0" />
            {[
              { label: 'Participante', cls: 'flex-1' },
              { label: 'CPF',         cls: 'hidden lg:block w-32 shrink-0' },
              { label: 'Tipo',        cls: 'hidden md:block w-28 shrink-0' },
              { label: 'Status',      cls: 'w-24 text-center shrink-0' },
              { label: 'Valor',       cls: 'w-24 text-right shrink-0' },
              { label: '',            cls: 'w-[190px] shrink-0' },
            ].map((col) => (
              <span
                key={col.label}
                className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${col.cls}`}
                style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}
              >
                {col.label}
              </span>
            ))}
          </div>
        )}

        {/* Linhas */}
        {loading ? (
          <p className="text-center py-14 text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            Carregando...
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-14 text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            Nenhuma inscrição encontrada.
          </p>
        ) : (
          <ul>
            {filtered.map((reg) => {
              const badge = STATUS[reg.status]
              return (
                <li
                  key={reg.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors"
                  style={{ borderBottom: '1px solid rgba(0,24,109,0.05)' }}
                >
                  {/* Linha 1 no mobile: avatar + nome + status. Em sm+, vira parte da linha única. */}
                  <div className="flex items-center gap-3 sm:contents">
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
                      <p className="text-xs truncate" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                        {reg.user.email}
                      </p>
                    </div>

                    <span className="hidden lg:block text-xs w-32 shrink-0 truncate" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                      {reg.cpf ? formatCpf(reg.cpf) : '—'}
                    </span>

                    <span
                      className="hidden md:block text-xs w-28 shrink-0 truncate"
                      style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}
                      title={paymentMethodLabel(reg)}
                    >
                      {paymentMethodLabel(reg)}
                    </span>

                    <span
                      className="text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-full shrink-0 sm:w-24 sm:text-center"
                      style={{ background: badge.bg, color: badge.color, fontFamily: 'var(--font-sans)' }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Linha 2 no mobile: forma de pagamento + valor + ações. Em sm+, vira parte da linha única. */}
                  <div className="flex items-center justify-between gap-3 sm:contents">
                    {/* sm:contents aninhado: no mobile agrupa forma + valor à
                        esquerda; em sm+ dissolve e cada span volta a ser célula
                        da linha, preservando a ordem das colunas do cabeçalho. */}
                    <div className="flex items-baseline gap-2 min-w-0 sm:contents">
                      {/* A coluna "Tipo" da linha única só aparece em md+, então
                          abaixo de sm a forma de pagamento precisa deste espelho. */}
                      <span className="sm:hidden text-xs truncate" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                        {paymentMethodLabel(reg)}
                      </span>
                      <span className="text-sm shrink-0 sm:w-24 sm:text-right" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                        {reg.payment ? brl(Number(reg.payment.amount)) : brl(0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 sm:w-[190px] sm:justify-end">
                      <Link
                        to={`/events/${id}/registrations/${reg.id}/edit`}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: '#6B7280' }}
                        title="Editar inscrição"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        onClick={() => handleDownloadTicket(reg)}
                        disabled={!reg.code || downloadingId === reg.id}
                        className="p-1.5 rounded-lg transition-all"
                        style={{
                          color: '#00186D',
                          opacity: reg.code ? (downloadingId === reg.id ? 0.5 : 1) : 0.35,
                          cursor: reg.code ? 'pointer' : 'not-allowed',
                        }}
                        title={
                          reg.code
                            ? 'Baixar PDF da inscrição'
                            : 'Inscrição sem código de credenciamento'
                        }
                      >
                        <FileDown size={14} />
                      </button>
                      {reg.status === 'confirmed' && (
                        <button
                          onClick={() => { setResendError(''); setResendModal(reg.id) }}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: '#D4B16A' }}
                          title="Reenviar e-mail de confirmação"
                        >
                          <Mail size={14} />
                        </button>
                      )}
                      {reg.status === 'pending' && (
                        <button
                          onClick={() => { setConfirmError(''); setConfirmPaymentModal(reg.id) }}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: '#166534' }}
                          title="Confirmar pagamento manualmente"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {reg.status !== 'canceled' ? (
                        <button
                          onClick={() => setCancelConfirm(reg.id)}
                          className="text-xs px-2.5 py-1.5 rounded-lg transition-all shrink-0"
                          style={{ border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', fontFamily: 'var(--font-sans)' }}
                        >
                          Cancelar
                        </button>
                      ) : (
                        <span className="hidden sm:inline-block w-[60px]" />
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Rodapé da tabela */}
        <div
          className="px-5 py-3 text-xs"
          style={{ borderTop: '1px solid rgba(0,24,109,0.06)', color: '#6B7280', fontFamily: 'var(--font-sans)' }}
        >
          {filtered.length} inscrição(ões) exibida(s)
        </div>
      </div>

      {/* ── Modal de cancelamento ── */}
      {cancelConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-7"
            style={{ background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
          >
            <h3
              className="font-semibold mb-2"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#00186D' }}
            >
              Cancelar inscrição
            </h3>
            <p className="text-sm mb-6" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              Tem certeza que deseja cancelar esta inscrição? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="px-4 py-2 text-sm rounded-xl"
                style={{ border: '1px solid rgba(0,24,109,0.15)', color: '#33425C', fontFamily: 'var(--font-sans)' }}
              >
                Voltar
              </button>
              <button
                onClick={() => handleCancel(cancelConfirm)}
                disabled={canceling}
                className="px-4 py-2 text-sm font-semibold rounded-xl"
                style={{ background: '#DC2626', color: '#FFFFFF', fontFamily: 'var(--font-sans)', opacity: canceling ? 0.7 : 1 }}
              >
                {canceling ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de confirmação manual de pagamento ── */}
      {confirmPaymentModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-7"
            style={{ background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
          >
            <h3
              className="font-semibold mb-2"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#00186D' }}
            >
              Confirmar pagamento
            </h3>
            <p className="text-sm mb-2" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              Use isto apenas se você já recebeu o pagamento fora do sistema (transferência, dinheiro, etc.). A inscrição passará para "Confirmado" e o participante receberá o e-mail de confirmação.
            </p>
            {confirmError && (
              <p className="text-sm mb-2" style={{ color: '#DC2626', fontFamily: 'var(--font-sans)' }}>
                {confirmError}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setConfirmPaymentModal(null)}
                className="px-4 py-2 text-sm rounded-xl"
                style={{ border: '1px solid rgba(0,24,109,0.15)', color: '#33425C', fontFamily: 'var(--font-sans)' }}
              >
                Voltar
              </button>
              <button
                onClick={() => handleConfirmPayment(confirmPaymentModal)}
                disabled={confirmingPayment}
                className="px-4 py-2 text-sm font-semibold rounded-xl"
                style={{ background: '#166534', color: '#FFFFFF', fontFamily: 'var(--font-sans)', opacity: confirmingPayment ? 0.7 : 1 }}
              >
                {confirmingPayment ? 'Confirmando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal de reenvio do e-mail de confirmação ── */}
      {resendModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-7"
            style={{ background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
          >
            <h3
              className="font-semibold mb-2"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#00186D' }}
            >
              Reenviar e-mail
            </h3>
            <p className="text-sm mb-2" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              O e-mail de confirmação, com o QR code de credenciamento, será enviado novamente para{' '}
              <span style={{ color: '#33425C', fontWeight: 600 }}>
                {registrations.find((r) => r.id === resendModal)?.user.email}
              </span>
              .
            </p>
            {resendError && (
              <p className="text-sm mb-2" style={{ color: '#DC2626', fontFamily: 'var(--font-sans)' }}>
                {resendError}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setResendModal(null)}
                className="px-4 py-2 text-sm rounded-xl"
                style={{ border: '1px solid rgba(0,24,109,0.15)', color: '#33425C', fontFamily: 'var(--font-sans)' }}
              >
                Voltar
              </button>
              <button
                onClick={() => handleResend(resendModal)}
                disabled={resending}
                className="px-4 py-2 text-sm font-semibold rounded-xl"
                style={{ background: '#00186D', color: '#FFFFFF', fontFamily: 'var(--font-sans)', opacity: resending ? 0.7 : 1 }}
              >
                {resending ? 'Enviando...' : 'Reenviar e-mail'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Aviso flutuante (reenvio / falha ao gerar PDF) ── */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-xs rounded-xl px-4 py-3 text-sm"
          style={{
            background: '#00186D',
            color: '#FFFFFF',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {toast}
        </div>
      )}
    </DashboardLayout>
  )
}
