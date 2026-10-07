// Máscara de telefone brasileiro com DDD: celular "(11) 99999-9999" (11 dígitos)
// ou fixo "(11) 3333-4444" (10 dígitos). Descarta tudo que não é dígito.
export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  const ddd = d.slice(0, 2)
  const rest = d.slice(2)
  if (rest.length <= 4) return `(${ddd}) ${rest}`
  const split = d.length === 11 ? 5 : 4
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`
}

// Completo = DDD + 8 ou 9 dígitos.
export function isCompletePhone(value: string): boolean {
  const n = value.replace(/\D/g, '').length
  return n === 10 || n === 11
}
