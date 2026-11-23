import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '../modules/auth/auth.service.js';
import { ApiException } from './api-exception.js';
import { IS_PUBLIC } from './public.decorator.js';

/** Global guard: every route needs a valid `Authorization: Bearer <JWT>` unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) {
      return true;
    }
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new ApiException('UNAUTHORIZED', 'Missing access token');
    req.user = await this.auth.authenticate(token);
    return true;
  }
}
