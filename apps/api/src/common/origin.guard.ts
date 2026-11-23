import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApiException } from './api-exception.js';

/** CSRF defence for the cookie-authenticated routes (refresh, logout): Origin must be a CORS origin. */
@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const origin = context.switchToHttp().getRequest<Request>().headers.origin;
    const allowed = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((o) => o.trim());
    if (!origin || !allowed.includes(origin)) throw new ApiException('FORBIDDEN', 'Origin not allowed');
    return true;
  }
}
