import { randomUUID } from 'crypto';
import {
  IPaymentProvider,
  PixPaymentInput,
  PixPaymentResult,
  ProviderPaymentStatus,
} from './payment-provider.interface.js';

// Minimal valid 1×1 white PNG, serves as placeholder QR image in mock mode
const PLACEHOLDER_QR_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export class MockPaymentProvider implements IPaymentProvider {
  private readonly statuses = new Map<string, ProviderPaymentStatus>();

  async createPixPayment(input: PixPaymentInput): Promise<PixPaymentResult> {
    const providerPaymentId = `mock_${randomUUID()}`;
    this.statuses.set(providerPaymentId, 'pending');

    const amountStr = input.amount.toFixed(2).replace('.', '');
    const copiaECola =
      `00020126580014br.gov.bcb.pix0136${providerPaymentId}` +
      `5204000053039865406${amountStr}5802BR5925MOCK INSCRICOES APP` +
      `6009SAO PAULO62290525${providerPaymentId.slice(-25)}6304ABCD`;

    return {
      providerPaymentId,
      qrCodeBase64: PLACEHOLDER_QR_BASE64,
      qrCodeCopiaECola: copiaECola,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentStatus> {
    return this.statuses.get(providerPaymentId) ?? 'pending';
  }

  simulateApproval(providerPaymentId: string): void {
    this.statuses.set(providerPaymentId, 'approved');
  }
}
