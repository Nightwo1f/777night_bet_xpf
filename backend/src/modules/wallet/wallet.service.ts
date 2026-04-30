import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type TransactionType = 'credit' | 'debit' | 'win' | 'loss';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      userId,
      balance: wallet.balance,
      transactions: await this.getTransactions(userId),
    };
  }

  async getBalance(userId: number) {
    return (await this.getWallet(userId)).balance;
  }

  async applyTransaction(input: {
    userId: number;
    amount: number;
    type: TransactionType;
    description: string;
  }) {
    if (!Number.isFinite(input.amount) || input.amount === 0) {
      throw new BadRequestException('Transaction amount must be valid');
    }

    return this.prisma.$transaction(async (prisma) => {
      const wallet = await prisma.wallet.findUnique({
        where: { userId: input.userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const nextBalance = wallet.balance + input.amount;

      if (nextBalance < 0) {
        throw new BadRequestException('Insufficient balance');
      }

      await prisma.wallet.update({
        where: { userId: input.userId },
        data: { balance: nextBalance },
      });

      return prisma.transaction.create({
        data: {
          userId: input.userId,
          amount: input.amount,
          balanceAfter: nextBalance,
          type: input.type,
          description: input.description,
        },
      });
    });
  }

  private getTransactions(userId: number) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
}
