import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, ImageIcon, Copy, ExternalLink } from 'lucide-react'
import { EventWizardHeader } from '../components/EventWizardHeader'
import { DashboardLayout } from '../components/DashboardLayout'
import { WizardField, WizardCard, WizardInput, WizardTextarea, Toggle, wizardNavBtn, wizardPrimaryBtn, wizardSecondaryBtn } from '../components/WizardShared'
import api, { API_BASE_URL } from '../api/axios'

export function EventSetupPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [title, setTitle]               = useState('')
  const [about, setAbout]               = useState('')
  const [aboutEnabled, setAboutEnabled] = useState(false)
  const [isPublished, setIsPublished]   = useState(false)
  const [slug, setSlug]                 = useState('')
  const [bannerUrl, setBannerUrl]       = useState<string | null>(null)
  const [uploading, setUploading]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [publishing, setPublishing]     = useState(false)
  const [saved, setSaved]               = useState(false)
  const [done, setDone]                 = useState(false)
  const [copied, setCopied]             = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/events/${id}`).then(({ data }) => {
      setTitle(data.title ?? '')
      setAbout(data.about ?? '')
      setAboutEnabled(!!data.about)
      setIsPublished(data.isPublished ?? false)
      setSlug(data.slug ?? '')
      setBannerUrl(data.bannerUrl ?? null)
    })
  }, [id])

  async function handleSave() {
    if (!id) return
    setSaving(true)
    setSaved(false)
    try {
      await api.put(`/events/${id}`, { title, about: aboutEnabled ? about : '', isPublished })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!id) return
    setPublishing(true)
    try {
      await api.put(`/events/${id}`, { title, about: aboutEnabled ? about : '', isPublished: true })
      setIsPublished(true)
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 2500)
    } finally {
      setPublishing(false)
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post(`/events/${id}/banner`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setBannerUrl(data.bannerUrl)
    } finally {
      setUploading(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl)
    } catch {
      const el = document.createElement('textarea')
      el.value = publicUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const publicUrl = `${window.location.origin}/evento/${slug}`

  if (done) {
    return (
      <DashboardLayout active="eventos">
        <div className="flex flex-col items-center justify-center gap-5 py-24">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,24,109,0.07)' }}
          >
            <CheckCircle size={32} style={{ color: '#00186D' }} />
          </div>
          <div className="text-center">
            <h2
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: '#00186D' }}
            >
              Evento publicado com sucesso!
            </h2>
            <p className="text-sm mt-1" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              Redirecionando para o painel...
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout active="eventos">
      <EventWizardHeader active="page" eventId={id} />

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 md:gap-6 pb-8">

        {/* Sidebar de seções: vira faixa de largura cheia no mobile */}
        <aside className="w-full md:w-52 md:shrink-0">
          <WizardCard>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}
            >
              Seções da página
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                Descrição
              </span>
              <Toggle enabled={aboutEnabled} onToggle={() => setAboutEnabled((v) => !v)} />
            </div>
          </WizardCard>
        </aside>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Nome */}
          <WizardCard>
            <WizardField label="Nome do evento">
              <WizardInput value={title} onChange={(e) => setTitle(e.target.value)} />
            </WizardField>
          </WizardCard>

          {/* Banner */}
          <WizardCard>
            <WizardField label="Imagem de capa">
              {bannerUrl ? (
                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden">
                  <img
                    src={`${API_BASE_URL}${bannerUrl}`}
                    alt="Capa do evento"
                    className="w-full h-full object-cover"
                  />
                  <label
                    className="absolute inset-0 flex items-center justify-center cursor-pointer transition-all"
                    style={{ background: 'rgba(0,24,109,0.45)' }}
                  >
                    <span className="text-white text-sm font-medium" style={{ fontFamily: 'var(--font-sans)' }}>
                      {uploading ? 'Enviando...' : 'Alterar imagem'}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploading} />
                  </label>
                </div>
              ) : (
                <label
                  className="flex flex-col items-center justify-center w-full aspect-[16/9] rounded-xl cursor-pointer transition-all"
                  style={{ border: '2px dashed rgba(0,24,109,0.2)', background: 'rgba(0,24,109,0.02)' }}
                >
                  {uploading ? (
                    <span className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>Enviando...</span>
                  ) : (
                    <>
                      <ImageIcon size={28} style={{ color: '#9CA3AF', marginBottom: '0.5rem' }} />
                      <span className="text-sm" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
                        Clique para anexar uma imagem
                      </span>
                      <span className="text-xs mt-1" style={{ color: '#9CA3AF', fontFamily: 'var(--font-sans)' }}>
                        PNG, JPG ou WebP · máx. 5 MB
                      </span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploading} />
                </label>
              )}
            </WizardField>
          </WizardCard>

          {/* Descrição (condicional) */}
          {aboutEnabled && (
            <WizardCard>
              <WizardField label="Descrição">
                <WizardTextarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={5}
                  placeholder="Descreva o evento para os participantes..."
                />
              </WizardField>
            </WizardCard>
          )}

          {/* Ações */}
          <WizardCard>
            {saved && (
              <p className="text-xs font-medium" style={{ color: '#166534', fontFamily: 'var(--font-sans)' }}>
                Alterações salvas.
              </p>
            )}

            {/* Link público */}
            {slug && (
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(0,24,109,0.04)', border: '1px solid rgba(0,24,109,0.1)' }}
              >
                <span className="flex-1 min-w-0 text-xs truncate" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                  {publicUrl}
                </span>
                <button onClick={copyLink} className="p-1 rounded transition-all" style={{ color: copied ? '#00186D' : '#6B7280' }} title="Copiar link">
                  <Copy size={14} />
                </button>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded" style={{ color: '#6B7280' }} title="Pré-visualizar">
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
            {copied && (
              <p className="text-xs" style={{ color: '#00186D', fontFamily: 'var(--font-sans)' }}>
                Link copiado!
              </p>
            )}

            <div className="flex items-center flex-wrap gap-x-3 gap-y-2 pt-1" style={{ borderTop: '1px solid rgba(0,24,109,0.07)' }}>
              <span className="text-sm font-medium" style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}>
                Publicar evento
              </span>
              <Toggle enabled={isPublished} onToggle={() => setIsPublished((v) => !v)} />
              <span className="text-xs" style={{ color: isPublished ? '#00186D' : '#9CA3AF', fontFamily: 'var(--font-sans)' }}>
                {isPublished ? 'Publicado' : 'Não publicado'}
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-3">
              <button onClick={handleSave} disabled={saving} style={wizardSecondaryBtn()}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={handlePublish} disabled={publishing} style={wizardPrimaryBtn(publishing)}>
                {publishing ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </WizardCard>

          <div className="flex">
            <button onClick={() => navigate(`/events/${id}/setup/form`)} style={wizardNavBtn()}>
              Passo anterior
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
