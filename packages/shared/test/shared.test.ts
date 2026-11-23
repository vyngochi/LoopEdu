import { describe, expect, it } from 'vitest';
import { MagicLinkRequestSchema, SECTIONS_BY_TRACK, reviewDueDates } from './index';

describe('reviewDueDates (AC-REVIEW-01)', () => {
  it('creates D+3, D+7, D+21 within a month', () => {
    expect(reviewDueDates('2026-11-02')).toEqual(['2026-11-05', '2026-11-09', '2026-11-23']);
  });

  it('crosses the end of a year', () => {
    expect(reviewDueDates('2026-12-30')).toEqual(['2027-01-02', '2027-01-06', '2027-01-20']);
  });

  it('lands on and crosses a leap day', () => {
    expect(reviewDueDates('2028-02-26')).toEqual(['2028-02-29', '2028-03-04', '2028-03-18']);
  });

  it('rejects malformed or impossible dates', () => {
    expect(() => reviewDueDates('2026-2-1')).toThrow();
    expect(() => reviewDueDates('2026-02-30')).toThrow();
  });
});

describe('MagicLinkRequestSchema', () => {
  it('trims and lowercases the email', () => {
    expect(MagicLinkRequestSchema.parse({ email: '  Learner@Example.COM ' })).toEqual({
      email: 'learner@example.com',
    });
  });

  it('rejects an invalid email', () => {
    expect(MagicLinkRequestSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});

describe('SECTIONS_BY_TRACK', () => {
  it('keeps TOEIC Describe a picture out of the MVP', () => {
    expect(SECTIONS_BY_TRACK.toeic).toHaveLength(4);
  });
});
