import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, count, eq, gt, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { UpdateProfileRequest, UserRole } from '@loopedu/shared';
import type { Database } from '../../db/database.js';
import { authTokens, profiles, userRoles, users } from '../../db/schema/index.js';

type Purpose = 'magic_link' | 'refresh';

@Injectable()
export class AuthRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Finds the user by email, creating it with a learner role and an empty profile on first sight. */
  async upsertLearner(email: string) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(users).values({ email }).onConflictDoNothing().returning();
      if (created) {
        await tx.insert(profiles).values({ userId: created.id });
        await tx.insert(userRoles).values({ userId: created.id, role: 'learner' });
        return created;
      }
      const [existing] = await tx.select().from(users).where(eq(users.email, email));
      return existing;
    });
  }

  /** Magic links issued in the last hour to this user (i.e. this email) and from this IP. */
  async countRecentMagicLinks(userId: string, ip: string | null, since: Date) {
    const recent = and(eq(authTokens.purpose, 'magic_link'), gt(authTokens.createdAt, since));
    const [[byUser], [byIp]] = await Promise.all([
      this.db.select({ n: count() }).from(authTokens).where(and(recent, eq(authTokens.userId, userId))),
      ip
        ? this.db.select({ n: count() }).from(authTokens).where(and(recent, eq(authTokens.createdIp, ip)))
        : Promise.resolve([{ n: 0 }]),
    ]);
    return { byUser: byUser.n, byIp: byIp.n };
  }

  async insertToken(t: {
    userId: string;
    purpose: Purpose;
    tokenHash: string;
    expiresAt: Date;
    createdIp: string | null;
  }) {
    await this.db.insert(authTokens).values(t);
  }

  /** Marks a live token used and returns its user. One atomic UPDATE, so a token works exactly once. */
  async consumeToken(tokenHash: string, purpose: Purpose): Promise<string | null> {
    const [row] = await this.db
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(authTokens.tokenHash, tokenHash),
          eq(authTokens.purpose, purpose),
          isNull(authTokens.usedAt),
          isNull(authTokens.revokedAt),
          gt(authTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: authTokens.userId });
    return row?.userId ?? null;
  }

  /** For reuse detection: a refresh token that was already rotated out. */
  async findUsedToken(tokenHash: string, purpose: Purpose): Promise<string | null> {
    const [row] = await this.db
      .select({ userId: authTokens.userId })
      .from(authTokens)
      .where(
        and(
          eq(authTokens.tokenHash, tokenHash),
          eq(authTokens.purpose, purpose),
          isNotNull(authTokens.usedAt),
          isNull(authTokens.revokedAt),
        ),
      );
    return row?.userId ?? null;
  }

  /** Revokes one refresh token, or all of a user's when only the user is given. */
  async revokeRefresh(by: { tokenHash: string } | { userId: string }) {
    await this.db
      .update(authTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(authTokens.purpose, 'refresh'),
          isNull(authTokens.revokedAt),
          'tokenHash' in by ? eq(authTokens.tokenHash, by.tokenHash) : eq(authTokens.userId, by.userId),
        ),
      );
  }

  /** Records a successful sign-in (either way) and clears any password lockout. */
  async markLogin(userId: string) {
    await this.db
      .update(users)
      .set({
        emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
        lastLoginAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, userId));
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        lockedUntil: users.lockedUntil,
      })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)));
    return user ?? null;
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const [row] = await this.db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId));
    return row?.hash ?? null;
  }

  async setPassword(userId: string, passwordHash: string) {
    await this.db.update(users).set({ passwordHash, failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, userId));
  }

  /** Counts a wrong password in one UPDATE; the 5th failure locks the account and restarts the count. */
  async recordPasswordFailure(userId: string, maxFailures: number, lockUntil: Date) {
    await this.db
      .update(users)
      .set({
        failedLoginCount: sql`case when ${users.failedLoginCount} + 1 >= ${maxFailures} then 0 else ${users.failedLoginCount} + 1 end`,
        lockedUntil: sql`case when ${users.failedLoginCount} + 1 >= ${maxFailures} then ${lockUntil.toISOString()}::timestamptz else ${users.lockedUntil} end`,
      })
      .where(eq(users.id, userId));
  }

  /** The signed-in identity, or null when the account is gone. Roles are read live so changes apply at once. */
  async findAuthUser(userId: string) {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));
    if (!user) return null;
    const rows = await this.db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId));
    return { id: user.id, roles: rows.map((r) => r.role) as UserRole[] };
  }

  /**
   * Updates only the given fields. Birth year is write-once: the condition sits in the WHERE clause, so a
   * different year never overwrites a stored one. Returns false when nothing matched.
   */
  async updateProfile(userId: string, patch: UpdateProfileRequest): Promise<boolean> {
    const rows = await this.db
      .update(profiles)
      .set(patch)
      .where(
        and(
          eq(profiles.userId, userId),
          patch.birthYear === undefined
            ? undefined
            : or(isNull(profiles.birthYear), eq(profiles.birthYear, patch.birthYear)),
        ),
      )
      .returning({ userId: profiles.userId });
    return rows.length > 0;
  }

  async findMe(userId: string) {
    const [row] = await this.db
      .select({
        id: users.id,
        email: users.email,
        hasPassword: sql<boolean>`${users.passwordHash} is not null`,
        profile: profiles,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));
    return row ?? null;
  }
}
