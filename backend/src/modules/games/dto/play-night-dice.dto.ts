import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class PlayNightDiceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  stake: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  choice: number;
}
