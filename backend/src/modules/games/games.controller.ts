import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlayNightDiceDto } from './dto/play-night-dice.dto';
import { GamesService } from './games.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: number;
    email: string;
  };
};

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('night-dice/play')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  playNightDice(
    @Body() body: PlayNightDiceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.gamesService.playNightDice({
      userId: request.user.sub,
      stake: body.stake,
      choice: body.choice,
    });
  }

  @Get('night-dice/history')
  getNightDiceHistory(@Req() request: AuthenticatedRequest) {
    return this.gamesService.getHistory(request.user.sub);
  }
}
