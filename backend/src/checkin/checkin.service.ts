import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { normalizeRegistrationCode } from '../common/registration-code.js';

type CheckinFilter = 'all' | 'done' | 'pending';

interface RegistrationRow {
  id: string;
  cpf: string | null;
  code: string | null;
  checkedIn: boolean;
  checkedInAt: Date | null;
  checkedInBy: string | null;
  status: string;
  user: { id: string; name: string; email: string };
  ticket: { id: string; name: string; price: unknown } | null;
  payment: { status: string; provider: string } | null;
}

/** Remove acentos e normaliza para comparação case/acento-insensitive. */
function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---- Autorização: criador do evento OU voluntário vinculado ----
  private async assertCanCheckin(eventId: string, userId: string) {
    const event = await this.prisma.db.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, createdBy: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');

    if (event.createdBy === userId) return event;

    const volunteer = await this.prisma.db.eventVolunteer.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true },
    });
    if (!volunteer) {
      throw new ForbiddenException(
        'Você não tem permissão para credenciar neste evento',
      );
    }
    return event;
  }

  private mapRegistration(reg: RegistrationRow) {
    return {
      id: reg.id,
      name: reg.user.name,
      email: reg.user.email,
      cpf: reg.cpf,
      code: reg.code,
      category: reg.ticket?.name ?? null,
      status: reg.status,
      paymentStatus: reg.payment?.status ?? null,
      paymentProvider: reg.payment?.provider ?? null,
      checkedIn: reg.checkedIn,
      checkedInAt: reg.checkedInAt,
      checkedInBy: reg.checkedInBy,
    };
  }

  async list(
    eventId: string,
    userId: string,
    filter: CheckinFilter = 'all',
    search?: string,
  ) {
    await this.assertCanCheckin(eventId, userId);

    // Carrega as inscrições não canceladas do evento. Para o tamanho típico de
    // um evento isso cabe em memória e permite busca acento-insensitive + ordenação.
    const registrations = (await this.prisma.db.registration.findMany({
      where: { eventId, status: { not: 'canceled' } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticket: { select: { id: true, name: true, price: true } },
        payment: { select: { status: true, provider: true } },
      },
    })) as unknown as RegistrationRow[];

    let rows = registrations;

    if (filter === 'done') rows = rows.filter((r) => r.checkedIn);
    else if (filter === 'pending') rows = rows.filter((r) => !r.checkedIn);

    if (search && search.trim().length > 0) {
      const q = normalizeText(search);
      rows = rows.filter((r) => {
        const haystack = normalizeText(
          `${r.user.name} ${r.cpf ?? ''} ${r.code ?? ''}`,
        );
        return haystack.includes(q);
      });
    }

    rows.sort((a, b) =>
      a.user.name.localeCompare(b.user.name, 'pt-BR', { sensitivity: 'base' }),
    );

    return rows.map((r) => this.mapRegistration(r));
  }

  async stats(eventId: string, userId: string) {
    const event = await this.assertCanCheckin(eventId, userId);

    const [total, done] = await Promise.all([
      this.prisma.db.registration.count({
        where: { eventId, status: { not: 'canceled' } },
      }),
      this.prisma.db.registration.count({
        where: { eventId, status: { not: 'canceled' }, checkedIn: true },
      }),
    ]);

    return { eventId, title: event.title, total, done, pending: total - done };
  }

  /** Eventos que o usuário pode credenciar (criador OU voluntário vinculado). */
  async myEvents(userId: string) {
    const links = await this.prisma.db.eventVolunteer.findMany({
      where: { userId },
      select: { eventId: true },
    });
    const volunteerEventIds = links.map((l) => l.eventId);

    const events = await this.prisma.db.event.findMany({
      where: { OR: [{ createdBy: userId }, { id: { in: volunteerEventIds } }] },
      include: { user: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });

    const eventIds = events.map((e) => e.id);
    if (eventIds.length === 0) return [];

    const [totals, dones] = await Promise.all([
      this.prisma.db.registration.groupBy({
        by: ['eventId'],
        where: { eventId: { in: eventIds }, status: { not: 'canceled' } },
        _count: { _all: true },
      }),
      this.prisma.db.registration.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: eventIds },
          status: { not: 'canceled' },
          checkedIn: true,
        },
        _count: { _all: true },
      }),
    ]);

    const totalMap = new Map(totals.map((t) => [t.eventId, t._count._all]));
    const doneMap = new Map(dones.map((d) => [d.eventId, d._count._all]));
    const now = new Date();

    return events.map((e) => {
      const end = e.endDate ?? e.date;
      return {
        id: e.id,
        title: e.title,
        startDate: e.date,
        endDate: e.endDate,
        status: end < now ? ('ended' as const) : ('ongoing' as const),
        organization: e.user?.name ?? null,
        total: totalMap.get(e.id) ?? 0,
        credentialed: doneMap.get(e.id) ?? 0,
      };
    });
  }

  async checkIn(eventId: string, registrationId: string, userId: string) {
    await this.assertCanCheckin(eventId, userId);

    // Condição atômica: só credencia se ainda NÃO estiver credenciado.
    // Se dois voluntários disputarem, apenas um update terá count === 1.
    const result = await this.prisma.db.registration.updateMany({
      where: {
        id: registrationId,
        eventId,
        checkedIn: false,
        status: { not: 'canceled' },
      },
      data: { checkedIn: true, checkedInAt: new Date(), checkedInBy: userId },
    });

    if (result.count === 1) {
      await this.prisma.db.checkinLog.create({
        data: {
          registrationId,
          eventId,
          action: 'check_in',
          performedBy: userId,
        },
      });
      this.logger.log(
        `Check-in OK: reg=${registrationId} evento=${eventId} por=${userId}`,
      );
      const reg = await this.fetchOrThrow(eventId, registrationId);
      return {
        status: 'checked_in' as const,
        registration: this.mapRegistration(reg),
      };
    }

    // count === 0: não encontrado, cancelado ou já credenciado.
    const reg = await this.fetchOrThrow(eventId, registrationId);
    if (reg.status === 'canceled') {
      throw new BadRequestException('Inscrição cancelada');
    }

    // Já estava credenciado → idempotente, devolve quem/quando sem erro feio.
    const performer = reg.checkedInBy
      ? await this.prisma.db.user.findUnique({
          where: { id: reg.checkedInBy },
          select: { name: true },
        })
      : null;

    return {
      status: 'already' as const,
      registration: this.mapRegistration(reg),
      checkedInByName: performer?.name ?? null,
    };
  }

  async undo(eventId: string, registrationId: string, userId: string) {
    await this.assertCanCheckin(eventId, userId);

    const result = await this.prisma.db.registration.updateMany({
      where: { id: registrationId, eventId, checkedIn: true },
      data: { checkedIn: false, checkedInAt: null, checkedInBy: null },
    });

    if (result.count === 1) {
      await this.prisma.db.checkinLog.create({
        data: {
          registrationId,
          eventId,
          action: 'undo',
          performedBy: userId,
        },
      });
      this.logger.log(
        `Desfez check-in: reg=${registrationId} evento=${eventId} por=${userId}`,
      );
      const reg = await this.fetchOrThrow(eventId, registrationId);
      return {
        status: 'undone' as const,
        registration: this.mapRegistration(reg),
      };
    }

    // count === 0: não encontrado ou já estava sem check-in (idempotente).
    const reg = await this.fetchOrThrow(eventId, registrationId);
    return {
      status: 'already' as const,
      registration: this.mapRegistration(reg),
    };
  }

  async findByCode(eventId: string, code: string, userId: string) {
    await this.assertCanCheckin(eventId, userId);

    const normalized = normalizeRegistrationCode(code);
    const reg = (await this.prisma.db.registration.findFirst({
      where: { code: normalized, eventId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticket: { select: { id: true, name: true, price: true } },
        payment: { select: { status: true, provider: true } },
      },
    })) as unknown as RegistrationRow | null;

    if (!reg) {
      throw new NotFoundException('Código não encontrado neste evento');
    }
    return this.mapRegistration(reg);
  }

  private async fetchOrThrow(
    eventId: string,
    registrationId: string,
  ): Promise<RegistrationRow> {
    const reg = (await this.prisma.db.registration.findFirst({
      where: { id: registrationId, eventId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticket: { select: { id: true, name: true, price: true } },
        payment: { select: { status: true, provider: true } },
      },
    })) as unknown as RegistrationRow | null;

    if (!reg) throw new NotFoundException('Inscrição não encontrada');
    return reg;
  }
}
