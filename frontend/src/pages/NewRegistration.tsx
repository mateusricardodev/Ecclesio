import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import { WizardCard, WizardField, WizardInput, wizardPrimaryBtn, wizardSecondaryBtn } from '../components/WizardShared'
import api from '../api/axios'

export function NewRegistration() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    name: '', email: '', cpf: '', phone: '', birthDate: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function formatCpf(v: string) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2')
  }
  function formatPhone(v: string) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post(`/events/${eventId}/registrations`, {
        name:      form.name,
        email:     form.email,
        cpf:       form.cpf.replace(/\D/g,''),
        phone:     form.phone.replace(/\D/g,'') || undefined,
        birthDate: form.birthDate || undefined,
      })
      setSuccess(true)
      setTimeout(() => navigate(`/events/${eventId}`), 2000)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message ?? 'Erro ao criar inscrição.')
    } finally {
      setLoading(false)
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
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: '#00186D' }}>
              Inscrição realizada!
            </h2>
            <p className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              Redirecionando para o evento...
            </p>
          </div>
        </div>
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
            style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}
          >
            <ArrowLeft size={14} /> Voltar ao evento
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}>
            Inscrições
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: '#00186D', lineHeight: 1.2 }}>
            Nova inscrição
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
            <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}>
              Dados básicos
            </p>
            <WizardField label="Nome completo" required>
              <WizardInput
                type="text" name="name" value={form.name}
                onChange={handleChange}
                placeholder="Ex: João Pedro Almeida"
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
              <WizardField label="E-mail" required>
                <WizardInput
                  type="email" name="email" value={form.email}
                  onChange={handleChange}
                  placeholder="exemplo@email.com"
                  required
                />
              </WizardField>
            </div>
          </WizardCard>

          <WizardCard>
            <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}>
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
                  onChange={handleChange}
                />
              </WizardField>
            </div>
          </WizardCard>

          <div className="flex items-center justify-between pb-8">
            <button
              type="button"
              onClick={() => navigate(`/events/${eventId}`)}
              style={wizardSecondaryBtn()}
            >
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={wizardPrimaryBtn(loading)}>
              {loading ? 'Cadastrando...' : 'Confirmar inscrição'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
