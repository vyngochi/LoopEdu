import { describe, expect, it } from 'vitest';
import { renderPlaceholders, CreateBlueprintRequestSchema, DEFAULT_BLUEPRINT_RULES, MagicLinkRequestSchema, SECTIONS_BY_TRACK, UpdateProfileRequestSchema, reviewDueDates } from '../src/index.js';

describe('UpdateProfileRequestSchema', () => {
  it('accepts IANA timezones and rejects made-up ones', () => {
    expect(UpdateProfileRequestSchema.safeParse({ timezone: 'Asia/Ho_Chi_Minh' }).success).toBe(true);
    expect(UpdateProfileRequestSchema.safeParse({ timezone: 'Mars/Olympus' }).success).toBe(false);
  });

  it('rejects unknown levels and non-integer years', () => {
    expect(UpdateProfileRequestSchema.safeParse({ level: 'expert' }).success).toBe(false);
    expect(UpdateProfileRequestSchema.safeParse({ birthYear: 2000.5 }).success).toBe(false);
  });
});

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

describe('CreateBlueprintRequestSchema', () => {
  it('accepts the default rules of both tracks', () => {
    for (const examType of ['ielts', 'toeic'] as const) {
      const r = CreateBlueprintRequestSchema.safeParse({ examType, rules: DEFAULT_BLUEPRINT_RULES[examType] });
      expect(r.success, examType).toBe(true);
    }
  });

  it('rejects rules for the wrong track and missing sections', () => {
    expect(CreateBlueprintRequestSchema.safeParse({ examType: 'toeic', rules: DEFAULT_BLUEPRINT_RULES.ielts }).success).toBe(false);
    const { ielts_p1 } = DEFAULT_BLUEPRINT_RULES.ielts.sections;
    expect(CreateBlueprintRequestSchema.safeParse({ examType: 'ielts', rules: { sections: { ielts_p1 } } }).success).toBe(false);
  });

  it('rejects a range whose min exceeds max', () => {
    const ielts = structuredClone(DEFAULT_BLUEPRINT_RULES.ielts);
    ielts.sections.ielts_p1!.speakSeconds = { min: 50, max: 40 };
    expect(CreateBlueprintRequestSchema.safeParse({ examType: 'ielts', rules: ielts }).success).toBe(false);
  });
});

describe('renderPlaceholders (AC-PRACTICE-02)', () => {
  it('fills defaults, falls back, and never leaves a raw placeholder', () => {
    expect(renderPlaceholders('I am {{name}} in {{city}}.', { name: 'Lan', city: 'Hue' })).toBe('I am Lan in Hue.');
    expect(renderPlaceholders('I am {{name}}.')).toBe('I am a learner.');
    expect(renderPlaceholders('A {{ mystery }} fan')).toBe('A fan');
    expect(renderPlaceholders('{{hobby}} and {{hobby}}')).toBe('reading and reading');
  });
});
