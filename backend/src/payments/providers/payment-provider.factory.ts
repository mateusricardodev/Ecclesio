import { ConfigService } from '@nestjs/config';
import { IPaymentProvider } from './payment-provider.interface.js';
import { MockPaymentProvider } from './mock.payment-provider.js';
import { MercadoPagoPaymentProvider } from './mercadopago.payment-provider.js';

export const PAYMENT_PROVIDER_TOKEN = 'PAYMENT_PROVIDER';

export function paymentProviderFactory(
  config: ConfigService,
): IPaymentProvider {
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  if (config.get('PAYMENT_PROVIDER') === 'mercadopago') {
    const token = config.get<string>('MERCADOPAGO_ACCESS_TOKEN', '');
    if (!token) {
      throw new Error(
        'MERCADOPAGO_ACCESS_TOKEN precisa estar configurado quando PAYMENT_PROVIDER=mercadopago.',
      );
    }
    return new MercadoPagoPaymentProvider(token);
  }

  // O provedor mock aprova pagamentos sem cobrança real e nunca pode subir em
  // produção por esquecimento de variável de ambiente.
  if (isProduction) {
    throw new Error(
      'Em produção PAYMENT_PROVIDER precisa ser "mercadopago" (o provedor mock não cobra de verdade).',
    );
  }
  return new MockPaymentProvider();
}
