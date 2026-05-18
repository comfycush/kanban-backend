import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BoardGateway } from '../realtime/board.gateway';
import { EmailOutbox } from '../email/email-outbox.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogsService,
    private readonly notifications: NotificationsService,
    private readonly boardGateway: BoardGateway,
    private readonly emailOutbox: EmailOutbox,
  ) {}

  private async bulkReorder(
    tx: Prisma.TransactionClient,
    columnId: string,
    ids: string[],
  ) {
    if (ids.length === 0) return;

    // PostgreSQL checks unique constraints row-by-row within a single UPDATE,
    // so swapping orders (e.g. 0 ↔ 1) causes a transient duplicate key error.
    // Step 1: push all cards in the column into negative-order space to clear
    // any conflicts, then step 2 assigns the real final positions.
    await tx.$executeRaw`
      UPDATE "Card"
      SET "order" = -("order" + 1)
      WHERE "columnId"::text = ${columnId}
    `;

    await tx.$executeRaw`
      UPDATE "Card"
      SET "order" = CASE id::text
        ${Prisma.join(
          ids.map((id, i) => Prisma.sql`WHEN ${id} THEN ${i}`),
          ' ',
        )}
        ELSE "order"
      END,
      "columnId" = ${columnId}::uuid
      WHERE id::text IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}`))})
    `;
  }

  private async assertColumnInOrg(columnId: string, orgId: string) {
    const col = await this.prisma.column.findFirst({
      where: { id: columnId, board: { orgId } },
      include: { board: { select: { id: true, orgId: true, name: true } } },
    });
    if (!col) {
      throw new NotFoundException('Column not found');
    }
    return col;
  }

  private async getCardInOrg(cardId: string, orgId: string) {
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, column: { board: { orgId } } },
      include: {
        column: {
          include: { board: true },
        },
        assignedTo: { select: { id: true, email: true, fullName: true } },
        attachments: true,
      },
    });
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    return card;
  }

  private async notifyAssign(
    assigneeId: string,
    card: { id: string; title: string; column: { board: { name: string } } },
    actorId: string,
    orgId: string,
    columnName: string,
  ) {
    await this.notifications.create(
      assigneeId,
      NotificationType.CARD_ASSIGNED,
      {
        orgId,
        cardId: card.id,
        title: card.title,
        boardName: card.column.board.name,
        columnName,
        assignerId: actorId,
      },
    );
    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
      select: { email: true },
    });
    if (assignee) {
      void this.emailOutbox.enqueueEmail({
        kind: 'CARD_ASSIGNED',
        toEmail: assignee.email,
        orgId,
        cardId: card.id,
        title: card.title,
      });
    }
  }

  async create(
    columnId: string,
    orgId: string,
    userId: string,
    userEmail: string,
    dto: CreateCardDto,
  ) {
    const column = await this.assertColumnInOrg(columnId, orgId);
    const last = await this.prisma.card.aggregate({
      where: { columnId },
      _max: { order: true },
    });
    const next = (last._max.order ?? -1) + 1;
    const card = await this.prisma.card.create({
      data: {
        columnId,
        title: dto.title,
        description: dto.description,
        order: next,
        assignedToId: dto.assignedToId,
      },
      include: { column: { include: { board: true } } },
    });
    if (dto.assignedToId && dto.assignedToId !== userId) {
      void this.notifyAssign(
        dto.assignedToId,
        card,
        userId,
        orgId,
        column.name,
      );
    }
    const logData = {
      summary: `${userEmail} created card ${card.title}`,
      cardTitle: card.title,
      columnName: column.name,
    };
    await this.activity.log(orgId, ActivityType.CARD_CREATED, logData, {
      userId,
      cardId: card.id,
    });
    this.boardGateway.emitCardEvent(card.column.boardId, {
      type: 'card:created',
      card: await this.getCardInOrg(card.id, orgId),
    });
    return card;
  }

  listForColumn(columnId: string, orgId: string) {
    return this.assertColumnInOrg(columnId, orgId).then(() =>
      this.prisma.card.findMany({
        where: { columnId },
        orderBy: { order: 'asc' },
        include: {
          assignedTo: { select: { id: true, email: true, fullName: true } },
        },
      }),
    );
  }

  getOne(cardId: string, orgId: string) {
    return this.getCardInOrg(cardId, orgId);
  }

  async update(
    cardId: string,
    orgId: string,
    userId: string,
    userEmail: string,
    dto: UpdateCardDto,
  ) {
    const existing = await this.getCardInOrg(cardId, orgId);
    const newAssignee = dto.assignedToId;
    if (
      newAssignee &&
      newAssignee !== userId &&
      newAssignee !== existing.assignedToId
    ) {
      const col = await this.prisma.column.findUniqueOrThrow({
        where: { id: existing.columnId },
        include: { board: { select: { name: true } } },
      });
      void this.notifyAssign(
        newAssignee,
        {
          id: existing.id,
          title: dto.title ?? existing.title,
          column: { board: { name: col.board.name } },
        },
        userId,
        orgId,
        col.name,
      );
    }
    const card = await this.prisma.card.update({
      where: { id: cardId },
      data: {
        title: dto.title,
        description: dto.description,
        assignedToId:
          dto.assignedToId === undefined ? undefined : dto.assignedToId,
      },
      include: {
        column: { include: { board: true } },
        assignedTo: { select: { id: true, email: true, fullName: true } },
        attachments: true,
      },
    });
    const logData: Prisma.InputJsonValue = {
      summary: `${userEmail} updated card ${card.title}`,
      cardTitle: card.title,
    };
    await this.activity.log(orgId, ActivityType.CARD_UPDATED, logData, {
      userId,
      cardId: card.id,
    });
    this.boardGateway.emitCardEvent(card.column.boardId, {
      type: 'card:updated',
      card: await this.getCardInOrg(card.id, orgId),
    });
    return card;
  }

  async move(
    cardId: string,
    orgId: string,
    userId: string,
    userEmail: string,
    dto: MoveCardDto,
  ) {
    const full = await this.prisma.card.findFirst({
      where: { id: cardId, column: { board: { orgId } } },
      include: { column: true },
    });
    const target = await this.prisma.column.findFirst({
      where: { id: dto.targetColumnId, board: { orgId } },
    });

    if (!full) throw new NotFoundException('Card not found');
    if (!target) throw new NotFoundException('Column not found');
    if (full.column.boardId !== target.boardId) {
      throw new BadRequestException('Target column must be on the same board');
    }

    const fromColumnId = full.columnId;
    const toColumnId = dto.targetColumnId;
    const boardId = full.column.boardId;

    if (fromColumnId === toColumnId) {
      const ids = (
        await this.prisma.card.findMany({
          where: { columnId: fromColumnId },
          orderBy: { order: 'asc' },
          select: { id: true },
        })
      ).map((c) => c.id);

      const fromIdx = ids.indexOf(cardId);
      if (fromIdx < 0) throw new NotFoundException('Card not found');
      ids.splice(fromIdx, 1);
      ids.splice(Math.min(dto.newOrder, ids.length), 0, cardId);

      await this.prisma.$transaction(async (tx) => {
        await this.bulkReorder(tx, fromColumnId, ids);
      });
    } else {
      const [fromCards, toCards] = await Promise.all([
        this.prisma.card.findMany({
          where: { columnId: fromColumnId },
          orderBy: { order: 'asc' },
          select: { id: true },
        }),
        this.prisma.card.findMany({
          where: { columnId: toColumnId },
          orderBy: { order: 'asc' },
          select: { id: true },
        }),
      ]);
      const fromList = fromCards.map((c) => c.id).filter((id) => id !== cardId);
      const toList = toCards.map((c) => c.id).filter((id) => id !== cardId);
      toList.splice(Math.min(dto.newOrder, toList.length), 0, cardId);

      await this.prisma.$transaction(async (tx) => {
        await this.bulkReorder(tx, fromColumnId, fromList);
        await this.bulkReorder(tx, toColumnId, toList);
      });
    }

    const logData: Prisma.InputJsonValue = {
      summary: `${userEmail} moved card ${full.title} to ${target.name}`,
      cardTitle: full.title,
      fromColumn: full.column.name,
      toColumn: target.name,
    };
    await this.activity.log(orgId, ActivityType.CARD_MOVED, logData, {
      userId,
      cardId,
    });

    this.boardGateway.emitCardEvent(boardId, {
      type: 'card:moved',
      cardId,
      orgId,
    });
    return this.getCardInOrg(cardId, orgId);
  }

  async delete(cardId: string, orgId: string) {
    const card = await this.getCardInOrg(cardId, orgId);
    const boardId = card.column.boardId;
    return this.prisma
      .$transaction(async (tx) => {
        const colId = card.columnId;
        await tx.card.delete({ where: { id: cardId } });
        const rest = await tx.card.findMany({
          where: { columnId: colId },
          orderBy: { order: 'asc' },
          select: { id: true },
        });
        await this.bulkReorder(
          tx,
          colId,
          rest.map((c) => c.id),
        );
      })
      .then(() => {
        this.boardGateway.emitCardEvent(boardId, {
          type: 'card:deleted',
          cardId,
          orgId,
        });
      });
  }
}
