import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@loopedu/shared';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'loopedu-api',
      env: process.env.APP_ENV ?? 'local',
      time: new Date().toISOString(),
    };
  }
}
