import { Injectable, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BoardsService } from '../boards/boards.service';
import { decodeJwtPayload } from '../auth/jwt-decode.util';
import { WsJoinBoardDto } from './dto/ws-join-board.dto';

@Injectable()
@WebSocketGateway({
  namespace: '/board',
  cors: { origin: '*' },
})
export class BoardGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly log = new Logger(BoardGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly boards: BoardsService,
  ) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      this.log.warn('Board socket: missing token, disconnecting');
      client.disconnect(true);
      return;
    }
    try {
      this.jwt.verify(token);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('joinBoard')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async joinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsJoinBoardDto,
  ) {
    const token = this.extractToken(client);
    if (!token) {
      return { ok: false, error: 'Unauthorized' };
    }
    const payload = decodeJwtPayload(this.jwt, token);
    if (!payload?.sub) {
      return { ok: false, error: 'Invalid token' };
    }
    try {
      await this.boards.ensureUserBoardAccess(payload.sub, data.boardId);
      void client.join(this.roomName(data.boardId));
      this.log.log(`User ${payload.sub} joined board room ${data.boardId}`);
      return { ok: true, boardId: data.boardId };
    } catch {
      return { ok: false, error: 'Forbidden' };
    }
  }

  @SubscribeMessage('leaveBoard')
  leaveBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string },
  ) {
    void client.leave(this.roomName(data.boardId));
    return { ok: true };
  }

  private roomName(boardId: string) {
    return `board:${boardId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) {
      return auth.token;
    }
    const h = client.handshake.headers?.authorization;
    if (h?.startsWith('Bearer ')) {
      return h.slice(7);
    }
    return undefined;
  }

  emitCardEvent(
    boardId: string,
    payload: {
      type: string;
      cardId?: string;
      orgId?: string;
      card?: unknown;
    },
  ) {
    this.server.to(this.roomName(boardId)).emit('board', payload);
  }
}
