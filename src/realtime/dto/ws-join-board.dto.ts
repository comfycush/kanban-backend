import { IsNotEmpty, IsUUID } from 'class-validator';

export class WsJoinBoardDto {
  @IsUUID()
  @IsNotEmpty()
  boardId: string;
}
