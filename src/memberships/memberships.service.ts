import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId },
      include: { org: true },
    });
  }

  async findForUserAndOrg(userId: string, orgId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_orgId: { userId, orgId } },
      include: { org: true },
    });
    if (!membership) {
      throw new NotFoundException(
        'No membership for this user in the given organization',
      );
    }
    return membership;
  }
}
