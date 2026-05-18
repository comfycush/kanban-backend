import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateColumnDto {
  @ApiProperty({ maxLength: 200, example: 'To do' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;
}
