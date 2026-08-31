import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { EventWizardHeader } from '../components/EventWizardHeader'
import { DashboardLayout } from '../components/DashboardLayout'
import { WizardField, WizardCard, WizardInput, WizardSelect, wizardNavBtn, wizardPrimaryBtn, wizardSecondaryBtn } from '../components/WizardShared'
import api from '../api/axios'

const CATEGORIES = [
  'Acampamentos', 'Ação Social', 'Conferências', 'Congressos', 'Cultos',
  'Encontros', 'Eventos esportivos', 'Feiras e exposições', 'Humor',
  'Legendários', 'Missa', 'Retiros', 'Shows e Festas', 'Workshops e Cursos',
]

function toDateInput(iso: string | null | undefined) {
  if (!iso) return ''
  return iso.split('T')[0]
}

export function EditEvent() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [saved, setSaved]     = useState(false)

  const [form, setForm] = useState({
    title: '', slug: '', category: '', maxParticipants: '',
    date: '', endDate: '', location: '', organizerPhone: '',
  })

  useEffect(() => {
    if (!id) return
    api.get(`/events/${id}`)
      .then(({ data }) => {
        setForm({
          title:           data.title ?? '',
          slug:            data.slug ?? '',
          category:        data.category ?? '',
          maxParticipants: data.maxParticipants != null ? String(data.maxParticipants) : '',
          date:            toDateInput(data.date),
          endDate:         toDateInput(data.endDate),
          location:        data.location ?? '',
          organizerPhone:  data.organizerPhone ?? '',
        })
      })
      .catch(() => setError('Não foi possível carregar os dados do evento.'))
      .finally(() => setLoading(false))
  }, [id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: name === 'slug' ? value.toLowerCase().replace(/[^a-z0-9-]/g, '-') : value,
    }))
  }

  async function save(): Promise<boolean> {
    if (!id) return false
    if (!form.title.trim()) { setError('Nome do evento é obrigatório'); return false }
    if (!form.date)          { setError('Data de início é obrigatória'); return false }
    setError('')
    setSaving(true)
    setSaved(false)
    try {
      await api.put(`/events/${id}`, {
        title:           form.title,
        slug:            form.slug || undefined,
        category:        form.category || undefined,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        date:            new Date(form.date + 'T00:00').toISOString(),
        endDate:         form.endDate ? new Date(form.endDate + 'T00:00').toISOString() : undefined,
        location:        form.location || undefined,
        organizerPhone:  form.organizerPhone || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      return true
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message ?? 'Erro ao salvar evento')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAndNext() {
    const ok = await save()
    if (ok) navigate(`/events/${id}/setup/payment`)
  }

  const baseUrl = `${window.location.origin}/evento/`

  if (loading) {
    return (
      <DashboardLayout active="eventos">
        <EventWizardHeader active="info" eventId={id} />
        <p className="text-center py-20 text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
          Carregando...
        </p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout active="eventos">
      <EventWizardHeader active="info" eventId={id} />

      <div className="max-w-2xl mx-auto">
        {error && <FeedbackBanner type="error" message={error} />}
        {saved && <FeedbackBanner type="success" message="Alterações salvas com sucesso!" />}

        <form onSubmit={(e) => { e.preventDefault(); save() }} noValidate className="flex flex-col gap-5">
          <WizardCard>
            <WizardField label="Endereço da página do evento">
              <div
                className="flex items-center overflow-hidden"
                style={{ border: '1px solid rgba(0,24,109,0.15)', borderRadius: '10px' }}
              >
                <span
                  className="px-3 py-2.5 text-xs shrink-0"
                  style={{ background: 'rgba(0,24,109,0.04)', borderRight: '1px solid rgba(0,24,109,0.12)', color: '#00186D', fontFamily: 'var(--font-sans)' }}
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
              <WizardInput name="title" value={form.title} onChange={handleChange} placeholder="Nome será destacado na página do evento" />
            </WizardField>

            <WizardField label="Categoria">
              <WizardSelect name="category" value={form.category} onChange={handleChange}>
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

            <WizardField label="Telefone do organizador">
              <WizardInput name="organizerPhone" value={form.organizerPhone} onChange={handleChange} placeholder="(11) 99999-9999" />
            </WizardField>
          </WizardCard>

          <div className="flex items-center justify-between pb-8">
            <button type="button" onClick={() => navigate(`/events/${id}`)} style={wizardNavBtn()}>
              ← Voltar ao evento
            </button>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving} style={wizardSecondaryBtn()}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" disabled={saving} onClick={handleSaveAndNext} style={wizardPrimaryBtn(saving)}>
                Próximo passo →
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

function FeedbackBanner({ type, message }: { type: 'error' | 'success'; message: string }) {
  const styles = type === 'error'
    ? { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }
    : { background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }
  return (
    <div className="text-sm rounded-xl px-4 py-3 mb-4" style={{ ...styles, fontFamily: 'var(--font-sans)' }}>
      {message}
    </div>
  )
}
