import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import api from '../api/axios'
import { useAuthStore } from '../store/auth.store'

type Mode = 'login' | 'register'

// Só aceita caminhos internos ("/app/eventos"), nunca URLs absolutas ou "//host"
function safeRedirect(raw: string | null): string {
  if (!raw) return '/dashboard'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

export function Login() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>(searchParams.get('modo') === 'cadastro' ? 'register' : 'login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const redirectTo = safeRedirect(searchParams.get('redirect'))

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setSuccess('')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const me = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      setAuth(me.data, data.access_token)
      navigate(redirectTo, { replace: true })
    } catch {
      setError('E-mail ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', { name, email, password })
      setSuccess('Conta criada! Faça login para continuar.')
      setName('')
      setConfirmPassword('')
      setMode('login')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message ?? 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row lg:p-5 gap-5">
      {/* Formulário */}
      <div className="flex-1 flex flex-col px-4 sm:px-10 lg:px-14 pt-6 pb-10">
        <Link to="/" className="self-start">
          <img src="/logo-horizontal.png" alt="Ecclesio" className="h-8 sm:h-9 object-contain" />
        </Link>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[440px] mx-auto lg:mx-0 py-12">
            <p className="ecc-eyebrow">{isLogin ? 'Entrar' : 'Criar conta'}</p>
            <h1 className="ecc-display text-[48px] sm:text-[60px] mt-6">
              {isLogin ? 'Bem-vindo de volta.' : 'Comece seu evento.'}
            </h1>
            <p className="ecc-paragraph mt-5">
              {isLogin
                ? 'Acesse o painel para acompanhar inscrições, pagamentos e check-in.'
                : 'A conta é gratuita. Você cria o evento e compartilha o link com a comunidade.'}
            </p>

            <div className="flex gap-1 rounded-full bg-[#F5F5F5] p-1 mt-10">
              {(['login', 'register'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-all ${
                    mode === m ? 'bg-white text-ecc-navy shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'text-ecc-text'
                  }`}
                  style={{ letterSpacing: '-0.025em' }}
                >
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>

            {success && (
              <p className="text-sm rounded-2xl px-4 py-3 mt-6 bg-[#F0FDF4] text-ecc-green border border-[#BBF7D0]">{success}</p>
            )}
            {error && (
              <p className="text-sm rounded-2xl px-4 py-3 mt-6 bg-ecc-red-soft text-ecc-red border border-[#FECACA]">{error}</p>
            )}

            {isLogin ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-5 mt-8">
                <Field label="E-mail">
                  <input
                    type="email" autoComplete="email" placeholder="seu@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required
                    className={inputClass}
                  />
                </Field>
                <Field label="Senha">
                  <PasswordInput
                    value={password} onChange={setPassword} placeholder="Sua senha"
                    visible={showPassword} onToggle={() => setShowPassword((v) => !v)}
                    autoComplete="current-password"
                  />
                </Field>
                <PrimaryButton loading={loading} label="Entrar" loadingLabel="Entrando..." />
              </form>
            ) : (
              <form onSubmit={handleRegister} className="flex flex-col gap-5 mt-8">
                <Field label="Nome completo">
                  <input
                    type="text" autoComplete="name" placeholder="Seu nome"
                    value={name} onChange={(e) => setName(e.target.value)} required
                    className={inputClass}
                  />
                </Field>
                <Field label="E-mail">
                  <input
                    type="email" autoComplete="email" placeholder="seu@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required
                    className={inputClass}
                  />
                </Field>
                <Field label="Senha">
                  <PasswordInput
                    value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" minLength={6}
                    visible={showPassword} onToggle={() => setShowPassword((v) => !v)}
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Confirmar senha">
                  <PasswordInput
                    value={confirmPassword} onChange={setConfirmPassword} placeholder="Repita a senha"
                    visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)}
                    autoComplete="new-password"
                  />
                </Field>
                <PrimaryButton loading={loading} label="Criar conta" loadingLabel="Criando..." />
              </form>
            )}

            <p className="text-xs text-ecc-text mt-6">
              Ao continuar, você concorda com a{' '}
              <Link to="/privacidade" target="_blank" className="text-ecc-navy underline">Política de privacidade</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Painel institucional */}
      <aside className="hidden lg:flex w-[46%] max-w-[760px] rounded-[30px] bg-ecc-navy text-white flex-col justify-between p-14 min-h-[calc(100vh-40px)] sticky top-5">
        <p className="ecc-eyebrow" style={{ color: '#D4B16A' }}>Ecclesio</p>
        <div className="flex flex-col gap-10">
          <p className="font-[family-name:var(--font-display)] text-[56px] xl:text-[72px] leading-[0.9]" style={{ letterSpacing: '-0.03em' }}>
            Inscrições, pagamentos e check-in do seu evento em um só lugar.
          </p>
          <ol className="flex flex-col">
            {['Crie o evento e o formulário', 'Compartilhe o link no grupo', 'Credencie pelo QR code'].map((item, i) => (
              <li key={item} className="flex gap-8 border-t border-white/15 py-4 text-[15px]">
                <span className="font-bold text-white/50">{String(i + 1).padStart(2, '0')}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-ecc-line bg-white px-3.5 py-3 text-[15px] text-ecc-ink placeholder:text-ecc-faint focus:outline-none focus:border-ecc-navy transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ecc-ink">{label}</span>
      {children}
    </label>
  )
}

function PasswordInput({
  value, onChange, placeholder, visible, onToggle, minLength, autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  visible: boolean
  onToggle: () => void
  minLength?: number
  autoComplete: string
}) {
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ecc-faint hover:text-ecc-ink"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

function PrimaryButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button type="submit" disabled={loading} className="ecc-btn ecc-btn-primary w-full mt-2">
      {loading ? loadingLabel : label}
    </button>
  )
}
