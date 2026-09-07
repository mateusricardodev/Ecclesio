import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockDb: any = {
  event: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  registration: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  payment: { deleteMany: jest.fn() },
  checkinLog: { deleteMany: jest.fn() },
  eventFeedback: { deleteMany: jest.fn() },
  eventVolunteer: { deleteMany: jest.fn() },
  ticket: { deleteMany: jest.fn() },
  eventPaymentMethod: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((cb: any) =>
    typeof cb === 'function' ? cb(mockDb) : Promise.all(cb),
  ),
};

const mockPrisma = { db: mockDb };

const OWNER_ID = 'owner-uuid';
const OTHER_ID = 'other-uuid';
const EVENT_ID = 'event-uuid';

const baseEvent = {
  id: EVENT_ID,
  title: 'Conferência',
  slug: 'conf-2026',
  createdBy: OWNER_ID,
  date: new Date('2026-08-01'),
  isPublished: false,
};

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
  });

  // ─── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna o evento quando encontrado pelo dono', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      const result = await service.findOne(EVENT_ID, OWNER_ID);
      expect(result).toEqual(baseEvent);
    });

    it('lança NotFoundException para id inexistente', async () => {
      mockDb.event.findUnique.mockResolvedValue(null);
      await expect(service.findOne('id-fake', OWNER_ID)).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException quando não é o dono do evento', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      await expect(service.findOne(EVENT_ID, 'outro-user')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('cria evento e associa ao userId', async () => {
      mockDb.event.findUnique.mockResolvedValue(null); // slug livre
      mockDb.event.create.mockResolvedValue({ ...baseEvent, createdBy: OWNER_ID });

      const result = await service.create(OWNER_ID, {
        title: 'Conferência',
        date: '2026-08-01',
        slug: 'conf-2026',
      });

      expect(result.createdBy).toBe(OWNER_ID);
      expect(mockDb.event.create).toHaveBeenCalledTimes(1);
    });

    it('lança ConflictException para slug já existente', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent); // slug em uso

      await expect(
        service.create(OWNER_ID, { title: 'Outro', date: '2026-08-01', slug: 'conf-2026' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('atualiza evento quando usuário é o dono', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.event.findFirst.mockResolvedValue(null);
      mockDb.event.update.mockResolvedValue({ ...baseEvent, title: 'Novo título' });

      const result = await service.update(EVENT_ID, OWNER_ID, { title: 'Novo título' });
      expect(result.title).toBe('Novo título');
    });

    it('lança ForbiddenException quando usuário não é o dono', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent); // createdBy = OWNER_ID

      await expect(service.update(EVENT_ID, OTHER_ID, { title: 'X' })).rejects.toThrow(ForbiddenException);
      expect(mockDb.event.update).not.toHaveBeenCalled();
    });

    it('lança ConflictException ao tentar usar slug de outro evento', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent); // ownership ok
      mockDb.event.findFirst.mockResolvedValue({ id: 'outro-evento' }); // slug em uso

      await expect(
        service.update(EVENT_ID, OWNER_ID, { slug: 'slug-em-uso' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('remove evento e dados cascata quando é o dono', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.registration.findMany.mockResolvedValue([{ id: 'r1' }]);
      mockDb.payment.deleteMany.mockResolvedValue({});
      mockDb.checkinLog.deleteMany.mockResolvedValue({});
      mockDb.registration.deleteMany.mockResolvedValue({});
      mockDb.eventPaymentMethod.deleteMany.mockResolvedValue({});
      mockDb.eventVolunteer.deleteMany.mockResolvedValue({});
      mockDb.ticket.deleteMany.mockResolvedValue({});
      mockDb.event.delete.mockResolvedValue({});

      const result = await service.remove(EVENT_ID, OWNER_ID);

      expect(result).toEqual({ message: 'Evento removido com sucesso' });
      expect(mockDb.payment.deleteMany).toHaveBeenCalledWith({ where: { registrationId: { in: ['r1'] } } });
      expect(mockDb.event.delete).toHaveBeenCalledWith({ where: { id: EVENT_ID } });
    });

    it('lança ForbiddenException quando não é o dono', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);

      await expect(service.remove(EVENT_ID, OTHER_ID)).rejects.toThrow(ForbiddenException);
      expect(mockDb.event.delete).not.toHaveBeenCalled();
    });
  });

  // ─── uploadBanner ──────────────────────────────────────────────────────────

  describe('uploadBanner', () => {
    it('salva bannerUrl e retorna o caminho', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.event.update.mockResolvedValue({ ...baseEvent, bannerUrl: '/uploads/banner.jpg' });

      const result = await service.uploadBanner(EVENT_ID, OWNER_ID, 'banner.jpg');
      expect(result).toEqual({ bannerUrl: '/uploads/banner.jpg' });
    });

    it('lança ForbiddenException quando não é o dono', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      await expect(service.uploadBanner(EVENT_ID, OTHER_ID, 'x.jpg')).rejects.toThrow(ForbiddenException);
    });
  });
});
