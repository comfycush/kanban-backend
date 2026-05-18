import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class WsSendMessageDto {
  @IsUUID()
  @IsNotEmpty()
  orgId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  content: string;
}
