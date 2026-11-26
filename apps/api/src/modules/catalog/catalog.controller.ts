import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  IdParamSchema,
  ListQuestionSetsQuerySchema,
  ListTopicsQuerySchema,
  type ListQuestionSetsQuery,
  type ListTopicsQuery,
  type QuestionSetDetail,
  type QuestionSetSummary,
  type Topic,
} from '@loopedu/shared';
import { CurrentUser, type AuthUser } from '../../common/current-user.js';
import { CatalogService } from './catalog.service.js';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('topics')
  topics(@CurrentUser() user: AuthUser, @Query({ schema: ListTopicsQuerySchema }) q: ListTopicsQuery): Promise<Topic[]> {
    return this.catalog.listTopics(user.id, q.exam);
  }

  @Get('question-sets')
  questionSets(
    @CurrentUser() user: AuthUser,
    @Query({ schema: ListQuestionSetsQuerySchema }) q: ListQuestionSetsQuery,
  ): Promise<QuestionSetSummary[]> {
    return this.catalog.listQuestionSets(user.id, q);
  }

  @Get('question-sets/:id')
  questionSet(@CurrentUser() user: AuthUser, @Param('id', { schema: IdParamSchema }) id: string): Promise<QuestionSetDetail> {
    return this.catalog.getQuestionSet(user.id, id);
  }
}
