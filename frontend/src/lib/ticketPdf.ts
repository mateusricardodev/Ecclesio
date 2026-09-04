import jsPDF from 'jspdf'
import QRCode from 'qrcode'

/**
 * Ingresso em PDF da inscrição — o mesmo documento que o participante baixa ao
 * concluir a inscrição pública e que o organizador pode gerar de novo pelo
 * painel, para quem perdeu o e-mail de confirmação.
 */
export interface TicketPdfData {
  /** Código de credenciamento; sem ele o PDF sai sem QR e perde a serventia. */
  code?: string | null
  registrationId?: string | null
  eventTitle?: string | null
  eventDate?: string | Date | null
  eventLocation?: string | null
  participantName?: string | null
  /** CPF já formatado para exibição. */
  participantCpf?: string | null
  email?: string | null
  amount?: number | null
}

const NAVY: [number, number, number] = [27, 43, 94]
const GOLD: [number, number, number] = [201, 168, 76]
const CREAM: [number, number, number] = [242, 237, 228]
const LABEL: [number, number, number] = [130, 130, 130]
const VALUE: [number, number, number] = [30, 30, 30]

function formatEventDate(value: string | Date): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const day = date.toLocaleDateString('pt-BR')
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} às ${time}`
}

function brl(value: number): string {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`
}

/** Monta o documento; exportado para quem precisar do jsPDF antes de salvar. */
export async function buildTicketPdf(data: TicketPdfData): Promise<jsPDF> {
  const qr = data.code
    ? await QRCode.toDataURL(data.code, {
        width: 300,
        margin: 2,
        color: { dark: '#1B2B5E', light: '#F2EDE4' },
      })
    : null

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()

  // Linhas de detalhe: só entram as que têm valor, e a altura do card
  // acompanha — inscrição lançada pelo organizador costuma ter menos dados.
  const rows: Array<[string, string]> = []
  if (data.participantName) rows.push(['Participante', data.participantName])
  if (data.participantCpf) rows.push(['Documento', data.participantCpf])
  if (data.email) rows.push(['E-mail', data.email])
  if (data.eventDate) {
    const formatted = formatEventDate(data.eventDate)
    if (formatted) rows.push(['Data', formatted])
  }
  if (data.eventLocation) rows.push(['Local', data.eventLocation])
  if (data.amount && data.amount > 0) rows.push(['Valor pago', brl(data.amount)])

  // fundo creme
  pdf.setFillColor(...CREAM)
  pdf.rect(0, 0, W, H, 'F')

  // header azul
  pdf.setFillColor(...NAVY)
  pdf.rect(0, 0, W, 48, 'F')

  // label "INGRESSO" dourado — sem charSpace para centralizar corretamente
  pdf.setTextColor(...GOLD)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('I N G R E S S O', W / 2, 17, { align: 'center' })

  // nome do evento
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(17)
  const titleLines = pdf.splitTextToSize(data.eventTitle ?? 'Evento', W - 30) as string[]
  pdf.text(titleLines, W / 2, 32, { align: 'center' })

  // card branco
  const cX = 18
  const cY = 58
  const cW = W - 36
  const cH = 128 + Math.max(rows.length, 1) * 14
  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(220, 220, 220)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(cX, cY, cW, cH, 4, 4, 'FD')

  // QR code centrado
  if (qr) {
    const qrSize = 68
    pdf.addImage(qr, 'PNG', (W - qrSize) / 2, cY + 10, qrSize, qrSize)
  }

  // label "CÓDIGO DE CREDENCIAMENTO"
  pdf.setTextColor(...GOLD)
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'bold')
  pdf.text('CÓDIGO DE CREDENCIAMENTO', W / 2, cY + 90, { align: 'center' })

  // código em destaque
  pdf.setTextColor(...NAVY)
  pdf.setFontSize(20)
  pdf.text(data.code ?? '-', W / 2, cY + 104, { align: 'center' })

  // linha divisória
  pdf.setDrawColor(230, 230, 230)
  pdf.line(cX + 10, cY + 114, cX + cW - 10, cY + 114)

  // detalhes
  let dy = cY + 128
  const valueMaxWidth = cW - 55

  rows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...LABEL)
    pdf.text(label, cX + 10, dy)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...VALUE)
    // Valor longo (endereço, e-mail comprido) fica só na primeira linha para
    // não invadir o rótulo da linha de baixo.
    const [firstLine] = pdf.splitTextToSize(value, valueMaxWidth) as string[]
    pdf.text(firstLine ?? value, cX + cW - 10, dy, { align: 'right' })
    dy += 14
  })

  // rodapé
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(150, 150, 150)
  pdf.text('Apresente este documento no credenciamento do evento.', W / 2, H - 12, {
    align: 'center',
  })

  return pdf
}

/** Gera o ingresso e dispara o download no navegador. */
export async function downloadTicketPdf(data: TicketPdfData): Promise<void> {
  const pdf = await buildTicketPdf(data)
  const blob = pdf.output('blob')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ingresso-${data.code ?? data.registrationId ?? 'inscricao'}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
