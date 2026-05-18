import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

type AuthUser = Pick<User, 'id' | 'email' | 'fullName' | 'createdAt'>;

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
