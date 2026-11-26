import { z } from 'zod';
import { ExamTrackSchema, LevelSchema, SectionCodeSchema } from './exam.js';

// Catalog: what a learner can pick (topics, question sets) and the content a set holds (PRD tech 11.3).

const Seconds = z.int().min(0).max(600);

const TimedQuestionSchema = z.object({
  text: z.string().min(1),
  prep_seconds: Seconds,
  response_seconds: Seconds,
});

/**
 * `question_set_versions.content_json` as stored (snake_case). Loose on purpose: sample answers,
 * patterns and structure are validated by the content pipeline (B12/B14) and never reach this projection.
 */
export const QuestionContentSchema = z.looseObject({
  topic: z.string().min(1),
  difficulty: LevelSchema,
  prompt: z.string().min(1).optional(),
  cue_points: z.array(z.string().min(1)).optional(),
  // IELTS Part 1 lists plain questions; TOEIC lists questions with their own timers.
  questions: z.array(z.union([z.string().min(1), TimedQuestionSchema])).optional(),
  // TOEIC read aloud / respond using information.
  passage: z.string().min(1).optional(),
  info_table: z.object({ title: z.string(), rows: z.array(z.array(z.string())) }).optional(),
  read_seconds: Seconds.optional(),
  prep_seconds: Seconds.optional(),
  speaking_seconds: Seconds.optional(),
  idea_hints: z.array(z.string()).optional(),
  useful_expressions: z.array(z.string()).optional(),
});
export type QuestionContent = z.infer<typeof QuestionContentSchema>;

/**
 * What the player receives. An explicit allow-list: no sample answer, patterns or structure here
 * (AC-DIAGRAM-02, AC-PRACTICE-02); those arrive with their own endpoints and rendering.
 */
export const LearnerQuestionContentSchema = z.object({
  prompt: z.string().optional(),
  cuePoints: z.array(z.string()).optional(),
  questions: z
    .array(
      z.union([
        z.string(),
        z.object({ text: z.string(), prepSeconds: Seconds, responseSeconds: Seconds }),
      ]),
    )
    .optional(),
  passage: z.string().optional(),
  infoTable: z.object({ title: z.string(), rows: z.array(z.array(z.string())) }).optional(),
  readSeconds: Seconds.optional(),
  prepSeconds: Seconds.optional(),
  speakingSeconds: Seconds.optional(),
  ideaHints: z.array(z.string()).optional(),
  usefulExpressions: z.array(z.string()).optional(),
});
export type LearnerQuestionContent = z.infer<typeof LearnerQuestionContentSchema>;

export const QuestionSetSummarySchema = z.object({
  id: z.uuid(),
  topic: z.object({ id: z.uuid(), slug: z.string(), name: z.string() }),
  examType: ExamTrackSchema,
  sectionCode: SectionCodeSchema,
  difficulty: LevelSchema,
  versionId: z.uuid(),
  versionNo: z.int().positive(),
  // pending_review: generated for this learner's own request and not yet approved.
  status: z.enum(['published', 'pending_review']),
});
export type QuestionSetSummary = z.infer<typeof QuestionSetSummarySchema>;

export const QuestionSetDetailSchema = QuestionSetSummarySchema.extend({
  content: LearnerQuestionContentSchema,
});
export type QuestionSetDetail = z.infer<typeof QuestionSetDetailSchema>;

export const ListQuestionSetsQuerySchema = z.object({
  exam: ExamTrackSchema.optional(),
  section: SectionCodeSchema.optional(),
  topic: z.string().max(80).optional(), // topic slug
});
export type ListQuestionSetsQuery = z.infer<typeof ListQuestionSetsQuerySchema>;

export const ListTopicsQuerySchema = z.object({ exam: ExamTrackSchema.optional() });
export type ListTopicsQuery = z.infer<typeof ListTopicsQuerySchema>;

export const TopicSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  sections: z.array(SectionCodeSchema),
});
export type Topic = z.infer<typeof TopicSchema>;
