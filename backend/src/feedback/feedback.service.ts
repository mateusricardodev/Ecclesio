import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto.js';
import { UpdateFeedbackConfigDto } from './dto/update-feedback-config.dto.js';
import { parseFeedbackItems } from './feedback.constants.js';

export interface StoredRating {
  item: string;
  score: number | null;
  comment: string | null;
}

/** Base do frontend para montar o link da pesquisa enviado por e-mail. */
function frontendBaseUrl(): string {
  const configured = process.env.FRONTEND_URL?.split(',')[0]?.trim();
  return (configured || 'http://localhost:5173').replace(/\/$/, '');
}

function parseRatings(raw: string): StoredRating[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is StoredRating =>
        !!r && typeof r === 'object' && typeof (r as StoredRating).item === 'string',
    );
  } catch {
    return [];
  }
}

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // Organizador

  async getConfig(eventId: string, userId: string) {
    const event = await this.checkOwnership(eventId);
    if (event.createdBy !== userId)
      throw new ForbiddenException('Sem permissão para acessar este evento');

    const answered = await this.prisma.db.eventFeedback.count({ where: { eventId } });

    return {
      items: parseFeedbackItems(event.feedbackItems),
      open: event.feedbackOpen,
      slug: event.slug,
      publicUrl: event.slug ? `${frontendBaseUrl()}/evento/${event.slug}/avaliacao` : null,
      answered,
    };
  }

  async updateConfig(eventId: string, userId: string, dto: UpdateFeedbackConfigDto) {
    const event = await this.checkOwnership(eventId);
    if (event.createdBy !== userId)
      throw new ForbiddenException('Apenas o criador pode modificar este evento');

    let items: string[] | undefined;
    if (dto.items) {
      items = dto.items.map((i) => i.trim()).filter((i) => i !== '');
      if (items.length === 0)
        throw new BadRequestException('Informe pelo menos um item para avaliar');
      if (new Set(items).size !== items.length)
        throw new BadRequestException('Há itens repetidos na lista');
    }

    const updated = await this.prisma.db.event.update({
      where: { id: eventId },
      data: {
        ...(items && { feedbackItems: JSON.stringify(items) }),
        ...(dto.open !== undefined && { feedbackOpen: dto.open }),
      },
      select: { feedbackItems: true, feedbackOpen: true, slug: true },
    });

    return {
      items: parseFeedbackItems(updated.feedbackItems),
      open: updated.feedbackOpen,
      publicUrl: updated.slug ? `${frontendBaseUrl()}/evento/${updated.slug}/avaliacao` : null,
    };
  }

  /** Respostas cruas + médias por item, para a tela de resultados. */
  async getResults(eventId: string, userId: string) {
    const event = await this.checkOwnership(eventId);
    if (event.createdBy !== userId)
      throw new ForbiddenException('Sem permissão para acessar este evento');

    const feedbacks = await this.prisma.db.eventFeedback.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: { registration: { select: { user: { select: { name: true } } } } },
    });

    const responses = feedbacks.map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      // Nome vem da inscrição (link individual) ou do que a pessoa digitou.
      name: f.registration?.user.name ?? f.respondentName ?? null,
      identified: !!f.registrationId,
      ratings: parseRatings(f.ratings),
      improvements: f.improvements,
      negatives: f.negatives,
    }));

    // Itens configurados hoje + os que aparecem em respostas antigas (a lista
    // pode ter mudado depois que alguém respondeu; nada se perde na tela).
    const configured = parseFeedbackItems(event.feedbackItems);
    const seen = new Set(configured);
    for (const r of responses)
      for (const rating of r.ratings) if (!seen.has(rating.item)) seen.add(rating.item);

    const summary = [...seen].map((item) => {
      const scores = responses
        .flatMap((r) => r.ratings.filter((x) => x.item === item))
        .map((x) => x.score)
        .filter((s): s is number => typeof s === 'number');

      const distribution = Array.from({ length: 11 }, (_, score) =>
        scores.filter((s) => s === score).length,
      );

      const comments = responses
        .flatMap((r) =>
          r.ratings
            .filter((x) => x.item === item && !!x.comment?.trim())
            .map((x) => ({ name: r.name, score: x.score, comment: x.comment!.trim() })),
        );

      return {
        item,
        answers: scores.length,
        average: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
        distribution,
        comments,
        active: configured.includes(item),
      };
    });

    // Média geral: todas as notas dadas, sem peso por item.
    const allScores = responses.flatMap((r) =>
      r.ratings.map((x) => x.score).filter((s): s is number => typeof s === 'number'),
    );

    return {
      total: responses.length,
      overall: allScores.length
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length
        : null,
      items: configured,
      open: event.feedbackOpen,
      summary,
      responses,
    };
  }

  /**
   * Dispara o convite da pesquisa para os inscritos confirmados que ainda não
   * responderam. Envio sequencial (a fila da Brevo é pequena) e tolerante a
   * falha: o retorno diz quantos saíram para o organizador reenviar depois.
   */
  async sendInvites(eventId: string, userId: string) {
    const event = await this.checkOwnership(eventId);
    if (event.createdBy !== userId)
      throw new ForbiddenException('Apenas o criador pode modificar este evento');
    if (!event.slug)
      throw new BadRequestException(
        'Defina a URL pública do evento antes de enviar a pesquisa',
      );
    if (!event.feedbackOpen)
      throw new BadRequestException(
        'Abra a pesquisa para respostas antes de enviar o convite',
      );

    const registrations = await this.prisma.db.registration.findMany({
      where: { eventId, status: 'confirmed', feedback: null },
      select: { id: true, user: { select: { name: true, email: true } } },
    });

    if (registrations.length === 0)
      return { total: 0, sent: 0, failed: 0, message: 'Ninguém pendente de resposta.' };

    const baseUrl = `${frontendBaseUrl()}/evento/${event.slug}/avaliacao`;

    let sent = 0;
    for (const reg of registrations) {
      const ok = await this.mail.sendFeedbackInvite({
        participantName: reg.user.name,
        participantEmail: reg.user.email,
        eventTitle: event.title,
        surveyUrl: `${baseUrl}?r=${reg.id}`,
      });
      if (ok) sent += 1;
    }

    return { total: registrations.length, sent, failed: registrations.length - sent };
  }

  // Público

  async getPublicForm(slug: string, registrationId?: string) {
    const event = await this.prisma.db.event.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        date: true,
        bannerUrl: true,
        feedbackItems: true,
        feedbackOpen: true,
      },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (!event.feedbackOpen)
      throw new NotFoundException('A avaliação deste evento não está disponível');

    let participantName: string | null = null;
    let alreadyAnswered = false;

    if (registrationId) {
      const registration = await this.prisma.db.registration.findUnique({
        where: { id: registrationId },
        select: {
          eventId: true,
          user: { select: { name: true } },
          feedback: { select: { id: true } },
        },
      });
      // Link de outro evento (ou inválido) é tratado como link genérico.
      if (registration?.eventId === event.id) {
        participantName = registration.user.name;
        alreadyAnswered = !!registration.feedback;
      }
    }

    return {
      eventTitle: event.title,
      eventDate: event.date,
      bannerUrl: event.bannerUrl,
      items: parseFeedbackItems(event.feedbackItems),
      participantName,
      alreadyAnswered,
    };
  }

  async submit(slug: string, dto: SubmitFeedbackDto) {
    const event = await this.prisma.db.event.findUnique({
      where: { slug },
      select: { id: true, feedbackItems: true, feedbackOpen: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (!event.feedbackOpen)
      throw new NotFoundException('A avaliação deste evento não está disponível');

    const allowed = new Set(parseFeedbackItems(event.feedbackItems));
    const unknown = dto.ratings.find((r) => !allowed.has(r.item));
    if (unknown)
      throw new BadRequestException(
        'O formulário foi atualizado pelo organizador. Recarregue a página e responda novamente.',
      );

    const ratings: StoredRating[] = dto.ratings.map((r) => ({
      item: r.item,
      score: typeof r.score === 'number' ? r.score : null,
      comment: r.comment?.trim() ? r.comment.trim() : null,
    }));

    const hasContent =
      ratings.some((r) => r.score !== null || r.comment) ||
      !!dto.improvements?.trim() ||
      !!dto.negatives?.trim();
    if (!hasContent)
      throw new BadRequestException('Responda pelo menos um item antes de enviar');

    let registrationId: string | null = null;
    if (dto.registrationId) {
      const registration = await this.prisma.db.registration.findUnique({
        where: { id: dto.registrationId },
        select: { id: true, eventId: true, feedback: { select: { id: true } } },
      });
      if (!registration || registration.eventId !== event.id)
        throw new BadRequestException('Inscrição não encontrada neste evento');
      if (registration.feedback)
        throw new ConflictException('Esta inscrição já respondeu à avaliação');
      registrationId = registration.id;
    }

    const created = await this.prisma.db.eventFeedback.create({
      data: {
        eventId: event.id,
        registrationId,
        respondentName: registrationId ? null : dto.respondentName?.trim() || null,
        ratings: JSON.stringify(ratings),
        improvements: dto.improvements?.trim() || null,
        negatives: dto.negatives?.trim() || null,
      },
      select: { id: true },
    });

    return { id: created.id, message: 'Avaliação registrada. Obrigado!' };
  }

  private async checkOwnership(eventId: string) {
    const event = await this.prisma.db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        createdBy: true,
        feedbackItems: true,
        feedbackOpen: true,
      },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return event;
  }
}
