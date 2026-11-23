import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import type { ApiError, ErrorCode } from '@loopedu/shared';

const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'QUOTA_EXCEEDED',
};

/** Every HttpException leaves the API as an ApiError. Unknown errors stay Nest's default 500. */
@Catch(HttpException)
export class ApiExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const status = exception.getStatus();
    const body = exception.getResponse();
    let error: ApiError;
    if (typeof body === 'object' && 'code' in body && 'message' in body) {
      error = body as ApiError;
    } else {
      // Raised by Nest itself (e.g. the validation pipe, unknown route): map by status.
      const message = typeof body === 'object' && 'message' in body ? body.message : body;
      error = {
        code: CODE_BY_STATUS[status] ?? 'VALIDATION_FAILED',
        message: Array.isArray(message) ? message.join('; ') : String(message),
      };
    }
    host.switchToHttp().getResponse<Response>().status(status).json(error);
  }
}
