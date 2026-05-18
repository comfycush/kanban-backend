import { IsNotEmpty, IsUUID } from 'class-validator';

export class WsJoinOrgDto {
  @IsUUID()
  @IsNotEmpty()
  orgId: string;
}
