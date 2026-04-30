import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const demoPasswordHash =
  '$2b$10$nttIpeZBHXb8tkeEJdk7ROPN927Mh/TUCeBrghGxtX6BboV0j6PH2';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    await this.ensureSchema();
    await this.seedDemoData();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureSchema() {
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "email" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Wallet" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "userId" INTEGER NOT NULL UNIQUE,
        "balance" INTEGER NOT NULL DEFAULT 1000,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Wallet_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User" ("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Transaction" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "userId" INTEGER NOT NULL,
        "amount" INTEGER NOT NULL,
        "balanceAfter" INTEGER NOT NULL,
        "type" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Transaction_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User" ("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    await this.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Transaction_userId_createdAt_idx"
      ON "Transaction" ("userId", "createdAt");
    `);
  }

  private async seedDemoData() {
    const user = await this.user.upsert({
      where: { email: 'test@test.com' },
      update: {},
      create: {
        email: 'test@test.com',
        passwordHash: demoPasswordHash,
        wallet: {
          create: {
            balance: 1000,
          },
        },
      },
      include: { wallet: true },
    });

    if (!user.wallet) {
      await this.wallet.create({
        data: {
          userId: user.id,
          balance: 1000,
        },
      });
    }

    const transactionCount = await this.transaction.count({
      where: { userId: user.id },
    });

    if (transactionCount === 0) {
      await this.transaction.create({
        data: {
          userId: user.id,
          amount: 1000,
          balanceAfter: 1000,
          type: 'credit',
          description: 'Creditos iniciais demo',
        },
      });
    }
  }
}
