import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { EventWizardHeader } from '../components/EventWizardHeader'
import { DashboardLayout } from '../components/DashboardLayout'
import { WizardField, WizardCard, WizardInput, WizardSelect, wizardNavBtn, wizardPrimaryBtn, wizardSecondaryBtn } from '../components/WizardShared'
import api from '../api/axios'

interface PaymentMethod {
  id: string
  type: string
  value: string
  installments: number
  description: string | null
  startDate: string | null
  endDate: string | null
}

const TYPE_LABELS: Record<string, string> = {
  pix:         'Pix',
  credit_card: 'Cartão de crédito',
  debit_card:  'Cartão de débito',
  cash:        'Dinheiro',
}

export function EventSetupPayment() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({
    type: 'pix', value: '', installments: '1', description: '', startDate: '', endDate: '',
  })

  useEffect(() => {
    if (!id) return
    api.get(`/events/${id}/payment-methods`).then(({ data }) => setMethods(data))
  }, [id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleAdd() {
    if (!id) return
    setSaving(true)
    try {
      const { data } = await api.post(`/events/${id}/payment-methods`, {
        type:         form.type,
        value:        form.value ? Number(form.value) : 0,
        installments: form.type === 'credit_card' ? Number(form.installments) : 1,
        description:  form.description || undefined,
        startDate:    form.startDate || undefined,
        endDate:      form.endDate || undefined,
      })
      setMethods((m) => [...m, data])
      setForm({ type: 'pix', value: '', installments: '1', description: '', startDate: '', endDate: '' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(methodId: string) {
    await api.delete(`/events/${id}/payment-methods/${methodId}`)
    setMethods((m) => m.filter((x) => x.id !== methodId))
  }

  const canProceed = methods.length > 0

  return (
    <DashboardLayout active="eventos">
      <EventWizardHeader active="payment" eventId={id} />

      <div className="max-w-2xl mx-auto flex flex-col gap-5">

        {/* Formas cadastradas */}
        {methods.length > 0 && (
          <WizardCard>
            <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              Modalidades cadastradas
            </p>
            <div className="flex flex-col gap-2">
              {methods.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between rounded-xl px-4 py-3"
                  style={{ background: 'rgba(0,24,109,0.04)', border: '1px solid rgba(0,24,109,0.08)' }}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                        R$ {Number(m.value).toFixed(2).replace('.', ',')}
                      </span>
                      {m.type === 'credit_card' && (
                        <span className="text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                          {m.installments}x
                        </span>
                      )}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,24,109,0.08)', color: '#00186D', fontFamily: 'var(--font-sans)' }}
                      >
                        {TYPE_LABELS[m.type] ?? m.type}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-xs mt-1" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>{m.description}</p>
                    )}
                    {m.startDate && m.endDate && (
                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}>
                        {new Date(m.startDate).toLocaleDateString('pt-BR')} a {new Date(m.endDate).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="p-1 rounded-lg transition-all ml-3 shrink-0"
                    style={{ color: '#EF4444' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </WizardCard>
        )}

        {/* Formulário nova modalidade */}
        <WizardCard>
          <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
            Adicionar modalidade
          </p>

          <WizardField label="Forma de pagamento" required>
            <WizardSelect name="type" value={form.type} onChange={handleChange}>
              <option value="pix">Pix</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="debit_card">Cartão de débito</option>
              <option value="cash">Dinheiro</option>
            </WizardSelect>
          </WizardField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.type === 'credit_card' && (
              <WizardField label="Número de parcelas">
                <WizardSelect name="installments" value={form.installments} onChange={handleChange}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                    <option key={n} value={n}>até {n}x</option>
                  ))}
                </WizardSelect>
              </WizardField>
            )}
            <WizardField label="Valor" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>R$</span>
                <WizardInput name="value" type="number" min={0} step="0.01" value={form.value} onChange={handleChange} placeholder="0,00" style={{ paddingLeft: '2.25rem' }} />
              </div>
            </WizardField>
          </div>

          <WizardField label="Descrição">
            <WizardInput name="description" type="text" value={form.description} onChange={handleChange} placeholder="Ex: R$ 50 na inscrição + R$ 50 no dia do evento" />
          </WizardField>

          <div className="grid grid-cols-2 gap-4">
            <WizardField label="Data início">
              <WizardInput name="startDate" type="date" value={form.startDate} onChange={handleChange} />
            </WizardField>
            <WizardField label="Data término">
              <WizardInput name="endDate" type="date" value={form.endDate} onChange={handleChange} />
            </WizardField>
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={handleAdd} disabled={saving} style={wizardSecondaryBtn()}>
              {saving ? 'Adicionando...' : '+ Adicionar modalidade'}
            </button>
          </div>
        </WizardCard>

        {!canProceed && (
          <p className="text-center text-xs" style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}>
            Adicione ao menos uma forma de pagamento para avançar.
          </p>
        )}

        {/* Navegação */}
        <div className="flex items-center justify-between pb-8">
          <button onClick={() => navigate(`/events/${id}/edit`)} style={wizardNavBtn()}>
            ← Passo anterior
          </button>
          {canProceed && (
            <button onClick={() => navigate(`/events/${id}/setup/form`)} style={wizardPrimaryBtn()}>
              Próximo passo →
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
