import { z } from 'zod';
import { LearnerQuestionContentSchema } from './catalog.js';
import { ExamTrackSchema, LevelSchema, SectionCodeSchema } from './exam.js';
import { SupportLevelSchema } from './learning.js';

// Practice sessions (B07): a learner starts a set at a support level and gets everything the player needs.

export const CreatePracticeSessionRequestSchema = z.object({
  questionSetId: z.uuid(),
  supportLevel: SupportLevelSchema.default('sample'),
});
export type CreatePracticeSessionRequest = z.infer<typeof CreatePracticeSessionRequestSchema>;

// "Chưa nhớ / Nhớ một phần / Trả lời tương đối tốt" (PRD 6); same values as the database enum.
export const SELF_RATINGS = ['not_yet', 'partial', 'good'] as const;
export const SelfRatingSchema = z.enum(SELF_RATINGS);
export type SelfRating = z.infer<typeof SelfRatingSchema>;

// The session id is the idempotency key: completing twice with the same rating returns the same session.
export const CompletePracticeSessionRequestSchema = z.object({ selfRating: SelfRatingSchema });
export type CompletePracticeSessionRequest = z.infer<typeof CompletePracticeSessionRequestSchema>;

const Seconds = z.int().min(0).max(600);

// One entry per question the learner answers; a set without a question list has one entry.
export const PlayerStepSchema = z.object({ prepSeconds: Seconds, speakSeconds: Seconds });
export type PlayerStep = z.infer<typeof PlayerStepSchema>;

// Everything the player needs for one version of a set; shared by practice sessions and review tasks.
export const PlayerViewSchema = z.object({
  questionSet: z.object({
    id: z.uuid(),
    topic: z.object({ id: z.uuid(), slug: z.string(), name: z.string() }),
    examType: ExamTrackSchema,
    sectionCode: SectionCodeSchema,
    difficulty: LevelSchema,
    versionNo: z.int().positive(),
  }),
  // Idea hints and useful expressions are left out at the "no support" level.
  content: LearnerQuestionContentSchema,
  // Only at the "sample" level, with placeholders already filled in. Otherwise null.
  sampleAnswers: z.array(z.string()).nullable(),
  timing: z.object({ readSeconds: Seconds, steps: z.array(PlayerStepSchema).min(1) }),
});
export type PlayerView = z.infer<typeof PlayerViewSchema>;

export const PracticeSessionSchema = PlayerViewSchema.extend({
  id: z.uuid(),
  status: z.enum(['in_progress', 'completed', 'abandoned']),
  supportLevel: SupportLevelSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  selfRating: SelfRatingSchema.nullable(),
});
export type PracticeSession = z.infer<typeof PracticeSessionSchema>;
