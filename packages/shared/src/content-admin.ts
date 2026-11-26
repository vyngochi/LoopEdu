import { z } from 'zod';
import { QuestionContentSchema } from './catalog.js';
import { ExamTrackSchema, LevelSchema, SECTIONS_BY_TRACK, SectionCodeSchema } from './exam.js';

// Editor/admin side of the catalog: topics and question set drafts (PRD tech 11.5, permission matrix 13).

export const TOPIC_STATUSES = ['draft', 'published', 'archived'] as const;
export const QUESTION_SET_STATUSES = ['draft', 'pending_review', 'published', 'rejected'] as const;

export const AdminTopicSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  status: z.enum(TOPIC_STATUSES),
  origin: z.enum(['admin', 'on_demand']),
  requestCount: z.int(),
  createdAt: z.string(),
});
export type AdminTopic = z.infer<typeof AdminTopicSchema>;

// Same format the database enforces on topics.slug.
export const CreateTopicRequestSchema = z.object({
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase words joined by single hyphens'),
  name: z.string().trim().min(1).max(120),
});
export type CreateTopicRequest = z.infer<typeof CreateTopicRequestSchema>;

// The slug is a stable URL key and never changes. Only an admin may change the status (publish/archive).
export const UpdateTopicRequestSchema = z
  .object({ name: z.string().trim().min(1).max(120), status: z.enum(TOPIC_STATUSES) })
  .partial()
  .refine((b) => Object.keys(b).length > 0, 'Send at least one field');
export type UpdateTopicRequest = z.infer<typeof UpdateTopicRequestSchema>;

export const CreateQuestionSetRequestSchema = z
  .object({
    topicId: z.uuid(),
    examType: ExamTrackSchema,
    sectionCode: SectionCodeSchema,
    // content.difficulty becomes the set's difficulty and cannot change afterwards.
    content: QuestionContentSchema,
  })
  .refine((b) => SECTIONS_BY_TRACK[b.examType].includes(b.sectionCode), {
    path: ['sectionCode'],
    message: 'Section does not belong to the exam type',
  });
export type CreateQuestionSetRequest = z.infer<typeof CreateQuestionSetRequestSchema>;

export const UpdateQuestionSetContentRequestSchema = z.object({ content: QuestionContentSchema });
export type UpdateQuestionSetContentRequest = z.infer<typeof UpdateQuestionSetContentRequestSchema>;

export const ListAdminQuestionSetsQuerySchema = z.object({
  status: z.enum(QUESTION_SET_STATUSES).optional(),
  exam: ExamTrackSchema.optional(),
  section: SectionCodeSchema.optional(),
  topic: z.string().max(80).optional(), // topic slug
});
export type ListAdminQuestionSetsQuery = z.infer<typeof ListAdminQuestionSetsQuerySchema>;

export const AdminQuestionSetSchema = z.object({
  id: z.uuid(),
  topic: z.object({ id: z.uuid(), slug: z.string(), name: z.string() }),
  examType: ExamTrackSchema,
  sectionCode: SectionCodeSchema,
  difficulty: LevelSchema,
  status: z.enum(QUESTION_SET_STATUSES),
  // The version learners get; null only for a set that never had one.
  currentVersionId: z.uuid().nullable(),
  latestVersionNo: z.int().positive(),
  // false while the latest version is still a draft (new work on a set learners already use).
  latestVersionPublished: z.boolean(),
});
export type AdminQuestionSet = z.infer<typeof AdminQuestionSetSchema>;

// Preview: the whole stored content, including sample answers, patterns and structure.
export const AdminQuestionSetDetailSchema = AdminQuestionSetSchema.extend({
  version: z.object({
    id: z.uuid(),
    versionNo: z.int().positive(),
    blueprintId: z.uuid(),
    contentHash: z.string(),
    publishedAt: z.string().nullable(),
    content: QuestionContentSchema,
  }),
});
export type AdminQuestionSetDetail = z.infer<typeof AdminQuestionSetDetailSchema>;

export const QuestionSetVersionQuerySchema = z.object({ versionNo: z.coerce.number().int().positive().optional() });
export type QuestionSetVersionQuery = z.infer<typeof QuestionSetVersionQuerySchema>;
