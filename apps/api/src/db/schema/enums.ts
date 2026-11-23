import { pgEnum } from 'drizzle-orm/pg-core';
import { EXAM_TRACKS, SECTION_CODES, SUPPORT_LEVELS } from '@loopedu/shared';

export const examTrack = pgEnum('exam_track', EXAM_TRACKS);

export const authTokenPurpose = pgEnum('auth_token_purpose', [
  'magic_link',
  'refresh',
]);

export const userRole = pgEnum('user_role', ['learner', 'editor', 'admin']);

export const contentStatus = pgEnum('content_status', [
  'draft',
  'active',
  'retired',
]);

export const topicStatus = pgEnum('topic_status', [
  'draft',
  'published',
  'archived',
]);

export const topicOrigin = pgEnum('topic_origin', ['admin', 'on_demand']);

export const sectionCode = pgEnum('section_code', SECTION_CODES);

export const difficulty = pgEnum('difficulty', [
  'beginner',
  'intermediate',
  'advanced',
]);

export const questionSetStatus = pgEnum('question_set_status', [
  'draft',
  'pending_review',
  'published',
  'rejected',
]);

export const jobStatus = pgEnum('job_status', [
  'queued',
  'running',
  'succeeded',
  'failed',
]);

export const practiceStatus = pgEnum('practice_status', [
  'in_progress',
  'completed',
  'abandoned',
]);

// "Chưa nhớ / Nhớ một phần / Trả lời tương đối tốt" (PRD 6).
export const selfRating = pgEnum('self_rating', ['not_yet', 'partial', 'good']);

export const supportLevel = pgEnum('support_level', SUPPORT_LEVELS);

export const reviewKind = pgEnum('review_kind', ['scheduled', 'extra']);

export const topicRequestOutcome = pgEnum('topic_request_outcome', [
  'matched',
  'suggested',
  'generated',
  'failed',
  'blocked',
]);

export const uploadStatus = pgEnum('upload_status', [
  'pending',
  'uploaded',
  'failed',
]);

export const assessmentMode = pgEnum('assessment_mode', ['read_along', 'free']);

export const assessmentStatus = pgEnum('assessment_status', [
  'queued',
  'processing',
  'completed',
  'failed',
]);

export const creditEntryType = pgEnum('credit_entry_type', [
  'grant',
  'reserve',
  'commit',
  'release',
]);
