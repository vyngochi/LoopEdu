import { z } from 'zod';

// Exam tracks and sections (PRD section 4).

export const EXAM_TRACKS = ['ielts', 'toeic'] as const;
export const ExamTrackSchema = z.enum(EXAM_TRACKS);
export type ExamTrack = z.infer<typeof ExamTrackSchema>;

// Self-reported level at onboarding; same values as question set difficulty.
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const LevelSchema = z.enum(LEVELS);
export type Level = z.infer<typeof LevelSchema>;

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
