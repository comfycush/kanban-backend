import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCardDto {
  @ApiProperty({ maxLength: 500, example: 'Fix login bug' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ maxLength: 10_000 })
  @IsString()
  @IsOptional()
  @MaxLength(10_000)
  description?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;
}
