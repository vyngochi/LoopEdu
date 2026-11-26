import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  CompletePracticeSessionRequestSchema,
  CreatePracticeSessionRequestSchema,
  IdParamSchema,
  type CompletePracticeSessionRequest,
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

  @Post(':id/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: IdParamSchema }) id: string,
    @Body({ schema: CompletePracticeSessionRequestSchema }) body: CompletePracticeSessionRequest,
  ): Promise<PracticeSession> {
    return this.practice.complete(user.id, id, body);
  }
}
