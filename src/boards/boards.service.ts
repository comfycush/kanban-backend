import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateBoardDto) {
    return this.prisma.board.create({
      data: { orgId, name: dto.name },
    });
  }

  listByOrg(orgId: string) {
    return this.prisma.board.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByIdForOrg(boardId: string, orgId: string) {
    const board = await this.prisma.board.findFirst({
      where: { id: boardId, orgId },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board;
  }

  async getWithDetails(boardId: string, orgId: string) {
    const board = await this.prisma.board.findFirst({
      where: { id: boardId, orgId },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            cards: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board;
  }

  async assertBoardInOrg(boardId: string, orgId: string) {
    return this.getByIdForOrg(boardId, orgId);
  }

  async update(boardId: string, orgId: string, dto: UpdateBoardDto) {
    await this.getByIdForOrg(boardId, orgId);
    if (!dto.name) {
      return this.prisma.board.findUniqueOrThrow({ where: { id: boardId } });
    }
    return this.prisma.board.update({
      where: { id: boardId },
      data: { name: dto.name },
    });
  }

  async delete(boardId: string, orgId: string) {
    await this.getByIdForOrg(boardId, orgId);
    return this.prisma.board.delete({ where: { id: boardId } });
  }

  async getOrgIdForBoard(boardId: string) {
    const b = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { orgId: true },
    });
    if (!b) {
      throw new NotFoundException('Board not found');
    }
    return b.orgId;
  }

  async ensureUserBoardAccess(userId: string, boardId: string) {
    const orgId = await this.getOrgIdForBoard(boardId);
    const m = await this.prisma.membership.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!m) {
      throw new ForbiddenException('Not a member of this organization');
    }
    return { orgId, membership: m };
  }
}
