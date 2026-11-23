import { HttpException } from '@nestjs/common';
import type { ErrorCode } from '@loopedu/shared';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONSENT_REQUIRED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  QUOTA_EXCEEDED: 429,
  AI_UNAVAILABLE: 503,
};

/** Services throw this; ApiExceptionFilter turns it into the `{ code, message }` body. */
export class ApiException extends HttpException {
  constructor(code: ErrorCode, message: string) {
    super({ code, message }, STATUS_BY_CODE[code]);
  }
}
