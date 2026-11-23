import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@loopedu/shared';
import { Public } from '../../common/public.decorator.js';

@Controller('health')
export class HealthController {
  @Public()
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
