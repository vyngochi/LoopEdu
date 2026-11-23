import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import {
  GoogleLoginRequestSchema,
  LoginRequestSchema,
  MagicLinkRequestSchema,
  SetPasswordRequestSchema,
  VerifyRequestSchema,
  type AuthSession,
  type GoogleLoginRequest,
  type LoginRequest,
  type MagicLinkRequest,
  type MagicLinkResponse,
  type MeResponse,
  type SetPasswordRequest,
  type VerifyRequest,
} from '@loopedu/shared';
import { ApiException } from '../../common/api-exception.js';
import { CurrentUser, type AuthUser } from '../../common/current-user.js';
import { OriginGuard } from '../../common/origin.guard.js';
import { Public } from '../../common/public.decorator.js';
import { AuthService, type Session } from './auth.service.js';

const REFRESH_COOKIE = 'refresh_token';
// Scoped to the auth routes so the refresh token is not sent with every API call.
const COOKIE_PATH = '/api/v1/auth';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function cookieOptions(): CookieOptions {
  const domain = process.env.COOKIE_DOMAIN;
  return {
    httpOnly: true,
    // Browsers accept Secure cookies on http://localhost, but Safari does not; skip it only locally.
    secure: process.env.APP_ENV !== 'local',
    sameSite: 'lax',
    path: COOKIE_PATH,
    ...(domain && domain !== 'localhost' ? { domain } : {}),
  };
}

function readRefreshCookie(req: Request): string {
  const match = req.headers.cookie?.match(new RegExp(`(?:^|;\\s*)${REFRESH_COOKIE}=([^;]+)`));
  if (!match) throw new ApiException('UNAUTHORIZED', 'No session');
  return decodeURIComponent(match[1]);
}

function startSession(res: Response, session: Session): AuthSession {
  res.cookie(REFRESH_COOKIE, session.refreshToken, { ...cookieOptions(), maxAge: THIRTY_DAYS_MS });
  return { accessToken: session.accessToken, expiresIn: session.expiresIn };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('magic-link')
  @HttpCode(200)
  async magicLink(
    @Body({ schema: MagicLinkRequestSchema }) body: MagicLinkRequest,
    @Req() req: Request,
  ): Promise<MagicLinkResponse> {
    await this.auth.requestMagicLink(body.email, req.ip ?? null);
    return { ok: true };
  }

  @Public()
  @Post('verify')
  @HttpCode(200)
  async verify(
    @Body({ schema: VerifyRequestSchema }) body: VerifyRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    return startSession(res, await this.auth.verify(body.token, req.ip ?? null));
  }

  // Brute-force guard per IP; the per-account lockout lives in AuthService.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body({ schema: LoginRequestSchema }) body: LoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    return startSession(res, await this.auth.login(body.email, body.password, req.ip ?? null));
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('google')
  @HttpCode(200)
  async google(
    @Body({ schema: GoogleLoginRequestSchema }) body: GoogleLoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    return startSession(res, await this.auth.loginWithGoogle(body.idToken, req.ip ?? null));
  }

  // The access token may have expired, so refresh and logout authenticate with the cookie.
  @Public()
  @UseGuards(OriginGuard)
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthSession> {
    return startSession(res, await this.auth.refresh(readRefreshCookie(req), req.ip ?? null));
  }

  @Public()
  @UseGuards(OriginGuard)
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const { maxAge: _ignored, ...options } = cookieOptions();
    res.clearCookie(REFRESH_COOKIE, options);
    await this.auth.logout(readRefreshCookie(req));
  }
}

@Controller('me')
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  me(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    return this.auth.me(user.id);
  }

  @UseGuards(ThrottlerGuard)
  @Post('password')
  @HttpCode(200)
  async setPassword(
    @CurrentUser() user: AuthUser,
    @Body({ schema: SetPasswordRequestSchema }) body: SetPasswordRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    return startSession(res, await this.auth.setPassword(user.id, body.password, body.currentPassword, req.ip ?? null));
  }
}
