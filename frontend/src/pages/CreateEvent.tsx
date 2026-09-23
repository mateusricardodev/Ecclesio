import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EventWizardHeader } from '../components/EventWizardHeader'
import { DashboardLayout } from '../components/DashboardLayout'
import { WizardField, WizardCard, WizardInput, WizardSelect, WizardTextarea, wizardPrimaryBtn } from '../components/WizardShared'
import api from '../api/axios'

const CATEGORIES = [
  'Acampamentos', 'Ação Social', 'Conferências', 'Congressos', 'Cultos',
  'Encontros', 'Eventos esportivos', 'Feiras e exposições', 'Humor',
  'Legendários', 'Missa', 'Retiros', 'Shows e Festas', 'Workshops e Cursos',
]

export function CreateEvent() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    slug: '', title: '', category: '', maxParticipants: '',
    date: '', endDate: '', location: '', description: '', organizerPhone: '', whatsappGroupUrl: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: name === 'slug' ? value.toLowerCase().replace(/[^a-z0-9-]/g, '-') : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/events', {
        title:           form.title,
        slug:            form.slug || undefined,
        category:        form.category || undefined,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        date:            new Date(form.date + 'T00:00').toISOString(),
        endDate:         form.endDate ? new Date(form.endDate + 'T00:00').toISOString() : undefined,
        location:        form.location || undefined,
        description:     form.description || undefined,
        organizerPhone:  form.organizerPhone || undefined,
        whatsappGroupUrl: form.whatsappGroupUrl.trim() || undefined,
      })
      navigate(`/events/${data.id}/setup/payment`)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message ?? 'Erro ao criar evento')
    } finally {
      setLoading(false)
    }
  }

  const baseUrl = `${window.location.origin}/evento/`

  return (
    <DashboardLayout active="eventos">
      <EventWizardHeader active="info" />

      <div className="max-w-2xl mx-auto">
        {error && <Alert message={error} />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <WizardCard>
            <WizardField label="Endereço da página do evento">
              <div
                className="flex items-center overflow-hidden"
                style={{ border: '1px solid rgba(0,24,109,0.15)', borderRadius: '10px' }}
              >
                <span
                  className="px-3 py-2.5 text-xs shrink-0"
                  style={{
                    background: 'rgba(0,24,109,0.04)',
                    borderRight: '1px solid rgba(0,24,109,0.12)',
                    color: '#00186D',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {baseUrl}
                </span>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="nome-do-evento"
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'transparent', color: '#0A0A09', fontFamily: 'var(--font-sans)' }}
                />
              </div>
            </WizardField>

            <WizardField label="Nome do evento" required>
              <WizardInput name="title" value={form.title} onChange={handleChange} placeholder="Ex: Retiro de Jovens 2025" required />
            </WizardField>

            <WizardField label="Categoria" required>
              <WizardSelect name="category" value={form.category} onChange={handleChange} required>
                <option value="">Selecione...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </WizardSelect>
            </WizardField>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <WizardField label="Limite de inscritos">
                <WizardInput name="maxParticipants" type="number" min={1} value={form.maxParticipants} onChange={handleChange} placeholder="Sem limite" />
              </WizardField>
              <WizardField label="Data de início" required>
                <WizardInput name="date" type="date" value={form.date} onChange={handleChange} required />
              </WizardField>
              <WizardField label="Data de término">
                <WizardInput name="endDate" type="date" value={form.endDate} onChange={handleChange} />
              </WizardField>
            </div>

            <WizardField label="Local do evento">
              <WizardInput name="location" value={form.location} onChange={handleChange} placeholder="Ex: Centro de Convenções — São Paulo, SP" />
            </WizardField>

            <WizardField label="Descrição">
              <WizardTextarea name="description" value={form.description} onChange={handleChange} placeholder="Descreva brevemente o evento para os participantes..." rows={3} />
            </WizardField>

            <WizardField label="Telefone do organizador">
              <WizardInput name="organizerPhone" value={form.organizerPhone} onChange={handleChange} placeholder="(11) 99999-9999" />
            </WizardField>

            <WizardField label="Link do grupo de WhatsApp">
              <WizardInput name="whatsappGroupUrl" type="url" value={form.whatsappGroupUrl} onChange={handleChange} placeholder="https://chat.whatsapp.com/..." />
            </WizardField>
          </WizardCard>

          <div className="flex justify-end pb-8">
            <button type="submit" disabled={loading} style={wizardPrimaryBtn(loading)}>
              {loading ? 'Criando...' : 'Próximo passo →'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

function Alert({ message }: { message: string }) {
  return (
    <div className="text-sm rounded-xl px-4 py-3 mb-5" style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', fontFamily: 'var(--font-sans)' }}>
      {message}
    </div>
  )
}
