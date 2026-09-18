import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { CreateRegistrationDto } from './dto/create-registration.dto.js';
import { CreateRegistrationOrganizerDto } from './dto/create-registration-organizer.dto.js';
import {
  PAYMENT_METHODS,
  UpdateRegistrationDto,
} from './dto/update-registration.dto.js';
import { generateUniqueRegistrationCode } from '../common/registration-code.js';

const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  canceled: 'Cancelado',
  overbooked: 'Pago (sem vaga)',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Crédito',
  debit_card: 'Débito',
  cash: 'Dinheiro',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  failed: 'Falhou',
};

function formatCpf(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Neutraliza injeção de fórmula (CSV/Excel Injection): campos vindos de
 * inscrição pública (nome, e-mail, telefone, campos extras) vão sem filtro
 * para a planilha exportada pelo organizador. Se o valor começar com
 * = + - @ ou tab/CR, o Excel pode interpretá-lo como fórmula ao abrir o
 * arquivo, permitindo exfiltrar a própria planilha (dados + valores pagos)
 * ou, em versões antigas, executar comandos via DDE.
 */
function sanitizeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * Fragmento de `where` para o filtro por forma de pagamento. `'none'` cobre os
 * dois jeitos de a modalidade estar ausente: inscrição sem Payment nenhum
 * (lançada pelo organizador, por exemplo) e Payment com `method` nulo.
 * Vai dentro de `AND` para não colidir com o `OR` da busca textual.
 */
function buildPaymentMethodWhere(method?: string) {
  if (method === 'none') {
    return {
      AND: [{ OR: [{ payment: { is: null } }, { payment: { method: null } }] }],
    };
  }
  if ((PAYMENT_METHODS as readonly string[]).includes(method ?? '')) {
    return { payment: { method } };
  }
  return {};
}

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(userId: string, dto: CreateRegistrationDto) {
    const event = await this.prisma.db.event.findUnique({ where: { id: dto.eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const ticket = await this.prisma.db.ticket.findUnique({ where: { id: dto.ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    if (ticket.eventId !== dto.eventId)
      throw new BadRequestException('Ticket não pertence a este evento');

    return this.prisma.db.$transaction(async (tx) => {
      const used = await tx.registration.count({
        where: { ticketId: dto.ticketId, status: { not: 'canceled' } },
      });
      if (used >= ticket.quantity)
        throw new BadRequestException('Ingressos esgotados para este ticket');

      const code = await generateUniqueRegistrationCode(tx);
      return tx.registration.create({
        data: { userId, eventId: dto.eventId, ticketId: dto.ticketId, code },
        include: {
          event: { select: { id: true, title: true, date: true } },
          ticket: { select: { id: true, name: true, price: true } },
        },
      });
    }, { isolationLevel: 'Serializable' as never });
  }

  async findMyRegistrations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.db.registration.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          event: { select: { id: true, title: true, date: true, location: true } },
          ticket: { select: { id: true, name: true, price: true } },
          payment: { select: { id: true, status: true, amount: true, method: true, provider: true } },
        },
      }),
      this.prisma.db.registration.count({ where: { userId } }),
    ]);
    return { data, total, page, limit };
  }

  async findByEvent(eventId: string, userId: string, page = 1, limit = 50) {
    const event = await this.prisma.db.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.createdBy !== userId)
      throw new ForbiddenException('Sem permissão para acessar estas inscrições');

    limit = Math.min(Math.max(limit, 1), 1000);
    const skip = (Math.max(page, 1) - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.db.registration.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          ticket: { select: { id: true, name: true, price: true } },
          payment: { select: { id: true, status: true, amount: true, method: true, provider: true } },
        },
      }),
      this.prisma.db.registration.count({ where: { eventId } }),
    ]);
    return { data, total, page, limit };
  }

  async exportToXlsx(
    eventId: string,
    userId: string,
    filters: {
      search?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      method?: string;
    },
  ) {
    const event = await this.prisma.db.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.createdBy !== userId)
      throw new ForbiddenException('Sem permissão para acessar estas inscrições');

    const allowedStatuses = ['pending', 'confirmed', 'canceled', 'overbooked'];
    const status = allowedStatuses.includes(filters.status ?? '') ? filters.status : undefined;
    const search = filters.search?.trim();
    const methodWhere = buildPaymentMethodWhere(filters.method);

    const registrations = await this.prisma.db.registration.findMany({
      where: {
        eventId,
        ...(status ? { status: status as never } : { status: { not: 'canceled' } }),
        ...((filters.dateFrom || filters.dateTo) && {
          createdAt: {
            ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
            ...(filters.dateTo && { lte: new Date(`${filters.dateTo}T23:59:59`) }),
          },
        }),
        ...(search && {
          OR: [
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { cpf: { contains: search } },
            { id: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...methodWhere,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticket: { select: { id: true, name: true, price: true } },
        payment: { select: { id: true, status: true, amount: true, method: true, provider: true } },
      },
    });

    const parsedExtras = registrations.map((reg) => {
      if (!reg.extraFields) return {};
      try {
        return JSON.parse(reg.extraFields) as Record<string, string>;
      } catch {
        return {};
      }
    });
    const extraKeys = [...new Set(parsedExtras.flatMap((e) => Object.keys(e)))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inscritos');
    sheet.columns = [
      { header: 'Nome', key: 'name', width: 28 },
      { header: 'E-mail', key: 'email', width: 30 },
      { header: 'CPF', key: 'cpf', width: 16 },
      { header: 'Telefone', key: 'phone', width: 16 },
      { header: 'Data de nascimento', key: 'birthDate', width: 16 },
      { header: 'Código da inscrição', key: 'code', width: 16 },
      { header: 'Status', key: 'status', width: 16 },
      // Check-in logo depois de Status, na mesma ordem da tela do evento: na
      // 13ª coluna ninguém enxergava sem rolar para a direita.
      { header: 'Check-in realizado', key: 'checkedIn', width: 16 },
      { header: 'Data/hora do check-in', key: 'checkedInAt', width: 18 },
      { header: 'Data da inscrição', key: 'createdAt', width: 18 },
      { header: 'Tipo de ingresso', key: 'ticket', width: 22 },
      { header: 'Valor', key: 'amount', width: 12 },
      { header: 'Forma de pagamento', key: 'paymentMethod', width: 16 },
      { header: 'Status do pagamento', key: 'paymentStatus', width: 16 },
      ...extraKeys.map((key) => ({ header: key, key: `extra:${key}`, width: 20 })),
    ];
    sheet.getRow(1).font = { bold: true };

    registrations.forEach((reg, i) => {
      sheet.addRow({
        name: sanitizeCell(reg.user.name),
        email: sanitizeCell(reg.user.email),
        cpf: reg.cpf ? formatCpf(reg.cpf) : '',
        phone: reg.phone ? sanitizeCell(reg.phone) : '',
        birthDate: reg.birthDate ? reg.birthDate.toLocaleDateString('pt-BR') : '',
        code: reg.code ?? '',
        status: REGISTRATION_STATUS_LABELS[reg.status] ?? reg.status,
        createdAt: reg.createdAt.toLocaleString('pt-BR'),
        ticket: reg.ticket?.name ?? '',
        amount: reg.payment ? Number(reg.payment.amount) : 0,
        paymentMethod: reg.payment?.method
          ? (PAYMENT_METHOD_LABELS[reg.payment.method] ?? reg.payment.method)
          : '',
        paymentStatus: reg.payment
          ? (PAYMENT_STATUS_LABELS[reg.payment.status] ?? reg.payment.status)
          : '',
        checkedIn: reg.checkedIn ? 'Sim' : 'Não',
        checkedInAt: reg.checkedInAt ? reg.checkedInAt.toLocaleString('pt-BR') : '',
        ...Object.fromEntries(
          extraKeys.map((key) => [`extra:${key}`, sanitizeCell(parsedExtras[i][key] ?? '')]),
        ),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buffer), filename: `inscritos-${event.slug ?? event.id}.xlsx` };
  }

  async createByOrganizer(eventId: string, userId: string, dto: CreateRegistrationOrganizerDto) {
    const event = await this.prisma.db.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.createdBy !== userId)
      throw new ForbiddenException('Sem permissão para adicionar inscrições a este evento');

    // Normaliza para só dígitos — o dedup por evento depende de formato único
    const normalizedCpf = dto.cpf.replace(/\D/g, '');

    const registration = await this.prisma.db.$transaction(async (tx) => {
      if (event.maxParticipants) {
        const count = await tx.registration.count({
          where: { eventId, status: { not: 'canceled' } },
        });
        if (count >= event.maxParticipants)
          throw new BadRequestException('Evento lotado');
      }

      const duplicate = await tx.registration.findFirst({
        where: { eventId, cpf: normalizedCpf, status: { not: 'canceled' } },
      });
      if (duplicate)
        throw new BadRequestException('CPF já inscrito neste evento');

      let user = await tx.user.findUnique({ where: { email: dto.email } });
      if (!user) {
        const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
        user = await tx.user.create({
          data: { name: dto.name, email: dto.email, password: randomPassword, isShadow: true },
        });
      }

      const code = await generateUniqueRegistrationCode(tx);
      return tx.registration.create({
        data: {
          userId: user.id,
          eventId,
          status: 'confirmed',
          cpf: normalizedCpf,
          phone: dto.phone,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          code,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }, { isolationLevel: 'Serializable' as never });

    void this.mail.sendRegistrationConfirmation({
      participantName: dto.name,
      participantEmail: dto.email,
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      registrationId: registration.id,
      registrationCode: registration.code,
    });

    return registration;
  }

  async update(id: string, userId: string, dto: UpdateRegistrationDto) {
    const registration = await this.prisma.db.registration.findUnique({
      where: { id },
      include: { user: true, event: true, payment: true },
    });
    if (!registration) throw new NotFoundException('Inscrição não encontrada');
    if (registration.event.createdBy !== userId)
      throw new ForbiddenException('Sem permissão para editar esta inscrição');

    // Só propaga o nome para o User vinculado se for uma conta-placeholder
    // (isShadow) criada para essa inscrição — nunca para uma conta real, que
    // pode pertencer a alguém sem qualquer relação com este organizador.
    if (dto.name && registration.user.isShadow) {
      await this.prisma.db.user.update({
        where: { id: registration.userId },
        data: { name: dto.name },
      });
    }

    if (dto.amount !== undefined || dto.method !== undefined) {
      await this.setRegistrationPayment(registration, {
        amount: dto.amount,
        method: dto.method,
      });
    }

    return this.prisma.db.registration.update({
      where: { id },
      data: {
        ...(dto.cpf && { cpf: dto.cpf.replace(/\D/g, '') }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.birthDate !== undefined && {
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        }),
        ...(dto.ticketId && { ticketId: dto.ticketId }),
        ...(dto.extraFields !== undefined && {
          extraFields: JSON.stringify(dto.extraFields),
        }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticket: { select: { id: true, name: true, price: true } },
        payment: { select: { id: true, status: true, amount: true, method: true, provider: true } },
      },
    });
  }

  /**
   * Grava valor e/ou modalidade de pagamento da inscrição. Nenhum dos dois tem
   * coluna própria na Registration — ambos vivem no Payment vinculado, então
   * aqui é um upsert desse Payment.
   *
   * `provider` de um Payment já existente não é tocado: ele registra por onde
   * a cobrança passou tecnicamente (gateway, dinheiro, lançamento manual), e
   * isso não muda porque o organizador corrigiu a modalidade no cadastro.
   */
  private async setRegistrationPayment(
    registration: {
      id: string;
      status: string;
      payment: { id: string; status: string; providerPaymentId: string | null } | null;
    },
    changes: { amount?: number; method?: string | null },
  ) {
    const { payment } = registration;

    // Uma cobrança em aberto no gateway já foi emitida com o valor e a
    // modalidade atuais (o QR do Pix carrega o valor embutido). Trocar só o
    // registro local faria o webhook confirmar dados diferentes dos gravados.
    if (payment && payment.status === 'pending' && payment.providerPaymentId) {
      throw new BadRequestException(
        'Há uma cobrança em aberto no gateway para esta inscrição. Aguarde o pagamento ou o vencimento para alterar valor ou forma de pagamento.',
      );
    }

    if (payment) {
      await this.prisma.db.payment.update({
        where: { id: payment.id },
        data: {
          ...(changes.amount !== undefined && { amount: changes.amount }),
          ...(changes.method !== undefined && { method: changes.method }),
        },
      });
      return;
    }

    await this.prisma.db.payment.create({
      data: {
        registrationId: registration.id,
        // Sem Payment ainda: informar só a modalidade cria o lançamento zerado,
        // que o organizador completa depois com o valor.
        amount: changes.amount ?? 0,
        method: changes.method ?? null,
        // Inscrição já confirmada = o valor lançado agora é um recebimento
        // registrado à mão; nos demais casos segue pendente e continua
        // disponível para a confirmação manual do organizador.
        status: registration.status === 'confirmed' ? 'paid' : 'pending',
        provider: 'manual',
      },
    });
  }

  /**
   * Reenvia o e-mail de confirmação de uma inscrição — participante que não
   * recebeu, perdeu ou apagou o original.
   *
   * Diferente dos disparos automáticos (fire-and-forget), aqui o envio é
   * aguardado: o organizador clicou no botão e precisa saber se a mensagem saiu
   * ou falhou. Só vale para inscrição confirmada — o e-mail anuncia "inscrição
   * confirmada", então mandá-lo para quem ainda não pagou seria mentira.
   */
  async resendConfirmation(id: string, userId: string) {
    const registration = await this.prisma.db.registration.findUnique({
      where: { id },
      include: {
        event: true,
        user: { select: { name: true, email: true } },
        ticket: { select: { name: true } },
        payment: { select: { amount: true, status: true } },
      },
    });
    if (!registration) throw new NotFoundException('Inscrição não encontrada');
    if (registration.event.createdBy !== userId)
      throw new ForbiddenException('Sem permissão para reenviar o e-mail desta inscrição');
    if (registration.status !== 'confirmed')
      throw new BadRequestException(
        'Só é possível reenviar a confirmação de inscrições confirmadas.',
      );

    const sent = await this.mail.sendRegistrationConfirmation({
      participantName: registration.user.name,
      participantEmail: registration.user.email,
      eventTitle: registration.event.title,
      eventDate: registration.event.date,
      eventLocation: registration.event.location,
      registrationId: registration.id,
      registrationCode: registration.code,
      ticketName: registration.ticket?.name ?? null,
      amountPaid:
        registration.payment?.status === 'paid' ? Number(registration.payment.amount) : null,
    });

    if (!sent)
      throw new ServiceUnavailableException(
        'Não foi possível enviar o e-mail agora. Tente novamente em instantes.',
      );

    const sentAt = new Date();
    await this.prisma.db.registration.update({
      where: { id },
      data: { confirmationEmailSentAt: sentAt },
    });

    return { sent: true, email: registration.user.email, sentAt };
  }

  async cancel(id: string, userId: string) {
    const registration = await this.prisma.db.registration.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!registration) throw new NotFoundException('Inscrição não encontrada');
    if (registration.event.createdBy !== userId)
      throw new ForbiddenException('Sem permissão para cancelar esta inscrição');

    return this.prisma.db.registration.update({
      where: { id },
      data: { status: 'canceled' },
    });
  }

  async search(q: string, userId: string) {
    if (!q || q.trim().length < 2) return [];

    return this.prisma.db.registration.findMany({
      where: {
        event: { createdBy: userId },
        OR: [
          { user: { name: { contains: q, mode: 'insensitive' } } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { cpf: { contains: q } },
          { id: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticket: { select: { id: true, name: true, price: true } },
        event: { select: { id: true, title: true } },
        payment: { select: { id: true, status: true, amount: true, method: true, provider: true } },
      },
    });
  }
}
