import { createHash, randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword } from './password.js';
import { Injectable, Logger } from '@nestjs/common';
import { MIN_AGE, type MeResponse, type UpdateProfileRequest } from '@loopedu/shared';
import { ApiException } from '../../common/api-exception.js';
import type { AuthUser } from '../../common/current-user.js';
import { ACCESS_TOKEN_TTL_SECONDS, AccessTokenService } from './access-token.service.js';
import { AuthMailer } from './auth.mailer.js';
import { AuthRepository } from './auth.repository.js';
import { GoogleIdTokenVerifier } from './google-id-token.verifier.js';

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_LINKS_PER_EMAIL = 5;
const MAX_LINKS_PER_IP = 20;
const MAX_PASSWORD_FAILURES = 5;
const PASSWORD_LOCK_MS = 15 * 60 * 1000;
const lockUntil = () => new Date(Date.now() + PASSWORD_LOCK_MS);

export interface Session {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

const newToken = () => randomBytes(32).toString('base64url');
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private decoy?: Promise<string>;

  constructor(
    private readonly repo: AuthRepository,
    private readonly accessTokens: AccessTokenService,
    private readonly mailer: AuthMailer,
    private readonly google: GoogleIdTokenVerifier,
  ) {}

  /**
   * Sends a sign-in link. Unknown emails get one too (accounts are created on first sign-in), and a
   * mail failure is only logged, so the caller sees the same result in every case.
   */
  async requestMagicLink(email: string, ip: string | null): Promise<void> {
    const user = await this.repo.upsertLearner(email);
    if (user.deletedAt) return;

    // shortcut: count-then-insert is not atomic, so a burst can slip a few extra links; fine for abuse control.
    const recent = await this.repo.countRecentMagicLinks(user.id, ip, new Date(Date.now() - RATE_WINDOW_MS));
    if (recent.byUser >= MAX_LINKS_PER_EMAIL || recent.byIp >= MAX_LINKS_PER_IP) {
      throw new ApiException('QUOTA_EXCEEDED', 'Too many sign-in requests, try again later');
    }

    const token = newToken();
    await this.repo.insertToken({
      userId: user.id,
      purpose: 'magic_link',
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
      createdIp: ip,
    });
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    try {
      await this.mailer.sendMagicLink(email, `${appUrl}/auth/verify?token=${token}`);
    } catch (err) {
      this.logger.error(`Sending the sign-in email failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  async verify(token: string, ip: string | null): Promise<Session> {
    const userId = await this.repo.consumeToken(hash(token), 'magic_link');
    if (!userId || !(await this.repo.findAuthUser(userId))) {
      throw new ApiException('UNAUTHORIZED', 'The sign-in link is invalid or has expired');
    }
    await this.repo.markLogin(userId);
    return this.issueSession(userId, ip);
  }

  /**
   * Google sign-in and sign-up in one: a verified Google email proves the address like a magic link does,
   * so it signs in the account with that email, creating it on first use.
   * shortcut: accounts are matched by email, not by Google `sub`; add a sub column if Google emails can change hands.
   */
  async loginWithGoogle(idToken: string, ip: string | null): Promise<Session> {
    const identity = await this.google.verify(idToken);
    if (!identity?.emailVerified) throw new ApiException('UNAUTHORIZED', 'Google sign-in failed');
    const user = await this.repo.upsertLearner(identity.email);
    if (user.deletedAt) throw new ApiException('UNAUTHORIZED', 'Google sign-in failed');
    await this.repo.markLogin(user.id);
    return this.issueSession(user.id, ip);
  }

  /** Email + password sign-in. Every failure looks the same: wrong password, no such email, no password set, locked. */
  async login(email: string, password: string, ip: string | null): Promise<Session> {
    const user = await this.repo.findByEmail(email);
    const stored = user?.passwordHash ?? null;
    const locked = !!user?.lockedUntil && user.lockedUntil > new Date();
    // Always hash once, so response time does not reveal whether the email has a password.
    const matches = await verifyPassword(password, stored ?? (await this.decoyHash()));
    if (!user || !stored || locked || !matches) {
      if (user && stored && !locked) await this.repo.recordPasswordFailure(user.id, MAX_PASSWORD_FAILURES, lockUntil());
      throw new ApiException('UNAUTHORIZED', 'Incorrect email or password');
    }
    await this.repo.markLogin(user.id);
    return this.issueSession(user.id, ip);
  }

  /**
   * Sets or changes the password of the signed-in user. Changing needs the current one. All other
   * sessions are signed out and a fresh one is returned for this device.
   */
  async setPassword(userId: string, password: string, currentPassword: string | undefined, ip: string | null): Promise<Session> {
    const stored = await this.repo.getPasswordHash(userId);
    if (stored && !(currentPassword && (await verifyPassword(currentPassword, stored)))) {
      await this.repo.recordPasswordFailure(userId, MAX_PASSWORD_FAILURES, lockUntil());
      throw new ApiException('FORBIDDEN', 'Current password is incorrect');
    }
    await this.repo.setPassword(userId, await hashPassword(password));
    await this.repo.revokeRefresh({ userId });
    return this.issueSession(userId, ip);
  }

  private decoyHash(): Promise<string> {
    return (this.decoy ??= hashPassword(randomBytes(16).toString('hex')));
  }

  /** Rotates the refresh token. Presenting one that was already rotated means it leaked: revoke them all. */
  async refresh(refreshToken: string, ip: string | null): Promise<Session> {
    const tokenHash = hash(refreshToken);
    const userId = await this.repo.consumeToken(tokenHash, 'refresh');
    if (!userId || !(await this.repo.findAuthUser(userId))) {
      const reusedBy = await this.repo.findUsedToken(tokenHash, 'refresh');
      if (reusedBy) await this.repo.revokeRefresh({ userId: reusedBy });
      throw new ApiException('UNAUTHORIZED', 'The session has expired, sign in again');
    }
    return this.issueSession(userId, ip);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.repo.revokeRefresh({ tokenHash: hash(refreshToken) });
  }

  /** Checks the access JWT, then reads the user's roles from `user_roles`. */
  async authenticate(accessToken: string): Promise<AuthUser> {
    const userId = await this.accessTokens.verify(accessToken);
    const user = userId ? await this.repo.findAuthUser(userId) : null;
    if (!user) throw new ApiException('UNAUTHORIZED', 'Invalid or expired access token');
    return user;
  }

  async me(userId: string): Promise<MeResponse> {
    const [row, user] = await Promise.all([this.repo.findMe(userId), this.repo.findAuthUser(userId)]);
    if (!row || !user) throw new ApiException('NOT_FOUND', 'User not found');
    const { profile: p } = row;
    return {
      id: row.id,
      email: row.email,
      roles: user.roles,
      hasPassword: row.hasPassword,
      profile: {
        timezone: p.timezone,
        displayName: p.displayName,
        level: p.level,
        dailyGoalMinutes: p.dailyGoalMinutes,
        examTrack: p.examTrack,
        birthYear: p.birthYear,
        guardianConsent: p.guardianConsentAt !== null,
        preferredName: p.preferredName,
        cityKey: p.cityKey,
        occupationKey: p.occupationKey,
        hobbyKeys: p.hobbyKeys,
      },
    };
  }

  /**
   * Onboarding and Settings. Under-14s are refused (age by year, PRD 7.7) and nothing is saved.
   * Birth year cannot be changed once set, so a 14-15 learner cannot step around guardian consent.
   */
  async updateProfile(userId: string, patch: UpdateProfileRequest): Promise<MeResponse> {
    if (patch.birthYear !== undefined && new Date().getUTCFullYear() - patch.birthYear < MIN_AGE) {
      throw new ApiException('AGE_NOT_ELIGIBLE', `LoopEdu is for learners aged ${MIN_AGE} and over`);
    }
    if (Object.keys(patch).length > 0 && !(await this.repo.updateProfile(userId, patch))) {
      throw new ApiException('CONFLICT', 'Birth year is already set');
    }
    return this.me(userId);
  }

  private async issueSession(userId: string, ip: string | null): Promise<Session> {
    const refreshToken = newToken();
    await this.repo.insertToken({
      userId,
      purpose: 'refresh',
      tokenHash: hash(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      createdIp: ip,
    });
    return { accessToken: await this.accessTokens.sign(userId), expiresIn: ACCESS_TOKEN_TTL_SECONDS, refreshToken };
  }
}
