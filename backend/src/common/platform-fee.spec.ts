import {
  computeCharge,
  resolveFeeConfig,
  saleAvailableAt,
  payoutHoldDays,
} from './platform-fee.js';

describe('platform-fee', () => {
  // computeCharge

  describe('computeCharge', () => {
    const fivePercent = { percent: 5, fixed: 0, min: 0 };

    it('soma a taxa por cima: o organizador recebe a base cheia', () => {
      expect(computeCharge(100, fivePercent)).toEqual({ base: 100, fee: 5, total: 105 });
    });

    it('arredonda a taxa para centavos', () => {
      // 5% de 99,90 = 4,995 → 5,00
      expect(computeCharge(99.9, fivePercent)).toEqual({ base: 99.9, fee: 5, total: 104.9 });
      // 5% de 33,33 = 1,6665 → 1,67
      expect(computeCharge(33.33, fivePercent)).toEqual({ base: 33.33, fee: 1.67, total: 35 });
    });

    it('não cobra taxa de inscrição gratuita', () => {
      expect(computeCharge(0, fivePercent)).toEqual({ base: 0, fee: 0, total: 0 });
    });

    it('trata valor negativo como gratuito', () => {
      expect(computeCharge(-10, fivePercent)).toEqual({ base: 0, fee: 0, total: 0 });
    });

    it('soma o valor fixo ao percentual', () => {
      expect(computeCharge(100, { percent: 5, fixed: 1.5, min: 0 })).toEqual({
        base: 100,
        fee: 6.5,
        total: 106.5,
      });
    });

    it('aplica o piso quando o percentual fica abaixo dele', () => {
      expect(computeCharge(10, { percent: 5, fixed: 0, min: 1 })).toEqual({
        base: 10,
        fee: 1,
        total: 11,
      });
    });

    it('ignora o piso quando o percentual já o supera', () => {
      expect(computeCharge(100, { percent: 5, fixed: 0, min: 1 }).fee).toBe(5);
    });

    it('não acumula erro de ponto flutuante em valores quebrados', () => {
      const { total } = computeCharge(0.1, { percent: 10, fixed: 0.2, min: 0 });
      expect(total).toBe(0.31);
    });
  });

  // resolveFeeConfig

  describe('resolveFeeConfig', () => {
    it('usa o padrão global quando o evento não tem override', () => {
      const cfg = resolveFeeConfig(null, {
        PLATFORM_FEE_PERCENT: '7',
        PLATFORM_FEE_FIXED: '0.5',
        PLATFORM_FEE_MIN: '2',
      });
      expect(cfg).toEqual({ percent: 7, fixed: 0.5, min: 2 });
    });

    it('cai no padrão de 5% sem variáveis de ambiente', () => {
      expect(resolveFeeConfig(null, {})).toEqual({ percent: 5, fixed: 0, min: 0 });
    });

    it('ignora variável de ambiente inválida', () => {
      expect(resolveFeeConfig(null, { PLATFORM_FEE_PERCENT: 'abc' }).percent).toBe(5);
    });

    it('respeita o override do evento', () => {
      const cfg = resolveFeeConfig({ feePercent: 10 }, { PLATFORM_FEE_PERCENT: '5' });
      expect(cfg.percent).toBe(10);
    });

    it('trata override 0 como isenção, não como ausência', () => {
      const cfg = resolveFeeConfig({ feePercent: 0 }, { PLATFORM_FEE_PERCENT: '5' });
      expect(cfg.percent).toBe(0);
      expect(computeCharge(100, cfg)).toEqual({ base: 100, fee: 0, total: 100 });
    });

    it('não deixa o piso global ressuscitar uma taxa zerada pelo evento', () => {
      const cfg = resolveFeeConfig(
        { feePercent: 0 },
        { PLATFORM_FEE_PERCENT: '5', PLATFORM_FEE_MIN: '3' },
      );
      expect(computeCharge(100, cfg).fee).toBe(0);
    });
  });

  // retenção

  describe('saleAvailableAt', () => {
    it('conta a retenção a partir da data de término do evento', () => {
      const available = saleAvailableAt(
        { date: new Date('2026-03-01T00:00:00Z'), endDate: new Date('2026-03-03T00:00:00Z') },
        { PAYOUT_HOLD_DAYS: '7' },
      );
      expect(available.toISOString()).toBe('2026-03-10T00:00:00.000Z');
    });

    it('usa a data de início quando não há término', () => {
      const available = saleAvailableAt(
        { date: new Date('2026-03-01T00:00:00Z'), endDate: null },
        { PAYOUT_HOLD_DAYS: '2' },
      );
      expect(available.toISOString()).toBe('2026-03-03T00:00:00.000Z');
    });

    it('usa 7 dias por padrão', () => {
      expect(payoutHoldDays({})).toBe(7);
    });
  });
});
