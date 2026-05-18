import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { ReorderColumnsDto } from './dto/reorder-columns.dto';

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boards: BoardsService,
  ) {}

  private async getBoardInOrgOrThrow(boardId: string, orgId: string) {
    return this.boards.getByIdForOrg(boardId, orgId);
  }

  async create(boardId: string, orgId: string, dto: CreateColumnDto) {
    await this.getBoardInOrgOrThrow(boardId, orgId);
    const last = await this.prisma.column.aggregate({
      where: { boardId },
      _max: { order: true },
    });
    const next = (last._max.order ?? -1) + 1;
    return this.prisma.column.create({
      data: { boardId, name: dto.name, order: next },
    });
  }

  list(boardId: string, orgId: string) {
    return this.getBoardInOrgOrThrow(boardId, orgId).then(() =>
      this.prisma.column.findMany({
        where: { boardId },
        orderBy: { order: 'asc' },
        include: { _count: { select: { cards: true } } },
      }),
    );
  }

  async getByIdForBoard(columnId: string, boardId: string, orgId: string) {
    const col = await this.prisma.column.findFirst({
      where: { id: columnId, boardId, board: { orgId } },
    });
    if (!col) {
      throw new NotFoundException('Column not found');
    }
    return col;
  }

  async update(
    boardId: string,
    columnId: string,
    orgId: string,
    dto: { name?: string },
  ) {
    await this.getByIdForBoard(columnId, boardId, orgId);
    if (!dto.name) {
      return this.prisma.column.findUniqueOrThrow({ where: { id: columnId } });
    }
    return this.prisma.column.update({
      where: { id: columnId },
      data: { name: dto.name },
    });
  }

  async delete(boardId: string, columnId: string, orgId: string) {
    await this.getByIdForBoard(columnId, boardId, orgId);
    return this.prisma.$transaction(async (tx) => {
      await tx.column.delete({ where: { id: columnId } });
      const rest = await tx.column.findMany({
        where: { boardId },
        orderBy: { order: 'asc' },
      });
      for (let i = 0; i < rest.length; i++) {
        await tx.column.update({
          where: { id: rest[i].id },
          data: { order: i },
        });
      }
    });
  }

  async reorder(boardId: string, orgId: string, body: ReorderColumnsDto) {
    await this.getBoardInOrgOrThrow(boardId, orgId);

    const current = await this.prisma.column.findMany({
      where: { boardId },
      select: { id: true },
    });
    const currentIds = new Set(current.map((c) => c.id));
    if (body.columnIds.length !== currentIds.size) {
      throw new BadRequestException(
        'columnIds must list every column exactly once',
      );
    }
    for (const id of body.columnIds) {
      if (!currentIds.has(id)) {
        throw new BadRequestException('Invalid column id in list');
      }
    }

    /** Shift orders first so interim updates never violate @@unique([boardId, order]). */
    const ORDER_OFFSET = 1_000_000;

    return this.prisma.$transaction(async (tx) => {
      await tx.column.updateMany({
        where: { boardId },
        data: { order: { increment: ORDER_OFFSET } },
      });
      for (let i = 0; i < body.columnIds.length; i++) {
        await tx.column.update({
          where: { id: body.columnIds[i] },
          data: { order: i },
        });
      }
    });
  }
}
