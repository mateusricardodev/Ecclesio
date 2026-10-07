import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { GoogleTokenVerifier } from './google-token.verifier.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly google: GoogleTokenVerifier,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const exists = await this.prisma.db.user.findUnique({
        where: { email: dto.email },
      });

      const hashed = await bcrypt.hash(dto.password, 10);

      if (exists) {
        // Conta-sombra: criada automaticamente quando a pessoa se inscreveu
        // num evento, com senha aleatória que ninguém nunca soube. Sem isso o
        // e-mail dela ficaria permanentemente bloqueado e não conseguiria se
        // cadastrar (o e-mail "já existe") nem entrar (não tem a senha).
        // Assumir a conta preserva o histórico de inscrições dela.
        if (!exists.isShadow) {
          throw new ConflictException('E-mail já cadastrado');
        }

        return await this.prisma.db.user.update({
          where: { id: exists.id },
          data: {
            name: dto.name,
            password: hashed,
            isShadow: false,
            hasPassword: true,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        });
      }

      const user = await this.prisma.db.user.create({
        data: { name: dto.name, email: dto.email, password: hashed },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return user;
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.db.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.signToken(user);
  }

  async loginWithGoogle(credential: string) {
    const profile = await this.google.verify(credential);

    let user = await this.prisma.db.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      // O e-mail é gravado como a pessoa digitou, então a busca ignora caixa.
      // Se houver mais de uma conta (ex.: "Joao@" sombra e "joao@" real),
      // prefere a conta real.
      const [existing] = await this.prisma.db.user.findMany({
        where: { email: { equals: profile.email, mode: 'insensitive' } },
        orderBy: { isShadow: 'asc' },
        take: 1,
      });

      if (existing) {
        // Vincula o Google à conta que já existe com esse e-mail. É seguro
        // porque o Google atestou o e-mail (email_verified). Uma conta-sombra
        // vira conta real aqui, igual ao `register`, mantendo o histórico de
        // inscrições.
        user = await this.prisma.db.user.update({
          where: { id: existing.id },
          data: { googleId: profile.googleId, isShadow: false },
        });
      } else {
        // Senha aleatória que ninguém sabe: essa conta só entra pelo Google.
        const password = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
        user = await this.prisma.db.user.create({
          data: {
            name: profile.name,
            email: profile.email,
            password,
            hasPassword: false,
            googleId: profile.googleId,
          },
        });
      }
    }

    return this.signToken(user);
  }

  private signToken(user: { id: string; email: string; role: string }) {
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { access_token: token };
  }

  async me(userId: string) {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        hasPassword: true,
        googleId: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // O googleId em si não sai daqui; a tela só precisa saber se há vínculo.
    const { googleId, ...rest } = user;
    return { ...rest, googleConnected: googleId !== null };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Informe o nome');

    await this.prisma.db.user.update({ where: { id: userId }, data: { name } });
    return this.me(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.hasPassword) {
      const valid =
        !!dto.currentPassword &&
        (await bcrypt.compare(dto.currentPassword, user.password));
      if (!valid) throw new BadRequestException('Senha atual incorreta');
    }

    const password = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.db.user.update({
      where: { id: userId },
      data: { password, hasPassword: true },
    });
    return { ok: true };
  }
}
