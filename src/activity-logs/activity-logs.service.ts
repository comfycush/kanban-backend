import { Injectable } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogFiltersDto } from './dto/activity-log-filters.dto';
import { toPaginatedList } from '../common/http/paginated-list';

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    orgId: string,
    type: ActivityType,
    data: Prisma.InputJsonValue,
    options: { userId?: string; cardId?: string } = {},
  ) {
    return this.prisma.activityLog.create({
      data: {
        orgId,
        type,
        data,
        userId: options.userId,
        cardId: options.cardId,
      },
    });
  }

  async listForOrg(orgId: string, query: ActivityLogFiltersDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;
    const where = { orgId };
    const include = {
      user: { select: { id: true, email: true, fullName: true } },
      card: { select: { id: true, title: true } },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include,
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return toPaginatedList(items, total, skip, take);
  }

  async listForCard(cardId: string, query: ActivityLogFiltersDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;
    const where = { cardId };
    const include = {
      user: { select: { id: true, email: true, fullName: true } },
      card: { select: { id: true, title: true } },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        include,
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return toPaginatedList(items, total, skip, take);
  }
}
