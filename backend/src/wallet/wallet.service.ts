import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdatePixAccountDto } from './dto/update-pix-account.dto.js';
import { UpdatePayoutDto } from './dto/update-payout.dto.js';

/** Converte o Decimal do Prisma (ou null) em centavos inteiros. */
function toCents(value: unknown): number {
  return Math.round(Number(value ?? 0) * 100);
}

function minPayoutCents(): number {
  const parsed = Number(process.env.MIN_PAYOUT_AMOUNT);
  return Math.round(
    (Number.isFinite(parsed) && parsed > 0 ? parsed : 10) * 100,
  );
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Carteira do organizador.
 *
 * O saldo nunca é armazenado — é sempre a soma do `LedgerEntry`. Uma linha
 * conta no saldo disponível quando `availableAt <= agora`; vendas ficam
 * retidas até alguns dias depois do evento, débitos de resgate valem na hora.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const now = new Date();
    const [available, pending, earned, paidOut] = await Promise.all([
      this.prisma.db.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: { userId, availableAt: { lte: now } },
      }),
      this.prisma.db.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: { userId, availableAt: { gt: now } },
      }),
      this.prisma.db.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: { userId, type: 'sale' },
      }),
      this.prisma.db.payoutRequest.aggregate({
        _sum: { amount: true },
        where: { userId, status: 'paid' },
      }),
    ]);

    return {
      available: toCents(available._sum.amount) / 100,
      pending: toCents(pending._sum.amount) / 100,
      totalEarned: toCents(earned._sum.amount) / 100,
      totalPaidOut: toCents(paidOut._sum.amount) / 100,
      minPayout: minPayoutCents() / 100,
    };
  }

  async listEntries(userId: string, page = 1, limit = 30) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.db.ledgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          availableAt: true,
          createdAt: true,
          event: { select: { id: true, title: true } },
        },
      }),
      this.prisma.db.ledgerEntry.count({ where: { userId } }),
    ]);

    return { items, total, page: Math.max(page, 1), limit: take };
  }

  async getPixAccount(userId: string) {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: {
        pixKey: true,
        pixKeyType: true,
        pixHolderName: true,
        pixHolderDocument: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async updatePixAccount(userId: string, dto: UpdatePixAccountDto) {
    const pixKey = dto.pixKey.trim();
    const document = dto.pixHolderDocument.replace(/\D/g, '');

    // Uma chave do tipo CPF/CNPJ tem que ser o documento do próprio titular —
    // é a checagem mais barata contra repassar para a conta de outra pessoa.
    if (dto.pixKeyType === 'cpf' || dto.pixKeyType === 'cnpj') {
      if (pixKey.replace(/\D/g, '') !== document)
        throw new BadRequestException(
          'Para chave do tipo CPF/CNPJ, a chave deve ser o mesmo documento do titular',
        );
    }

    await this.prisma.db.user.update({
      where: { id: userId },
      data: {
        pixKey,
        pixKeyType: dto.pixKeyType,
        pixHolderName: dto.pixHolderName.trim(),
        pixHolderDocument: document,
      },
    });

    return this.getPixAccount(userId);
  }

  /**
   * Solicita um resgate. O débito no razão nasce na mesma transação que confere
   * o saldo, sob isolamento serializável — sem isso, dois cliques simultâneos
   * sacariam o mesmo saldo duas vezes.
   */
  async requestPayout(userId: string, amount: number) {
    const account = await this.getPixAccount(userId);
    if (
      !account.pixKey ||
      !account.pixKeyType ||
      !account.pixHolderName ||
      !account.pixHolderDocument
    )
      throw new BadRequestException(
        'Cadastre sua chave PIX antes de solicitar um resgate',
      );

    const amountCents = toCents(amount);
    const minCents = minPayoutCents();
    if (amountCents < minCents)
      throw new BadRequestException(
        `O valor mínimo para resgate é ${formatBRL(minCents)}`,
      );

    const payout = await this.prisma.db.$transaction(
      async (tx) => {
        const open = await tx.payoutRequest.findFirst({
          where: { userId, status: { in: ['requested', 'processing'] } },
        });
        if (open)
          throw new ConflictException(
            'Você já tem um resgate em andamento — aguarde a conclusão antes de pedir outro',
          );

        const balance = await tx.ledgerEntry.aggregate({
          _sum: { amount: true },
          where: { userId, availableAt: { lte: new Date() } },
        });
        const availableCents = toCents(balance._sum.amount);
        if (amountCents > availableCents)
          throw new BadRequestException(
            `Saldo disponível insuficiente (${formatBRL(availableCents)})`,
          );

        const created = await tx.payoutRequest.create({
          data: {
            userId,
            amount: amountCents / 100,
            status: 'requested',
            pixKey: account.pixKey!,
            pixKeyType: account.pixKeyType!,
            pixHolderName: account.pixHolderName!,
            pixHolderDocument: account.pixHolderDocument!,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            userId,
            payoutId: created.id,
            type: 'payout',
            amount: -(amountCents / 100),
            description: 'Resgate solicitado',
            availableAt: new Date(),
          },
        });

        return created;
      },
      { isolationLevel: 'Serializable' as never },
    );

    this.logger.log(
      `[payout] Resgate ${payout.id} solicitado por ${userId}: ${formatBRL(amountCents)}`,
    );
    return payout;
  }

  async listPayouts(userId: string) {
    return this.prisma.db.payoutRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        pixKey: true,
        pixKeyType: true,
        notes: true,
        receiptUrl: true,
        processedAt: true,
        createdAt: true,
      },
    });
  }

  // ---------------------------------------------------------------- admin ---

  async listAllPayouts(status?: string) {
    return this.prisma.db.payoutRequest.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  /**
   * Atualiza um resgate. Recusar devolve o valor ao saldo com uma linha de
   * estorno, em vez de apagar o débito — o histórico de um resgate recusado
   * precisa continuar visível.
   */
  async updatePayout(payoutId: string, adminId: string, dto: UpdatePayoutDto) {
    return this.prisma.db.$transaction(
      async (tx) => {
        const payout = await tx.payoutRequest.findUnique({
          where: { id: payoutId },
        });
        if (!payout) throw new NotFoundException('Resgate não encontrado');
        if (payout.status === 'paid' || payout.status === 'rejected')
          throw new ConflictException('Este resgate já foi finalizado');

        if (dto.status === 'rejected') {
          await tx.ledgerEntry.create({
            data: {
              userId: payout.userId,
              payoutId: payout.id,
              type: 'payout_reversal',
              amount: payout.amount,
              description: 'Resgate recusado — valor devolvido ao saldo',
              availableAt: new Date(),
            },
          });
        }

        const isFinal = dto.status === 'paid' || dto.status === 'rejected';
        return tx.payoutRequest.update({
          where: { id: payoutId },
          data: {
            status: dto.status,
            ...(dto.notes !== undefined && { notes: dto.notes }),
            ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl }),
            processedBy: adminId,
            processedAt: isFinal ? new Date() : null,
          },
        });
      },
      { isolationLevel: 'Serializable' as never },
    );
  }

  /**
   * Visão financeira da plataforma: quanto entrou, quanto é dos organizadores
   * e quanto sobra de taxa. `outstandingBalance` é a soma de todo o razão —
   * ou seja, o que a plataforma ainda deve, retido e disponível somados.
   */
  async getPlatformRevenue() {
    const [paid, ledger] = await Promise.all([
      this.prisma.db.payment.aggregate({
        _sum: { feeAmount: true, baseAmount: true, amount: true },
        where: { status: 'paid', provider: { notIn: ['cash', 'manual'] } },
      }),
      this.prisma.db.ledgerEntry.aggregate({ _sum: { amount: true } }),
    ]);

    return {
      totalCollected: toCents(paid._sum.amount) / 100,
      organizersShare: toCents(paid._sum.baseAmount) / 100,
      platformFees: toCents(paid._sum.feeAmount) / 100,
      outstandingBalance: toCents(ledger._sum.amount) / 100,
    };
  }
}
