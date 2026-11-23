import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@loopedu/shared';
import { ApiException } from './api-exception.js';
import type { AuthUser } from './current-user.js';
import { ROLES } from './roles.decorator.js';

/** Runs after JwtAuthGuard; routes without @Roles() are open to any signed-in user. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    if (!user?.roles.some((r) => required.includes(r))) throw new ApiException('FORBIDDEN', 'Not allowed');
    return true;
  }
}
