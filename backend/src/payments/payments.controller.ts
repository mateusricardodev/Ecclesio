import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service.js';
import { JwtGuard } from '../auth/guards/jwt.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { IPaymentProvider } from './providers/payment-provider.interface.js';
import { MockPaymentProvider } from './providers/mock.payment-provider.js';
import { MercadoPagoPaymentProvider } from './providers/mercadopago.payment-provider.js';
import { PAYMENT_PROVIDER_TOKEN } from './providers/payment-provider.factory.js';

interface MpWebhookBody {
  type?: string;
  data?: { id?: string | number };
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: IPaymentProvider,
  ) {}

  /** Inicia um pagamento PIX para a inscrição do usuário autenticado. */
  @UseGuards(JwtGuard)
  @Post('pix/:registrationId')
  createPix(
    @CurrentUser() user: { id: string },
    @Param('registrationId') registrationId: string,
  ) {
    return this.paymentsService.createPixForRegistration(registrationId, user.id);
  }

  /** Retorna o status atual de pagamento de uma inscrição. */
  @UseGuards(JwtGuard)
  @Get('status/:registrationId')
  getStatus(
    @CurrentUser() user: { id: string },
    @Param('registrationId') registrationId: string,
  ) {
    return this.paymentsService.getStatus(registrationId, user.id);
  }

  /** Confirmação manual do pagamento pelo organizador (dono do evento). */
  @UseGuards(JwtGuard)
  @Patch('registrations/:registrationId/confirm-manual')
  async confirmManually(
    @CurrentUser() user: { id: string },
    @Param('registrationId') registrationId: string,
  ) {
    await this.paymentsService.confirmManually(registrationId, user.id);
    return { ok: true };
  }

  /**
   * Webhook do Mercado Pago. Recebe notificações de mudança de status de pagamento.
   * Valida a assinatura quando MERCADOPAGO_WEBHOOK_SECRET estiver configurado.
   * Sempre retorna 200: erros de negócio não devem causar retentativa do MP.
   */
  @SkipThrottle()
  @Post('webhook/mercadopago')
  @HttpCode(200)
  async mpWebhook(
    @Body() body: MpWebhookBody,
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
  ) {
    if (body?.type !== 'payment' || !body?.data?.id) return { ok: true };

    const dataId = String(body.data.id);
    const secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET');

    if (secret) {
      const mp = this.provider as MercadoPagoPaymentProvider;
      if (typeof mp.validateWebhookSignature === 'function') {
        // Com o secret configurado, a assinatura é obrigatória. Sem o
        // header não há como validar, então a notificação é ignorada (antes
        // a ausência do header pulava a checagem inteira e processava assim
        // mesmo).
        const valid =
          !!xSignature &&
          mp.validateWebhookSignature(secret, xSignature, xRequestId ?? '', dataId);
        if (!valid) return { ok: true }; // assinatura ausente/inválida, ignora silenciosamente
      }
    }

    const status = await this.provider.getPaymentStatus(dataId);
    if (status === 'approved') {
      await this.paymentsService.confirmPayment(dataId);
    }

    return { ok: true };
  }

  /**
   * Simula a aprovação de um pagamento PIX no modo mock.
   * BLOQUEADO quando PAYMENT_PROVIDER !== 'mock'.
   * Dispara o mesmo confirmPayment que o webhook real dispararia.
   */
  @Post('mock/:providerPaymentId/approve')
  async mockApprove(@Param('providerPaymentId') providerPaymentId: string) {
    if (this.config.get('PAYMENT_PROVIDER') !== 'mock') {
      throw new NotFoundException();
    }

    (this.provider as MockPaymentProvider).simulateApproval(providerPaymentId);
    await this.paymentsService.confirmPayment(providerPaymentId);

    return { ok: true, providerPaymentId };
  }
}
