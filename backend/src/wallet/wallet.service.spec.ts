import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockDb: any = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  ledgerEntry: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  payoutRequest: {
    aggregate: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  payment: { aggregate: jest.fn() },
  $transaction: jest.fn().mockImplementation((cb: any) =>
    typeof cb === 'function' ? cb(mockDb) : Promise.all(cb),
  ),
};

const mockPrisma = { db: mockDb };

const USER_ID = 'organizer-uuid';
const ADMIN_ID = 'admin-uuid';

const validAccount = {
  pixKey: 'organizador@email.com',
  pixKeyType: 'email',
  pixHolderName: 'Maria Souza',
  pixHolderDocument: '52998224725',
};

/** Deixa o saldo disponível em `available` reais. */
function withAvailableBalance(available: number) {
  mockDb.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: available } });
}

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<WalletService>(WalletService);
    jest.clearAllMocks();
    delete process.env.MIN_PAYOUT_AMOUNT;
  });

  // getSummary

  describe('getSummary', () => {
    it('separa saldo disponível do retido', async () => {
      mockDb.ledgerEntry.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 300 } }) // availableAt <= agora
        .mockResolvedValueOnce({ _sum: { amount: 150 } }) // availableAt > agora
        .mockResolvedValueOnce({ _sum: { amount: 500 } }); // vendas
      mockDb.payoutRequest.aggregate.mockResolvedValue({ _sum: { amount: 50 } });

      const result = await service.getSummary(USER_ID);

      expect(result).toEqual({
        available: 300,
        pending: 150,
        totalEarned: 500,
        totalPaidOut: 50,
        minPayout: 10,
      });
    });

    it('retorna zeros quando não há lançamento nenhum', async () => {
      mockDb.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockDb.payoutRequest.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getSummary(USER_ID);

      expect(result.available).toBe(0);
      expect(result.pending).toBe(0);
    });
  });

  // updatePixAccount

  describe('updatePixAccount', () => {
    it('normaliza o documento removendo máscara', async () => {
      mockDb.user.update.mockResolvedValue({});
      mockDb.user.findUnique.mockResolvedValue(validAccount);

      await service.updatePixAccount(USER_ID, {
        ...validAccount,
        pixHolderDocument: '529.982.247-25',
      });

      expect(mockDb.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pixHolderDocument: '52998224725' }),
        }),
      );
    });

    it('recusa chave CPF diferente do documento do titular', async () => {
      await expect(
        service.updatePixAccount(USER_ID, {
          pixKeyType: 'cpf',
          pixKey: '111.444.777-35',
          pixHolderName: 'Maria Souza',
          pixHolderDocument: '52998224725',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.user.update).not.toHaveBeenCalled();
    });

    it('aceita chave CPF igual ao documento, com máscaras diferentes', async () => {
      mockDb.user.update.mockResolvedValue({});
      mockDb.user.findUnique.mockResolvedValue(validAccount);

      await service.updatePixAccount(USER_ID, {
        pixKeyType: 'cpf',
        pixKey: '529.982.247-25',
        pixHolderName: 'Maria Souza',
        pixHolderDocument: '52998224725',
      });

      expect(mockDb.user.update).toHaveBeenCalled();
    });
  });

  // requestPayout

  describe('requestPayout', () => {
    it('exige chave PIX cadastrada', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        pixKey: null,
        pixKeyType: null,
        pixHolderName: null,
        pixHolderDocument: null,
      });

      await expect(service.requestPayout(USER_ID, 100)).rejects.toThrow(BadRequestException);
      expect(mockDb.payoutRequest.create).not.toHaveBeenCalled();
    });

    it('recusa valor abaixo do mínimo', async () => {
      mockDb.user.findUnique.mockResolvedValue(validAccount);

      await expect(service.requestPayout(USER_ID, 5)).rejects.toThrow(BadRequestException);
      expect(mockDb.payoutRequest.create).not.toHaveBeenCalled();
    });

    it('recusa valor acima do saldo disponível', async () => {
      mockDb.user.findUnique.mockResolvedValue(validAccount);
      mockDb.payoutRequest.findFirst.mockResolvedValue(null);
      withAvailableBalance(80);

      await expect(service.requestPayout(USER_ID, 100)).rejects.toThrow(BadRequestException);
      expect(mockDb.payoutRequest.create).not.toHaveBeenCalled();
    });

    it('recusa um segundo resgate enquanto houver um em andamento', async () => {
      mockDb.user.findUnique.mockResolvedValue(validAccount);
      mockDb.payoutRequest.findFirst.mockResolvedValue({ id: 'payout-antigo' });

      await expect(service.requestPayout(USER_ID, 100)).rejects.toThrow(ConflictException);
      expect(mockDb.payoutRequest.create).not.toHaveBeenCalled();
    });

    it('cria o pedido e debita o razão na mesma transação', async () => {
      mockDb.user.findUnique.mockResolvedValue(validAccount);
      mockDb.payoutRequest.findFirst.mockResolvedValue(null);
      withAvailableBalance(500);
      mockDb.payoutRequest.create.mockResolvedValue({ id: 'payout-1', amount: 100 });
      mockDb.ledgerEntry.create.mockResolvedValue({});

      const result = await service.requestPayout(USER_ID, 100);

      expect(result.id).toBe('payout-1');
      // Snapshot da chave fica gravado no pedido
      expect(mockDb.payoutRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          amount: 100,
          status: 'requested',
          pixKey: validAccount.pixKey,
        }),
      });
      // Débito negativo, disponível na hora
      expect(mockDb.ledgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          payoutId: 'payout-1',
          type: 'payout',
          amount: -100,
        }),
      });
      expect(mockDb.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });

    it('permite sacar exatamente o saldo disponível', async () => {
      mockDb.user.findUnique.mockResolvedValue(validAccount);
      mockDb.payoutRequest.findFirst.mockResolvedValue(null);
      withAvailableBalance(100);
      mockDb.payoutRequest.create.mockResolvedValue({ id: 'payout-1', amount: 100 });
      mockDb.ledgerEntry.create.mockResolvedValue({});

      await expect(service.requestPayout(USER_ID, 100)).resolves.toBeDefined();
    });

    it('respeita MIN_PAYOUT_AMOUNT do ambiente', async () => {
      process.env.MIN_PAYOUT_AMOUNT = '50';
      mockDb.user.findUnique.mockResolvedValue(validAccount);

      await expect(service.requestPayout(USER_ID, 20)).rejects.toThrow(BadRequestException);
    });
  });

  // updatePayout (admin)

  describe('updatePayout', () => {
    it('marca como pago e registra quem processou', async () => {
      mockDb.payoutRequest.findUnique.mockResolvedValue({
        id: 'payout-1',
        userId: USER_ID,
        amount: 100,
        status: 'requested',
      });
      mockDb.payoutRequest.update.mockResolvedValue({ id: 'payout-1', status: 'paid' });

      await service.updatePayout('payout-1', ADMIN_ID, { status: 'paid' });

      expect(mockDb.payoutRequest.update).toHaveBeenCalledWith({
        where: { id: 'payout-1' },
        data: expect.objectContaining({ status: 'paid', processedBy: ADMIN_ID }),
      });
      // Pagar não mexe no razão: o débito já saiu quando o resgate foi pedido
      expect(mockDb.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it('recusar devolve o valor ao saldo com lançamento de estorno', async () => {
      mockDb.payoutRequest.findUnique.mockResolvedValue({
        id: 'payout-1',
        userId: USER_ID,
        amount: 100,
        status: 'requested',
      });
      mockDb.payoutRequest.update.mockResolvedValue({ id: 'payout-1', status: 'rejected' });
      mockDb.ledgerEntry.create.mockResolvedValue({});

      await service.updatePayout('payout-1', ADMIN_ID, {
        status: 'rejected',
        notes: 'Chave inválida',
      });

      expect(mockDb.ledgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          payoutId: 'payout-1',
          type: 'payout_reversal',
          amount: 100,
        }),
      });
    });

    it('não deixa mexer em resgate já finalizado', async () => {
      mockDb.payoutRequest.findUnique.mockResolvedValue({
        id: 'payout-1',
        userId: USER_ID,
        amount: 100,
        status: 'paid',
      });

      await expect(
        service.updatePayout('payout-1', ADMIN_ID, { status: 'rejected' }),
      ).rejects.toThrow(ConflictException);
      expect(mockDb.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it('lança NotFoundException para resgate inexistente', async () => {
      mockDb.payoutRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePayout('nao-existe', ADMIN_ID, { status: 'paid' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('processing não grava processedAt (o resgate ainda não terminou)', async () => {
      mockDb.payoutRequest.findUnique.mockResolvedValue({
        id: 'payout-1',
        userId: USER_ID,
        amount: 100,
        status: 'requested',
      });
      mockDb.payoutRequest.update.mockResolvedValue({});

      await service.updatePayout('payout-1', ADMIN_ID, { status: 'processing' });

      expect(mockDb.payoutRequest.update).toHaveBeenCalledWith({
        where: { id: 'payout-1' },
        data: expect.objectContaining({ status: 'processing', processedAt: null }),
      });
    });
  });
});
