import { ConfigService } from '@nestjs/config';
import { paymentProviderFactory } from './payment-provider.factory.js';
import { MockPaymentProvider } from './mock.payment-provider.js';
import { MercadoPagoPaymentProvider } from './mercadopago.payment-provider.js';

const configWith = (env: Record<string, string>) => new ConfigService(env);

describe('paymentProviderFactory', () => {
  it('usa o mock fora de produção', () => {
    expect(
      paymentProviderFactory(configWith({ NODE_ENV: 'development' })),
    ).toBeInstanceOf(MockPaymentProvider);
  });

  it('recusa o mock em produção', () => {
    expect(() =>
      paymentProviderFactory(configWith({ NODE_ENV: 'production' })),
    ).toThrow(/mercadopago/);
    expect(() =>
      paymentProviderFactory(
        configWith({ NODE_ENV: 'production', PAYMENT_PROVIDER: 'mock' }),
      ),
    ).toThrow(/mercadopago/);
  });

  it('exige o access token do Mercado Pago', () => {
    expect(() =>
      paymentProviderFactory(configWith({ PAYMENT_PROVIDER: 'mercadopago' })),
    ).toThrow(/MERCADOPAGO_ACCESS_TOKEN/);
  });

  it('usa o Mercado Pago quando configurado', () => {
    expect(
      paymentProviderFactory(
        configWith({
          NODE_ENV: 'production',
          PAYMENT_PROVIDER: 'mercadopago',
          MERCADOPAGO_ACCESS_TOKEN: 'tok',
        }),
      ),
    ).toBeInstanceOf(MercadoPagoPaymentProvider);
  });
});
