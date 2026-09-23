import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import api, { API_BASE_URL } from '../api/axios'
import { downloadTicketPdf } from '../lib/ticketPdf'

/**
 * MODO MOCK: como testar sem Mercado Pago real:
 * 1. Faça a inscrição normalmente pelo formulário.
 * 2. Copie o `providerPaymentId` que aparece na seção "Teste (modo mock)" abaixo.
 * 3. Execute no terminal:
 *    curl -X POST <VITE_API_URL>/payments/mock/<providerPaymentId>/approve
 * 4. O polling desta página detectará o status 'confirmed' em até 4 segundos.
 */

interface PixState {
  registrationId: string
  code?: string | null
  participantName?: string
  participantCpf?: string
  providerPaymentId?: string
  qrCodeBase64?: string | null
  qrCodeCopiaECola?: string | null
  expiresAt?: string
  amount?: number
  eventTitle?: string
  /** Link do grupo de WhatsApp definido pelo organizador do evento */
  whatsappGroupUrl?: string | null
  email?: string
  reused?: boolean
  free?: boolean
  /** Inscrição em dinheiro: vaga garantida, pagamento presencial pendente */
  cashPending?: boolean
  /** Valor a acertar presencialmente (pagamento em dinheiro) */
  amountDue?: number
}

type Stage = 'pending' | 'confirmed' | 'failed' | 'overbooked' | 'cash'

function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 000 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
    </svg>
  )
}

function WhatsAppGroupCard({ url }: { url: string }) {
  return (
    <div className="bg-[#E7F8EE] border border-[#25D366]/30 rounded-xl p-5 flex flex-col items-center gap-3 mb-6">
      <svg viewBox="0 0 32 32" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2C8.28 2 2 8.28 2 16c0 2.47.67 4.78 1.83 6.77L2 30l7.43-1.8A13.93 13.93 0 0016 30c7.72 0 14-6.28 14-14S23.72 2 16 2z" fill="#25D366"/>
        <path d="M22.5 19.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.67-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" fill="#fff"/>
      </svg>
      <div className="text-center">
        <p className="font-inter font-semibold text-gray-800 text-sm">Entre no grupo do WhatsApp</p>
        <p className="font-inter text-xs text-gray-500 mt-0.5">Fique por dentro de todas as informações do evento</p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bebas w-full bg-[#25D366] hover:bg-[#1dba58] text-black py-3 rounded-full text-xl tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
      >
        Acessar grupo
      </a>
    </div>
  )
}

export function PixPayment() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as PixState | null

  const [stage, setStage] = useState<Stage>(
    state?.cashPending ? 'cash' : state?.free ? 'confirmed' : 'pending',
  )
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!state?.code) return
    QRCode.toDataURL(state.code, { width: 256, margin: 2, color: { dark: '#1B2B5E', light: '#F2EDE4' } })
      .then(setQrDataUrl)
      .catch(() => undefined)
  }, [state?.code])
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!state?.expiresAt) return 900
    const diff = Math.floor((new Date(state.expiresAt).getTime() - Date.now()) / 1000)
    return Math.min(900, Math.max(0, diff))
  })
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!state?.registrationId) {
      navigate(`/evento/${slug}/inscricao`, { replace: true })
    }
  }, [state, slug, navigate])

  useEffect(() => {
    if (stage !== 'pending') return
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setStage('failed')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [stage])

  useEffect(() => {
    if (!state?.registrationId || stage !== 'pending') return
    const poll = async () => {
      try {
        const { data } = await api.get(`/public/payments/status/${state.registrationId}`)
        if (data.status === 'confirmed') {
          setStage('confirmed')
          if (pollingRef.current) clearInterval(pollingRef.current)
        } else if (data.status === 'overbooked') {
          setStage('overbooked')
          if (pollingRef.current) clearInterval(pollingRef.current)
        } else if (data.paymentStatus === 'failed') {
          setStage('failed')
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      } catch {
        // silently ignore transient polling errors
      }
    }
    pollingRef.current = setInterval(poll, 4000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [stage, state?.registrationId])

  if (!state?.registrationId) return null

  const amount = state.amount ?? 0
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadTicketPdf({
        code: state?.code,
        registrationId: state?.registrationId,
        eventTitle: state?.eventTitle,
        participantName: state?.participantName,
        participantCpf: state?.participantCpf,
        email: state?.email,
        amount,
      })
    } catch (err) {
      console.error('Erro ao gerar ingresso:', err)
      alert('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setDownloading(false)
    }
  }
  async function handleCopy() {
    if (!state?.qrCodeCopiaECola) return
    try {
      await navigator.clipboard.writeText(state.qrCodeCopiaECola)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // fallback: select text
    }
  }

  // Stage D: Dinheiro, vaga garantida, pagamento presencial
  if (stage === 'cash') {
    return (
      <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center px-4 py-12">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-[#C9A84C]/15 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="font-cinzel text-2xl font-bold text-[#1B2B5E] mb-2">Inscrição recebida!</h1>
          <p className="font-inter text-gray-500 text-sm mb-6">
            Sua vaga está garantida. O pagamento será feito em dinheiro, no dia do evento.
          </p>

          <div className="bg-[#F2EDE4] border border-[#C9A84C]/40 rounded-xl p-4 mb-6 text-left">
            <p className="font-cinzel text-xs text-[#C9A84C] uppercase tracking-widest mb-1">Pagamento em dinheiro</p>
            <p className="font-inter text-sm text-gray-600">
              {state.amountDue && state.amountDue > 0 ? (
                <>Leve <span className="font-semibold text-[#1B2B5E]">R$ {Number(state.amountDue).toFixed(2).replace('.', ',')}</span> em
                dinheiro e acerte com o organizador no credenciamento.</>
              ) : (
                'Acerte o pagamento com o organizador no credenciamento.'
              )}
            </p>
          </div>

          {state.whatsappGroupUrl && <WhatsAppGroupCard url={state.whatsappGroupUrl} />}

          {state.email && (
            <p className="font-inter text-sm text-gray-500 mb-6">
              Enviaremos o e-mail de confirmação para{' '}
              <span className="font-semibold text-gray-700">{state.email}</span>{' '}
              assim que o organizador registrar o pagamento.
            </p>
          )}

          {state.code && (
            <div className="bg-[#F2EDE4] border border-[#1B2B5E]/10 rounded-xl p-4 mb-6 flex flex-col items-center gap-3">
              <p className="font-cinzel text-xs text-[#C9A84C] uppercase tracking-widest">Código de credenciamento</p>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code da inscrição" className="w-44 h-44 rounded-lg" />
              ) : (
                <div className="w-44 h-44 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Spinner className="w-6 h-6 text-[#1B2B5E]" />
                </div>
              )}
              <p className="font-mono text-lg font-bold text-[#1B2B5E] tracking-widest">{state.code}</p>
              <p className="font-inter text-xs text-gray-400 text-center">Apresente este QR code no credenciamento do evento</p>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="font-bebas w-full bg-[#C9A84C] hover:bg-[#b8973e] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-full text-xl tracking-widest uppercase transition-colors flex items-center justify-center gap-2 mb-3"
          >
            {downloading ? (
              <><Spinner className="w-4 h-4" /> Gerando...</>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Baixar Ingresso
              </>
            )}
          </button>

          <button
            onClick={() => navigate(`/evento/${slug}`)}
            className="font-bebas w-full bg-[#1B2B5E] hover:bg-[#152348] text-[#F2EDE4] py-3 rounded-full text-xl tracking-widest uppercase transition-colors"
          >
            Voltar ao evento
          </button>
        </div>
      </div>
    )
  }

  // Stage B: Confirmed
  if (stage === 'confirmed') {
    return (
      <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center px-4 py-12">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-[#1B2B5E]/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-[#1B2B5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="font-cinzel text-2xl font-bold text-[#1B2B5E] mb-2">Inscrição confirmada!</h1>
          <p className="font-inter text-gray-500 text-sm mb-6">Seu pagamento foi processado com sucesso.</p>

          {state.whatsappGroupUrl && <WhatsAppGroupCard url={state.whatsappGroupUrl} />}

          {state.email && (
            <p className="font-inter text-sm text-gray-500 mb-6">
              Um e-mail de confirmação foi enviado para{' '}
              <span className="font-semibold text-gray-700">{state.email}</span>.
            </p>
          )}

          {state.code && (
            <div className="bg-[#F2EDE4] border border-[#1B2B5E]/10 rounded-xl p-4 mb-6 flex flex-col items-center gap-3">
              <p className="font-cinzel text-xs text-[#C9A84C] uppercase tracking-widest">Código de credenciamento</p>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code da inscrição" className="w-44 h-44 rounded-lg" />
              ) : (
                <div className="w-44 h-44 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Spinner className="w-6 h-6 text-[#1B2B5E]" />
                </div>
              )}
              <p className="font-mono text-lg font-bold text-[#1B2B5E] tracking-widest">{state.code}</p>
              <p className="font-inter text-xs text-gray-400 text-center">Apresente este QR code no credenciamento do evento</p>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="font-bebas w-full bg-[#C9A84C] hover:bg-[#b8973e] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-full text-xl tracking-widest uppercase transition-colors flex items-center justify-center gap-2 mb-3"
          >
            {downloading ? (
              <><Spinner className="w-4 h-4" /> Gerando...</>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Baixar Ingresso
              </>
            )}
          </button>

          <button
            onClick={() => navigate(`/evento/${slug}`)}
            className="font-bebas w-full bg-[#1B2B5E] hover:bg-[#152348] text-[#F2EDE4] py-3 rounded-full text-xl tracking-widest uppercase transition-colors"
          >
            Voltar ao evento
          </button>
        </div>
      </div>
    )
  }

  // Stage C: Failed / Overbooked
  if (stage === 'failed' || stage === 'overbooked') {
    return (
      <div className="min-h-screen bg-[#F2EDE4] flex items-center justify-center px-4 py-12">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="font-cinzel text-2xl font-bold text-red-700 mb-2">Pagamento não realizado</h1>
          {stage === 'overbooked' ? (
            <p className="font-inter text-gray-500 text-sm mb-8">
              Seu pagamento foi recebido, porém o ingresso esgotou simultaneamente. Você será reembolsado em breve.
            </p>
          ) : (
            <p className="font-inter text-gray-500 text-sm mb-8">
              O pagamento não foi confirmado. Você pode tentar novamente com um novo código PIX.
            </p>
          )}

          <button
            onClick={() => navigate(`/evento/${slug}/inscricao`, { state: location.state })}
            className="font-bebas w-full bg-[#1B2B5E] hover:bg-[#152348] text-[#F2EDE4] py-3 rounded-full text-xl tracking-widest uppercase transition-colors mb-3"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => navigate(`/evento/${slug}`)}
            className="font-inter w-full text-sm text-gray-400 hover:text-gray-600 py-2"
          >
            Voltar ao evento
          </button>
        </div>
      </div>
    )
  }

  // Stage A: Pending (waiting for payment)
  return (
    <div className="min-h-screen bg-[#F2EDE4]">
      <div className="bg-[#1B2B5E] text-white py-6">
        <div className="max-w-lg mx-auto px-4 text-center">
          <h1 className="font-bebas text-3xl tracking-widest uppercase">Pague com PIX</h1>
          {state.eventTitle && (
            <p className="font-inter text-sm text-blue-200 mt-1">{state.eventTitle}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Valor */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
          <p className="font-cinzel text-xs font-bold text-[#C9A84C] uppercase tracking-widest mb-1">Valor a pagar</p>
          <p className="font-cormorant text-5xl font-bold text-[#1B2B5E]">
            R$ {Number(amount).toFixed(2).replace('.', ',')}
          </p>
        </div>

        {/* QR Code + Copia e Cola */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col items-center gap-5">
          <div className="w-52 h-52 flex items-center justify-center">
            {state.qrCodeBase64 ? (
              <img
                src={`data:image/png;base64,${state.qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2">
                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                <p className="font-inter text-xs text-gray-400 text-center px-4">QR Code indisponível no modo teste</p>
              </div>
            )}
          </div>

          {state.qrCodeCopiaECola && (
            <div className="w-full flex flex-col gap-2">
              <p className="font-inter text-xs text-gray-500 text-center">Ou use o código Pix Copia e Cola:</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <p className="font-mono text-xs text-gray-500 break-all line-clamp-2">
                  {state.qrCodeCopiaECola}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className={[
                  'font-bebas w-full py-3 rounded-full text-xl tracking-widest uppercase transition-colors',
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-[#1B2B5E] hover:bg-[#152348] text-[#F2EDE4]',
                ].join(' ')}
              >
                {copied ? 'Copiado' : 'Copiar código PIX'}
              </button>
            </div>
          )}
        </div>

        {/* Expiração + polling */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col gap-3 text-center">
          <p className="font-inter text-sm text-gray-500">
            Este PIX expira em{' '}
            <span className="font-bold text-[#1B2B5E] tabular-nums">{mm}:{ss}</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Spinner className="w-4 h-4 text-[#1B2B5E]" />
            <span className="font-inter">Aguardando confirmação do pagamento...</span>
          </div>
        </div>

        {/* Dev/mock helper */}
        {state.providerPaymentId && !state.qrCodeBase64 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-cinzel text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Modo teste (mock)</p>
            <p className="font-inter text-xs text-amber-600 mb-2">
              Para simular o pagamento, execute no terminal:
            </p>
            <code className="block bg-amber-100 rounded px-3 py-2 text-xs text-amber-800 break-all">
              curl -X POST {API_BASE_URL}/payments/mock/{state.providerPaymentId}/approve
            </code>
          </div>
        )}

        <button
          onClick={() => navigate(`/evento/${slug}`)}
          className="font-inter text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
        >
          Voltar ao evento
        </button>
      </div>
    </div>
  )
}
