import { PrismaService } from '../../prisma/prisma.service';

/**
 * Resolves which organization a request refers to from route parameters.
 */
export async function resolveOrgIdFromParams(
  prisma: PrismaService,
  params: Record<string, string | undefined>,
): Promise<string | null> {
  if (params.orgId) {
    return params.orgId;
  }

  if (params.boardId) {
    const board = await prisma.board.findUnique({
      where: { id: params.boardId },
      select: { orgId: true },
    });
    return board?.orgId ?? null;
  }

  if (params.columnId) {
    const column = await prisma.column.findUnique({
      where: { id: params.columnId },
      include: { board: { select: { orgId: true } } },
    });
    return column?.board.orgId ?? null;
  }

  if (params.cardId) {
    const card = await prisma.card.findUnique({
      where: { id: params.cardId },
      include: {
        column: { include: { board: { select: { orgId: true } } } },
      },
    });
    return card?.column.board.orgId ?? null;
  }

  return null;
}
