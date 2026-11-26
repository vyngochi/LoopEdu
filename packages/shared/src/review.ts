import { z } from 'zod';
import { PlayerViewSchema, SelfRatingSchema } from './practice.js';
import { SupportLevelSchema } from './learning.js';

// Reviews (B10): the 3-7-21 tasks a learner has to do, and doing one.

const LocalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ListReviewsQuerySchema = z.object({
  // Only "due" exists for now: due today or overdue, in the learner's local date.
  status: z.enum(['due']).default('due'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListReviewsQuery = z.infer<typeof ListReviewsQuerySchema>;

export const ReviewTaskSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['scheduled', 'extra']),
  // 3, 7 or 21 for scheduled tasks; null for an extra one.
  milestoneDays: z.int().nullable(),
  dueOn: LocalDate,
  // 0 when due today; never negative here because only due tasks are listed.
  daysOverdue: z.int().min(0),
  questionSet: PlayerViewSchema.shape.questionSet,
});
export type ReviewTask = z.infer<typeof ReviewTaskSchema>;

export const ReviewListSchema = z.object({
  // The learner's local date used to decide what is due.
  today: LocalDate,
  total: z.int().min(0),
  items: z.array(ReviewTaskSchema),
});
export type ReviewList = z.infer<typeof ReviewListSchema>;

export const ReviewSessionQuerySchema = z.object({ supportLevel: SupportLevelSchema.default('none') });
export type ReviewSessionQuery = z.infer<typeof ReviewSessionQuerySchema>;

// The task id is the idempotency key: completing twice with the same rating returns the stored result.
export const CompleteReviewRequestSchema = z.object({
  selfRating: SelfRatingSchema,
  supportLevel: SupportLevelSchema,
});
export type CompleteReviewRequest = z.infer<typeof CompleteReviewRequestSchema>;

// A review task played from the version the learner studied (AC-REVIEW-03).
export const ReviewSessionSchema = PlayerViewSchema.extend({
  id: z.uuid(),
  kind: z.enum(['scheduled', 'extra']),
  milestoneDays: z.int().nullable(),
  dueOn: LocalDate,
  supportLevel: SupportLevelSchema,
  completedAt: z.string().nullable(),
  selfRating: SelfRatingSchema.nullable(),
});
export type ReviewSession = z.infer<typeof ReviewSessionSchema>;
