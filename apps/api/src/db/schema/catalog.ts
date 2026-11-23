// Catalog: blueprints, frameworks, topics, question sets, AI generation, topic requests.
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import { createdAt } from './columns.js';
import {
  contentStatus,
  difficulty,
  examTrack,
  jobStatus,
  questionSetStatus,
  sectionCode,
  topicOrigin,
  topicRequestOutcome,
  topicStatus,
} from './enums.js';
import { users } from './identity.js';

// Active rows are immutable (trigger); a change creates a new version.
export const examBlueprints = pgTable(
  'exam_blueprints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    examType: examTrack('exam_type').notNull(),
    version: integer('version').notNull(),
    status: contentStatus('status').notNull().default('draft'),
    rulesJson: jsonb('rules_json').notNull(),
    approvedBy: uuid('approved_by').references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique('exam_blueprints_type_version_unique').on(t.examType, t.version),
    uniqueIndex('exam_blueprints_one_active')
      .on(t.examType)
      .where(sql`${t.status} = 'active'`),
    check(
      'exam_blueprints_active_approved',
      sql`${t.status} <> 'active' or ${t.approvedBy} is not null`,
    ),
    check('exam_blueprints_version_positive', sql`${t.version} > 0`),
  ],
);

export const frameworks = pgTable(
  'frameworks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    version: integer('version').notNull(),
    partScope: text('part_scope').notNull(),
    nodeSchemaJson: jsonb('node_schema_json').notNull(),
    minNodes: integer('min_nodes').notNull(),
    maxNodes: integer('max_nodes').notNull(),
    status: contentStatus('status').notNull().default('draft'),
    approvedBy: uuid('approved_by').references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique('frameworks_key_version_unique').on(t.key, t.version),
    uniqueIndex('frameworks_one_active')
      .on(t.key)
      .where(sql`${t.status} = 'active'`),
    check(
      'frameworks_active_approved',
      sql`${t.status} <> 'active' or ${t.approvedBy} is not null`,
    ),
    check(
      'frameworks_node_range',
      sql`${t.minNodes} >= 1 and ${t.maxNodes} >= ${t.minNodes}`,
    ),
    check('frameworks_version_positive', sql`${t.version} > 0`),
  ],
);

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    status: topicStatus('status').notNull().default('draft'),
    origin: topicOrigin('origin').notNull().default('admin'),
    // 1536 dims (OpenAI embeddings); null until embedded. Cosine distance for semantic matching.
    embedding: vector('embedding', { dimensions: 1536 }),
    requestCount: integer('request_count').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index('topics_embedding_hnsw').using(
      'hnsw',
      t.embedding.op('vector_cosine_ops'),
    ),
    check('topics_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('topics_request_count_nonneg', sql`${t.requestCount} >= 0`),
  ],
);

export const questionSets = pgTable(
  'question_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id),
    examType: examTrack('exam_type').notNull(),
    sectionCode: sectionCode('section_code').notNull(),
    difficulty: difficulty('difficulty').notNull(),
    // Circular with question_set_versions; set once the first version exists.
    currentVersionId: uuid('current_version_id').references(
      (): AnyPgColumn => questionSetVersions.id,
    ),
    status: questionSetStatus('status').notNull().default('draft'),
    createdAt: createdAt(),
  },
  (t) => [
    index('question_sets_topic_id_idx').on(t.topicId),
    index('question_sets_catalog_idx').on(t.status, t.examType, t.sectionCode),
    index('question_sets_current_version_id_idx').on(t.currentVersionId),
    check(
      'question_sets_section_matches_exam',
      sql`(${t.examType} = 'ielts' and starts_with(${t.sectionCode}::text, 'ielts_')) or (${t.examType} = 'toeic' and starts_with(${t.sectionCode}::text, 'toeic_'))`,
    ),
    check(
      'question_sets_published_has_version',
      sql`${t.status} <> 'published' or ${t.currentVersionId} is not null`,
    ),
  ],
);

// Published versions are immutable (trigger); reviews keep pointing at the version that was studied.
export const questionSetVersions = pgTable(
  'question_set_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionSetId: uuid('question_set_id')
      .notNull()
      .references(() => questionSets.id),
    versionNo: integer('version_no').notNull(),
    blueprintId: uuid('blueprint_id')
      .notNull()
      .references(() => examBlueprints.id),
    contentJson: jsonb('content_json').notNull(),
    contentHash: text('content_hash').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique('question_set_versions_set_version_unique').on(
      t.questionSetId,
      t.versionNo,
    ),
    index('question_set_versions_blueprint_id_idx').on(t.blueprintId),
    check('question_set_versions_version_positive', sql`${t.versionNo} > 0`),
  ],
);

export const aiGenerationJobs = pgTable(
  'ai_generation_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestedBy: uuid('requested_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    // Never holds API keys.
    configJson: jsonb('config_json').notNull(),
    status: jobStatus('status').notNull().default('queued'),
    provider: text('provider'),
    model: text('model'),
    promptVersion: text('prompt_version'),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    costEstimate: numeric('cost_estimate', { precision: 12, scale: 6 }),
    error: text('error'),
    createdAt: createdAt(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('ai_generation_jobs_status_idx').on(t.status, t.createdAt),
    index('ai_generation_jobs_requested_by_idx').on(t.requestedBy),
  ],
);

export const validationReports = pgTable(
  'validation_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => questionSetVersions.id),
    ruleResult: jsonb('rule_result').notNull(),
    aiResult: jsonb('ai_result'),
    issuesJson: jsonb('issues_json')
      .notNull()
      .default(sql`'[]'::jsonb`),
    // Human reviewer metadata; null while only the automatic checks have run.
    reviewerId: uuid('reviewer_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    validatedAt: timestamp('validated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('validation_reports_version_id_idx').on(t.versionId)],
);

export const topicRequests = pgTable(
  'topic_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rawText: text('raw_text').notNull(),
    normalizedText: text('normalized_text').notNull(),
    partNo: integer('part_no'),
    matchedTopicId: uuid('matched_topic_id').references(() => topics.id, {
      onDelete: 'set null',
    }),
    similarity: real('similarity'),
    outcome: topicRequestOutcome('outcome').notNull(),
    questionSetId: uuid('question_set_id').references(() => questionSets.id, {
      onDelete: 'set null',
    }),
    jobId: uuid('job_id').references(() => aiGenerationJobs.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAt(),
  },
  (t) => [
    // Daily limit of generated requests per user.
    index('topic_requests_user_created_idx').on(t.userId, t.createdAt),
    index('topic_requests_normalized_text_idx').on(t.normalizedText),
    index('topic_requests_matched_topic_id_idx').on(t.matchedTopicId),
    check(
      'topic_requests_part_no_positive',
      sql`${t.partNo} is null or ${t.partNo} > 0`,
    ),
  ],
);
