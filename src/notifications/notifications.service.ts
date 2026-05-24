import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, NotificationType, Prisma } from '@prisma/client';
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

  private async enrichWithMessages<T extends Notification>(
    notifications: T[],
  ): Promise<(T & { message: string })[]> {
    const actorIds = this.collectActorIds(notifications);
    const users =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, fullName: true },
          })
        : [];
    const actorNames = new Map(users.map((u) => [u.id, u.fullName]));
    return notifications.map((notification) => ({
      ...notification,
      message: this.buildNotificationMessage(
        notification.type,
        notification.data,
        actorNames,
      ),
    }));
  }

  private collectActorIds(notifications: Notification[]): string[] {
    const ids = new Set<string>();
    for (const notification of notifications) {
      const payload = this.asRecord(notification.data);
      if (notification.type === NotificationType.INVITE) {
        const inviterId = this.str(payload, 'inviterId');
        if (inviterId) ids.add(inviterId);
      } else if (notification.type === NotificationType.CARD_ASSIGNED) {
        const assignerId = this.str(payload, 'assignerId');
        if (assignerId) ids.add(assignerId);
      }
    }
    return [...ids];
  }

  private buildNotificationMessage(
    type: NotificationType,
    data: unknown,
    actorNames: Map<string, string>,
  ): string {
    const payload = this.asRecord(data);

    switch (type) {
      case NotificationType.INVITE: {
        const orgName = this.str(payload, 'orgName') ?? 'an organization';
        const inviterId = this.str(payload, 'inviterId');
        const inviterName = inviterId ? actorNames.get(inviterId) : undefined;
        return inviterName
          ? `${inviterName} invited you to join ${orgName}`
          : `You were invited to join ${orgName}`;
      }
      case NotificationType.CARD_ASSIGNED: {
        const title = this.str(payload, 'title') ?? 'a card';
        const boardName = this.str(payload, 'boardName') ?? 'a board';
        const columnName = this.str(payload, 'columnName');
        const assignerId = this.str(payload, 'assignerId');
        const assignerName = assignerId
          ? actorNames.get(assignerId)
          : undefined;
        const location = columnName
          ? ` in ${columnName} on ${boardName}`
          : ` on ${boardName}`;
        return assignerName
          ? `${assignerName} assigned you to "${title}"${location}`
          : `You were assigned to "${title}"${location}`;
      }
      case NotificationType.SYSTEM:
        return this.str(payload, 'message') ?? 'System notification';
      default:
        return 'Notification';
    }
  }

  private asRecord(data: unknown): Record<string, unknown> {
    return data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  }

  private str(data: Record<string, unknown>, key: string): string | undefined {
    const value = data[key];
    return typeof value === 'string' ? value : undefined;
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
    const enriched = await this.enrichWithMessages(items);
    return toPaginatedList(enriched, total, skip, take);
  }

  async markRead(userId: string, id: string) {
    const n = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!n) {
      throw new NotFoundException('Notification not found');
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    const [enriched] = await this.enrichWithMessages([updated]);
    return enriched;
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
