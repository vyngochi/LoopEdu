import { z } from 'zod';
import { ExamTrackSchema, SECTIONS_BY_TRACK, SectionCodeSchema, type ExamTrack } from './exam.js';

// Exam blueprint rules (PRD tech 12.1): the structure AI generation and the player must follow.
// One entry per section of the track; the timers are per question.

const Range = z
  .object({ min: z.int().min(1), max: z.int().min(1) })
  .refine((r) => r.min <= r.max, 'min must not exceed max');

export const SectionRuleSchema = z.object({
  questionCount: Range,
  // Seconds before recording starts. 0 = no preparation.
  prepSeconds: z.int().min(0).max(300),
  // Seconds to read the provided text/table before preparation (TOEIC Q8–10); 0 = none.
  readSeconds: z.int().min(0).max(300),
  speakSeconds: Range,
  // false when the text to read aloud is the sample itself (TOEIC read aloud).
  hasSampleAnswer: z.boolean(),
  // Azure scripted pronunciation against the reference text vs free speech.
  scoringMode: z.enum(['read_along', 'free']),
});
export type SectionRule = z.infer<typeof SectionRuleSchema>;

export const BlueprintRulesSchema = z.object({
  sections: z.partialRecord(SectionCodeSchema, SectionRuleSchema),
});
export type BlueprintRules = z.infer<typeof BlueprintRulesSchema>;

export const CreateBlueprintRequestSchema = z
  .object({ examType: ExamTrackSchema, rules: BlueprintRulesSchema })
  .superRefine((b, ctx) => {
    const expected = [...SECTIONS_BY_TRACK[b.examType]].sort();
    const actual = Object.keys(b.rules.sections).sort();
    if (expected.join() !== actual.join()) {
      ctx.addIssue({
        code: 'custom',
        path: ['rules', 'sections'],
        message: `${b.examType} needs exactly the sections: ${expected.join(', ')}`,
      });
    }
  });
export type CreateBlueprintRequest = z.infer<typeof CreateBlueprintRequestSchema>;

export const BlueprintSchema = z.object({
  id: z.uuid(),
  examType: ExamTrackSchema,
  version: z.int().positive(),
  status: z.enum(['draft', 'active', 'retired']),
  rules: BlueprintRulesSchema,
  approvedBy: z.uuid().nullable(),
  createdAt: z.string(),
});
export type Blueprint = z.infer<typeof BlueprintSchema>;

export const ListBlueprintsQuerySchema = z.object({ examType: ExamTrackSchema.optional() });
export type ListBlueprintsQuery = z.infer<typeof ListBlueprintsQuerySchema>;

const rule = (r: SectionRule): SectionRule => r;

// Starting point for version 1 (PRD section 4). TOEIC follows our current reading of ETS and must be
// checked against the official ETS material before an admin activates it (PRD risk table).
export const DEFAULT_BLUEPRINT_RULES: Record<ExamTrack, BlueprintRules> = {
  ielts: {
    sections: {
      // Part 1: up to 3 questions of 40 s each, no preparation.
      ielts_p1: rule({
        questionCount: { min: 1, max: 3 },
        prepSeconds: 0,
        readSeconds: 0,
        speakSeconds: { min: 10, max: 40 },
        hasSampleAnswer: true,
        scoringMode: 'free',
      }),
      // Part 2: 1 minute to prepare, up to 2 minutes to speak.
      ielts_p2: rule({
        questionCount: { min: 1, max: 1 },
        prepSeconds: 60,
        readSeconds: 0,
        speakSeconds: { min: 60, max: 120 },
        hasSampleAnswer: true,
        scoringMode: 'free',
      }),
    },
  },
  toeic: {
    sections: {
      // Q1–2: read a text aloud, 45 s to prepare and 45 s to read.
      toeic_read_aloud: rule({
        questionCount: { min: 1, max: 2 },
        prepSeconds: 45,
        readSeconds: 0,
        speakSeconds: { min: 20, max: 45 },
        hasSampleAnswer: false,
        scoringMode: 'read_along',
      }),
      // Q5–7: respond to questions, 3 s to prepare and 15–30 s to speak.
      toeic_respond: rule({
        questionCount: { min: 1, max: 3 },
        prepSeconds: 3,
        readSeconds: 0,
        speakSeconds: { min: 15, max: 30 },
        hasSampleAnswer: true,
        scoringMode: 'free',
      }),
      // Q8–10: respond using the information provided, 45 s to read it first.
      toeic_respond_info: rule({
        questionCount: { min: 1, max: 3 },
        prepSeconds: 3,
        readSeconds: 45,
        speakSeconds: { min: 15, max: 30 },
        hasSampleAnswer: true,
        scoringMode: 'free',
      }),
      // Q11: express an opinion, 45 s to prepare and 60 s to speak.
      toeic_opinion: rule({
        questionCount: { min: 1, max: 1 },
        prepSeconds: 45,
        readSeconds: 0,
        speakSeconds: { min: 30, max: 60 },
        hasSampleAnswer: true,
        scoringMode: 'free',
      }),
    },
  },
};

export const IdParamSchema = z.uuid();
