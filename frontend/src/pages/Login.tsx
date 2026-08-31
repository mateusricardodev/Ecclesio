import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, Users } from 'lucide-react'
import api from '../api/axios'
import { useAuthStore } from '../store/auth.store'

type Mode = 'login' | 'register'

export function Login() {
  const [mode, setMode] = useState<Mode>('login')

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
      navigate('/dashboard')
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
    <div className="min-h-screen flex" style={{ background: '#F5F2E8' }}>

      {/* ── LADO ESQUERDO — imagem institucional ── */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden">
        <img
          src="/interior-igreja.jpg"
          alt="Interior de catedral"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* overlay escuro suave */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,24,109,0.82) 0%, rgba(0,24,109,0.45) 100%)' }} />

        {/* Conteúdo sobre a imagem */}
        <div className="relative z-10 flex flex-col justify-between h-full px-14 py-12">
          {/* Logo */}
          <div>
            <img src="/logo-ecclesio.png" alt="Ecclesio" className="h-10 object-contain" />
          </div>

          {/* Headline */}
          <div>
            {/* Ornamento dourado */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8" style={{ background: '#D4B16A' }} />
              <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: '#D4B16A', fontFamily: 'var(--font-sans)' }}>
                Plataforma de eventos católicos
              </span>
            </div>

            <h1
              className="text-white leading-tight mb-4"
              style={{ fontFamily: 'var(--font-display)', fontSize: '3.25rem', fontWeight: 600 }}
            >
              Organize eventos.<br />
              Conecte pessoas.<br />
              <span style={{ color: '#D4B16A', fontStyle: 'italic' }}>Fortaleça a missão.</span>
            </h1>

            <p className="text-white/70 text-base leading-relaxed max-w-sm" style={{ fontFamily: 'var(--font-sans)' }}>
              A plataforma completa para gestão de retiros, encontros, conferências e inscrições da sua comunidade.
            </p>

            {/* Stats discretos */}
            <div className="flex items-center gap-8 mt-10">
              {[
                { value: '500+', label: 'Eventos realizados' },
                { value: '12k+', label: 'Participantes' },
                { value: '100%', label: 'Seguro' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-white font-bold text-xl" style={{ fontFamily: 'var(--font-sans)' }}>{s.value}</p>
                  <p className="text-white/50 text-xs mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé esquerdo */}
          <p className="text-white/30 text-xs" style={{ fontFamily: 'var(--font-sans)' }}>
            © {new Date().getFullYear()} Ecclesio. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* ── LADO DIREITO — formulário ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">

          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/logo-ecclesio.png" alt="Ecclesio" className="h-9 object-contain" />
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8 w-full"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 4px 32px rgba(0,24,109,0.08), 0 1px 4px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,24,109,0.08)',
            }}
          >
            {/* Linha dourada decorativa no topo do card */}
            <div className="h-0.5 w-12 mb-6 rounded-full" style={{ background: '#D4B16A' }} />

            {/* Título */}
            <h2
              className="mb-1"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.875rem',
                fontWeight: 600,
                color: '#00186D',
                lineHeight: 1.2,
              }}
            >
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-sm mb-7" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              {isLogin
                ? 'Acesse sua conta para gerenciar seus eventos'
                : 'Comece a gerenciar seus eventos hoje'}
            </p>

            {/* Tabs */}
            <div
              className="flex rounded-xl p-1 mb-7"
              style={{ background: '#F5F2E8' }}
            >
              {(['login', 'register'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    background: mode === m ? '#FFFFFF' : 'transparent',
                    color: mode === m ? '#00186D' : '#6B7280',
                    boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>

            {/* Feedback */}
            {success && (
              <div className="text-sm rounded-xl px-4 py-3 mb-5 flex items-center gap-2" style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>
                <span>✓</span> {success}
              </div>
            )}
            {error && (
              <div className="text-sm rounded-xl px-4 py-3 mb-5" style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                {error}
              </div>
            )}

            {/* ── LOGIN ── */}
            {isLogin && (
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <Field label="E-mail">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={inputStyle}
                      className="w-full pl-10 pr-4 py-3 text-sm transition-all focus:outline-none"
                    />
                  </div>
                </Field>

                <Field label="Senha">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={inputStyle}
                      className="w-full pl-10 pr-10 py-3 text-sm transition-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: '#6B7280' }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                <PrimaryButton loading={loading} label="Entrar" loadingLabel="Entrando..." />
              </form>
            )}

            {/* ── CADASTRO ── */}
            {!isLogin && (
              <form onSubmit={handleRegister} className="flex flex-col gap-5">
                <Field label="Nome completo">
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={inputStyle}
                      className="w-full pl-10 pr-4 py-3 text-sm transition-all focus:outline-none"
                    />
                  </div>
                </Field>

                <Field label="E-mail">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={inputStyle}
                      className="w-full pl-10 pr-4 py-3 text-sm transition-all focus:outline-none"
                    />
                  </div>
                </Field>

                <Field label="Senha">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      style={inputStyle}
                      className="w-full pl-10 pr-10 py-3 text-sm transition-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: '#6B7280' }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirmar senha">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={inputStyle}
                      className="w-full pl-10 pr-10 py-3 text-sm transition-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: '#6B7280' }}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                <PrimaryButton loading={loading} label="Criar conta" loadingLabel="Criando..." />
              </form>
            )}

            {/* Rodapé do card */}
            <p className="text-center text-xs mt-6" style={{ color: '#6B7280', fontFamily: 'var(--font-sans)' }}>
              Ao continuar, você concorda com os{' '}
              <span className="cursor-pointer" style={{ color: '#00186D' }}>Termos de uso</span>
              {' '}e{' '}
              <span className="cursor-pointer" style={{ color: '#00186D' }}>Política de privacidade</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: '#FAFAFA',
  border: '1px solid #E5E0D4',
  borderRadius: '10px',
  color: '#0A0A09',
  fontFamily: 'var(--font-sans)',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-1.5"
        style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function PrimaryButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm mt-1"
      style={{
        background: loading ? '#33425C' : '#00186D',
        color: '#FFFFFF',
        fontFamily: 'var(--font-sans)',
        letterSpacing: '0.01em',
        opacity: loading ? 0.75 : 1,
      }}
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {loadingLabel}
        </>
      ) : (
        <>
          {label}
          <span style={{ color: '#D4B16A' }}>→</span>
        </>
      )}
    </button>
  )
}
