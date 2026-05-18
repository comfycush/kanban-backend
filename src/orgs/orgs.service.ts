import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailOutbox } from '../email/email-outbox.service';

@Injectable()
export class OrgsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailOutbox: EmailOutbox,
  ) {}

  create(userId: string, dto: CreateOrgDto) {
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: dto.name },
      });
      await tx.membership.create({
        data: { userId, orgId: org.id, role: Role.ADMIN },
      });
      return tx.organization.findUniqueOrThrow({
        where: { id: org.id },
        include: {
          memberships: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
      });
    });
  }

  listForUser(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId },
      include: { org: true },
    });
  }

  getOrg(orgId: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });
  }

  listMembers(orgId: string) {
    return this.prisma.membership.findMany({
      where: { orgId },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(orgId: string, inviterId: string, dto: InviteUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new NotFoundException(
        'No user with this email. They must register first.',
      );
    }
    const existing = await this.prisma.membership.findUnique({
      where: { userId_orgId: { userId: user.id, orgId } },
    });
    if (existing) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }
    const org = await this.getOrg(orgId);
    const membership = await this.prisma.membership.create({
      data: {
        orgId,
        userId: user.id,
        role: dto.role ?? Role.MEMBER,
      },
      include: { user: { select: { id: true, email: true } } },
    });
    await this.notifications.create(user.id, NotificationType.INVITE, {
      orgId: org.id,
      orgName: org.name,
      inviterId,
    });
    void this.emailOutbox.enqueueEmail({
      kind: 'INVITE',
      toEmail: dto.email,
      orgName: org.name,
      orgId: org.id,
    });
    return membership;
  }

  async updateMemberRole(
    orgId: string,
    actingUserId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const actor = await this.prisma.membership.findUnique({
      where: { userId_orgId: { userId: actingUserId, orgId } },
    });
    if (!actor || actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only organization admins can update member roles',
      );
    }

    const member = await this.prisma.membership.findUnique({
      where: { userId_orgId: { userId: targetUserId, orgId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }
    if (member.role === Role.ADMIN && dto.role === Role.MEMBER) {
      const adminCount = await this.prisma.membership.count({
        where: { orgId, role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new ConflictException(
          'Cannot demote the last admin of the organization',
        );
      }
    }

    return this.prisma.membership.update({
      where: { userId_orgId: { userId: targetUserId, orgId } },
      data: { role: dto.role },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async removeMember(orgId: string, userId: string, _requestingUserId: string) {
    const member = await this.prisma.membership.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }
    if (member.role === Role.ADMIN) {
      const adminCount = await this.prisma.membership.count({
        where: { orgId, role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new ConflictException(
          'Cannot remove the last admin of the organization',
        );
      }
    }
    await this.prisma.membership.delete({
      where: { userId_orgId: { userId, orgId } },
    });
  }

  async deleteOrg(orgId: string) {
    await this.getOrg(orgId);
    await this.prisma.organization.delete({ where: { id: orgId } });
  }
}
