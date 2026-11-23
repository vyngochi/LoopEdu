// Analytics and admin audit trail.
import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt } from './columns.js';
import { users } from './identity.js';

// No transcripts or private content in properties_json (privacy rule).
export const productEvents = pgTable(
  'product_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    eventName: text('event_name').notNull(),
    propertiesJson: jsonb('properties_json')
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [
    index('product_events_name_created_idx').on(t.eventName, t.createdAt),
    index('product_events_user_id_idx').on(t.userId),
  ],
);

// Append-only (trigger).
export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id'),
    changesJson: jsonb('changes_json'),
    createdAt: createdAt(),
  },
  (t) => [
    index('admin_audit_logs_target_idx').on(t.targetType, t.targetId),
    index('admin_audit_logs_actor_idx').on(t.actorId, t.createdAt),
  ],
);
