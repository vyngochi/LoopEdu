import { z } from 'zod';

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
