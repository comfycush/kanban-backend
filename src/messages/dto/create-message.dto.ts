import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ maxLength: 10_000, example: 'Hello team' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  content: string;
}
