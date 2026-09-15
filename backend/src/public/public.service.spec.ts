import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PublicService } from './public.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { MailService } from '../mail/mail.service.js';
import { PAYMENT_PROVIDER_TOKEN } from '../payments/providers/payment-provider.factory.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb: any = {
  event: { findUnique: jest.fn() },
  eventPaymentMethod: { findUnique: jest.fn() },
  registration: {
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  user: { findUnique: jest.fn(), create: jest.fn() },
  payment: { create: jest.fn(), delete: jest.fn(), findFirst: jest.fn() },
  $transaction: jest.fn().mockImplementation((cb: (tx: unknown) => unknown) =>
    typeof cb === 'function' ? cb(mockDb) : Promise.all(cb as Promise<unknown>[]),
  ),
};

const mockPrisma = { db: mockDb };

const mockPixResult = {
  paymentId: 'pay-1',
  providerPaymentId: 'mock_abc-123',
  qrCodeBase64: 'base64==',
  qrCodeCopiaECola: '0002...',
  expiresAt: new Date('2099-01-01'),
  amount: 99.9,
};

const mockPayments = {
  createPixForRegistration: jest.fn().mockResolvedValue(mockPixResult),
};

const mockMail = { sendRegistrationConfirmation: jest.fn() };

const mockProvider = { createPixPayment: jest.fn(), getPaymentStatus: jest.fn() };

const EVENT_ID = 'event-uuid';
const PM_ID = 'pm-uuid';
const SLUG = 'evento-teste';
const SHADOW_USER_ID = 'shadow-user-uuid';

const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const pastDate   = new Date(Date.now() - 24 * 60 * 60 * 1000);

const baseEvent = {
  id: EVENT_ID,
  title: 'Evento Teste',
  isPublished: true,
  date: futureDate,
  location: 'São Paulo',
  maxParticipants: null,
};

const basePaymentMethod = {
  id: PM_ID,
  eventId: EVENT_ID,
  type: 'pix',
  value: 99.9,
  installments: 1,
};

const baseUser = { id: SHADOW_USER_ID, name: 'Ana', email: 'ana@test.com' };

const baseDto = {
  paymentMethodId: PM_ID,
  fullName: 'Ana Silva',
  email: 'ana@test.com',
  cpf: '529.982.247-25',
  phone: '11999999999',
  termsAccepted: true as const,
};

describe('PublicService', () => {
  let service: PublicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: mockPayments },
        { provide: MailService, useValue: mockMail },
        { provide: PAYMENT_PROVIDER_TOKEN, useValue: mockProvider },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      typeof cb === 'function' ? cb(mockDb) : Promise.all(cb as Promise<unknown>[]),
    );
  });

  // ─── findEventBySlug ─────────────────────────────────────────────────────────

  describe('findEventBySlug', () => {
    it('retorna evento publicado com formas de pagamento', async () => {
      mockDb.event.findUnique.mockResolvedValue({
        ...baseEvent,
        slug: SLUG,
        paymentMethods: [{ id: PM_ID, type: 'pix', value: 99.9, installments: 1 }],
        user: { name: 'Org' },
      });

      const result = await service.findEventBySlug(SLUG);

      expect(result.paymentMethods[0].type).toBe('pix');
    });

    it('lança NotFoundException para evento inexistente', async () => {
      mockDb.event.findUnique.mockResolvedValue(null);
      await expect(service.findEventBySlug('nao-existe')).rejects.toThrow(NotFoundException);
    });

    it('lança NotFoundException para evento não publicado', async () => {
      mockDb.event.findUnique.mockResolvedValue({
        ...baseEvent, isPublished: false, paymentMethods: [], user: { name: 'Org' },
      });
      await expect(service.findEventBySlug(SLUG)).rejects.toThrow(NotFoundException);
    });

    it('filtra modalidades fora da janela de vigência e oculta as datas', async () => {
      const past   = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      mockDb.event.findUnique.mockResolvedValue({
        ...baseEvent,
        slug: SLUG,
        paymentMethods: [
          { id: 'pm-expirado', type: 'pix', value: 50, installments: 1, startDate: null, endDate: past },
          { id: 'pm-futuro',   type: 'pix', value: 80, installments: 1, startDate: future, endDate: null },
          { id: 'pm-ativo',    type: 'pix', value: 99, installments: 1, startDate: past, endDate: future },
          { id: 'pm-sem-datas', type: 'cash', value: 99, installments: 1, startDate: null, endDate: null },
        ],
        user: { name: 'Org' },
      });

      const result = await service.findEventBySlug(SLUG);

      expect(result.paymentMethods.map((m: { id: string }) => m.id))
        .toEqual(['pm-ativo', 'pm-sem-datas']);
      expect(result.paymentMethods[0]).not.toHaveProperty('startDate');
    });

    it('nunca expõe dados de outros inscritos', async () => {
      mockDb.event.findUnique.mockResolvedValue({
        ...baseEvent,
        slug: SLUG,
        paymentMethods: [],
        user: { name: 'Org' },
      });

      const result = await service.findEventBySlug(SLUG);

      expect(result).not.toHaveProperty('registrations');
    });
  });

  // ─── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    const setup = () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventPaymentMethod.findUnique.mockResolvedValue(basePaymentMethod);
      mockDb.registration.findFirst.mockResolvedValue(null);
      mockDb.registration.count.mockResolvedValue(0);
      mockDb.user.findUnique.mockResolvedValue(baseUser);
      mockDb.registration.create.mockResolvedValue({
        id: 'reg-1',
        userId: SHADOW_USER_ID,
        eventId: EVENT_ID,
        status: 'pending',
        cpf: '52998224725',
      });
    };

    it('fluxo completo: inscrição pending + PIX gerado com amount da forma de pagamento', async () => {
      setup();

      const result = await service.register(SLUG, baseDto);

      expect(result.status).toBe('pending');
      expect(result.qrCodeBase64).toBe('base64==');
      expect(result.qrCodeCopiaECola).toBe('0002...');
      // Taxa de serviço por cima: R$ 99,90 + 5% = R$ 104,90 cobrados, com os
      // R$ 99,90 cheios indo para o organizador.
      expect(mockPayments.createPixForRegistration).toHaveBeenCalledWith(
        'reg-1',
        SHADOW_USER_ID,
        { base: 99.9, fee: 5, total: 104.9 },
        'pix',
      );
    });

    it('normaliza o CPF (remove máscara) antes de salvar', async () => {
      setup();

      await service.register(SLUG, { ...baseDto, cpf: '529.982.247-25' });

      expect(mockDb.registration.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ cpf: '52998224725' }) }),
      );
    });

    it('cria shadow user quando email não existe', async () => {
      setup();
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue({ id: 'new-user', name: 'Ana', email: 'ana@test.com' });
      mockDb.registration.create.mockResolvedValue({
        id: 'reg-1', userId: 'new-user', eventId: EVENT_ID, status: 'pending',
      });

      await service.register(SLUG, baseDto);

      expect(mockDb.user.create).toHaveBeenCalledTimes(1);
      expect(mockDb.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'ana@test.com' }) }),
      );
    });

    it('inscrição gratuita (R$0): status confirmed, sem PIX, email enviado', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventPaymentMethod.findUnique.mockResolvedValue({ ...basePaymentMethod, value: 0 });
      mockDb.registration.findFirst.mockResolvedValue(null);
      mockDb.registration.count.mockResolvedValue(0);
      mockDb.user.findUnique.mockResolvedValue(baseUser);
      mockDb.registration.create.mockResolvedValue({
        id: 'reg-free', userId: SHADOW_USER_ID, eventId: EVENT_ID, status: 'confirmed', cpf: '52998224725',
      });
      mockDb.registration.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.register(SLUG, baseDto);

      expect(result.status).toBe('confirmed');
      expect(mockPayments.createPixForRegistration).not.toHaveBeenCalled();
      expect(mockMail.sendRegistrationConfirmation).toHaveBeenCalledTimes(1);
    });

    it('dinheiro: inscrição pendente com Payment cash, sem PIX e sem email', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventPaymentMethod.findUnique.mockResolvedValue({ ...basePaymentMethod, type: 'cash' });
      mockDb.registration.findFirst.mockResolvedValue(null);
      mockDb.registration.count.mockResolvedValue(0);
      mockDb.user.findUnique.mockResolvedValue(baseUser);
      mockDb.registration.create.mockResolvedValue({
        id: 'reg-cash', userId: SHADOW_USER_ID, eventId: EVENT_ID, status: 'pending', code: 'ABC-DEF-GHJ',
      });

      const result = await service.register(SLUG, baseDto);

      expect(result.status).toBe('pending');
      expect(result).toMatchObject({ paymentType: 'cash', amount: 99.9 });
      expect(mockDb.registration.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) }),
      );
      expect(mockDb.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: 'cash', method: 'cash', status: 'pending', amount: 99.9,
          }),
        }),
      );
      expect(mockPayments.createPixForRegistration).not.toHaveBeenCalled();
      // Email só sai na confirmação manual pelo organizador
      expect(mockMail.sendRegistrationConfirmation).not.toHaveBeenCalled();
    });

    it('dinheiro: mesmo CPF pendente reaproveita a inscrição existente', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventPaymentMethod.findUnique.mockResolvedValue({ ...basePaymentMethod, type: 'cash' });
      mockDb.registration.findFirst
        .mockResolvedValueOnce(null) // checagem de CPF confirmado
        .mockResolvedValueOnce({    // inscrição cash pendente existente
          id: 'reg-existente', code: 'JKM-NPQ-RST', payment: { amount: 99.9 },
        });

      const result = await service.register(SLUG, baseDto);

      expect(result).toMatchObject({
        registrationId: 'reg-existente',
        status: 'pending',
        paymentType: 'cash',
        reused: true,
      });
      expect(mockDb.registration.create).not.toHaveBeenCalled();
    });

    it('lança NotFoundException para evento inexistente ou não publicado', async () => {
      mockDb.event.findUnique.mockResolvedValue(null);
      await expect(service.register(SLUG, baseDto)).rejects.toThrow(NotFoundException);
    });

    it('lança BadRequestException quando evento já aconteceu', async () => {
      mockDb.event.findUnique.mockResolvedValue({ ...baseEvent, date: pastDate });
      await expect(service.register(SLUG, baseDto)).rejects.toThrow(BadRequestException);
    });

    it('lança NotFoundException para forma de pagamento inexistente', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventPaymentMethod.findUnique.mockResolvedValue(null);
      await expect(service.register(SLUG, baseDto)).rejects.toThrow(NotFoundException);
    });

    it('lança BadRequestException para forma de pagamento de outro evento', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventPaymentMethod.findUnique.mockResolvedValue({ ...basePaymentMethod, eventId: 'outro' });
      await expect(service.register(SLUG, baseDto)).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException para modalidade com vigência expirada', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventPaymentMethod.findUnique.mockResolvedValue({
        ...basePaymentMethod,
        endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      });
      await expect(service.register(SLUG, baseDto)).rejects.toThrow(BadRequestException);
      expect(mockDb.registration.create).not.toHaveBeenCalled();
    });

    it('lança BadRequestException para modalidade que ainda não começou', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventPaymentMethod.findUnique.mockResolvedValue({
        ...basePaymentMethod,
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      });
      await expect(service.register(SLUG, baseDto)).rejects.toThrow(BadRequestException);
    });

    it('aceita modalidade no último dia de vigência (endDate inclusivo)', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      // endDate à meia-noite de hoje: ainda válido durante o dia todo
      const todayMidnight = new Date();
      todayMidnight.setUTCHours(0, 0, 0, 0);
      mockDb.eventPaymentMethod.findUnique.mockResolvedValue({
        ...basePaymentMethod,
        value: 0,
        endDate: todayMidnight,
      });
      mockDb.registration.findFirst.mockResolvedValue(null);
      mockDb.registration.count.mockResolvedValue(0);
      mockDb.user.findUnique.mockResolvedValue(baseUser);
      mockDb.registration.create.mockResolvedValue({
        id: 'reg-lote', userId: SHADOW_USER_ID, eventId: EVENT_ID, status: 'confirmed',
      });
      mockDb.registration.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.register(SLUG, baseDto);
      expect(result.status).toBe('confirmed');
    });

    it('lança ConflictException quando evento lotado (maxParticipants)', async () => {
      mockDb.event.findUnique.mockResolvedValue({ ...baseEvent, maxParticipants: 5 });
      mockDb.eventPaymentMethod.findUnique.mockResolvedValue(basePaymentMethod);
      mockDb.registration.findFirst.mockResolvedValue(null);
      mockDb.registration.count.mockResolvedValue(5);

      await expect(service.register(SLUG, baseDto)).rejects.toThrow(ConflictException);
    });

    describe('anti-duplicidade', () => {
      it('reutiliza inscrição+PIX existente quando mesmo CPF tem cobrança pendente válida', async () => {
        const existingPayment = {
          id: 'pay-old',
          providerPaymentId: 'mock_existente',
          qrCodeBase64: 'oldqr==',
          qrCodeCopiaECola: '0002existing',
          expiresAt: new Date('2099-01-01'),
          amount: 99.9,
        };
        mockDb.event.findUnique.mockResolvedValue(baseEvent);
        mockDb.eventPaymentMethod.findUnique.mockResolvedValue(basePaymentMethod);
        mockDb.registration.findFirst
          .mockResolvedValueOnce(null) // alreadyConfirmed check
          .mockResolvedValueOnce({ id: 'reg-old', cpf: '52998224725', status: 'pending', payment: existingPayment });

        const result = await service.register(SLUG, baseDto);

        expect(mockDb.registration.create).not.toHaveBeenCalled();
        expect(mockPayments.createPixForRegistration).not.toHaveBeenCalled();
        expect(result.registrationId).toBe('reg-old');
        expect((result as { reused?: boolean }).reused).toBe(true);
      });

      it('cria nova inscrição quando PIX anterior já expirou', async () => {
        mockDb.event.findUnique.mockResolvedValue(baseEvent);
        mockDb.eventPaymentMethod.findUnique.mockResolvedValue(basePaymentMethod);
        mockDb.registration.findFirst.mockResolvedValue(null);
        mockDb.registration.count.mockResolvedValue(0);
        mockDb.user.findUnique.mockResolvedValue(baseUser);
        mockDb.registration.create.mockResolvedValue({
          id: 'reg-new', userId: SHADOW_USER_ID, eventId: EVENT_ID, status: 'pending',
        });

        const result = await service.register(SLUG, baseDto);

        expect(mockDb.registration.create).toHaveBeenCalledTimes(1);
        expect(result.registrationId).toBe('reg-new');
        expect((result as { reused?: boolean }).reused).toBeUndefined();
      });
    });
  });
});
