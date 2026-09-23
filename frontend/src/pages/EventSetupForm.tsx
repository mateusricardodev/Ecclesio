import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { EventWizardHeader } from '../components/EventWizardHeader'
import { DashboardLayout } from '../components/DashboardLayout'
import { WizardCard, Toggle, wizardNavBtn, wizardPrimaryBtn } from '../components/WizardShared'
import api, { API_BASE_URL } from '../api/axios'

const FIELD_GROUPS = [
  {
    label: 'Dados pessoais',
    fields: ['Data de Nascimento', 'Sexo', 'Estado Civil', 'Celular', 'Telefone Fixo'],
  },
  {
    label: 'Endereço',
    fields: ['CEP', 'Endereço: logradouro', 'Endereço: número', 'Endereço: bairro', 'Endereço: complemento', 'Cidade', 'Estado', 'País'],
  },
  {
    label: 'Contato do responsável',
    fields: ['Nome do Responsável', 'Telefone do Responsável'],
  },
  { label: 'Saúde',      fields: ['Usa Medicamento'] },
  { label: 'Documentos', fields: ['Autorização de Responsável'] },
]

const FIXED_FIELDS = ['Nome completo', 'Documento (CPF)', 'E-mail']
const AUTHORIZATION_FIELD = 'Autorização de Responsável'

export function EventSetupForm() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [saving, setSaving]   = useState(false)
  const [authFormUrl, setAuthFormUrl] = useState<string | null>(null)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get(`/events/${id}`).then(({ data }) => {
      setAuthFormUrl(data.authorizationFormUrl ?? null)
      if (data.formFields) {
        try { setEnabled(new Set(JSON.parse(data.formFields))) } catch { /* invalid JSON */ }
      }
    })
  }, [id])

  function toggle(field: string) {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(field)) { next.delete(field) } else { next.add(field) }
      return next
    })
  }

  async function handleAuthFormUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !id) return
    setUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post(`/events/${id}/authorization-form`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAuthFormUrl(data.authorizationFormUrl)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setUploadError(e?.response?.data?.message ?? 'Não foi possível enviar o arquivo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleAuthFormRemove() {
    if (!id) return
    setUploading(true)
    setUploadError('')
    try {
      await api.delete(`/events/${id}/authorization-form`)
      setAuthFormUrl(null)
    } catch {
      setUploadError('Não foi possível remover o arquivo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleNext() {
    if (!id) return
    setSaving(true)
    try {
      await api.put(`/events/${id}`, { formFields: JSON.stringify([...enabled]) })
      navigate(`/events/${id}/setup/page`)
    } finally {
      setSaving(false)
    }
  }

  const colHdr = (label: string, cls: string) => (
    <span
      key={label}
      className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${cls}`}
      style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}
    >
      {label}
    </span>
  )

  return (
    <DashboardLayout active="eventos">
      <EventWizardHeader active="form" eventId={id} />

      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <WizardCard>
          {/* Cabeçalho da tabela */}
          <div
            className="grid grid-cols-3 pb-2"
            style={{ borderBottom: '1px solid rgba(0,24,109,0.08)' }}
          >
            {colHdr('Campo',              'col-span-1')}
            {colHdr('Obrigatório',        'col-span-1 text-center')}
            {colHdr('Ativado / Desativado', 'col-span-1 text-right')}
          </div>

          {/* Campos fixos */}
          {FIXED_FIELDS.map((field) => (
            <div
              key={field}
              className="grid grid-cols-3 items-center py-3"
              style={{ borderBottom: '1px solid rgba(0,24,109,0.06)' }}
            >
              <span className="text-sm font-medium" style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}>
                {field}
              </span>
              <div className="flex justify-center">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ background: '#00186D' }}
                >
                  <Check size={11} color="white" />
                </span>
              </div>
              <div className="flex justify-end">
                <span className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}>
                  Obrigatório
                </span>
              </div>
            </div>
          ))}

          {/* Grupos opcionais */}
          {FIELD_GROUPS.map((group) => (
            <div key={group.label}>
              <div
                className="py-2 mt-2"
                style={{ borderTop: '1px solid rgba(0,24,109,0.06)' }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}
                >
                  {group.label}
                </span>
              </div>

              {group.fields.map((field) => (
                <div
                  key={field}
                  className="grid grid-cols-3 items-center py-3"
                  style={{ borderBottom: '1px solid rgba(0,24,109,0.05)' }}
                >
                  <span className="text-sm" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                    {field}
                  </span>
                  <span />
                  <div className="flex items-center justify-end gap-2.5">
                    <span className="text-xs" style={{ color: enabled.has(field) ? '#00186D' : '#9CA3AF', fontFamily: 'var(--font-sans)' }}>
                      {enabled.has(field) ? 'Ativo' : 'Inativo'}
                    </span>
                    <Toggle enabled={enabled.has(field)} onToggle={() => toggle(field)} />
                  </div>
                  {field === AUTHORIZATION_FIELD && enabled.has(field) && (
                    <div className="col-span-3 mt-3 flex flex-col gap-2">
                      <p className="text-xs" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                        Envie o modelo (PDF) que o participante vai baixar, preencher e entregar no dia do evento.
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        {authFormUrl && (
                          <a
                            href={`${API_BASE_URL}${authFormUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm underline"
                            style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}
                          >
                            Ver modelo enviado
                          </a>
                        )}
                        <label
                          className="text-sm font-semibold px-4 py-1.5 rounded-full cursor-pointer"
                          style={{ background: '#00186D', color: '#FFFFFF', fontFamily: 'var(--font-sans)', opacity: uploading ? 0.6 : 1 }}
                        >
                          {uploading ? 'Enviando...' : authFormUrl ? 'Trocar PDF' : 'Enviar PDF'}
                          <input type="file" accept="application/pdf" className="hidden" onChange={handleAuthFormUpload} disabled={uploading} />
                        </label>
                        {authFormUrl && (
                          <button
                            type="button"
                            onClick={handleAuthFormRemove}
                            disabled={uploading}
                            className="text-sm"
                            style={{ color: '#991B1B', fontFamily: 'var(--font-sans)' }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      {uploadError && (
                        <p className="text-xs" style={{ color: '#991B1B', fontFamily: 'var(--font-sans)' }}>{uploadError}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </WizardCard>

        <div className="flex items-center justify-between pb-8">
          <button onClick={() => navigate(`/events/${id}/setup/payment`)} style={wizardNavBtn()}>
            Passo anterior
          </button>
          <button onClick={handleNext} disabled={saving} style={wizardPrimaryBtn(saving)}>
            {saving ? 'Salvando...' : 'Próximo passo'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
