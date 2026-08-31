import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RegistrationsService } from './registrations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';

const mockDb: any = {
  event: { findUnique: jest.fn() },
  ticket: { findUnique: jest.fn() },
  payment: {
    create: jest.fn(),
    update: jest.fn(),
  },
  registration: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  // executa o callback com o próprio mock, simulando a transação
  $transaction: jest.fn().mockImplementation((cb: any) =>
    typeof cb === 'function' ? cb(mockDb) : Promise.all(cb),
  ),
};

const OWNER_ID = 'owner-uuid';

const mockPrisma = { db: mockDb };
const mockMail = { sendRegistrationConfirmation: jest.fn().mockResolvedValue(undefined) };

const EVENT_ID = 'event-uuid';
const TICKET_ID = 'ticket-uuid';
const USER_ID = 'user-uuid';

const baseEvent = {
  id: EVENT_ID,
  title: 'Conferência',
  slug: 'conf-2026',
  isPublished: true,
  maxParticipants: 100,
  date: new Date('2026-08-01'),
  location: 'São Paulo',
  createdBy: OWNER_ID,
};

const baseTicket = {
  id: TICKET_ID,
  eventId: EVENT_ID,
  name: 'Geral',
  price: 0,
  quantity: 50,
};

const baseUser = { id: USER_ID, name: 'João', email: 'joao@test.com' };

describe('RegistrationsService', () => {
  let service: RegistrationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
    jest.clearAllMocks();
  });

  // ─── create (com ticket) ────────────────────────────────────────────────────

  describe('create', () => {
    it('cria inscrição com ticket válido', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.ticket.findUnique.mockResolvedValue(baseTicket);
      mockDb.registration.count.mockResolvedValue(0); // 0 usados de 50
      mockDb.registration.create.mockResolvedValue({ id: 'r1', userId: USER_ID, eventId: EVENT_ID, ticketId: TICKET_ID });

      const result = await service.create(USER_ID, { eventId: EVENT_ID, ticketId: TICKET_ID });
      expect(result).toHaveProperty('id');
    });

    it('lança NotFoundException para evento inexistente', async () => {
      mockDb.event.findUnique.mockResolvedValue(null);

      await expect(service.create(USER_ID, { eventId: 'fake', ticketId: TICKET_ID }))
        .rejects.toThrow(NotFoundException);
    });

    it('lança NotFoundException para ticket inexistente', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.ticket.findUnique.mockResolvedValue(null);

      await expect(service.create(USER_ID, { eventId: EVENT_ID, ticketId: 'fake' }))
        .rejects.toThrow(NotFoundException);
    });

    it('lança BadRequestException quando ticket não pertence ao evento', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.ticket.findUnique.mockResolvedValue({ ...baseTicket, eventId: 'outro-evento' });

      await expect(service.create(USER_ID, { eventId: EVENT_ID, ticketId: TICKET_ID }))
        .rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando ingressos esgotados', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.ticket.findUnique.mockResolvedValue({ ...baseTicket, quantity: 10 });
      mockDb.registration.count.mockResolvedValue(10); // lotado

      await expect(service.create(USER_ID, { eventId: EVENT_ID, ticketId: TICKET_ID }))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ─── findByEvent ────────────────────────────────────────────────────────────

  describe('findByEvent', () => {
    it('retorna inscrições paginadas quando é o dono do evento', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.registration.findMany.mockResolvedValue([{ id: 'r1' }]);
      mockDb.registration.count.mockResolvedValue(1);

      const result = await service.findByEvent(EVENT_ID, OWNER_ID);
      expect(result).toMatchObject({ data: [{ id: 'r1' }], total: 1, page: 1 });
    });

    it('lança ForbiddenException quando não é o dono do evento', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);

      await expect(service.findByEvent(EVENT_ID, 'outro-user')).rejects.toThrow(ForbiddenException);
      expect(mockDb.registration.findMany).not.toHaveBeenCalled();
    });

    it('lança NotFoundException para evento inexistente', async () => {
      mockDb.event.findUnique.mockResolvedValue(null);

      await expect(service.findByEvent('fake', OWNER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── exportToXlsx ───────────────────────────────────────────────────────────

  describe('exportToXlsx', () => {
    beforeEach(() => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.registration.findMany.mockResolvedValue([]);
    });

    function whereOfLastFindMany() {
      return mockDb.registration.findMany.mock.calls[0][0].where;
    }

    it('filtra por forma de pagamento', async () => {
      await service.exportToXlsx(EVENT_ID, OWNER_ID, { method: 'pix' });

      expect(whereOfLastFindMany()).toMatchObject({ payment: { method: 'pix' } });
    });

    it("filtra inscrições sem forma de pagamento com method='none'", async () => {
      await service.exportToXlsx(EVENT_ID, OWNER_ID, { method: 'none' });

      expect(whereOfLastFindMany()).toMatchObject({
        AND: [{ OR: [{ payment: { is: null } }, { payment: { method: null } }] }],
      });
    });

    it('ignora forma de pagamento desconhecida', async () => {
      await service.exportToXlsx(EVENT_ID, OWNER_ID, { method: 'bitcoin' });

      const where = whereOfLastFindMany();
      expect(where.payment).toBeUndefined();
      expect(where.AND).toBeUndefined();
    });

    it('combina busca textual e forma de pagamento sem uma sobrescrever a outra', async () => {
      await service.exportToXlsx(EVENT_ID, OWNER_ID, { search: 'joao', method: 'cash' });

      const where = whereOfLastFindMany();
      expect(where.OR).toHaveLength(4);
      expect(where.payment).toEqual({ method: 'cash' });
    });

    it('lança ForbiddenException quando não é o dono do evento', async () => {
      await expect(service.exportToXlsx(EVENT_ID, 'outro-user', {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── createByOrganizer ──────────────────────────────────────────────────────

  describe('createByOrganizer', () => {
    const dto = { name: 'José', email: 'jose@test.com', cpf: '00000000000' };

    it('cria inscrição manual com sucesso', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.registration.count.mockResolvedValue(0);
      mockDb.registration.findFirst.mockResolvedValue(null);
      mockDb.user.findUnique.mockResolvedValue(baseUser);
      mockDb.registration.create.mockResolvedValue({ id: 'r1', userId: USER_ID, eventId: EVENT_ID });

      const result = await service.createByOrganizer(EVENT_ID, OWNER_ID, dto);
      expect(result).toHaveProperty('id');
    });

    it('lança ForbiddenException quando não é o dono do evento', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);

      await expect(service.createByOrganizer(EVENT_ID, 'outro-user', dto))
        .rejects.toThrow(ForbiddenException);
    });

    it('lança BadRequestException quando evento lotado', async () => {
      mockDb.event.findUnique.mockResolvedValue({ ...baseEvent, maxParticipants: 1 });
      mockDb.registration.count.mockResolvedValue(1);

      await expect(service.createByOrganizer(EVENT_ID, OWNER_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('normaliza CPF formatado antes do dedup e da gravação', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.registration.count.mockResolvedValue(0);
      mockDb.registration.findFirst.mockResolvedValue(null);
      mockDb.user.findUnique.mockResolvedValue(baseUser);
      mockDb.registration.create.mockResolvedValue({ id: 'r1' });

      await service.createByOrganizer(EVENT_ID, OWNER_ID, { ...dto, cpf: '529.982.247-25' });

      expect(mockDb.registration.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ cpf: '52998224725' }) }),
      );
      expect(mockDb.registration.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ cpf: '52998224725' }) }),
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    const reg = { id: 'r1', userId: USER_ID, user: baseUser, event: { createdBy: OWNER_ID } };

    it('atualiza dados da inscrição quando é o dono do evento', async () => {
      mockDb.registration.findUnique.mockResolvedValue(reg);
      mockDb.user.update.mockResolvedValue({});
      mockDb.registration.update.mockResolvedValue({ ...reg, cpf: '99999999999' });

      const result = await service.update('r1', OWNER_ID, { name: 'Novo nome', cpf: '99999999999' });
      expect(mockDb.registration.update).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('cpf', '99999999999');
    });

    it('lança ForbiddenException quando não é o dono do evento', async () => {
      mockDb.registration.findUnique.mockResolvedValue(reg);

      await expect(service.update('r1', 'outro-user', { cpf: '99999999999' }))
        .rejects.toThrow(ForbiddenException);
      expect(mockDb.registration.update).not.toHaveBeenCalled();
    });

    it('lança NotFoundException para inscrição inexistente', async () => {
      mockDb.registration.findUnique.mockResolvedValue(null);

      await expect(service.update('fake', OWNER_ID, { cpf: '12345678900' })).rejects.toThrow(NotFoundException);
    });

    it('atualiza o valor no Payment existente', async () => {
      mockDb.registration.findUnique.mockResolvedValue({
        ...reg,
        status: 'pending',
        payment: { id: 'p1', status: 'pending', providerPaymentId: null },
      });
      mockDb.registration.update.mockResolvedValue(reg);

      await service.update('r1', OWNER_ID, { amount: 120.5 });

      expect(mockDb.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { amount: 120.5 },
      });
      expect(mockDb.payment.create).not.toHaveBeenCalled();
    });

    it('cria Payment manual pendente quando a inscrição ainda não tem valor', async () => {
      mockDb.registration.findUnique.mockResolvedValue({ ...reg, status: 'pending', payment: null });
      mockDb.registration.update.mockResolvedValue(reg);

      await service.update('r1', OWNER_ID, { amount: 80 });

      expect(mockDb.payment.create).toHaveBeenCalledWith({
        data: { registrationId: 'r1', amount: 80, method: null, status: 'pending', provider: 'manual' },
      });
    });

    it('cria Payment manual já pago quando a inscrição está confirmada', async () => {
      mockDb.registration.findUnique.mockResolvedValue({ ...reg, status: 'confirmed', payment: null });
      mockDb.registration.update.mockResolvedValue(reg);

      await service.update('r1', OWNER_ID, { amount: 80 });

      expect(mockDb.payment.create).toHaveBeenCalledWith({
        data: { registrationId: 'r1', amount: 80, method: null, status: 'paid', provider: 'manual' },
      });
    });

    it('recusa alterar o valor com cobrança em aberto no gateway', async () => {
      mockDb.registration.findUnique.mockResolvedValue({
        ...reg,
        status: 'pending',
        payment: { id: 'p1', status: 'pending', providerPaymentId: 'mp-123' },
      });

      await expect(service.update('r1', OWNER_ID, { amount: 10 })).rejects.toThrow(BadRequestException);
      expect(mockDb.payment.update).not.toHaveBeenCalled();
      expect(mockDb.registration.update).not.toHaveBeenCalled();
    });

    it('não mexe no Payment quando valor e forma de pagamento não foram enviados', async () => {
      mockDb.registration.findUnique.mockResolvedValue({ ...reg, status: 'pending', payment: null });
      mockDb.registration.update.mockResolvedValue(reg);

      await service.update('r1', OWNER_ID, { name: 'Novo nome' });

      expect(mockDb.payment.create).not.toHaveBeenCalled();
      expect(mockDb.payment.update).not.toHaveBeenCalled();
    });

    it('altera a forma de pagamento sem tocar no valor nem no provider', async () => {
      mockDb.registration.findUnique.mockResolvedValue({
        ...reg,
        status: 'confirmed',
        payment: { id: 'p1', status: 'paid', providerPaymentId: null },
      });
      mockDb.registration.update.mockResolvedValue(reg);

      await service.update('r1', OWNER_ID, { method: 'cash' });

      expect(mockDb.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { method: 'cash' },
      });
    });

    it('limpa a forma de pagamento quando recebe null', async () => {
      mockDb.registration.findUnique.mockResolvedValue({
        ...reg,
        status: 'pending',
        payment: { id: 'p1', status: 'pending', providerPaymentId: null },
      });
      mockDb.registration.update.mockResolvedValue(reg);

      await service.update('r1', OWNER_ID, { method: null });

      expect(mockDb.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { method: null },
      });
    });

    it('grava valor e forma de pagamento na mesma edição', async () => {
      mockDb.registration.findUnique.mockResolvedValue({
        ...reg,
        status: 'pending',
        payment: { id: 'p1', status: 'pending', providerPaymentId: null },
      });
      mockDb.registration.update.mockResolvedValue(reg);

      await service.update('r1', OWNER_ID, { amount: 45, method: 'debit_card' });

      expect(mockDb.payment.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { amount: 45, method: 'debit_card' },
      });
    });

    it('cria Payment zerado quando só a forma de pagamento é informada', async () => {
      mockDb.registration.findUnique.mockResolvedValue({ ...reg, status: 'pending', payment: null });
      mockDb.registration.update.mockResolvedValue(reg);

      await service.update('r1', OWNER_ID, { method: 'pix' });

      expect(mockDb.payment.create).toHaveBeenCalledWith({
        data: { registrationId: 'r1', amount: 0, method: 'pix', status: 'pending', provider: 'manual' },
      });
    });

    it('recusa alterar a forma de pagamento com cobrança em aberto no gateway', async () => {
      mockDb.registration.findUnique.mockResolvedValue({
        ...reg,
        status: 'pending',
        payment: { id: 'p1', status: 'pending', providerPaymentId: 'mp-123' },
      });

      await expect(service.update('r1', OWNER_ID, { method: 'cash' })).rejects.toThrow(BadRequestException);
      expect(mockDb.payment.update).not.toHaveBeenCalled();
    });
  });

  // ─── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('cancela inscrição quando é o dono do evento', async () => {
      mockDb.registration.findUnique.mockResolvedValue({ id: 'r1', status: 'confirmed', event: { createdBy: OWNER_ID } });
      mockDb.registration.update.mockResolvedValue({ id: 'r1', status: 'canceled' });

      const result = await service.cancel('r1', OWNER_ID);
      expect(result.status).toBe('canceled');
    });

    it('lança ForbiddenException quando não é o dono do evento', async () => {
      mockDb.registration.findUnique.mockResolvedValue({ id: 'r1', status: 'confirmed', event: { createdBy: OWNER_ID } });

      await expect(service.cancel('r1', 'outro-user')).rejects.toThrow(ForbiddenException);
      expect(mockDb.registration.update).not.toHaveBeenCalled();
    });

    it('lança NotFoundException para inscrição inexistente', async () => {
      mockDb.registration.findUnique.mockResolvedValue(null);
      await expect(service.cancel('fake', OWNER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── search ─────────────────────────────────────────────────────────────────

  describe('search', () => {
    it('retorna apenas inscrições dos eventos do usuário autenticado', async () => {
      const regs = [{ id: 'r1', user: baseUser }];
      mockDb.registration.findMany.mockResolvedValue(regs);

      const result = await service.search('joão', OWNER_ID);

      expect(result).toEqual(regs);
      expect(mockDb.registration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ event: { createdBy: OWNER_ID } }),
        }),
      );
    });

    it('retorna array vazio para query com menos de 2 caracteres', async () => {
      const result = await service.search('j', OWNER_ID);
      expect(result).toEqual([]);
      expect(mockDb.registration.findMany).not.toHaveBeenCalled();
    });

    it('retorna array vazio para query em branco', async () => {
      const result = await service.search('', OWNER_ID);
      expect(result).toEqual([]);
    });
  });
});
