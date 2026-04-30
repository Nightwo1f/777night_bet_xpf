import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GamesModule } from './modules/games/games.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [AuthModule, WalletModule, GamesModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
