import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateOrgDto {
  @ApiProperty({ maxLength: 200, example: 'My team' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;
}
