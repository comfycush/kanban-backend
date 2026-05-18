import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class MoveCardDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetColumnId: string;

  @ApiProperty({ minimum: 0, example: 0 })
  @IsInt()
  @Min(0)
  newOrder: number;
}
