import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockDb = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockPrisma = { db: mockDb };
const mockJwt = { sign: jest.fn().mockReturnValue('signed-token') };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // register

  describe('register', () => {
    it('cria usuário e retorna dados sem senha', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue({
        id: 'u1', name: 'João', email: 'joao@test.com', role: 'user', createdAt: new Date(),
      });

      const result = await service.register({ name: 'João', email: 'joao@test.com', password: 'senha123' });

      expect(result.email).toBe('joao@test.com');
      expect(result).not.toHaveProperty('password');
      expect(mockDb.user.create).toHaveBeenCalledTimes(1);
    });

    it('lança ConflictException quando email já existe numa conta real', async () => {
      mockDb.user.findUnique.mockResolvedValue({ id: 'existing', isShadow: false });

      await expect(
        service.register({ name: 'João', email: 'duplicado@test.com', password: 'senha123' }),
      ).rejects.toThrow(ConflictException);

      expect(mockDb.user.create).not.toHaveBeenCalled();
      expect(mockDb.user.update).not.toHaveBeenCalled();
    });

    it('deixa a pessoa assumir a própria conta-sombra em vez de bloquear o e-mail', async () => {
      // Conta criada automaticamente numa inscrição pública: o e-mail está
      // ocupado mas ninguém nunca soube a senha. Sem isso a pessoa não
      // conseguia nem se cadastrar nem entrar.
      mockDb.user.findUnique.mockResolvedValue({ id: 'shadow-1', isShadow: true });
      mockDb.user.update.mockResolvedValue({
        id: 'shadow-1', name: 'João', email: 'joao@test.com', role: 'user', createdAt: new Date(),
      });

      const result = await service.register({
        name: 'João', email: 'joao@test.com', password: 'senha123',
      });

      expect(result.id).toBe('shadow-1'); // mesma conta: histórico preservado
      expect(mockDb.user.create).not.toHaveBeenCalled();
      expect(mockDb.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shadow-1' },
          data: expect.objectContaining({ name: 'João', isShadow: false }),
        }),
      );
    });

    it('grava a senha escolhida ao assumir a conta-sombra', async () => {
      mockDb.user.findUnique.mockResolvedValue({ id: 'shadow-1', isShadow: true });
      mockDb.user.update.mockResolvedValue({
        id: 'shadow-1', name: 'João', email: 'joao@test.com', role: 'user', createdAt: new Date(),
      });

      await service.register({ name: 'João', email: 'joao@test.com', password: 'minha-senha' });

      const { password } = mockDb.user.update.mock.calls[0][0].data;
      expect(password).not.toBe('minha-senha');
      expect(await bcrypt.compare('minha-senha', password)).toBe(true);
    });

    it('armazena senha como hash bcrypt (nunca em texto puro)', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue({
        id: 'u1', name: 'João', email: 'joao@test.com', role: 'user', createdAt: new Date(),
      });

      await service.register({ name: 'João', email: 'joao@test.com', password: 'senha-plana' });

      const { password } = mockDb.user.create.mock.calls[0][0].data;
      expect(password).not.toBe('senha-plana');
      expect(await bcrypt.compare('senha-plana', password)).toBe(true);
    });
  });

  // login

  describe('login', () => {
    it('retorna access_token para credenciais válidas', async () => {
      const hashed = await bcrypt.hash('correta', 10);
      mockDb.user.findUnique.mockResolvedValue({ id: 'u1', email: 'joao@test.com', password: hashed, role: 'user' });

      const result = await service.login({ email: 'joao@test.com', password: 'correta' });

      expect(result).toEqual({ access_token: 'signed-token' });
      expect(mockJwt.sign).toHaveBeenCalledWith({ sub: 'u1', email: 'joao@test.com', role: 'user' });
    });

    it('lança UnauthorizedException para email desconhecido', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'naoexiste@test.com', password: 'qualquer' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException para senha errada', async () => {
      const hashed = await bcrypt.hash('correta', 10);
      mockDb.user.findUnique.mockResolvedValue({ id: 'u1', email: 'joao@test.com', password: hashed, role: 'user' });

      await expect(
        service.login({ email: 'joao@test.com', password: 'errada' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockJwt.sign).not.toHaveBeenCalled();
    });
  });

  // me

  describe('me', () => {
    it('retorna dados do usuário por id', async () => {
      const user = { id: 'u1', name: 'João', email: 'joao@test.com', role: 'user', createdAt: new Date() };
      mockDb.user.findUnique.mockResolvedValue(user);

      const result = await service.me('u1');

      expect(result).toEqual(user);
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: expect.any(Object) });
    });

    it('lança NotFoundException quando usuário não existe (token de sessão órfão)', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      await expect(service.me('uuid-inexistente')).rejects.toThrow(NotFoundException);
    });
  });
});
