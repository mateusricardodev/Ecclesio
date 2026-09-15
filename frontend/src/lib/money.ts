/**
 * Formatação e simulação de valores em reais.
 *
 * `computeCharge` espelha `backend/src/common/platform-fee.ts` e existe só para
 * dar preview instantâneo enquanto o organizador digita. O valor que vale é
 * sempre o que o backend devolve — nunca use este cálculo para cobrar.
 */

export interface FeeConfig {
  percent: number
  fixed: number
  min: number
}

export interface Charge {
  base: number
  fee: number
  total: number
}

export function formatBRL(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0)
  return (Number.isFinite(amount) ? amount : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/** Mesma aritmética do backend: tudo em centavos inteiros. */
export function computeCharge(baseAmount: number, config: FeeConfig): Charge {
  const baseCents = Math.round(baseAmount * 100)
  if (!Number.isFinite(baseCents) || baseCents <= 0) return { base: 0, fee: 0, total: 0 }

  const feeCents = Math.max(
    Math.round((baseCents * config.percent) / 100) + Math.round(config.fixed * 100),
    Math.round(config.min * 100),
  )

  return {
    base: baseCents / 100,
    fee: feeCents / 100,
    total: (baseCents + feeCents) / 100,
  }
}
