import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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
          data: { name: dto.name, password: hashed, isShadow: false },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
      }

      const user = await this.prisma.db.user.create({
        data: { name: dto.name, email: dto.email, password: hashed },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
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
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
}
