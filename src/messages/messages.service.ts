import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ChatGateway } from '../realtime/chat.gateway';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageFiltersDto } from './dto/message-filters.dto';
import { toPaginatedList } from '../common/http/paginated-list';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async create(
    orgId: string,
    userId: string,
    actorLabel: string,
    dto: CreateMessageDto,
  ) {
    const message = await this.prisma.message.create({
      data: { orgId, userId, content: dto.content },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    const logData: Prisma.InputJsonValue = {
      summary: `${actorLabel} sent a message`,
    };
    await this.activity.log(orgId, ActivityType.MESSAGE_SENT, logData, {
      userId,
    });
    this.chatGateway.emitNewMessage(orgId, message);
    return message;
  }

  async listForOrg(orgId: string, query: MessageFiltersDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;
    const where = { orgId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.message.count({ where }),
    ]);
    return toPaginatedList(items, total, skip, take);
  }
}
