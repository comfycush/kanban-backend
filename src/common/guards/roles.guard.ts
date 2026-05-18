import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { resolveOrgIdFromParams } from '../utils/resolve-org-id.util';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const classRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (classRoles == null) {
      throw new ForbiddenException(
        'This route is protected with RolesGuard but is missing @Roles()',
      );
    }
    if (classRoles.length === 0) {
      throw new ForbiddenException('Invalid @Roles() configuration');
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: Express.User; membership?: unknown }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const orgId = await resolveOrgIdFromParams(
      this.prisma,
      (request.params ?? {}) as Record<string, string | undefined>,
    );
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_orgId: { userId: user.id, orgId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    if (!classRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    request.membership = membership;
    return true;
  }
}
