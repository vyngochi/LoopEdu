// Usage and privacy: AI cost events, consent records, credit ledger.
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt } from './columns.js';
import { creditEntryType } from './enums.js';
import { users } from './identity.js';
import { speakingAssessments } from './learning.js';

// Written only by the backend; the monthly budget kill switch sums cost_usd.
export const aiUsageEvents = pgTable(
  'ai_usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),
    operation: text('operation').notNull(),
    requestId: text('request_id'),
    refType: text('ref_type'),
    refId: uuid('ref_id'),
    audioSeconds: numeric('audio_seconds', { precision: 10, scale: 2 }),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    costUsd: numeric('cost_usd', { precision: 12, scale: 6 })
      .notNull()
      .default('0'),
    retryCount: integer('retry_count').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index('ai_usage_events_created_idx').on(t.createdAt),
    index('ai_usage_events_ref_idx').on(t.refType, t.refId),
    check('ai_usage_events_cost_nonneg', sql`${t.costUsd} >= 0`),
  ],
);

// Append-only (trigger). Each grant or withdrawal is its own row: exactly one of the two timestamps is set.
export const consentRecords = pgTable(
  'consent_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    consentType: text('consent_type').notNull(),
    policyVersion: text('policy_version').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    index('consent_records_user_type_idx').on(t.userId, t.consentType),
    check(
      'consent_records_one_event',
      sql`num_nonnulls(${t.grantedAt}, ${t.revokedAt}) = 1`,
    ),
  ],
);

// Append-only (trigger). Balance = SUM(amount) per user and period; request_key makes retries idempotent.
export const creditLedger = pgTable(
  'credit_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Billing month, 'YYYY-MM'.
    period: text('period').notNull(),
    entryType: creditEntryType('entry_type').notNull(),
    amount: integer('amount').notNull(),
    requestKey: text('request_key').notNull().unique(),
    assessmentId: uuid('assessment_id').references(
      () => speakingAssessments.id,
    ),
    createdAt: createdAt(),
  },
  (t) => [
    index('credit_ledger_user_period_idx').on(t.userId, t.period),
    index('credit_ledger_assessment_id_idx').on(t.assessmentId),
    check(
      'credit_ledger_period_format',
      sql`${t.period} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`,
    ),
  ],
);
