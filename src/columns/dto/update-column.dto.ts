import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateColumnDto {
  @ApiPropertyOptional({ maxLength: 200, example: 'In progress' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  name?: string;
}
