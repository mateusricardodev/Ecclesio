import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Zap, ZapOff, Check, AlertTriangle, X } from 'lucide-react'
import { startQrScanner, type QrController } from '../qr'
import { doCheckIn, findByCode } from '../api'

type Feedback = {
  type: 'success' | 'warning' | 'error'
  title: string
  subtitle?: string
}

const FEEDBACK_MS = 2500

export function QrScanner() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const controllerRef = useRef<QrController | null>(null)
  const processingRef = useRef(false)

  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  async function handleScan(text: string) {
    if (navigator.vibrate) navigator.vibrate(60)
    try {
      const participant = await findByCode(id, text)
      const res = await doCheckIn(id, participant.id)
      if (res.status === 'checked_in') {
        setFeedback({ type: 'success', title: participant.name, subtitle: 'Check-in realizado' })
      } else {
        setFeedback({
          type: 'warning',
          title: participant.name,
          subtitle: res.checkedInByName
            ? `Já credenciado por ${res.checkedInByName}`
            : 'Já estava credenciado',
        })
      }
    } catch {
      setFeedback({
        type: 'error',
        title: 'QR Code inválido',
        subtitle: 'Inscrição não encontrada neste evento',
      })
    } finally {
      setTimeout(() => {
        setFeedback(null)
        processingRef.current = false
      }, FEEDBACK_MS)
    }
  }

  useEffect(() => {
    let cancelled = false
    const video = videoRef.current
    if (!video) return

    startQrScanner(video, (text) => {
      if (processingRef.current) return
      processingRef.current = true
      void handleScan(text)
    })
      .then((ctrl) => {
        if (cancelled) {
          ctrl.stop()
          return
        }
        controllerRef.current = ctrl
        setTorchSupported(ctrl.torchSupported)
      })
      .catch(() => {
        if (!cancelled)
          setCameraError(
            'Não foi possível acessar a câmera. Conceda a permissão e use HTTPS ou localhost.',
          )
      })

    return () => {
      cancelled = true
      controllerRef.current?.stop()
      controllerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function toggleTorch() {
    const next = !torchOn
    setTorchOn(next)
    void controllerRef.current?.setTorch(next)
  }

  return (
    <div className="fixed inset-0 z-50 bg-ecc-navy-deep">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
      />
      {/* Véu navy: escurece a câmera sem sair da identidade. Leve, para não
          atrapalhar quem precisa enxergar o QR na tela do participante. */}
      <div className="absolute inset-0 bg-ecc-navy/40" />

      {/* header */}
      <div className="absolute inset-x-0 top-0 z-10 bg-ecc-navy pt-[env(safe-area-inset-top)] shadow-[0_2px_12px_rgba(0,24,109,0.35)]">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            onClick={() => navigate(`/app/evento/${id}`)}
            aria-label="Voltar"
            className="-ml-1 rounded-lg p-1 text-white active:bg-white/15"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <span className="text-lg font-semibold text-white">Ler QR Code</span>
        </div>
      </div>

      {/* conteúdo central */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8">
        {cameraError ? (
          <p className="max-w-xs rounded-2xl bg-white/95 px-5 py-4 text-center text-sm text-ecc-ink">
            {cameraError}
          </p>
        ) : (
          <>
            <p className="mb-8 max-w-xs text-center text-[15px] leading-relaxed text-white">
              Posicione o QR Code abaixo e aguarde.
              <br />A leitura é automática
            </p>

            {/* Moldura com cantos dourados */}
            <div className="relative h-64 w-64">
              <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-2xl border-l-[3px] border-t-[3px] border-ecc-gold" />
              <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-2xl border-r-[3px] border-t-[3px] border-ecc-gold" />
              <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-[3px] border-l-[3px] border-ecc-gold" />
              <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-2xl border-b-[3px] border-r-[3px] border-ecc-gold" />
            </div>

            {torchSupported && (
              <button
                onClick={toggleTorch}
                aria-label="Lanterna"
                className={
                  'mt-8 flex h-12 w-12 items-center justify-center rounded-full transition-colors ' +
                  (torchOn
                    ? 'bg-ecc-gold text-ecc-navy'
                    : 'bg-white/15 text-white active:bg-white/25')
                }
              >
                {torchOn ? <Zap className="h-6 w-6" /> : <ZapOff className="h-6 w-6" />}
              </button>
            )}
          </>
        )}
      </div>

      {/* feedback */}
      {feedback && (
        <div className="absolute inset-x-0 bottom-0 z-20 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <span
              className={
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ' +
                (feedback.type === 'success'
                  ? 'bg-ecc-green'
                  : feedback.type === 'warning'
                    ? 'bg-ecc-gold-dark'
                    : 'bg-ecc-red')
              }
            >
              {feedback.type === 'success' ? (
                <Check className="h-5 w-5" strokeWidth={3} />
              ) : feedback.type === 'warning' ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" strokeWidth={3} />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ecc-ink">{feedback.title}</p>
              {feedback.subtitle && (
                <p
                  className={
                    'truncate text-sm ' +
                    (feedback.type === 'success'
                      ? 'text-ecc-green'
                      : feedback.type === 'warning'
                        ? 'text-ecc-amber'
                        : 'text-ecc-red')
                  }
                >
                  {feedback.subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
