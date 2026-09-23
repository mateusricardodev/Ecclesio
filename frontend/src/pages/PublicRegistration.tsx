import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api, { API_BASE_URL } from '../api/axios'
import { formatBRL } from '../lib/money'

interface PaymentMethod {
  id: string
  type: string
  value: string
  installments: number
  description: string | null
  /** Taxa de serviço da plataforma, já calculada no backend (0 para dinheiro). */
  feeAmount: number
  /** Total efetivamente cobrado: valor da inscrição + taxa. */
  totalAmount: number
}

interface EventInfo {
  title: string
  date: string
  location: string | null
  paymentMethods: PaymentMethod[]
  formFields: string | null
  whatsappGroupUrl: string | null
  authorizationFormUrl: string | null
}

const TYPE_LABELS: Record<string, string> = {
  pix:         'PIX',
  credit_card: 'Cartão de crédito',
  debit_card:  'Cartão de débito',
  cash:        'Dinheiro',
}

function formatCpf(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatPhone(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

function formatCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

type FieldInput = { label: string; placeholder?: string; type?: 'text' | 'date'; format?: (v: string) => string }

const FIELD_CONFIG: Record<string, FieldInput> = {
  'CEP':                      { label: 'CEP',                      placeholder: '00000-000', format: formatCep },
  'Cidade':                   { label: 'Cidade',                   placeholder: 'Ex: São Paulo' },
  'Data de Nascimento':       { label: 'Data de nascimento',       type: 'date' },
  'Endereço: bairro':         { label: 'Bairro',                   placeholder: 'Ex: Centro' },
  'Endereço: complemento':    { label: 'Complemento',              placeholder: 'Ex: Apto 12' },
  'Endereço: logradouro':     { label: 'Logradouro',               placeholder: 'Ex: Rua das Flores' },
  'Endereço: número':         { label: 'Número',                   placeholder: 'Ex: 123' },
  'Estado':                   { label: 'Estado',                   placeholder: 'Ex: SP' },
  'Estado Civil':             { label: 'Estado civil',             placeholder: 'Ex: Solteiro(a)' },
  'Sexo':                     { label: 'Sexo',                     placeholder: 'Ex: Masculino' },
  'Telefone Fixo':            { label: 'Telefone fixo',            placeholder: '(00) 0000-0000' },
  'País':                     { label: 'País',                     placeholder: 'Ex: Brasil' },
  'Nome do Responsável':      { label: 'Nome do responsável',      placeholder: 'Ex: Maria da Silva' },
  'Telefone do Responsável':  { label: 'Telefone do responsável',  placeholder: '(00) 00000-0000', format: formatPhone },
}

const PERSONAL_FIELDS    = ['Data de Nascimento', 'Sexo', 'Estado Civil']
const ADDRESS_FIELDS     = ['CEP', 'Endereço: logradouro', 'Endereço: número', 'Endereço: bairro', 'Endereço: complemento', 'Cidade', 'Estado', 'País']
const RESPONSIBLE_FIELDS = ['Nome do Responsável', 'Telefone do Responsável']
const EXTRA_SKIP         = new Set(['Celular', 'Telefone Fixo'])
// Campos habilitados que seguem opcionais: nem todo endereço tem complemento,
// e exigir um obrigaria a pessoa a inventar um valor pra conseguir se inscrever.
const OPTIONAL_FIELDS    = new Set(['Endereço: complemento'])

const inputStyle: React.CSSProperties = {
  width:        '100%',
  background:   '#FAFAFA',
  border:       '1px solid rgba(0,24,109,0.15)',
  borderRadius: '10px',
  color:        '#0A0A09',
  fontFamily:   'var(--font-sans)',
  fontSize:     '0.875rem',
  padding:      '0.625rem 0.75rem',
  outline:      'none',
}

const labelStyle: React.CSSProperties = {
  display:     'block',
  fontSize:    '0.8125rem',
  fontWeight:  500,
  color:       '#33425C',
  fontFamily:  'var(--font-sans)',
  marginBottom: '0.375rem',
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize:      '0.625rem',
  fontWeight:    700,
  color:         '#D4B16A',
  fontFamily:    'var(--font-sans)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

export function PublicRegistration() {
  const { slug }       = useParams<{ slug: string }>()
  const navigate       = useNavigate()

  const [event, setEvent]           = useState<EventInfo | null>(null)
  const [loading, setLoading]       = useState(true)
  const [notFound, setNotFound]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const [paymentMethodId, setPaymentMethodId]   = useState('')
  const [usaMedicamento, setUsaMedicamento]     = useState<'sim' | 'nao' | ''>('')
  const [qualMedicamento, setQualMedicamento]   = useState('')
  const [cepLoading, setCepLoading]             = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', cpf: '', phone: '', birthDate: '',
    termsAccepted: false,
    extra: {} as Record<string, string>,
  })

  useEffect(() => {
    if (!slug) return
    api.get(`/public/events/${slug}`)
      .then(({ data }) => setEvent(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const enabled: Set<string> = (() => {
    if (!event?.formFields) return new Set()
    try { return new Set<string>(JSON.parse(event.formFields)) } catch { return new Set() }
  })()

  function setExtra(key: string, value: string) {
    setForm(f => ({ ...f, extra: { ...f.extra, [key]: value } }))
  }

  async function handleCepChange(raw: string) {
    const formatted = formatCep(raw)
    setExtra('CEP', formatted)
    const digits = raw.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) return
      const candidates: Record<string, string> = {
        'Endereço: logradouro':  data.logradouro ?? '',
        'Endereço: bairro':      data.bairro ?? '',
        'Endereço: complemento': data.complemento ?? '',
        'Cidade':                data.localidade ?? '',
        'Estado':                data.uf ?? '',
        'País':                  'Brasil',
      }
      setForm(f => {
        const extra = { ...f.extra }
        for (const [key, value] of Object.entries(candidates)) {
          if (enabled.has(key) && value) extra[key] = value
        }
        return { ...f, extra }
      })
    } catch {
      // falha silenciosa
    } finally {
      setCepLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.termsAccepted) {
      setError('Você deve aceitar os termos para continuar.')
      return
    }
    // Os campos de texto/data são cobertos pelo required nativo, que barra o
    // submit antes daqui. "Faz uso de medicamento?" é um par de botões, não um
    // controle de formulário, então precisa de checagem própria.
    if (enabled.has('Usa Medicamento') && !usaMedicamento) {
      setError('Informe se faz uso de medicamento para continuar.')
      return
    }
    if (!paymentMethodId) {
      setError('Selecione uma forma de pagamento para continuar.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const extraFields: Record<string, string> = {}
      for (const key of enabled) {
        if (!EXTRA_SKIP.has(key) && key !== 'Data de Nascimento' && key !== 'Usa Medicamento' && key !== 'Autorização de Responsável' && form.extra[key]) {
          extraFields[key] = form.extra[key]
        }
      }
      if (enabled.has('Usa Medicamento') && usaMedicamento) {
        extraFields['Usa Medicamento'] = usaMedicamento
        if (usaMedicamento === 'sim' && qualMedicamento.trim()) {
          extraFields['Qual Medicamento'] = qualMedicamento.trim()
        }
      }

      const { data } = await api.post(`/public/events/${slug}/register`, {
        paymentMethodId,
        fullName:       form.fullName,
        email:          form.email,
        cpf:            form.cpf.replace(/\D/g, ''),
        phone:          form.phone.replace(/\D/g, '') || undefined,
        birthDate:      form.birthDate || undefined,
        ...(Object.keys(extraFields).length > 0 && { extraFields }),
        termsAccepted: true,
      })

      if (data.status === 'confirmed') {
        navigate(`/evento/${slug}/pagamento-pix`, {
          state: {
            registrationId:  data.registrationId,
            code:            data.code,
            participantName: form.fullName,
            participantCpf:  form.cpf,
            amount:          0,
            eventTitle:      event?.title,
            whatsappGroupUrl: event?.whatsappGroupUrl,
            email:           form.email,
            free:            true,
          },
        })
        return
      }

      // Dinheiro: vaga garantida, pagamento presencial no dia do evento
      if (data.paymentType === 'cash') {
        navigate(`/evento/${slug}/pagamento-pix`, {
          state: {
            registrationId:  data.registrationId,
            code:            data.code,
            participantName: form.fullName,
            participantCpf:  form.cpf,
            amount:          0,
            amountDue:       Number(data.amount),
            eventTitle:      event?.title,
            whatsappGroupUrl: event?.whatsappGroupUrl,
            email:           form.email,
            cashPending:     true,
          },
        })
        return
      }

      navigate(`/evento/${slug}/pagamento-pix`, {
        state: {
          registrationId:     data.registrationId,
          code:               data.code,
          participantName:    form.fullName,
          participantCpf:     form.cpf,
          providerPaymentId:  data.providerPaymentId,
          qrCodeBase64:       data.qrCodeBase64,
          qrCodeCopiaECola:   data.qrCodeCopiaECola,
          expiresAt:          data.expiresAt,
          amount:             data.amount,
          eventTitle:         event?.title,
          whatsappGroupUrl:   event?.whatsappGroupUrl,
          email:              form.email,
          reused:             data.reused,
        },
      })
    } catch (err: unknown) {
      const e   = err as { response?: { data?: { message?: string | string[] } } }
      const msg = e?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erro ao realizar inscrição.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F2E8' }}>
      <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>Carregando...</p>
    </div>
  )

  if (notFound || !event) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: '#F5F2E8' }}>
      <p className="text-lg font-semibold" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>Evento não encontrado</p>
      <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>O endereço pode estar incorreto ou o evento não está publicado.</p>
    </div>
  )

  const startDate = new Date(event.date)
  const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  const hasPersonal    = PERSONAL_FIELDS.some(f => enabled.has(f))
  const hasAddress     = ADDRESS_FIELDS.some(f => enabled.has(f))
  const hasResponsible = RESPONSIBLE_FIELDS.some(f => enabled.has(f))

  // Todo campo que o organizador habilitou em formFields é obrigatório, salvo os
  // de OPTIONAL_FIELDS. "Qual Medicamento" também escapa, mas de graça: o input
  // só é renderizado quando a resposta é "sim", então o required nativo já cai
  // fora sozinho no "não".
  function renderField(fieldName: string) {
    const config = FIELD_CONFIG[fieldName]
    if (!config || !enabled.has(fieldName) || EXTRA_SKIP.has(fieldName)) return null
    const isRequired = !OPTIONAL_FIELDS.has(fieldName)
    const label      = `${config.label}${isRequired ? ' *' : ''}`
    const isBirthDate = fieldName === 'Data de Nascimento'
    if (isBirthDate) {
      return (
        <div key={fieldName}>
          <label style={labelStyle}>{label}</label>
          <input type="date" value={form.birthDate} required={isRequired} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} style={inputStyle} />
        </div>
      )
    }
    return (
      <div key={fieldName}>
        <label style={labelStyle}>{label}</label>
        <input
          type="text"
          value={form.extra[fieldName] ?? ''}
          required={isRequired}
          onChange={e => setExtra(fieldName, config.format ? config.format(e.target.value) : e.target.value)}
          placeholder={config.placeholder}
          style={inputStyle}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F2E8' }}>
      {/* Topbar mínima */}
      <div className="w-full py-3 px-6 flex items-center" style={{ background: '#00186D' }}>
        <img src="/logo-ecclesio.png" alt="Ecclesio" className="h-6 brightness-0 invert" />
      </div>

      {/* Cabeçalho do evento */}
      <div className="py-8 px-4" style={{ background: '#00186D' }}>
        <div className="max-w-2xl mx-auto">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.2 }}>
            {event.title}
          </h1>
          <p className="text-sm mt-1 capitalize" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)' }}>
            {formatDate(startDate)}{event.location && ` · ${event.location}`}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,24,109,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          {/* Título do formulário */}
          <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}>
            <p style={sectionLabelStyle}>Formulário de inscrição</p>
            <p className="text-xl font-semibold mt-0.5" style={{ color: '#00186D', fontFamily: 'var(--font-display)' }}>
              Preencha seus dados
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Dados básicos */}
            <div className="px-6 py-5 flex flex-col gap-4" style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}>
              <p style={sectionLabelStyle}>Dados básicos</p>
              <div>
                <label style={labelStyle}>Nome completo *</label>
                <input type="text" value={form.fullName} required onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Ex: João Pedro Silva" style={inputStyle} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>E-mail *</label>
                  <input type="email" value={form.email} required onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="seu@email.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>CPF *</label>
                  <input type="text" value={form.cpf} required onChange={e => setForm(f => ({ ...f, cpf: formatCpf(e.target.value) }))} placeholder="000.000.000-00" style={inputStyle} />
                </div>
              </div>
              <div>
                {/* O input existe sempre, mas só vira obrigatório se o
                    organizador marcou "Celular" entre os campos do formulário. */}
                <label style={labelStyle}>Telefone / WhatsApp{enabled.has('Celular') ? ' *' : ''}</label>
                <input type="text" value={form.phone} required={enabled.has('Celular')} onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} placeholder="(00) 00000-0000" style={inputStyle} />
              </div>
            </div>

            {/* Dados pessoais */}
            {hasPersonal && (
              <div className="px-6 py-5 flex flex-col gap-4" style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}>
                <p style={sectionLabelStyle}>Dados pessoais</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PERSONAL_FIELDS.map(renderField)}
                </div>
              </div>
            )}

            {/* Contato do responsável */}
            {hasResponsible && (
              <div className="px-6 py-5 flex flex-col gap-4" style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}>
                <p style={sectionLabelStyle}>Contato do responsável</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {RESPONSIBLE_FIELDS.map(renderField)}
                </div>
              </div>
            )}

            {/* Saúde */}
            {enabled.has('Usa Medicamento') && (
              <div className="px-6 py-5 flex flex-col gap-4" style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}>
                <p style={sectionLabelStyle}>Saúde</p>
                <div>
                  <label style={labelStyle}>Faz uso de medicamento? *</label>
                  <div className="flex gap-2 mt-1">
                    {(['sim', 'nao'] as const).map((opcao) => (
                      <button
                        key={opcao}
                        type="button"
                        onClick={() => { setUsaMedicamento(opcao); if (opcao === 'nao') setQualMedicamento('') }}
                        className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                        style={
                          usaMedicamento === opcao
                            ? { background: '#00186D', color: '#FFFFFF', border: '1.5px solid #00186D' }
                            : { background: 'transparent', color: '#6B7280', border: '1.5px solid rgba(0,24,109,0.2)' }
                        }
                      >
                        {opcao === 'sim' ? 'Sim' : 'Não'}
                      </button>
                    ))}
                  </div>
                </div>
                {usaMedicamento === 'sim' && (
                  <div>
                    <label style={labelStyle}>Qual medicamento? *</label>
                    <input type="text" value={qualMedicamento} required onChange={e => setQualMedicamento(e.target.value)} placeholder="Ex: Ritalina 10mg" style={inputStyle} />
                  </div>
                )}
              </div>
            )}

            {/* Endereço */}
            {hasAddress && (
              <div className="px-6 py-5 flex flex-col gap-4" style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}>
                <p style={sectionLabelStyle}>Endereço</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {enabled.has('CEP') && (
                    <div key="CEP">
                      <label style={labelStyle}>CEP *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.extra['CEP'] ?? ''}
                          required
                          onChange={e => handleCepChange(e.target.value)}
                          placeholder="00000-000"
                          style={inputStyle}
                        />
                        {cepLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: '#00186D' }}>
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 000 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {ADDRESS_FIELDS.filter(f => f !== 'CEP').map(renderField)}
                </div>
              </div>
            )}

            {/* Autorização de Responsável */}
            {enabled.has('Autorização de Responsável') && (
              <div className="px-6 py-5 flex flex-col gap-3" style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}>
                <p style={sectionLabelStyle}>Documentos</p>
                <div
                  className="flex items-start gap-4 rounded-xl p-4"
                  style={{ background: 'rgba(0,24,109,0.03)', border: '1px solid rgba(0,24,109,0.08)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: '#00186D' }}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>Autorização de Responsável</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                      {event.authorizationFormUrl
                        ? 'Baixe o modelo, preencha, assine e entregue no dia do evento.'
                        : 'Traga a autorização assinada pelo responsável no dia do evento.'}
                    </p>
                    {event.authorizationFormUrl && (
                      <a
                        href={`${API_BASE_URL}${event.authorizationFormUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                        style={{ background: '#00186D', color: '#FFFFFF', fontFamily: 'var(--font-sans)' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Baixar modelo
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Forma de pagamento */}
            <div className="px-6 py-5 flex flex-col gap-3" style={{ borderBottom: '1px solid rgba(0,24,109,0.07)' }}>
              <p style={sectionLabelStyle}>Forma de pagamento</p>
              {event.paymentMethods.length === 0 ? (
                <p
                  className="text-sm rounded-xl px-4 py-3"
                  style={{ color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA', fontFamily: 'var(--font-sans)' }}
                >
                  Nenhuma forma de pagamento disponível para este evento.
                </p>
              ) : (
                event.paymentMethods.map(method => {
                  const selected = method.id === paymentMethodId
                  const value    = Number(method.value)
                  const fee      = Number(method.feeAmount ?? 0)
                  const total    = Number(method.totalAmount ?? value)
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethodId(method.id)}
                      className="w-full text-left rounded-xl px-4 py-3 transition-all text-sm"
                      style={{
                        border:     selected ? '1.5px solid #00186D' : '1px solid rgba(0,24,109,0.12)',
                        background: selected ? 'rgba(0,24,109,0.04)' : 'transparent',
                        boxShadow:  selected ? '0 0 0 2px rgba(0,24,109,0.1)' : 'none',
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold" style={{ color: selected ? '#00186D' : '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                          {TYPE_LABELS[method.type] ?? method.type}
                        </span>
                        <span className="font-bold" style={{ color: selected ? '#00186D' : '#33425C', fontFamily: 'var(--font-sans)' }}>
                          {value === 0 ? 'Grátis' : formatBRL(total)}
                        </span>
                      </div>
                      {fee > 0 && (
                        <p className="text-xs mt-1" style={{ color: selected ? 'rgba(0,24,109,0.6)' : '#6B7280', fontFamily: 'var(--font-sans)' }}>
                          {formatBRL(value)} de inscrição + {formatBRL(fee)} de taxa de serviço
                        </p>
                      )}
                      {method.description && (
                        <p className="text-xs mt-1" style={{ color: selected ? 'rgba(0,24,109,0.6)' : '#6B7280', fontFamily: 'var(--font-sans)' }}>
                          {method.description}
                        </p>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            {/* Termos e Submit */}
            <div className="px-6 py-5 flex flex-col gap-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.termsAccepted}
                  onChange={e => setForm(f => ({ ...f, termsAccepted: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 shrink-0"
                  style={{ accentColor: '#00186D' }}
                />
                <span className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                  Concordo com os termos de participação e autorizo o uso dos meus dados para fins de organização do evento.
                </span>
              </label>

              {error && (
                <p
                  className="text-sm rounded-xl px-3 py-2"
                  style={{ color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA', fontFamily: 'var(--font-sans)' }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !form.termsAccepted}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background:  (submitting || !form.termsAccepted) ? 'rgba(0,24,109,0.4)' : '#00186D',
                  color:       '#FFFFFF',
                  fontFamily:  'var(--font-sans)',
                  cursor:      (submitting || !form.termsAccepted) ? 'not-allowed' : 'pointer',
                  boxShadow:   (submitting || !form.termsAccepted) ? 'none' : '0 4px 14px rgba(0,24,109,0.25)',
                }}
              >
                {submitting && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 000 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                  </svg>
                )}
                {submitting ? 'Processando...' : 'Confirmar inscrição →'}
              </button>

              <Link
                to={`/evento/${slug}`}
                className="text-center text-sm transition-colors"
                style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}
              >
                ← Voltar para o evento
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
