// Learning: practice sessions, 3-7-21 reviews, and the speaking assessments that grade them.
// Reviews and assessments point at each other, so they live in one file.
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt } from './columns.js';
import {
  assessmentMode,
  assessmentStatus,
  practiceStatus,
  reviewKind,
  selfRating,
  supportLevel,
  uploadStatus,
} from './enums.js';
import { users } from './identity.js';
import { questionSetVersions } from './catalog.js';

export const practiceSessions = pgTable(
  'practice_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionSetVersionId: uuid('question_set_version_id')
      .notNull()
      .references(() => questionSetVersions.id),
    status: practiceStatus('status').notNull().default('in_progress'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    selfRating: selfRating('self_rating'),
    supportLevel: supportLevel('support_level').notNull().default('sample'),
    recorded: boolean('recorded').notNull().default(false),
  },
  (t) => [
    index('practice_sessions_user_completed_idx').on(t.userId, t.completedAt),
    index('practice_sessions_version_id_idx').on(t.questionSetVersionId),
    check(
      'practice_sessions_completed_fields',
      sql`${t.status} <> 'completed' or (${t.completedAt} is not null and ${t.selfRating} is not null)`,
    ),
  ],
);

export const learningItems = pgTable(
  'learning_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionSetVersionId: uuid('question_set_version_id')
      .notNull()
      .references(() => questionSetVersions.id),
    // Learner-local calendar day of the first completion; review dates count from it and never move.
    anchorLocalDate: date('anchor_local_date').notNull(),
    anchorTimezone: text('anchor_timezone').notNull(),
    firstSessionId: uuid('first_session_id')
      .notNull()
      .references(() => practiceSessions.id),
  },
  (t) => [
    unique('learning_items_user_version_unique').on(
      t.userId,
      t.questionSetVersionId,
    ),
    index('learning_items_first_session_id_idx').on(t.firstSessionId),
    index('learning_items_version_id_idx').on(t.questionSetVersionId),
  ],
);

export const reviewTasks = pgTable(
  'review_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learningItemId: uuid('learning_item_id')
      .notNull()
      .references(() => learningItems.id, { onDelete: 'cascade' }),
    kind: reviewKind('kind').notNull(),
    // 3, 7 or 21 for scheduled tasks; null for extra.
    milestoneDays: integer('milestone_days'),
    dueOn: date('due_on').notNull(),
    createdAt: createdAt(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    selfRating: selfRating('self_rating'),
    assessmentId: uuid('assessment_id').references(
      (): AnyPgColumn => speakingAssessments.id,
      {
        onDelete: 'set null',
      },
    ),
    supportLevel: supportLevel('support_level'),
    // D+3 {used_sample, fluency}; D+7/D+21 {covered_points, confidence}.
    surveyJson: jsonb('survey_json'),
    // Session or review task that produced this extra task (polymorphic, so no FK).
    sourceRef: uuid('source_ref'),
  },
  (t) => [
    unique('review_tasks_item_milestone_unique').on(
      t.learningItemId,
      t.milestoneDays,
    ),
    // At most one pending extra task per learning item.
    uniqueIndex('review_tasks_one_pending_extra')
      .on(t.learningItemId)
      .where(sql`${t.kind} = 'extra' and ${t.completedAt} is null`),
    index('review_tasks_item_due_idx').on(t.learningItemId, t.dueOn),
    index('review_tasks_extra_created_idx')
      .on(t.kind, t.createdAt)
      .where(sql`${t.kind} = 'extra'`),
    index('review_tasks_assessment_id_idx').on(t.assessmentId),
    check(
      'review_tasks_kind_milestone',
      sql`(${t.kind} = 'scheduled' and ${t.milestoneDays} in (3, 7, 21)) or (${t.kind} = 'extra' and ${t.milestoneDays} is null)`,
    ),
  ],
);

export const audioAssets = pgTable(
  'audio_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Key in object storage; the file itself is never in Postgres.
    objectKey: text('object_key').notNull().unique(),
    mime: text('mime').notNull(),
    // Filled when the upload is confirmed.
    sizeBytes: integer('size_bytes'),
    durationMs: integer('duration_ms'),
    uploadStatus: uploadStatus('upload_status').notNull().default('pending'),
    deleteAfter: timestamp('delete_after', { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '7 days'`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('audio_assets_user_id_idx').on(t.userId),
    // Cleanup job.
    index('audio_assets_delete_after_idx')
      .on(t.deleteAfter)
      .where(sql`${t.deletedAt} is null`),
    check(
      'audio_assets_size_positive',
      sql`${t.sizeBytes} is null or ${t.sizeBytes} > 0`,
    ),
    check(
      'audio_assets_duration_positive',
      sql`${t.durationMs} is null or ${t.durationMs} > 0`,
    ),
  ],
);

export const speakingAssessments = pgTable(
  'speaking_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    practiceSessionId: uuid('practice_session_id').references(
      () => practiceSessions.id,
      {
        onDelete: 'set null',
      },
    ),
    reviewTaskId: uuid('review_task_id').references(
      (): AnyPgColumn => reviewTasks.id,
      {
        onDelete: 'set null',
      },
    ),
    audioAssetId: uuid('audio_asset_id').references(() => audioAssets.id, {
      onDelete: 'set null',
    }),
    mode: assessmentMode('mode').notNull(),
    // Snapshot taken at job creation; removed together with the voice data.
    referenceText: text('reference_text'),
    status: assessmentStatus('status').notNull().default('queued'),
    idempotencyKey: text('idempotency_key').notNull(),
    providerVersions: jsonb('provider_versions'),
    rubricVersion: text('rubric_version'),
    attempts: integer('attempts').notNull().default(0),
    errorCode: text('error_code'),
    createdAt: createdAt(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    unique('speaking_assessments_user_key_unique').on(
      t.userId,
      t.idempotencyKey,
    ),
    // Job handler picks up work by status and age.
    index('speaking_assessments_status_created_idx').on(t.status, t.createdAt),
    index('speaking_assessments_practice_session_id_idx').on(
      t.practiceSessionId,
    ),
    index('speaking_assessments_review_task_id_idx').on(t.reviewTaskId),
    index('speaking_assessments_audio_asset_id_idx').on(t.audioAssetId),
    check('speaking_assessments_attempts_nonneg', sql`${t.attempts} >= 0`),
  ],
);

export const assessmentResults = pgTable('assessment_results', {
  assessmentId: uuid('assessment_id')
    .primaryKey()
    .references(() => speakingAssessments.id, { onDelete: 'cascade' }),
  transcriptJson: jsonb('transcript_json'),
  azureScoresJson: jsonb('azure_scores_json'),
  feedbackJson: jsonb('feedback_json'),
  flagsJson: jsonb('flags_json'),
});

export const feedbackReports = pgTable(
  'feedback_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => speakingAssessments.id, { onDelete: 'cascade' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    reviewerId: uuid('reviewer_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    verdict: text('verdict'),
    createdAt: createdAt(),
  },
  (t) => [
    index('feedback_reports_assessment_id_idx').on(t.assessmentId),
    index('feedback_reports_reporter_id_idx').on(t.reporterId),
  ],
);
