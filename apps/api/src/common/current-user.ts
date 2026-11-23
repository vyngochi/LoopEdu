import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@loopedu/shared';

export interface AuthUser {
  id: string;
  roles: UserRole[];
}

/** The acting user always comes from the token, never from the body or path. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
