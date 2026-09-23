import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { DEFAULT_FEEDBACK_ITEMS } from './feedback.constants.js';

const mockDb: any = {
  event: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  registration: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  eventFeedback: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
};

const mockPrisma = { db: mockDb };
const mockMail = { sendFeedbackInvite: jest.fn() };

const OWNER_ID = 'owner-uuid';
const OTHER_ID = 'other-uuid';
const EVENT_ID = 'event-uuid';
const SLUG = 'retiro-2026';

const baseEvent = {
  id: EVENT_ID,
  title: 'Retiro 2026',
  slug: SLUG,
  createdBy: OWNER_ID,
  feedbackItems: null,
  feedbackOpen: true,
};

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    jest.clearAllMocks();
  });

  // config

  describe('getConfig', () => {
    it('cai na lista padrão quando o evento nunca configurou os itens', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.eventFeedback.count.mockResolvedValue(3);

      const result = await service.getConfig(EVENT_ID, OWNER_ID);

      expect(result.items).toEqual([...DEFAULT_FEEDBACK_ITEMS]);
      expect(result.answered).toBe(3);
      expect(result.publicUrl).toContain(`/evento/${SLUG}/avaliacao`);
    });

    it('barra quem não é dono do evento', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      await expect(service.getConfig(EVENT_ID, OTHER_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateConfig', () => {
    it('rejeita itens repetidos', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      await expect(
        service.updateConfig(EVENT_ID, OWNER_ID, { items: ['Cozinha', 'Cozinha'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('grava os itens como JSON', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.event.update.mockResolvedValue({
        feedbackItems: '["Cozinha","Limpeza"]',
        feedbackOpen: true,
        slug: SLUG,
      });

      const result = await service.updateConfig(EVENT_ID, OWNER_ID, {
        items: [' Cozinha ', 'Limpeza'],
        open: true,
      });

      expect(mockDb.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { feedbackItems: '["Cozinha","Limpeza"]', feedbackOpen: true },
        }),
      );
      expect(result.items).toEqual(['Cozinha', 'Limpeza']);
    });
  });

  // resultados

  describe('getResults', () => {
    it('calcula média e distribuição ignorando itens sem nota', async () => {
      mockDb.event.findUnique.mockResolvedValue({
        ...baseEvent,
        feedbackItems: '["Cozinha","Gincana"]',
      });
      mockDb.eventFeedback.findMany.mockResolvedValue([
        {
          id: 'f1',
          createdAt: new Date('2026-09-01'),
          registrationId: 'reg-1',
          respondentName: null,
          registration: { user: { name: 'Maria' } },
          ratings: JSON.stringify([
            { item: 'Cozinha', score: 10, comment: 'Tudo ótimo' },
            { item: 'Gincana', score: null, comment: null },
          ]),
          improvements: 'Mais tempo livre',
          negatives: null,
        },
        {
          id: 'f2',
          createdAt: new Date('2026-09-02'),
          registrationId: null,
          respondentName: 'Anônimo',
          registration: null,
          ratings: JSON.stringify([{ item: 'Cozinha', score: 8, comment: null }]),
          improvements: null,
          negatives: 'Wi-fi ruim',
        },
      ]);

      const result = await service.getResults(EVENT_ID, OWNER_ID);

      const cozinha = result.summary.find((s) => s.item === 'Cozinha')!;
      expect(cozinha.average).toBe(9);
      expect(cozinha.answers).toBe(2);
      expect(cozinha.distribution[10]).toBe(1);
      expect(cozinha.distribution[8]).toBe(1);
      expect(cozinha.comments).toEqual([{ name: 'Maria', score: 10, comment: 'Tudo ótimo' }]);

      // "Não sei avaliar" não entra na média nem na contagem
      const gincana = result.summary.find((s) => s.item === 'Gincana')!;
      expect(gincana.average).toBeNull();
      expect(gincana.answers).toBe(0);

      expect(result.total).toBe(2);
      expect(result.overall).toBe(9);
      expect(result.responses[0].name).toBe('Maria');
      expect(result.responses[1].identified).toBe(false);
    });

    it('mantém na tela itens que saíram da configuração mas já têm resposta', async () => {
      mockDb.event.findUnique.mockResolvedValue({ ...baseEvent, feedbackItems: '["Cozinha"]' });
      mockDb.eventFeedback.findMany.mockResolvedValue([
        {
          id: 'f1',
          createdAt: new Date(),
          registrationId: null,
          respondentName: null,
          registration: null,
          ratings: JSON.stringify([{ item: 'Pregações', score: 9, comment: null }]),
          improvements: null,
          negatives: null,
        },
      ]);

      const result = await service.getResults(EVENT_ID, OWNER_ID);
      const pregacoes = result.summary.find((s) => s.item === 'Pregações')!;

      expect(pregacoes.average).toBe(9);
      expect(pregacoes.active).toBe(false);
    });
  });

  // convites

  describe('sendInvites', () => {
    it('exige a pesquisa aberta', async () => {
      mockDb.event.findUnique.mockResolvedValue({ ...baseEvent, feedbackOpen: false });
      await expect(service.sendInvites(EVENT_ID, OWNER_ID)).rejects.toThrow(BadRequestException);
    });

    it('envia só para confirmados que ainda não responderam e conta as falhas', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.registration.findMany.mockResolvedValue([
        { id: 'reg-1', user: { name: 'Maria', email: 'maria@x.com' } },
        { id: 'reg-2', user: { name: 'João', email: 'joao@x.com' } },
      ]);
      mockMail.sendFeedbackInvite.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const result = await service.sendInvites(EVENT_ID, OWNER_ID);

      expect(mockDb.registration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: EVENT_ID, status: 'confirmed', feedback: null },
        }),
      );
      expect(mockMail.sendFeedbackInvite).toHaveBeenCalledWith(
        expect.objectContaining({ surveyUrl: expect.stringContaining('?r=reg-1') }),
      );
      expect(result).toEqual({ total: 2, sent: 1, failed: 1 });
    });
  });

  // formulário público

  describe('getPublicForm', () => {
    it('não expõe o formulário com a pesquisa fechada', async () => {
      mockDb.event.findUnique.mockResolvedValue({ ...baseEvent, feedbackOpen: false });
      await expect(service.getPublicForm(SLUG)).rejects.toThrow(NotFoundException);
    });

    it('identifica o participante pelo link individual', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.registration.findUnique.mockResolvedValue({
        eventId: EVENT_ID,
        user: { name: 'Maria' },
        feedback: { id: 'f1' },
      });

      const result = await service.getPublicForm(SLUG, 'reg-1');

      expect(result.participantName).toBe('Maria');
      expect(result.alreadyAnswered).toBe(true);
    });

    it('ignora link de inscrição de outro evento', async () => {
      mockDb.event.findUnique.mockResolvedValue(baseEvent);
      mockDb.registration.findUnique.mockResolvedValue({
        eventId: 'outro-evento',
        user: { name: 'Maria' },
        feedback: null,
      });

      const result = await service.getPublicForm(SLUG, 'reg-1');

      expect(result.participantName).toBeNull();
    });
  });

  // envio de resposta

  describe('submit', () => {
    const ratings = [{ item: 'Cozinha', score: 9 }];

    beforeEach(() => {
      mockDb.event.findUnique.mockResolvedValue({
        ...baseEvent,
        feedbackItems: '["Cozinha","Gincana"]',
      });
    });

    it('recusa item fora da lista configurada', async () => {
      await expect(
        service.submit(SLUG, { ratings: [{ item: 'Estacionamento', score: 5 }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('recusa resposta totalmente vazia', async () => {
      await expect(
        service.submit(SLUG, { ratings: [{ item: 'Cozinha' }], improvements: '  ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('recusa segunda resposta da mesma inscrição', async () => {
      mockDb.registration.findUnique.mockResolvedValue({
        id: 'reg-1',
        eventId: EVENT_ID,
        feedback: { id: 'f1' },
      });

      await expect(
        service.submit(SLUG, { ratings, registrationId: 'reg-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('grava resposta anônima com nota e texto', async () => {
      mockDb.eventFeedback.create.mockResolvedValue({ id: 'f9' });

      const result = await service.submit(SLUG, {
        ratings: [{ item: 'Cozinha', score: 9, comment: '  muito boa  ' }],
        respondentName: ' Maria ',
        negatives: 'Frio à noite',
      });

      expect(mockDb.eventFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: EVENT_ID,
            registrationId: null,
            respondentName: 'Maria',
            ratings: JSON.stringify([{ item: 'Cozinha', score: 9, comment: 'muito boa' }]),
            improvements: null,
            negatives: 'Frio à noite',
          }),
        }),
      );
      expect(result.id).toBe('f9');
    });

    it('vincula a resposta à inscrição do link individual', async () => {
      mockDb.registration.findUnique.mockResolvedValue({
        id: 'reg-1',
        eventId: EVENT_ID,
        feedback: null,
      });
      mockDb.eventFeedback.create.mockResolvedValue({ id: 'f10' });

      await service.submit(SLUG, { ratings, registrationId: 'reg-1', respondentName: 'Fulano' });

      expect(mockDb.eventFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // Identificado pela inscrição: o nome digitado não sobrescreve o cadastro
          data: expect.objectContaining({ registrationId: 'reg-1', respondentName: null }),
        }),
      );
    });
  });
});
