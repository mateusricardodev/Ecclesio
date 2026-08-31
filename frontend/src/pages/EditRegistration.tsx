import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import { WizardCard, WizardField, WizardInput, wizardPrimaryBtn } from '../components/WizardShared'
import api from '../api/axios'

interface Registration {
  id: string
  status: string
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

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  failed: 'Falhou',
}

/**
 * Uma cobrança emitida por gateway (Pix/cartão) e ainda em aberto carrega o
 * valor antigo no QR — o backend recusa a alteração até ela ser paga ou
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
  const [payment, setPayment]                   = useState<Registration['payment']>(null)

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
          if (reg.extraFields) {
            try {
              const parsed = JSON.parse(reg.extraFields) as Record<string, string>
              const { 'Usa Medicamento': usaMed, 'Qual Medicamento': qualMed, ...rest } = parsed
              setExtraMap(rest)
              if (usaMed) setUsaMedicamento(usaMed as 'sim' | 'nao')
              if (qualMed) setQualMedicamento(qualMed)
            } catch { /* invalid JSON */ }
          }
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

  const amountLocked  = hasOpenGatewayCharge(payment)
  const amountChanged = !amountLocked && Number(amount || 0) !== Number(initialAmount || 0)

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
        // Só vai no payload se o organizador mexeu no campo — enviar sempre
        // criaria um Payment de R$ 0 em toda edição de inscrição sem valor.
        ...(amountChanged && { amount: Math.round(Number(amount || 0) * 100) / 100 }),
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

  const extraFormKeys = formFieldKeys.filter((k) => !BASE_ONLY.has(k))
  const legacyKeys    = Object.keys(extraMap).filter((k) => !formFieldKeys.includes(k) && k !== 'Qual Medicamento')
  const allExtraKeys  = [...new Set([...extraFormKeys, ...legacyKeys])]
  const showUsaMed    = formFieldKeys.includes('Usa Medicamento')

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
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 600, color: '#00186D' }}>
              Inscrição atualizada!
            </h2>
            <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>
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
        <p className="text-center py-20 text-sm" style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>Carregando...</p>
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
            style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}
          >
            <ArrowLeft size={14} /> Voltar ao evento
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: '#D4B16A', fontFamily: 'Cinzel, serif' }}>
            Inscrições
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', fontWeight: 600, color: '#00186D', lineHeight: 1.2 }}>
            Editar inscrição
          </h1>
        </div>

        {error && (
          <div
            className="mb-4 text-sm rounded-xl px-4 py-3"
            style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', fontFamily: 'Inter, sans-serif' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <WizardCard>
            <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: '#D4B16A', fontFamily: 'Cinzel, serif' }}>
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
            <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: '#D4B16A', fontFamily: 'Cinzel, serif' }}>
              Dados complementares
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="Celular">
                <WizardInput
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
                  placeholder="(00) 00000-0000"
                />
              </WizardField>
              <WizardField label="Data de nascimento">
                <WizardInput
                  type="date" name="birthDate" value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </WizardField>
            </div>
          </WizardCard>

          <WizardCard>
            <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: '#D4B16A', fontFamily: 'Cinzel, serif' }}>
              Pagamento
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <WizardField label="Valor da inscrição">
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}
                  >
                    R$
                  </span>
                  <WizardInput
                    type="number" min={0} step="0.01" inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    disabled={amountLocked}
                    style={{
                      paddingLeft: '2.25rem',
                      ...(amountLocked ? { cursor: 'not-allowed', opacity: 0.55 } : {}),
                    }}
                  />
                </div>
              </WizardField>
              <WizardField label="Status do pagamento">
                <WizardInput
                  value={payment ? (PAYMENT_STATUS_LABELS[payment.status] ?? payment.status) : 'Sem lançamento'}
                  disabled
                  style={{ cursor: 'not-allowed', opacity: 0.55 }}
                />
              </WizardField>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>
              {amountLocked
                ? 'Há uma cobrança em aberto no gateway com o valor atual. Só é possível alterá-lo depois que ela for paga ou vencer.'
                : payment?.status === 'paid'
                  ? 'Pagamento já confirmado. Alterar o valor corrige apenas o registro — não gera cobrança nem estorno.'
                  : 'Valor cobrado desta inscrição. Fica registrado como recebido se a inscrição já estiver confirmada, ou como pendente até a confirmação do pagamento.'}
            </p>
          </WizardCard>

          {(allExtraKeys.length > 0 || showUsaMed) && (
            <WizardCard>
              <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: '#D4B16A', fontFamily: 'Cinzel, serif' }}>
                Campos do formulário
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allExtraKeys.map((key) => (
                  <WizardField key={key} label={FIELD_LABELS[key] ?? key}>
                    <WizardInput
                      value={extraMap[key] ?? ''}
                      onChange={(e) => setExtraMap((m) => ({ ...m, [key]: e.target.value }))}
                    />
                  </WizardField>
                ))}

                {showUsaMed && (
                  <div className="sm:col-span-2 flex flex-col gap-2">
                    <p className="text-sm font-medium" style={{ color: '#33425C', fontFamily: 'Inter, sans-serif' }}>
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
                          className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                          style={
                            usaMedicamento === op
                              ? { background: '#00186D', color: '#FFFFFF', border: '1.5px solid #00186D' }
                              : { background: 'transparent', color: '#6B7280', border: '1.5px solid rgba(0,24,109,0.2)' }
                          }
                        >
                          {op === 'sim' ? 'Sim' : 'Não'}
                        </button>
                      ))}
                    </div>
                    {usaMedicamento === 'sim' && (
                      <WizardField label="Qual medicamento?">
                        <WizardInput
                          value={qualMedicamento}
                          onChange={(e) => setQualMedicamento(e.target.value)}
                          placeholder="Ex: Ritalina 10mg"
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
