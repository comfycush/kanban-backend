import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'org_roles';

/** Require membership in the org; user must have one of these roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const ORG_MEMBERS: Role[] = [Role.MEMBER, Role.ADMIN];
