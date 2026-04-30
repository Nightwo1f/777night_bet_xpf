import { BadRequestException, Injectable } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class GamesService {
  constructor(private readonly walletService: WalletService) {}

  async playNightDice(input: { userId: number; stake: number; choice: number }) {
    const stake = Number(input.stake);
    const choice = Number(input.choice);

    if (!Number.isInteger(choice) || choice < 1 || choice > 10) {
      throw new BadRequestException('Choice must be an integer between 1 and 10');
    }

    if (!Number.isFinite(stake) || stake <= 0) {
      throw new BadRequestException('Stake must be greater than zero');
    }

    if (stake > (await this.walletService.getBalance(input.userId))) {
      throw new BadRequestException('Insufficient balance');
    }

    const drawn = Math.floor(Math.random() * 10) + 1;
    const won = drawn === choice;
    const amount = won ? stake * 2 : -stake;

    const transaction = await this.walletService.applyTransaction({
      userId: input.userId,
      amount,
      type: won ? 'win' : 'loss',
      description: won ? 'Night Dice win' : 'Night Dice loss',
    });

    return {
      game: 'night-dice',
      stake,
      choice,
      drawn,
      won,
      delta: amount,
      balance: transaction.balanceAfter,
      transaction,
    };
  }
}
