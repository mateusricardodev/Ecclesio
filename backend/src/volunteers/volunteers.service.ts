import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Equipe de credenciamento do evento.
 *
 * Quem está aqui pode usar o app de credenciamento (`/app`) naquele evento e
 * nada além disso: não vê a carteira, não edita o evento, não mexe em outros
 * eventos. A autorização em si já era feita pelo CheckinService, que consulta
 * `EventVolunteer`; o que faltava era o organizador conseguir popular a tabela
 * sem INSERT no banco (e, por falta disso, acabar compartilhando o login).
 */
@Injectable()
export class VolunteersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(eventId: string, ownerId: string) {
    await this.assertOwner(eventId, ownerId);

    const links = await this.prisma.db.eventVolunteer.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, isShadow: true } },
      },
    });

    return links.map((link) => ({
      id: link.id,
      userId: link.user.id,
      name: link.user.name,
      email: link.user.email,
      // Conta-sombra nunca teve senha escolhida por ninguém: a pessoa foi
      // criada automaticamente ao se inscrever num evento. Enquanto não
      // ativar a conta pelo cadastro, ela não consegue entrar para credenciar.
      needsActivation: link.user.isShadow,
      createdAt: link.createdAt,
    }));
  }

  async add(eventId: string, ownerId: string, email: string) {
    const event = await this.assertOwner(eventId, ownerId);
    const normalized = email.trim();

    // Busca sem diferenciar maiúscula: o e-mail é gravado como a pessoa
    // digitou no cadastro, e o organizador não tem como adivinhar a grafia.
    const user = await this.prisma.db.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
      select: { id: true, name: true, email: true, isShadow: true },
    });

    if (!user)
      throw new NotFoundException(
        'Nenhuma conta com esse e-mail. Peça para a pessoa criar a conta no site antes de adicioná-la à equipe.',
      );

    if (user.id === event.createdBy)
      throw new BadRequestException(
        'Você é o organizador deste evento e já pode credenciar.',
      );

    const existing = await this.prisma.db.eventVolunteer.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException('Essa pessoa já está na equipe deste evento');

    const link = await this.prisma.db.eventVolunteer.create({
      data: { eventId, userId: user.id },
      select: { id: true, createdAt: true },
    });

    return {
      id: link.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      needsActivation: user.isShadow,
      createdAt: link.createdAt,
    };
  }

  async remove(eventId: string, ownerId: string, userId: string) {
    await this.assertOwner(eventId, ownerId);

    const link = await this.prisma.db.eventVolunteer.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true },
    });
    if (!link) throw new NotFoundException('Essa pessoa não está na equipe');

    await this.prisma.db.eventVolunteer.delete({ where: { id: link.id } });
    return { message: 'Removido da equipe' };
  }

  /** Mesmo padrão dos outros services: só o dono do evento administra. */
  private async assertOwner(eventId: string, userId: string) {
    const event = await this.prisma.db.event.findUnique({
      where: { id: eventId },
      select: { id: true, createdBy: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.createdBy !== userId)
      throw new ForbiddenException('Apenas o criador pode gerenciar a equipe');
    return event;
  }
}
