import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @ApiProperty({ maxLength: 200, example: 'Sprint 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;
}
