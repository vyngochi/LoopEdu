import { z } from 'zod';

// ---------- Exam tracks and sections (PRD section 4) ----------

export const EXAM_TRACKS = ['ielts', 'toeic'] as const;
export const ExamTrackSchema = z.enum(EXAM_TRACKS);
export type ExamTrack = z.infer<typeof ExamTrackSchema>;

export const SECTION_CODES = [
  'ielts_p1',
  'ielts_p2',
  'toeic_read_aloud',
  'toeic_respond',
  'toeic_respond_info',
  'toeic_opinion',
] as const;
export const SectionCodeSchema = z.enum(SECTION_CODES);
export type SectionCode = z.infer<typeof SectionCodeSchema>;

export const SECTIONS_BY_TRACK: Record<ExamTrack, readonly SectionCode[]> = {
  ielts: ['ielts_p1', 'ielts_p2'],
  toeic: ['toeic_read_aloud', 'toeic_respond', 'toeic_respond_info', 'toeic_opinion'],
};

// ---------- Practice and review ----------

export const SUPPORT_LEVELS = ['sample', 'diagram', 'none'] as const;
export const SupportLevelSchema = z.enum(SUPPORT_LEVELS);
export type SupportLevel = z.infer<typeof SupportLevelSchema>;

export const REVIEW_OFFSETS_DAYS = [3, 7, 21] as const;

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Due dates for the 3-7-21 review tasks, counted from the learner's local
 * anchor date (first completion, in the timezone stored at that time).
 * Pure calendar math on YYYY-MM-DD, so month/year/leap-day boundaries are exact.
 */
export function reviewDueDates(anchorLocalDate: string): string[] {
  if (!LOCAL_DATE.test(anchorLocalDate)) {
    throw new Error(`anchorLocalDate must be YYYY-MM-DD, got "${anchorLocalDate}"`);
  }
  const [y, m, d] = anchorLocalDate.split('-').map(Number);
  const anchor = Date.UTC(y, m - 1, d);
  if (new Date(anchor).getUTCDate() !== d) {
    throw new Error(`anchorLocalDate is not a real calendar date: "${anchorLocalDate}"`);
  }
  return REVIEW_OFFSETS_DAYS.map((days) =>
    new Date(anchor + days * 86_400_000).toISOString().slice(0, 10),
  );
}

// ---------- API contract ----------

export const ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'VALIDATION_FAILED',
  'CONFLICT',
  'NOT_FOUND',
  'CONSENT_REQUIRED',
  'QUOTA_EXCEEDED',
  'AI_UNAVAILABLE',
] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const MagicLinkRequestSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});
export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('loopedu-api'),
  env: z.string(),
  time: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
