import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto.js';
import { computeCharge, resolveFeeConfig } from '../common/platform-fee.js';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.db.event.findMany({
      where: { createdBy: userId },
      orderBy: { date: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
        _count: {
          select: {
            tickets: true,
            registrations: { where: { status: { not: 'canceled' } } },
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const event = await this.prisma.db.event.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        tickets: true,
        paymentMethods: { orderBy: { createdAt: 'asc' } },
        _count: { select: { registrations: { where: { status: { not: 'canceled' } } } } },
      },
    });

    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.createdBy !== userId)
      throw new ForbiddenException('Sem permissão para acessar este evento');

    return event;
  }

  async create(userId: string, dto: CreateEventDto) {
    if (dto.slug) {
      const existing = await this.prisma.db.event.findUnique({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException('Esta URL já está em uso');
    }

    return this.prisma.db.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        date: new Date(dto.date),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        bannerUrl: dto.bannerUrl,
        slug: dto.slug,
        category: dto.category,
        maxParticipants: dto.maxParticipants,
        organizerPhone: dto.organizerPhone,
        whatsappGroupUrl: dto.whatsappGroupUrl,
        about: dto.about,
        formFields: dto.formFields,
        createdBy: userId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateEventDto) {
    await this.checkOwnership(id, userId);

    if (dto.slug) {
      const existing = await this.prisma.db.event.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (existing) throw new ConflictException('Esta URL já está em uso');
    }

    return this.prisma.db.event.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.maxParticipants !== undefined && { maxParticipants: dto.maxParticipants }),
        ...(dto.organizerPhone !== undefined && { organizerPhone: dto.organizerPhone }),
        ...(dto.whatsappGroupUrl !== undefined && { whatsappGroupUrl: dto.whatsappGroupUrl }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        ...(dto.about !== undefined && { about: dto.about }),
        ...(dto.formFields !== undefined && { formFields: dto.formFields }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.checkOwnership(id, userId);

    // Um evento que já movimentou dinheiro não pode ser apagado: o razão da
    // carteira ficaria com créditos sem origem rastreável, e o organizador
    // perderia a comprovação de onde veio o saldo que ele vai resgatar.
    const ledgerCount = await this.prisma.db.ledgerEntry.count({
      where: { eventId: id },
    });
    if (ledgerCount > 0)
      throw new BadRequestException(
        'Este evento tem pagamentos lançados na carteira e não pode ser excluído. Despublique-o em vez disso.',
      );

    await this.prisma.db.$transaction(async (tx) => {
      const registrations = await tx.registration.findMany({
        where: { eventId: id },
        select: { id: true },
      });
      const regIds = registrations.map((r) => r.id);

      await tx.payment.deleteMany({ where: { registrationId: { in: regIds } } });
      await tx.checkinLog.deleteMany({ where: { registrationId: { in: regIds } } });
      await tx.eventFeedback.deleteMany({ where: { eventId: id } });
      await tx.registration.deleteMany({ where: { eventId: id } });
      await tx.eventPaymentMethod.deleteMany({ where: { eventId: id } });
      await tx.eventVolunteer.deleteMany({ where: { eventId: id } });
      await tx.ticket.deleteMany({ where: { eventId: id } });
      await tx.event.delete({ where: { id } });
    });

    return { message: 'Evento removido com sucesso' };
  }

  async addPaymentMethod(eventId: string, userId: string, dto: CreatePaymentMethodDto) {
    await this.checkOwnership(eventId, userId);

    return this.prisma.db.eventPaymentMethod.create({
      data: {
        eventId,
        type: dto.type,
        value: dto.value ?? 0,
        installments: dto.installments ?? 1,
        description: dto.description ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async removePaymentMethod(eventId: string, methodId: string, userId: string) {
    await this.checkOwnership(eventId, userId);

    const method = await this.prisma.db.eventPaymentMethod.findFirst({
      where: { id: methodId, eventId },
    });
    if (!method) throw new NotFoundException('Modalidade não encontrada');

    await this.prisma.db.eventPaymentMethod.delete({ where: { id: methodId } });
    return { message: 'Modalidade removida' };
  }

  async uploadBanner(id: string, userId: string, filename: string) {
    await this.checkOwnership(id, userId);

    const current = await this.prisma.db.event.findUnique({ where: { id }, select: { bannerUrl: true } });
    if (current?.bannerUrl) {
      try {
        await unlink(join(process.cwd(), current.bannerUrl));
      } catch { /* arquivo já não existe, sem problema */ }
    }

    const bannerUrl = `/uploads/${filename}`;
    await this.prisma.db.event.update({ where: { id }, data: { bannerUrl } });
    return { bannerUrl };
  }

  async uploadAuthorizationForm(id: string, userId: string, filename: string) {
    await this.checkOwnership(id, userId);
    await this.deleteAuthorizationFormFile(id);

    const authorizationFormUrl = `/uploads/${filename}`;
    await this.prisma.db.event.update({ where: { id }, data: { authorizationFormUrl } });
    return { authorizationFormUrl };
  }

  async removeAuthorizationForm(id: string, userId: string) {
    await this.checkOwnership(id, userId);
    await this.deleteAuthorizationFormFile(id);
    await this.prisma.db.event.update({ where: { id }, data: { authorizationFormUrl: null } });
    return { authorizationFormUrl: null };
  }

  private async deleteAuthorizationFormFile(id: string) {
    const current = await this.prisma.db.event.findUnique({
      where: { id },
      select: { authorizationFormUrl: true },
    });
    if (current?.authorizationFormUrl) {
      try {
        await unlink(join(process.cwd(), current.authorizationFormUrl));
      } catch { /* arquivo já não existe, sem problema */ }
    }
  }

  /**
   * Modalidades do evento já com a taxa de serviço calculada, para o
   * organizador ver quanto o participante paga e quanto ele recebe.
   */
  async getPaymentMethods(eventId: string, userId: string) {
    const event = await this.checkOwnership(eventId, userId);
    const feeConfig = resolveFeeConfig(event);

    const methods = await this.prisma.db.eventPaymentMethod.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });

    return methods.map((method) => {
      // Dinheiro é recebido direto pelo organizador, sem passar pela
      // plataforma — logo, sem taxa.
      const charge =
        method.type === 'cash'
          ? { base: Number(method.value), fee: 0, total: Number(method.value) }
          : computeCharge(Number(method.value), feeConfig);
      return { ...method, feeAmount: charge.fee, totalAmount: charge.total };
    });
  }

  /**
   * Taxa vigente do evento, para a tela de cadastro simular o total antes de
   * salvar a modalidade. O valor autoritativo continua vindo do backend.
   */
  async getFeeConfig(eventId: string, userId: string) {
    const event = await this.checkOwnership(eventId, userId);
    return resolveFeeConfig(event);
  }

  private async checkOwnership(id: string, userId: string) {
    const event = await this.prisma.db.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.createdBy !== userId)
      throw new ForbiddenException('Apenas o criador pode modificar este evento');
    return event;
  }
}
