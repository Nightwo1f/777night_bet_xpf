import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
  playNightDice(
    @Body() body: { stake: number; choice: number },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.gamesService.playNightDice({
      userId: request.user.sub,
      stake: body.stake,
      choice: body.choice,
    });
  }
}
