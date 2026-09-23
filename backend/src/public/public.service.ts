import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { MailService } from '../mail/mail.service.js';
import { generateUniqueRegistrationCode } from '../common/registration-code.js';
import { computeCharge, resolveFeeConfig } from '../common/platform-fee.js';
import { PublicRegistrationDto } from './dto/public-registration.dto.js';

/**
 * Janela de vigência de uma modalidade (lote). `endDate` é inclusivo: a
 * modalidade vale durante todo o dia final (data armazenada à meia-noite,
 * tolerância de 24h cobre o dia inteiro).
 */
function isPaymentMethodActive(
  method: { startDate: Date | null; endDate: Date | null },
  now = new Date(),
): boolean {
  if (method.startDate && now < method.startDate) return false;
  if (method.endDate && now.getTime() > method.endDate.getTime() + 24 * 60 * 60 * 1000)
    return false;
  return true;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly mail: MailService,
  ) {}

  async findEventBySlug(slug: string) {
    const event = await this.prisma.db.event.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        description: true,
        about: true,
        location: true,
        date: true,
        endDate: true,
        bannerUrl: true,
        slug: true,
        category: true,
        maxParticipants: true,
        organizerPhone: true,
        whatsappGroupUrl: true,
        authorizationFormUrl: true,
        isPublished: true,
        formFields: true,
        feePercent: true,
        feeFixed: true,
        paymentMethods: {
          select: {
            id: true, type: true, value: true, installments: true, description: true,
            startDate: true, endDate: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        user: { select: { name: true } },
      },
    });

    if (!event || !event.isPublished) throw new NotFoundException('Evento não encontrado');

    const feeConfig = resolveFeeConfig(event);
    const { feePercent: _fp, feeFixed: _ff, ...eventFields } = event;

    // Expõe apenas modalidades dentro da janela de vigência (lotes ativos),
    // já com a taxa de serviço calculada para a tela pública mostrar o total
    // antes do participante decidir. Dinheiro não passa pela plataforma, então
    // não tem taxa.
    return {
      ...eventFields,
      paymentMethods: event.paymentMethods
        .filter((m) => isPaymentMethodActive(m))
        .map(({ startDate: _s, endDate: _e, ...rest }) => {
          const charge =
            rest.type === 'cash'
              ? { base: Number(rest.value), fee: 0, total: Number(rest.value) }
              : computeCharge(Number(rest.value), feeConfig);
          return { ...rest, feeAmount: charge.fee, totalAmount: charge.total };
        }),
    };
  }

  async getPaymentStatus(registrationId: string) {
    const registration = await this.prisma.db.registration.findUnique({
      where: { id: registrationId },
      select: { status: true, payment: { select: { status: true, providerPaymentId: true } } },
    });
    if (!registration) throw new NotFoundException('Inscrição não encontrada');

    // Fallback do webhook: se ainda pendente, pergunta ao provider e reconcilia
    if (registration.payment?.status === 'pending' && registration.payment.providerPaymentId) {
      await this.payments.reconcileByProvider(registration.payment.providerPaymentId);
      const refreshed = await this.prisma.db.registration.findUnique({
        where: { id: registrationId },
        select: { status: true, payment: { select: { status: true } } },
      });
      if (refreshed) {
        return {
          status: refreshed.status,
          paymentStatus: refreshed.payment?.status ?? null,
        };
      }
    }

    return {
      status: registration.status,
      paymentStatus: registration.payment?.status ?? null,
    };
  }

  async register(slug: string, dto: PublicRegistrationDto) {
    const normalizedCpf = dto.cpf.replace(/\D/g, '');

    const event = await this.prisma.db.event.findUnique({
      where: { slug },
      select: {
        id: true, title: true, isPublished: true, date: true, endDate: true,
        location: true, maxParticipants: true, feePercent: true, feeFixed: true,
      },
    });

    if (!event || !event.isPublished) throw new NotFoundException('Evento não encontrado');
    // Inscrições abertas até o fim do evento (data de término, ou a de início se não houver término)
    if (new Date() > (event.endDate ?? event.date))
      throw new BadRequestException('As inscrições para este evento estão encerradas');

    const paymentMethod = await this.prisma.db.eventPaymentMethod.findUnique({
      where: { id: dto.paymentMethodId },
    });
    if (!paymentMethod) throw new NotFoundException('Forma de pagamento não encontrada');
    if (paymentMethod.eventId !== event.id)
      throw new BadRequestException('Forma de pagamento não pertence a este evento');
    if (!isPaymentMethodActive(paymentMethod))
      throw new BadRequestException('Esta modalidade não está mais disponível');

    const baseAmount = Number(paymentMethod.value);
    // Dinheiro (valor > 0): vaga garantida, mas a inscrição fica pendente até o
    // organizador registrar o recebimento presencial (confirmação manual).
    const isCashPayment = baseAmount > 0 && paymentMethod.type === 'cash';
    const requiresOnlinePayment = baseAmount > 0 && !isCashPayment;

    // Taxa de serviço por cima do valor da inscrição: o participante paga
    // base + taxa, o organizador recebe a base cheia. Só incide sobre
    // pagamento online — em dinheiro o valor nunca passa pela plataforma.
    const charge = requiresOnlinePayment
      ? computeCharge(baseAmount, resolveFeeConfig(event))
      : { base: baseAmount, fee: 0, total: baseAmount };

    // CPF já tem inscrição confirmada neste evento
    const alreadyConfirmed = await this.prisma.db.registration.findFirst({
      where: { eventId: event.id, cpf: normalizedCpf, status: 'confirmed' },
    });
    if (alreadyConfirmed)
      throw new ConflictException('Este CPF já possui inscrição confirmada neste evento');

    // Anti-duplicidade para dinheiro pendente: mesmo CPF reaproveita a inscrição
    if (isCashPayment) {
      const existing = await this.prisma.db.registration.findFirst({
        where: {
          eventId: event.id,
          cpf: normalizedCpf,
          status: 'pending',
          payment: { provider: 'cash', status: 'pending' },
        },
        select: {
          id: true,
          code: true,
          payment: { select: { amount: true, baseAmount: true } },
        },
      });
      if (existing) {
        return {
          registrationId: existing.id,
          code: existing.code,
          amount: Number(existing.payment?.amount ?? charge.total),
          baseAmount: Number(existing.payment?.baseAmount ?? charge.base),
          feeAmount: 0, // dinheiro nunca passa pela plataforma
          status: 'pending' as const,
          paymentType: 'cash' as const,
          reused: true,
        };
      }
    }

    // Anti-duplicidade para PIX pendente: reutiliza o mesmo QR Code se ainda válido
    if (requiresOnlinePayment) {
      const existing = await this.prisma.db.registration.findFirst({
        where: {
          eventId: event.id,
          cpf: normalizedCpf,
          status: 'pending',
          payment: { status: 'pending', expiresAt: { gt: new Date() } },
        },
        include: {
          payment: {
            select: {
              id: true,
              providerPaymentId: true,
              qrCodeBase64: true,
              qrCodeCopiaECola: true,
              expiresAt: true,
              amount: true,
              baseAmount: true,
              feeAmount: true,
            },
          },
        },
      });

      if (existing?.payment) {
        return {
          registrationId: existing.id,
          code: existing.code,
          paymentId: existing.payment.id,
          providerPaymentId: existing.payment.providerPaymentId,
          qrCodeBase64: existing.payment.qrCodeBase64,
          qrCodeCopiaECola: existing.payment.qrCodeCopiaECola,
          expiresAt: existing.payment.expiresAt,
          amount: existing.payment.amount,
          baseAmount: existing.payment.baseAmount,
          feeAmount: existing.payment.feeAmount,
          status: 'pending' as const,
          reused: true,
        };
      }
    }

    // Cria inscrição dentro de transação serializável
    const registration = await this.prisma.db.$transaction(async (tx) => {
      if (event.maxParticipants !== null) {
        const total = await tx.registration.count({
          where: { eventId: event.id, status: { not: 'canceled' } },
        });
        if (total >= event.maxParticipants!)
          throw new ConflictException('Evento lotado');
      }

      let user = await tx.user.findUnique({ where: { email: dto.email } });
      if (!user) {
        const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
        user = await tx.user.create({
          data: { name: dto.fullName, email: dto.email, password: randomPassword, isShadow: true },
        });
      }

      const code = await generateUniqueRegistrationCode(tx);

      const created = await tx.registration.create({
        data: {
          userId: user.id,
          eventId: event.id,
          status: requiresOnlinePayment || isCashPayment ? 'pending' : 'confirmed',
          cpf: normalizedCpf,
          phone: dto.phone ?? null,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          extraFields: dto.extraFields ? JSON.stringify(dto.extraFields) : null,
          code,
        },
      });

      // Dinheiro: registra o valor devido para a confirmação manual do organizador
      if (isCashPayment) {
        await tx.payment.create({
          data: {
            registrationId: created.id,
            amount: charge.total,
            baseAmount: charge.base,
            feeAmount: charge.fee,
            status: 'pending',
            method: paymentMethod.type,
            provider: 'cash',
          },
        });
      }

      return created;
    }, { isolationLevel: 'Serializable' as never });

    // Dinheiro: vaga garantida, aguardando pagamento presencial. O e-mail de
    // confirmação só sai quando o organizador registrar o recebimento.
    if (isCashPayment) {
      return {
        registrationId: registration.id,
        code: registration.code,
        amount: charge.total,
        baseAmount: charge.base,
        feeAmount: charge.fee,
        status: 'pending' as const,
        paymentType: 'cash' as const,
      };
    }

    // Inscrição gratuita: confirma direto e envia e-mail
    if (!requiresOnlinePayment) {
      const marked = await this.prisma.db.registration.updateMany({
        where: { id: registration.id, confirmationEmailSentAt: null },
        data: { confirmationEmailSentAt: new Date() },
      });
      if (marked.count > 0) {
        void this.mail.sendRegistrationConfirmation({
          participantName: dto.fullName,
          participantEmail: dto.email,
          eventTitle: event.title,
          eventDate: event.date,
          eventLocation: event.location,
          registrationId: registration.id,
          registrationCode: registration.code,
          amountPaid: 0,
        });
      }

      return {
        registrationId: registration.id,
        code: registration.code,
        amount: 0,
        status: 'confirmed' as const,
      };
    }

    // Inscrição paga: gera PIX
    const pix = await this.payments.createPixForRegistration(
      registration.id,
      registration.userId,
      charge,
      paymentMethod.type,
    );

    return {
      registrationId: registration.id,
      code: registration.code,
      ...pix,
      status: 'pending' as const,
    };
  }
}
