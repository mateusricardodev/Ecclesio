function part(d: Date, withYear: boolean): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return withYear ? `${day} ${month} ${d.getFullYear()}` : `${day} ${month}`
}

/** Período "07 fev a 19 abr 2026" (ano só no fim quando coincide). */
export function formatPeriod(startISO: string, endISO: string | null): string {
  const start = new Date(startISO)
  if (!endISO) return part(start, true)
  const end = new Date(endISO)
  const sameYear = start.getFullYear() === end.getFullYear()
  return `${part(start, !sameYear)} a ${part(end, true)}`
}

/** "14 jun 2026 20:51" */
export function formatSyncStamp(d: Date): string {
  const date = part(d, true)
  const time = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} ${time}`
}

/** Primeira letra (maiúscula, sem acento) para agrupamento. */
export function groupLetter(name: string): string {
  const first = name.trim().charAt(0).toUpperCase()
  return first.normalize('NFD').replace(/[̀-ͯ]/g, '') || '#'
}

const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  canceled: 'Cancelado',
  overbooked: 'Pago (sem vaga)',
}

/** Rótulo do status da inscrição ("pending" → "Pendente"). */
export function formatRegistrationStatus(status: string | null): string | null {
  if (!status) return null
  return REGISTRATION_STATUS_LABELS[status] ?? status
}
