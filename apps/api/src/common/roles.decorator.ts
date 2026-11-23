import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@loopedu/shared';

export const ROLES = 'roles';
/** Allows the route for users holding at least one of these roles. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);
