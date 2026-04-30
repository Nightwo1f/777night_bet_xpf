import { Body, Controller, Post } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('night-dice/play')
  playNightDice(@Body() body: { stake: number; choice: number }) {
    return this.gamesService.playNightDice({
      userId: 1,
      stake: body.stake,
      choice: body.choice,
    });
  }
}
