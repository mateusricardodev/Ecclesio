import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { VolunteersService } from './volunteers.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockDb: any = {
  event: { findUnique: jest.fn() },
  user: { findFirst: jest.fn() },
  eventVolunteer: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

const mockPrisma = { db: mockDb };

const EVENT_ID = 'event-uuid';
const OWNER_ID = 'owner-uuid';
const OTHER_ID = 'other-uuid';
const VOLUNTEER_ID = 'volunteer-uuid';

const baseEvent = { id: EVENT_ID, createdBy: OWNER_ID };

const volunteerUser = {
  id: VOLUNTEER_ID,
  name: 'Ana Lima',
  email: 'ana@email.com',
  isShadow: false,
};

describe('VolunteersService', () => {
  let service: VolunteersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VolunteersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VolunteersService>(VolunteersService);
    jest.clearAllMocks();
  });

  // autorização

  describe('autorização', () => {
    it('só o dono do evento administra a equipe', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);

      await expect(service.list(EVENT_ID, OTHER_ID)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        service.add(EVENT_ID, OTHER_ID, 'ana@email.com'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove(EVENT_ID, OTHER_ID, VOLUNTEER_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockDb.eventVolunteer.create).not.toHaveBeenCalled();
      expect(mockDb.eventVolunteer.delete).not.toHaveBeenCalled();
    });

    it('lança NotFoundException para evento inexistente', async () => {
      mockDb.event.findUnique.mockResolvedValue(null);

      await expect(service.list(EVENT_ID, OWNER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // list

  describe('list', () => {
    it('marca conta-sombra como pendente de ativação', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventVolunteer.findMany.mockResolvedValue([
        {
          id: 'link-1',
          createdAt: new Date('2026-09-01'),
          user: volunteerUser,
        },
        {
          id: 'link-2',
          createdAt: new Date('2026-09-02'),
          user: {
            ...volunteerUser,
            id: 'u2',
            email: 'bruno@email.com',
            isShadow: true,
          },
        },
      ]);

      const result = await service.list(EVENT_ID, OWNER_ID);

      expect(result[0]).toMatchObject({
        email: 'ana@email.com',
        needsActivation: false,
      });
      expect(result[1]).toMatchObject({
        email: 'bruno@email.com',
        needsActivation: true,
      });
    });
  });

  // add

  describe('add', () => {
    it('vincula a pessoa ao evento', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.user.findFirst.mockResolvedValue(volunteerUser);
      mockDb.eventVolunteer.findUnique.mockResolvedValue(null);
      mockDb.eventVolunteer.create.mockResolvedValue({
        id: 'link-1',
        createdAt: new Date('2026-09-01'),
      });

      const result = await service.add(EVENT_ID, OWNER_ID, 'ana@email.com');

      expect(mockDb.eventVolunteer.create).toHaveBeenCalledWith({
        data: { eventId: EVENT_ID, userId: VOLUNTEER_ID },
        select: { id: true, createdAt: true },
      });
      expect(result).toMatchObject({ userId: VOLUNTEER_ID, name: 'Ana Lima' });
    });

    it('busca o e-mail sem diferenciar maiúscula nem espaço em volta', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.user.findFirst.mockResolvedValue(volunteerUser);
      mockDb.eventVolunteer.findUnique.mockResolvedValue(null);
      mockDb.eventVolunteer.create.mockResolvedValue({
        id: 'link-1',
        createdAt: new Date(),
      });

      await service.add(EVENT_ID, OWNER_ID, '  Ana@Email.com  ');

      expect(mockDb.user.findFirst).toHaveBeenCalledWith({
        where: { email: { equals: 'Ana@Email.com', mode: 'insensitive' } },
        select: { id: true, name: true, email: true, isShadow: true },
      });
    });

    it('recusa e-mail sem conta, orientando a pessoa a se cadastrar', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.user.findFirst.mockResolvedValue(null);

      await expect(
        service.add(EVENT_ID, OWNER_ID, 'ninguem@email.com'),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.eventVolunteer.create).not.toHaveBeenCalled();
    });

    it('recusa adicionar o próprio organizador', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.user.findFirst.mockResolvedValue({
        ...volunteerUser,
        id: OWNER_ID,
      });

      await expect(
        service.add(EVENT_ID, OWNER_ID, 'dono@email.com'),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.eventVolunteer.create).not.toHaveBeenCalled();
    });

    it('recusa duplicata na mesma equipe', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.user.findFirst.mockResolvedValue(volunteerUser);
      mockDb.eventVolunteer.findUnique.mockResolvedValue({ id: 'link-1' });

      await expect(
        service.add(EVENT_ID, OWNER_ID, 'ana@email.com'),
      ).rejects.toThrow(ConflictException);
      expect(mockDb.eventVolunteer.create).not.toHaveBeenCalled();
    });

    it('aceita conta-sombra, sinalizando que falta ativar', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.user.findFirst.mockResolvedValue({
        ...volunteerUser,
        isShadow: true,
      });
      mockDb.eventVolunteer.findUnique.mockResolvedValue(null);
      mockDb.eventVolunteer.create.mockResolvedValue({
        id: 'link-1',
        createdAt: new Date(),
      });

      const result = await service.add(EVENT_ID, OWNER_ID, 'ana@email.com');

      expect(result.needsActivation).toBe(true);
    });
  });

  // remove

  describe('remove', () => {
    it('desvincula a pessoa do evento', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventVolunteer.findUnique.mockResolvedValue({ id: 'link-1' });
      mockDb.eventVolunteer.delete.mockResolvedValue({});

      await service.remove(EVENT_ID, OWNER_ID, VOLUNTEER_ID);

      expect(mockDb.eventVolunteer.delete).toHaveBeenCalledWith({
        where: { id: 'link-1' },
      });
    });

    it('lança NotFoundException para quem não está na equipe', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventVolunteer.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(EVENT_ID, OWNER_ID, 'nao-esta'),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.eventVolunteer.delete).not.toHaveBeenCalled();
    });
  });
});
