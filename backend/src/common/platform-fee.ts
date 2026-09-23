/**
 * Taxa de serviço da plataforma.
 *
 * O participante paga a taxa POR CIMA do valor da inscrição: uma inscrição de
 * R$ 100,00 com taxa de 5% é cobrada como R$ 105,00, o organizador recebe os
 * R$ 100,00 cheios e a plataforma fica com R$ 5,00.
 *
 * Atenção ao fechar a margem: o gateway (Mercado Pago) cobra a taxa dele sobre
 * o TOTAL cobrado, e ela sai da parte da plataforma. O organizador sempre
 * recebe a base integral. Ou seja, a taxa configurada aqui é bruta, não
 * líquida.
 */

export interface FeeConfig {
  /** Percentual sobre o valor da inscrição (5 = 5%). */
  percent: number;
  /** Valor fixo somado ao percentual, em reais. */
  fixed: number;
  /** Piso da taxa, em reais. Evita cobrar centavos em inscrições baratas. */
  min: number;
}

export interface Charge {
  /** Valor da inscrição: vira crédito do organizador. */
  base: number;
  /** Taxa de serviço: fica com a plataforma. */
  fee: number;
  /** Total cobrado do participante (base + fee). */
  total: number;
}

export const DEFAULT_FEE_CONFIG: FeeConfig = { percent: 5, fixed: 0, min: 0 };

function toNumber(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Resolve a taxa efetiva: override do evento quando presente (0 é válido e
 * significa isento), senão o padrão global das variáveis de ambiente.
 */
export function resolveFeeConfig(
  event?: { feePercent?: unknown; feeFixed?: unknown } | null,
  env: Record<string, string | undefined> = process.env,
): FeeConfig {
  const global: FeeConfig = {
    percent: toNumber(env.PLATFORM_FEE_PERCENT, DEFAULT_FEE_CONFIG.percent),
    fixed: toNumber(env.PLATFORM_FEE_FIXED, DEFAULT_FEE_CONFIG.fixed),
    min: toNumber(env.PLATFORM_FEE_MIN, DEFAULT_FEE_CONFIG.min),
  };

  const hasPercentOverride =
    event?.feePercent !== null && event?.feePercent !== undefined;
  const hasFixedOverride =
    event?.feeFixed !== null && event?.feeFixed !== undefined;
  if (!hasPercentOverride && !hasFixedOverride) return global;

  return {
    percent: hasPercentOverride
      ? toNumber(event.feePercent, global.percent)
      : global.percent,
    fixed: hasFixedOverride
      ? toNumber(event.feeFixed, global.fixed)
      : global.fixed,
    // O piso global não se aplica quando o evento define a própria taxa: um
    // override de 0% seria anulado por ele.
    min: 0,
  };
}

/**
 * Monta a cobrança a partir do valor da inscrição. Toda a aritmética roda em
 * centavos inteiros para não acumular erro de ponto flutuante.
 *
 * Inscrição gratuita (base 0) nunca gera taxa.
 */
export function computeCharge(baseAmount: number, config: FeeConfig): Charge {
  const baseCents = Math.round(baseAmount * 100);
  if (baseCents <= 0) return { base: 0, fee: 0, total: 0 };

  const feeCents = Math.max(
    Math.round((baseCents * config.percent) / 100) +
      Math.round(config.fixed * 100),
    Math.round(config.min * 100),
  );

  return {
    base: baseCents / 100,
    fee: feeCents / 100,
    total: (baseCents + feeCents) / 100,
  };
}

/**
 * Dias de retenção antes do saldo de uma venda ficar sacável, contados a partir
 * do fim do evento. É a proteção contra estornar um PIX já resgatado.
 */
export function payoutHoldDays(
  env: Record<string, string | undefined> = process.env,
): number {
  return toNumber(env.PAYOUT_HOLD_DAYS, 7);
}

/** Momento em que o crédito de uma venda entra no saldo disponível. */
export function saleAvailableAt(
  event: { date: Date; endDate: Date | null },
  env: Record<string, string | undefined> = process.env,
): Date {
  const reference = event.endDate ?? event.date;
  return new Date(
    reference.getTime() + payoutHoldDays(env) * 24 * 60 * 60 * 1000,
  );
}
