import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createWithWallet(input: { email: string; passwordHash: string }) {
    return this.prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          wallet: {
            create: {
              balance: 1000,
            },
          },
        },
      });

      await prisma.transaction.create({
        data: {
          userId: user.id,
          amount: 1000,
          balanceAfter: 1000,
          type: 'credit',
          description: 'Creditos iniciais',
        },
      });

      return user;
    });
  }
}
