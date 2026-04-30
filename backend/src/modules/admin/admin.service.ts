import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [users, totalTransactions] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      }),
      this.prisma.transaction.count(),
    ]);

    const totalBalance = users.reduce(
      (sum, user) => sum + (user.wallet?.balance ?? 0),
      0,
    );

    return {
      stats: {
        users: users.length,
        totalBalance,
        totalTransactions,
      },
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        balance: user.wallet?.balance ?? 0,
        transactions: user.transactions,
      })),
    };
  }
}
