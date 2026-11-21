// Drizzle schema = source of truth for the database (PRD tab Kỹ thuật, mục 11).
// Change it, then `pnpm --filter @loopedu/api db:generate` and review the SQL in drizzle/.
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { EXAM_TRACKS } from '@loopedu/shared';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const examTrack = pgEnum('exam_track', EXAM_TRACKS);
export const authTokenPurpose = pgEnum('auth_token_purpose', ['magic_link', 'refresh']);
export const userRole = pgEnum('user_role', ['learner', 'editor', 'admin']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: createdAt(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    // Account deletion is soft first; a scheduled job purges the data.
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [check('users_email_lowercase', sql`${t.email} = lower(${t.email})`)],
);

// Only hashes are stored. Magic link: 15 min, single use. Refresh: 30 days, rotated.
export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: authTokenPurpose('purpose').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdIp: text('created_ip'),
    createdAt: createdAt(),
  },
  (t) => [index('auth_tokens_user_id_idx').on(t.userId)],
);

export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Required once onboarding is done; null before that.
  timezone: text('timezone'),
  displayName: text('display_name'),
  level: text('level'),
  dailyGoalMinutes: integer('daily_goal_minutes'),
  examTrack: examTrack('exam_track'),
  // Personalisation of sample answers; all optional, keys from preset lists.
  preferredName: text('preferred_name'),
  cityKey: text('city_key'),
  occupationKey: text('occupation_key'),
  hobbyKeys: text('hobby_keys').array().notNull().default(sql`'{}'::text[]`),
  createdAt: createdAt(),
});

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRole('role').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] })],
);
