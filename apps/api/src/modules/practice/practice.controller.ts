import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  CreatePracticeSessionRequestSchema,
  IdParamSchema,
  type CreatePracticeSessionRequest,
  type PracticeSession,
} from '@loopedu/shared';
import { CurrentUser, type AuthUser } from '../../common/current-user.js';
import { PracticeService } from './practice.service.js';

@Controller('practice-sessions')
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}

  @Post()
  start(
    @CurrentUser() user: AuthUser,
    @Body({ schema: CreatePracticeSessionRequestSchema }) body: CreatePracticeSessionRequest,
  ): Promise<PracticeSession> {
    return this.practice.start(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', { schema: IdParamSchema }) id: string): Promise<PracticeSession> {
    return this.practice.get(user.id, id);
  }
}
