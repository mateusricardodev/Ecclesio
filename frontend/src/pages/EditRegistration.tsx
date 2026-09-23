import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, FileDown, Mail } from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import { WizardCard, WizardField, WizardInput, WizardSelect, wizardPrimaryBtn } from '../components/WizardShared'
import api from '../api/axios'
import { downloadTicketPdf } from '../lib/ticketPdf'

interface Registration {
  id: string
  status: string
  code: string | null
  cpf: string | null
  phone: string | null
  birthDate: string | null
  extraFields: string | null
  user: { id: string; name: string; email: string }
  ticket: { id: string; name: string; price: string } | null
  payment: {
    id: string
    status: string
    amount: string
    method: string | null
    provider: string
  } | null
}

const PAYMENT_METHOD_OPTIONS = [
  { value: 'pix',         label: 'Pix' },
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'debit_card',  label: 'Cartão de débito' },
  { value: 'cash',        label: 'Dinheiro' },
]

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  failed: 'Falhou',
}

/**
 * Uma cobrança emitida por gateway (Pix/cartão) e ainda em aberto carrega o
 * valor antigo no QR. O backend recusa a alteração até ela ser paga ou
 * vencer, então o campo aparece travado.
 */
function hasOpenGatewayCharge(payment: Registration['payment']): boolean {
  return (
    !!payment &&
    payment.status === 'pending' &&
    payment.provider !== 'manual' &&
    payment.provider !== 'cash'
  )
}

const FIELD_LABELS: Record<string, string> = {
  'CEP':                     'CEP',
  'Cidade':                  'Cidade',
  'Endereço: bairro':        'Bairro',
  'Endereço: complemento':   'Complemento',
  'Endereço: logradouro':    'Logradouro',
  'Endereço: número':        'Número',
  'Estado':                  'Estado',
  'Estado Civil':            'Estado civil',
  'Sexo':                    'Sexo',
  'País':                    'País',
  'Nome do Responsável':     'Nome do responsável',
  'Telefone do Responsável': 'Telefone do responsável',
}

const BASE_ONLY = new Set([
  'Celular',
  'Data de Nascimento',
  'Autorização de Responsável',
  'Telefone Fixo',
  'Usa Medicamento',
])

// Mesma exceção da inscrição pública: nem todo endereço tem complemento.
const OPTIONAL_FIELDS = new Set(['Endereço: complemento'])

export function EditRegistration() {
  const { id: eventId, regId } = useParams<{ id: string; regId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    name: '', email: '', cpf: '', phone: '', birthDate: '',
  })
  const [formFieldKeys, setFormFieldKeys]       = useState<string[]>([])
  const [extraMap, setExtraMap]                 = useState<Record<string, string>>({})
  const [usaMedicamento, setUsaMedicamento]     = useState<'sim' | 'nao' | ''>('')
  const [qualMedicamento, setQualMedicamento]   = useState('')
  const [amount, setAmount]                     = useState('')
  const [initialAmount, setInitialAmount]       = useState('')
  const [method, setMethod]                     = useState('')
  const [initialMethod, setInitialMethod]       = useState('')
  const [payment, setPayment]                   = useState<Registration['payment']>(null)
  /** Dados que alimentam o ingresso em PDF e o reenvio do e-mail. */
  const [ticket, setTicket] = useState<{
    code: string | null
    status: string
    eventTitle: string
    eventDate: string
    eventLocation: string | null
    amountPaid: number | null
  } | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [resending, setResending]     = useState(false)
  const [ticketMsg, setTicketMsg]     = useState<{ type: 'ok' | 'erro'; text: string } | null>(null)
  /**
   * O que já vinha preenchido quando a inscrição foi carregada. Só esses campos
   * são obrigatórios: a edição não pode apagar um dado existente, mas também não
   * força a completar o que o evento nunca chegou a coletar (inscrição antiga,
   * ou lançada pelo organizador sem campos extras).
   */
  const [filledOnLoad, setFilledOnLoad] = useState({
    phone: false,
    birthDate: false,
    qualMedicamento: false,
    extra: new Set<string>(),
  })

  useEffect(() => {
    if (!eventId || !regId) return
    Promise.all([
      api.get(`/events/${eventId}`),
      api.get(`/events/${eventId}/registrations?limit=1000`),
    ])
      .then(([evtRes, regRes]) => {
        const eventData = evtRes.data
        const reg: Registration = regRes.data.data.find((r: Registration) => r.id === regId)
        if (eventData.formFields) {
          try { setFormFieldKeys(JSON.parse(eventData.formFields) as string[]) } catch { /* invalid JSON */ }
        }
        if (reg) {
          setTicket({
            code: reg.code,
            status: reg.status,
            eventTitle: eventData.title,
            eventDate: eventData.date,
            eventLocation: eventData.location ?? null,
            // O ingresso só anuncia "valor pago" quando o pagamento está quitado.
            amountPaid: reg.payment?.status === 'paid' ? Number(reg.payment.amount) : null,
          })
          setForm({
            name:      reg.user.name,
            email:     reg.user.email,
            cpf:       reg.cpf  ? reg.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '',
            phone:     reg.phone ? reg.phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '',
            birthDate: reg.birthDate ? reg.birthDate.split('T')[0] : '',
          })
          setPayment(reg.payment)
          const loadedAmount = reg.payment ? Number(reg.payment.amount).toFixed(2) : ''
          setAmount(loadedAmount)
          setInitialAmount(loadedAmount)
          const loadedMethod = reg.payment?.method ?? ''
          setMethod(loadedMethod)
          setInitialMethod(loadedMethod)
          let parsedExtra: Record<string, string> = {}
          if (reg.extraFields) {
            try {
              parsedExtra = JSON.parse(reg.extraFields) as Record<string, string>
            } catch { /* invalid JSON */ }
          }
          const { 'Usa Medicamento': usaMed, 'Qual Medicamento': qualMed, ...rest } = parsedExtra
          setExtraMap(rest)
          if (usaMed) setUsaMedicamento(usaMed as 'sim' | 'nao')
          if (qualMed) setQualMedicamento(qualMed)
          setFilledOnLoad({
            phone:           !!reg.phone,
            birthDate:       !!reg.birthDate,
            qualMedicamento: !!qualMed?.trim(),
            extra: new Set(
              Object.entries(rest).filter(([, v]) => v?.trim()).map(([key]) => key),
            ),
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [eventId, regId])

  function formatCpf(v: string) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2')
  }
  function formatPhone(v: string) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2')
  }

  // Valor e modalidade viajam no mesmo Payment, então a cobrança em aberto no
  // gateway trava os dois campos de uma vez.
  const paymentLocked = hasOpenGatewayCharge(payment)
  const amountChanged = !paymentLocked && Number(amount || 0) !== Number(initialAmount || 0)
  const methodChanged = !paymentLocked && method !== initialMethod

  const extraFormKeys = formFieldKeys.filter((k) => !BASE_ONLY.has(k))
  const legacyKeys    = Object.keys(extraMap).filter((k) => !formFieldKeys.includes(k) && k !== 'Qual Medicamento')
  const allExtraKeys  = [...new Set([...extraFormKeys, ...legacyKeys])]
  const showUsaMed    = formFieldKeys.includes('Usa Medicamento')
  // Obrigatório aqui significa "não pode ser apagado", não "precisa ser
  // preenchido": só entram os campos que já vinham com valor. Campos que o
  // evento pede mas nunca foram coletados seguem editáveis e vazios, senão uma
  // correção de nome ficaria travada atrás de um endereço que ninguém tem.
  const requiredExtraKeys = new Set(
    [...filledOnLoad.extra].filter((k) => !OPTIONAL_FIELDS.has(k)),
  )

  async function handleDownloadTicket() {
    if (!ticket) return
    setDownloading(true)
    setTicketMsg(null)
    try {
      await downloadTicketPdf({
        code: ticket.code,
        registrationId: regId,
        eventTitle: ticket.eventTitle,
        eventDate: ticket.eventDate,
        eventLocation: ticket.eventLocation,
        participantName: form.name,
        participantCpf: form.cpf || null,
        email: form.email,
        amount: ticket.amountPaid,
      })
    } catch {
      setTicketMsg({ type: 'erro', text: 'Não foi possível gerar o PDF do ingresso.' })
    } finally {
      setDownloading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setTicketMsg(null)
    try {
      const { data } = await api.post(`/registrations/${regId}/resend-confirmation`)
      setTicketMsg({ type: 'ok', text: `E-mail de confirmação reenviado para ${data.email}.` })
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setTicketMsg({
        type: 'erro',
        text: e?.response?.data?.message ?? 'Não foi possível reenviar o e-mail.',
      })
    } finally {
      setResending(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const updatedExtra: Record<string, string> = { ...extraMap }
      if (formFieldKeys.includes('Usa Medicamento') && usaMedicamento) {
        updatedExtra['Usa Medicamento'] = usaMedicamento
        if (usaMedicamento === 'sim' && qualMedicamento.trim()) {
          updatedExtra['Qual Medicamento'] = qualMedicamento.trim()
        } else {
          delete updatedExtra['Qual Medicamento']
        }
      }
      await api.put(`/registrations/${regId}`, {
        name:      form.name,
        cpf:       form.cpf.replace(/\D/g,''),
        phone:     form.phone.replace(/\D/g,'') || undefined,
        birthDate: form.birthDate || undefined,
        ...(Object.keys(updatedExtra).length > 0 && { extraFields: updatedExtra }),
        // Só vão no payload se o organizador mexeu nos campos; enviar sempre
        // criaria um Payment vazio em toda edição de inscrição sem pagamento.
        ...(amountChanged && { amount: Math.round(Number(amount || 0) * 100) / 100 }),
        ...(methodChanged && { method: method || null }),
      })
      setSuccess(true)
      setTimeout(() => navigate(`/events/${eventId}`), 2000)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message ?? 'Erro ao salvar alterações.')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <DashboardLayout active="eventos">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,24,109,0.07)' }}
            >
              <CheckCircle size={28} style={{ color: '#00186D' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', fontSize: '1.875rem', fontWeight: 400, color: '#0A0A09' }}>
              Inscrição atualizada!
            </h2>
            <p className="text-sm" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
              Redirecionando para o evento...
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout active="eventos">
        <p className="text-center py-20 text-sm" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>Carregando...</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout active="eventos">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            to={`/events/${eventId}`}
            className="inline-flex items-center gap-1.5 text-sm mb-4"
            style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}
          >
            <ArrowLeft size={14} /> Voltar ao evento
          </Link>
          <p className="ecc-eyebrow mb-1"
 style={{ color: '#00186D' }}>
            Inscrições
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', fontSize: '2.5rem', fontWeight: 400, color: '#0A0A09', lineHeight: 1.2 }}>
            Editar inscrição
          </h1>
        </div>

        {error && (
          <div
            className="mb-4 text-sm rounded-xl px-4 py-3"
            style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', fontFamily: 'var(--font-sans)' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <WizardCard>
            <p className="ecc-eyebrow"
 style={{ color: '#00186D' }}>
              Dados básicos
            </p>
            <WizardField label="Nome completo" required>
              <WizardInput
                name="name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </WizardField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="CPF" required>
                <WizardInput
                  value={form.cpf}
                  onChange={(e) => setForm((f) => ({ ...f, cpf: formatCpf(e.target.value) }))}
                  placeholder="000.000.000-00" required
                />
              </WizardField>
              <WizardField label="E-mail">
                <WizardInput value={form.email} disabled style={{ cursor: 'not-allowed', opacity: 0.55 }} />
              </WizardField>
            </div>
          </WizardCard>

          <WizardCard>
            <p className="ecc-eyebrow"
 style={{ color: '#00186D' }}>
              Dados complementares
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="Celular" required={filledOnLoad.phone}>
                <WizardInput
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
                  placeholder="(00) 00000-0000"
                  required={filledOnLoad.phone}
                />
              </WizardField>
              <WizardField label="Data de nascimento" required={filledOnLoad.birthDate}>
                <WizardInput
                  type="date" name="birthDate" value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                  required={filledOnLoad.birthDate}
                />
              </WizardField>
            </div>
          </WizardCard>

          <WizardCard>
            <p className="ecc-eyebrow"
 style={{ color: '#00186D' }}>
              Pagamento
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="Valor da inscrição">
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}
                  >
                    R$
                  </span>
                  <WizardInput
                    type="number" min={0} step="0.01" inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    disabled={paymentLocked}
                    style={{
                      paddingLeft: '2.25rem',
                      ...(paymentLocked ? { cursor: 'not-allowed', opacity: 0.55 } : {}),
                    }}
                  />
                </div>
              </WizardField>
              <WizardField label="Forma de pagamento">
                <WizardSelect
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  disabled={paymentLocked}
                  style={paymentLocked ? { cursor: 'not-allowed', opacity: 0.55 } : undefined}
                >
                  <option value="">Não informada</option>
                  {PAYMENT_METHOD_OPTIONS.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </WizardSelect>
              </WizardField>
              <WizardField label="Status do pagamento">
                <WizardInput
                  value={payment ? (PAYMENT_STATUS_LABELS[payment.status] ?? payment.status) : 'Sem lançamento'}
                  disabled
                  style={{ cursor: 'not-allowed', opacity: 0.55 }}
                />
              </WizardField>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
              {paymentLocked
                ? 'Há uma cobrança em aberto no gateway com o valor e a forma de pagamento atuais. Só é possível alterá-los depois que ela for paga ou vencer.'
                : payment?.status === 'paid'
                  ? 'Pagamento já confirmado. Alterar valor ou forma de pagamento corrige apenas o registro. Não gera cobrança nem estorno.'
                  : 'Valor e forma de pagamento desta inscrição. Ficam registrados como recebidos se a inscrição já estiver confirmada, ou como pendentes até a confirmação do pagamento.'}
            </p>
          </WizardCard>

          <WizardCard>
            <p className="ecc-eyebrow"
 style={{ color: '#00186D' }}>
              Ingresso e confirmação
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleDownloadTicket}
                disabled={downloading || !ticket?.code}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full"
                style={{
                  border: '1px solid #E9E9E9',
                  color: '#00186D',
                  background: '#FFFFFF',
                  fontFamily: 'var(--font-sans)',
                  cursor: ticket?.code ? 'pointer' : 'not-allowed',
                  opacity: ticket?.code ? (downloading ? 0.6 : 1) : 0.5,
                }}
              >
                <FileDown size={15} />
                {downloading ? 'Gerando...' : 'Baixar PDF da inscrição'}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || ticket?.status !== 'confirmed'}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full"
                style={{
                  border: '1px solid #E9E9E9',
                  color: '#00186D',
                  background: '#FFFFFF',
                  fontFamily: 'var(--font-sans)',
                  cursor: ticket?.status === 'confirmed' ? 'pointer' : 'not-allowed',
                  opacity: ticket?.status === 'confirmed' ? (resending ? 0.6 : 1) : 0.5,
                }}
              >
                <Mail size={15} />
                {resending ? 'Enviando...' : 'Reenviar e-mail de confirmação'}
              </button>
            </div>
            {ticketMsg && (
              <p
                className="text-xs"
                style={{
                  color: ticketMsg.type === 'ok' ? '#166534' : '#DC2626',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {ticketMsg.text}
              </p>
            )}
            <p className="text-xs leading-relaxed" style={{ color: '#6F6F6F', fontFamily: 'var(--font-sans)' }}>
              {!ticket?.code
                ? 'Esta inscrição não tem código de credenciamento, então não é possível gerar o ingresso em PDF.'
                : ticket.status !== 'confirmed'
                  ? 'O e-mail de confirmação só pode ser reenviado depois que a inscrição estiver confirmada. O PDF já pode ser baixado e enviado por outro canal.'
                  : 'O PDF traz o QR code de credenciamento, útil para quem não recebeu o e-mail. O reenvio dispara a mesma mensagem de confirmação para o e-mail cadastrado.'}
            </p>
          </WizardCard>

          {(allExtraKeys.length > 0 || showUsaMed) && (
            <WizardCard>
              <p className="ecc-eyebrow"
 style={{ color: '#00186D' }}>
                Campos do formulário
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allExtraKeys.map((key) => (
                  <WizardField key={key} label={FIELD_LABELS[key] ?? key} required={requiredExtraKeys.has(key)}>
                    <WizardInput
                      value={extraMap[key] ?? ''}
                      onChange={(e) => setExtraMap((m) => ({ ...m, [key]: e.target.value }))}
                      required={requiredExtraKeys.has(key)}
                    />
                  </WizardField>
                ))}

                {showUsaMed && (
                  <div className="sm:col-span-2 flex flex-col gap-2">
                    <p className="text-sm font-medium" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                      Faz uso de medicamento?
                    </p>
                    <div className="flex gap-2">
                      {(['sim', 'nao'] as const).map((op) => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => {
                            setUsaMedicamento(op)
                            if (op === 'nao') setQualMedicamento('')
                          }}
                          className="px-5 py-2 rounded-full text-sm font-bold transition-all"
                          style={
                            usaMedicamento === op
                              ? { background: '#00186D', color: '#FFFFFF', border: '1.5px solid #00186D' }
                              : { background: 'transparent', color: '#6F6F6F', border: '1.5px solid rgba(0,24,109,0.2)' }
                          }
                        >
                          {op === 'sim' ? 'Sim' : 'Não'}
                        </button>
                      ))}
                    </div>
                    {usaMedicamento === 'sim' && (
                      <WizardField label="Qual medicamento?" required={filledOnLoad.qualMedicamento}>
                        <WizardInput
                          value={qualMedicamento}
                          onChange={(e) => setQualMedicamento(e.target.value)}
                          placeholder="Ex: Ritalina 10mg"
                          required={filledOnLoad.qualMedicamento}
                        />
                      </WizardField>
                    )}
                  </div>
                )}
              </div>
            </WizardCard>
          )}

          <div className="flex items-center justify-end gap-3 pb-8">
            <button type="submit" disabled={saving} style={wizardPrimaryBtn(saving)}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
