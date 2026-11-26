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

/**
 * The learner's calendar day (YYYY-MM-DD) at an instant, in their IANA timezone. This is the review
 * anchor: a completion at 23:30 UTC is already tomorrow in Asia/Ho_Chi_Minh.
 */
export function localDateIn(timezone: string, at: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const day = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((day(to) - day(from)) / 86_400_000);
}
