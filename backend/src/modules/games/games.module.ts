import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [WalletModule],
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
