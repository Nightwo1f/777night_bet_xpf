import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

type TransactionType = 'credit' | 'debit' | 'win' | 'loss';

export type WalletTransaction = {
  id: number;
  userId: number;
  amount: number;
  balanceAfter: number;
  type: TransactionType;
  description: string;
  createdAt: string;
};

@Injectable()
export class WalletService {
  private readonly balances = new Map<number, number>([[1, 1000]]);
  private readonly transactions: WalletTransaction[] = [
    {
      id: 1,
      userId: 1,
      amount: 1000,
      balanceAfter: 1000,
      type: 'credit',
      description: 'Creditos iniciais demo',
      createdAt: new Date().toISOString(),
    },
  ];

  getWallet(userId: number) {
    const balance = this.balances.get(userId);

    if (balance === undefined) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      userId,
      balance,
      transactions: this.getTransactions(userId),
    };
  }

  getBalance(userId: number) {
    return this.getWallet(userId).balance;
  }

  applyTransaction(input: {
    userId: number;
    amount: number;
    type: TransactionType;
    description: string;
  }) {
    if (!Number.isFinite(input.amount) || input.amount === 0) {
      throw new BadRequestException('Transaction amount must be valid');
    }

    const currentBalance = this.getBalance(input.userId);
    const nextBalance = currentBalance + input.amount;

    if (nextBalance < 0) {
      throw new BadRequestException('Insufficient balance');
    }

    this.balances.set(input.userId, nextBalance);

    const transaction: WalletTransaction = {
      id: this.transactions.length + 1,
      userId: input.userId,
      amount: input.amount,
      balanceAfter: nextBalance,
      type: input.type,
      description: input.description,
      createdAt: new Date().toISOString(),
    };

    this.transactions.unshift(transaction);

    return transaction;
  }

  private getTransactions(userId: number) {
    return this.transactions
      .filter((transaction) => transaction.userId === userId)
      .slice(0, 10);
  }
}
