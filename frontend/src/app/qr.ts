// Abstrai a leitura de QR: usa a API nativa BarcodeDetector quando disponível
// e cai para @zxing/browser caso contrário. Também controla a lanterna (torch).

interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike
  getSupportedFormats?(): Promise<string[]>
}

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }

export interface QrController {
  stop: () => void
  torchSupported: boolean
  setTorch: (on: boolean) => Promise<void>
}

export async function startQrScanner(
  video: HTMLVideoElement,
  onResult: (text: string) => void,
): Promise<QrController> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  })
  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  video.muted = true
  await video.play().catch(() => undefined)

  const track = stream.getVideoTracks()[0]
  const caps = (track.getCapabilities?.() ?? {}) as TorchCapabilities
  const torchSupported = caps.torch === true

  let stopped = false
  let zxingControls: { stop: () => void } | null = null

  const setTorch = async (on: boolean) => {
    if (!torchSupported) return
    try {
      await track.applyConstraints({
        advanced: [{ torch: on }],
      } as unknown as MediaTrackConstraints)
    } catch {
      /* dispositivo não aceitou, ignora */
    }
  }

  const stop = () => {
    stopped = true
    zxingControls?.stop()
    stream.getTracks().forEach((t) => t.stop())
  }

  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector

  let useNative = false
  if (Ctor) {
    try {
      const formats = (await Ctor.getSupportedFormats?.()) ?? ['qr_code']
      useNative = formats.includes('qr_code')
    } catch {
      useNative = false
    }
  }

  if (useNative && Ctor) {
    const detector = new Ctor({ formats: ['qr_code'] })
    const tick = async () => {
      if (stopped) return
      try {
        const codes = await detector.detect(video)
        const value = codes[0]?.rawValue
        if (value) onResult(value)
      } catch {
        /* frame ainda não pronto */
      }
      if (!stopped) setTimeout(() => void tick(), 250)
    }
    void tick()
  } else {
    const { BrowserQRCodeReader } = await import('@zxing/browser')
    const reader = new BrowserQRCodeReader()
    zxingControls = await reader.decodeFromStream(stream, video, (result) => {
      if (result) onResult(result.getText())
    })
  }

  return { stop, torchSupported, setTorch }
}
