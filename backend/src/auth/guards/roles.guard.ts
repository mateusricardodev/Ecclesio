import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id?: string } }>();
    const userId = request.user?.id;
    if (!userId) throw new ForbiddenException('Acesso restrito');

    // O papel é lido do banco, não do JWT: assim revogar um admin tem efeito
    // imediato, sem precisar esperar o token expirar.
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || !required.includes(user.role))
      throw new ForbiddenException('Acesso restrito');

    return true;
  }
}
