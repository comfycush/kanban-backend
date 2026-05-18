import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
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
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { WsSendMessageDto } from './dto/ws-send-message.dto';
import { WsJoinOrgDto } from './dto/ws-join-org.dto';
import { decodeJwtPayload } from '../auth/jwt-decode.util';

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly log = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messages: MessagesService,
  ) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      this.log.warn('Chat socket: missing token');
      client.disconnect(true);
      return;
    }
    try {
      this.jwt.verify(token);
      this.log.log(`Chat socket: connected: ${client.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('joinOrg')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async joinOrg(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsJoinOrgDto,
  ) {
    const sub = this.requireUserId(client);
    if (!sub) {
      return { ok: false, error: 'Unauthorized' };
    }
    const m = await this.prisma.membership.findUnique({
      where: { userId_orgId: { userId: sub, orgId: data.orgId } },
    });
    if (!m) {
      return { ok: false, error: 'Forbidden' };
    }
    void client.join(this.orgRoom(data.orgId));
    console.log('joined org room', { ok: true, orgId: data.orgId });

    return { ok: true, orgId: data.orgId };
  }

  @SubscribeMessage('sendMessage')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsSendMessageDto,
  ) {
    const sub = this.requireUserId(client);
    if (!sub) {
      return { ok: false, error: 'Unauthorized' };
    }
    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, email: true, fullName: true },
    });
    if (!user) {
      return { ok: false, error: 'User not found' };
    }
    const message = await this.messages.create(
      data.orgId,
      user.id,
      user.fullName.trim() || user.email,
      { content: data.content },
    );
    return { ok: true, message };
  }

  emitNewMessage(
    orgId: string,
    message: {
      id: string;
      content: string;
      orgId: string;
      userId: string;
      createdAt: Date;
      user: { id: string; email: string; fullName: string };
    },
  ) {
    console.log({ test: this.orgRoom(orgId) });

    this.server.to(this.orgRoom(orgId)).emit('chat', {
      type: 'message:new',
      message,
    });
  }

  private orgRoom(orgId: string) {
    return `org:${orgId}`;
  }

  private requireUserId(client: Socket): string | undefined {
    const token = this.extractToken(client);
    if (!token) {
      return undefined;
    }
    const p = decodeJwtPayload(this.jwt, token);
    if (!p?.sub) {
      return undefined;
    }
    return p.sub;
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
}
