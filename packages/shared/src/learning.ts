import { z } from 'zod';

// Practice support levels and the 3-7-21 review schedule.

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
