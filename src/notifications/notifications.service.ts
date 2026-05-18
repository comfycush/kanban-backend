import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationFiltersDto } from './dto/notification-filters.dto';
import { toPaginatedList } from '../common/http/paginated-list';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, type: NotificationType, data: Prisma.InputJsonValue) {
    return this.prisma.notification.create({
      data: { userId, type, data },
    });
  }

  async listForUser(userId: string, query: NotificationFiltersDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const where = {
      userId,
      ...(query.unreadOnly ? { read: false } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return toPaginatedList(items, total, skip, take);
  }

  async markRead(userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!n) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
