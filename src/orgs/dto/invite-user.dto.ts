import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class InviteUserDto {
  @ApiProperty({ example: 'teammate@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: Role, example: Role.MEMBER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
