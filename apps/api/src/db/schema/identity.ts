// Identity: accounts, sign-in tokens, profiles, roles.
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt } from './columns.js';
import { authTokenPurpose, examTrack, userRole } from './enums.js';

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

export const profiles = pgTable(
  'profiles',
  {
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
    hobbyKeys: text('hobby_keys')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    // Required after onboarding. The age rule (>= 14, by year) is checked in the API: it depends on today.
    birthYear: integer('birth_year'),
    // Set by an admin for learners aged 14-15 (also written to admin_audit_logs).
    guardianConsentAt: timestamp('guardian_consent_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      'profiles_birth_year_range',
      sql`${t.birthYear} between 1900 and 2100`,
    ),
    check('profiles_daily_goal_positive', sql`${t.dailyGoalMinutes} > 0`),
  ],
);

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
