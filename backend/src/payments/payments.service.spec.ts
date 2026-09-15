import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { IPaymentProvider, PixPaymentResult } from './providers/payment-provider.interface.js';
import { PAYMENT_PROVIDER_TOKEN } from './providers/payment-provider.factory.js';

const mockDb = {
  registration: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  payment: { create: jest.fn(), delete: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
  $executeRaw: jest.fn(),
};
const mockPrisma = { db: mockDb };

const mockMail = { sendRegistrationConfirmation: jest.fn() };

const mockPixResult: PixPaymentResult = {
  providerPaymentId: 'mock_abc-123',
  qrCodeBase64: 'base64img==',
  qrCodeCopiaECola: '0002...copia',
  expiresAt: new Date('2099-01-01'),
};

const mockProvider: IPaymentProvider = {
  createPixPayment: jest.fn().mockResolvedValue(mockPixResult),
  getPaymentStatus: jest.fn(),
};

const USER_ID = 'user-uuid';
const REG_ID = 'reg-uuid';
const EVENT_ID = 'event-uuid';
const TICKET_ID = 'ticket-uuid';

const baseRegistration = {
  id: REG_ID,
  userId: USER_ID,
  eventId: EVENT_ID,
  ticketId: TICKET_ID,
  cpf: '12345678900',
  status: 'pending',
  ticket: { id: TICKET_ID, name: 'Inteira', price: 50 },
  event: { id: EVENT_ID, title: 'Congresso 2026' },
  user: { id: USER_ID, name: 'João', email: 'joao@email.com' },
  payment: null,
};

// Helper: mounts a full payment object as returned by findFirst with includes
const makePaymentWithIncludes = (overrides: Record<string, unknown> = {}) => ({
  id: 'pay-1',
  registrationId: REG_ID,
  amount: 50,
  registration: {
    id: REG_ID,
    ticketId: TICKET_ID,
    ticket: { id: TICKET_ID, name: 'Inteira' },
    event: { title: 'Congresso 2026', date: new Date('2026-09-01'), location: 'São Paulo' },
    user: { name: 'João', email: 'joao@email.com' },
  },
  ...overrides,
});

// Helper: wires a $transaction mock that executes the callback with mockDb as tx
const mockTx = (paymentFixture: unknown, executeRawResult = 1) => {
  mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
    mockDb.payment.findFirst.mockResolvedValue(paymentFixture);
    mockDb.$executeRaw.mockResolvedValue(executeRawResult);
    mockDb.payment.update.mockResolvedValue({});
    mockDb.registration.update.mockResolvedValue({});
    return fn(mockDb);
  });
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
        { provide: PAYMENT_PROVIDER_TOKEN, useValue: mockProvider },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  // ─── createPixForRegistration ────────────────────────────────────────────────

  describe('createPixForRegistration', () => {
    it('usa o amount passado como parâmetro', async () => {
      mockDb.registration.findUnique.mockResolvedValue(baseRegistration);
      mockDb.payment.create.mockResolvedValue({
        id: 'pay-1',
        amount: 50,
        status: 'pending',
        expiresAt: mockPixResult.expiresAt,
      });

      const result = await service.createPixForRegistration(REG_ID, USER_ID, { base: 50, fee: 0, total: 50 });

      expect(result.amount).toBe(50);
      expect(mockProvider.createPixPayment).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 50 }),
      );
    });

    it('retorna qrCodeBase64, qrCodeCopiaECola e expiresAt', async () => {
      mockDb.registration.findUnique.mockResolvedValue(baseRegistration);
      mockDb.payment.create.mockResolvedValue({ id: 'pay-1', amount: 50, expiresAt: mockPixResult.expiresAt });

      const result = await service.createPixForRegistration(REG_ID, USER_ID, { base: 50, fee: 0, total: 50 });

      expect(result.qrCodeBase64).toBe('base64img==');
      expect(result.qrCodeCopiaECola).toBe('0002...copia');
      expect(result.expiresAt).toEqual(new Date('2099-01-01'));
    });

    it('lança NotFoundException para inscrição inexistente', async () => {
      mockDb.registration.findUnique.mockResolvedValue(null);

      await expect(service.createPixForRegistration(REG_ID, USER_ID, { base: 50, fee: 0, total: 50 }))
        .rejects.toThrow(NotFoundException);
      expect(mockProvider.createPixPayment).not.toHaveBeenCalled();
    });

    it('lança ForbiddenException quando inscrição pertence a outro usuário', async () => {
      mockDb.registration.findUnique.mockResolvedValue({ ...baseRegistration, userId: 'outro' });

      await expect(service.createPixForRegistration(REG_ID, USER_ID, { base: 50, fee: 0, total: 50 }))
        .rejects.toThrow(ForbiddenException);
    });

    it('lança ConflictException quando pagamento já foi confirmado', async () => {
      mockDb.registration.findUnique.mockResolvedValue({
        ...baseRegistration,
        payment: { id: 'pay-old', status: 'paid' },
      });

      await expect(service.createPixForRegistration(REG_ID, USER_ID, { base: 50, fee: 0, total: 50 }))
        .rejects.toThrow(ConflictException);
    });

    it('usa amount do pagamento anterior quando não fornecido (retry)', async () => {
      const existingPending = { id: 'pay-old', status: 'pending', amount: 75 };
      mockDb.registration.findUnique.mockResolvedValue({
        ...baseRegistration,
        payment: existingPending,
      });
      mockDb.payment.delete.mockResolvedValue({});
      mockDb.payment.create.mockResolvedValue({ id: 'pay-new', amount: 75, expiresAt: mockPixResult.expiresAt });

      await service.createPixForRegistration(REG_ID, USER_ID);

      expect(mockDb.payment.delete).toHaveBeenCalledWith({ where: { id: 'pay-old' } });
      expect(mockProvider.createPixPayment).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 75 }),
      );
    });

    it('apaga pagamento pendente anterior e cria novo (retry com amount explícito)', async () => {
      const existingPending = { id: 'pay-old', status: 'pending', amount: 50 };
      mockDb.registration.findUnique.mockResolvedValue({
        ...baseRegistration,
        payment: existingPending,
      });
      mockDb.payment.delete.mockResolvedValue({});
      mockDb.payment.create.mockResolvedValue({ id: 'pay-new', amount: 50, expiresAt: mockPixResult.expiresAt });

      await service.createPixForRegistration(REG_ID, USER_ID, { base: 50, fee: 0, total: 50 });

      expect(mockDb.payment.delete).toHaveBeenCalledWith({ where: { id: 'pay-old' } });
      expect(mockDb.payment.create).toHaveBeenCalledTimes(1);
    });
  });

  // ─── confirmPayment ──────────────────────────────────────────────────────────

  describe('confirmPayment', () => {
    it('confirma pagamento: Payment=paid, Registration=confirmed, decrementa estoque', async () => {
      mockTx(makePaymentWithIncludes(), 1 /* 1 row affected = estoque OK */);
      mockDb.registration.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.confirmPayment('mock_abc-123')).resolves.toBeUndefined();

      expect(mockDb.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'paid' } }),
      );
      expect(mockDb.registration.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'confirmed' } }),
      );
      expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('dispara e-mail de confirmação após commit da transação', async () => {
      mockTx(makePaymentWithIncludes(), 1);
      mockDb.registration.updateMany.mockResolvedValue({ count: 1 });

      await service.confirmPayment('mock_abc-123');

      expect(mockMail.sendRegistrationConfirmation).toHaveBeenCalledTimes(1);
      expect(mockMail.sendRegistrationConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          participantEmail: 'joao@email.com',
          eventTitle: 'Congresso 2026',
          ticketName: 'Inteira',
          amountPaid: 50,
        }),
      );
    });

    it('é idempotente: segunda chamada (payment já paid) não altera nada', async () => {
      // findFirst retorna null porque status 'paid' não satisfaz { not: 'paid' }
      mockTx(null);
      mockDb.registration.updateMany.mockResolvedValue({ count: 0 });

      await service.confirmPayment('mock_abc-123');
      await service.confirmPayment('mock_abc-123');

      expect(mockDb.$transaction).toHaveBeenCalledTimes(2);
      expect(mockDb.payment.update).not.toHaveBeenCalled();
      expect(mockMail.sendRegistrationConfirmation).not.toHaveBeenCalled();
    });

    it('idempotência de email: updateMany count=0 impede reenvio mesmo com transação nova', async () => {
      mockTx(makePaymentWithIncludes(), 1);
      // Simula que o email já foi enviado (confirmationEmailSentAt já preenchido)
      mockDb.registration.updateMany.mockResolvedValue({ count: 0 });

      await service.confirmPayment('mock_abc-123');

      expect(mockMail.sendRegistrationConfirmation).not.toHaveBeenCalled();
    });

    it('path overbooked: estoque esgotado → Registration=overbooked, sem email', async () => {
      mockTx(makePaymentWithIncludes(), 0 /* 0 rows affected = sem estoque */);
      mockDb.registration.updateMany.mockResolvedValue({ count: 0 });

      await service.confirmPayment('mock_abc-123');

      expect(mockDb.registration.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'overbooked' } }),
      );
      expect(mockDb.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'paid' } }),
      );
      // Pagamento é marcado como paid mesmo com overbooked (prova de pagamento)
      expect(mockMail.sendRegistrationConfirmation).not.toHaveBeenCalled();
    });

    it('sem ticketId: pula decremento de estoque e confirma normalmente', async () => {
      const paymentWithoutTicket = makePaymentWithIncludes({
        registration: {
          id: REG_ID,
          ticketId: null,
          ticket: null,
          event: { title: 'Congresso 2026', date: new Date('2026-09-01'), location: null },
          user: { name: 'João', email: 'joao@email.com' },
        },
      });
      mockTx(paymentWithoutTicket);
      mockDb.registration.updateMany.mockResolvedValue({ count: 1 });

      await service.confirmPayment('mock_abc-123');

      expect(mockDb.$executeRaw).not.toHaveBeenCalled();
      expect(mockDb.registration.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'confirmed' } }),
      );
      expect(mockMail.sendRegistrationConfirmation).toHaveBeenCalledTimes(1);
    });
  });

  // ─── confirmManually ─────────────────────────────────────────────────────────

  describe('confirmManually', () => {
    const baseRegForManual = {
      ...baseRegistration,
      event: { id: EVENT_ID, title: 'Congresso 2026', createdBy: USER_ID, date: new Date('2026-09-01'), location: 'São Paulo' },
      code: 'ABC123',
      payment: null,
    };

    const mockManualTx = (executeRawResult = 1) => {
      mockDb.$transaction.mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
        mockDb.$executeRaw.mockResolvedValue(executeRawResult);
        mockDb.payment.create.mockResolvedValue({});
        mockDb.payment.update.mockResolvedValue({});
        mockDb.registration.update.mockResolvedValue({
          id: REG_ID,
          code: 'ABC123',
          status: executeRawResult === 0 ? 'overbooked' : 'confirmed',
          user: { name: 'João', email: 'joao@email.com' },
          event: { title: 'Congresso 2026', date: new Date('2026-09-01'), location: 'São Paulo' },
          ticket: { id: TICKET_ID, name: 'Inteira' },
          payment: { amount: 50 },
        });
        return fn(mockDb);
      });
    };

    it('confirma inscrição pending sem payment: cria Payment paid/manual e Registration=confirmed', async () => {
      mockDb.registration.findUnique.mockResolvedValue(baseRegForManual);
      mockManualTx(1);
      mockDb.registration.updateMany.mockResolvedValue({ count: 1 });

      await service.confirmManually(REG_ID, USER_ID);

      expect(mockDb.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'paid', provider: 'manual' }) }),
      );
      expect(mockDb.registration.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'confirmed' } }),
      );
      expect(mockMail.sendRegistrationConfirmation).toHaveBeenCalledTimes(1);
    });

    it('atualiza payment existente para paid/manual em vez de criar um novo', async () => {
      mockDb.registration.findUnique.mockResolvedValue({
        ...baseRegForManual,
        payment: { id: 'pay-1', status: 'pending' },
      });
      mockManualTx(1);
      mockDb.registration.updateMany.mockResolvedValue({ count: 1 });

      await service.confirmManually(REG_ID, USER_ID);

      expect(mockDb.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: 'paid', provider: 'manual' },
      });
      expect(mockDb.payment.create).not.toHaveBeenCalled();
    });

    it('lança NotFoundException para inscrição inexistente', async () => {
      mockDb.registration.findUnique.mockResolvedValue(null);

      await expect(service.confirmManually(REG_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException quando o usuário não é o dono do evento', async () => {
      mockDb.registration.findUnique.mockResolvedValue(baseRegForManual);

      await expect(service.confirmManually(REG_ID, 'outro-organizador')).rejects.toThrow(ForbiddenException);
      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });

    it('lança BadRequestException para inscrição cancelada', async () => {
      mockDb.registration.findUnique.mockResolvedValue({ ...baseRegForManual, status: 'canceled' });

      await expect(service.confirmManually(REG_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('lança ConflictException quando a inscrição já está confirmada', async () => {
      mockDb.registration.findUnique.mockResolvedValue({ ...baseRegForManual, status: 'confirmed' });

      await expect(service.confirmManually(REG_ID, USER_ID)).rejects.toThrow(ConflictException);
    });

    it('overbooked: estoque esgotado marca Registration=overbooked e não envia email', async () => {
      mockDb.registration.findUnique.mockResolvedValue(baseRegForManual);
      mockManualTx(0);

      await service.confirmManually(REG_ID, USER_ID);

      expect(mockDb.registration.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'overbooked' } }),
      );
      expect(mockMail.sendRegistrationConfirmation).not.toHaveBeenCalled();
    });
  });

  // ─── fluxo mock ponta-a-ponta ────────────────────────────────────────────────

  describe('fluxo mock ponta-a-ponta', () => {
    it('cria PIX (pending) → confirma → Payment=paid, Registration=confirmed, email enviado', async () => {
      // 1. Criar PIX
      mockDb.registration.findUnique.mockResolvedValue(baseRegistration);
      mockDb.payment.create.mockResolvedValue({
        id: 'pay-1',
        amount: 50,
        expiresAt: mockPixResult.expiresAt,
        providerPaymentId: 'mock_abc-123',
        status: 'pending',
      });

      const pixResult = await service.createPixForRegistration(REG_ID, USER_ID, { base: 50, fee: 0, total: 50 });
      expect(pixResult.qrCodeBase64).toBeDefined();
      expect(pixResult.qrCodeCopiaECola).toBeDefined();

      // 2. Simular aprovação via confirmPayment
      mockTx(makePaymentWithIncludes({ id: 'pay-1' }), 1);
      mockDb.registration.updateMany.mockResolvedValue({ count: 1 });

      await service.confirmPayment('mock_abc-123');

      expect(mockDb.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'paid' } }),
      );
      expect(mockDb.registration.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'confirmed' } }),
      );
      expect(mockMail.sendRegistrationConfirmation).toHaveBeenCalledTimes(1);
    });
  });
});
