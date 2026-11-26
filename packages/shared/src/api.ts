import { z } from 'zod';
import { ExamTrackSchema, LevelSchema } from './exam.js';

// API contract: error bodies and request/response shapes shared by web and api.

export const ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'VALIDATION_FAILED',
  'CONFLICT',
  'NOT_FOUND',
  'CONSENT_REQUIRED',
  'QUOTA_EXCEEDED',
  'AI_UNAVAILABLE',
  'AGE_NOT_ELIGIBLE',
] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const USER_ROLES = ['learner', 'editor', 'admin'] as const;
export const UserRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const MagicLinkRequestSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});
export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;

// Same body whether or not the email is known, so it cannot be probed.
export const MagicLinkResponseSchema = z.object({ ok: z.literal(true) });
export type MagicLinkResponse = z.infer<typeof MagicLinkResponseSchema>;

export const VerifyRequestSchema = z.object({ token: z.string().min(1).max(200) });
export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// The ID token ("credential") Google Identity Services hands to the browser; the API verifies it.
export const GoogleLoginRequestSchema = z.object({ idToken: z.string().min(1).max(4096) });
export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequestSchema>;

// Length only (NIST): no composition rules. The 128 cap bounds the hashing cost.
export const PASSWORD_MIN_LENGTH = 8;
export const SetPasswordRequestSchema = z.object({
  password: z.string().min(PASSWORD_MIN_LENGTH).max(128),
  // Required when a password is already set.
  currentPassword: z.string().max(128).optional(),
});
export type SetPasswordRequest = z.infer<typeof SetPasswordRequestSchema>;

// The refresh token travels only in an httpOnly cookie, never in the body.
export const AuthSessionSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const MeResponseSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  roles: z.array(UserRoleSchema),
  hasPassword: z.boolean(),
  profile: z.object({
    timezone: z.string().nullable(),
    displayName: z.string().nullable(),
    level: z.string().nullable(),
    dailyGoalMinutes: z.number().int().nullable(),
    examTrack: ExamTrackSchema.nullable(),
    birthYear: z.number().int().nullable(),
    guardianConsent: z.boolean(),
    preferredName: z.string().nullable(),
    cityKey: z.string().nullable(),
    occupationKey: z.string().nullable(),
    hobbyKeys: z.array(z.string()),
  }),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

// Age is counted by year (current year − birth year); the API rejects anyone under this.
export const MIN_AGE = 14;
export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20] as const;

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// PUT /me/profile: onboarding and Settings. Every field is optional; only the ones sent are changed.
export const UpdateProfileRequestSchema = z.object({
  birthYear: z.int().min(1900).max(2100).optional(),
  timezone: z.string().max(64).refine(isTimeZone, 'Unknown IANA timezone').optional(),
  examTrack: ExamTrackSchema.optional(),
  level: LevelSchema.optional(),
  dailyGoalMinutes: z.int().min(1).max(240).optional(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

/** Onboarding is done once the required profile fields are set (PRD F02). */
export const isOnboarded = (p: MeResponse['profile']) =>
  p.birthYear !== null && p.timezone !== null && p.examTrack !== null;

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('loopedu-api'),
  env: z.string(),
  time: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
