import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  CreateBlueprintRequestSchema,
  CreateQuestionSetRequestSchema,
  CreateTopicRequestSchema,
  IdParamSchema,
  ListAdminQuestionSetsQuerySchema,
  ListBlueprintsQuerySchema,
  QuestionSetVersionQuerySchema,
  UpdateQuestionSetContentRequestSchema,
  UpdateTopicRequestSchema,
  type AdminQuestionSet,
  type AdminQuestionSetDetail,
  type AdminTopic,
  type Blueprint,
  type CreateBlueprintRequest,
  type CreateQuestionSetRequest,
  type CreateTopicRequest,
  type ListAdminQuestionSetsQuery,
  type ListBlueprintsQuery,
  type QuestionSetVersionQuery,
  type UpdateQuestionSetContentRequest,
  type UpdateTopicRequest,
} from '@loopedu/shared';
import { CurrentUser, type AuthUser } from '../../common/current-user.js';
import { Roles } from '../../common/roles.decorator.js';
import { ContentAdminService } from './content-admin.service.js';

const IdParam = (name = 'id') => Param(name, { schema: IdParamSchema });

// Editors work on topics and drafts; blueprints and publishing stay with admins (permission matrix, spec 13).
@Controller('admin')
export class ContentAdminController {
  constructor(private readonly content: ContentAdminService) {}

  // ---- blueprints ----

  @Roles('editor', 'admin')
  @Get('blueprints')
  listBlueprints(@Query({ schema: ListBlueprintsQuerySchema }) q: ListBlueprintsQuery): Promise<Blueprint[]> {
    return this.content.listBlueprints(q.examType);
  }

  @Roles('admin')
  @Post('blueprints')
  createBlueprint(
    @CurrentUser() user: AuthUser,
    @Body({ schema: CreateBlueprintRequestSchema }) body: CreateBlueprintRequest,
  ): Promise<Blueprint> {
    return this.content.createBlueprint(user.id, body);
  }

  @Roles('admin')
  @Post('blueprints/:id/activate')
  @HttpCode(200)
  activateBlueprint(@CurrentUser() user: AuthUser, @IdParam() id: string): Promise<Blueprint> {
    return this.content.activateBlueprint(user.id, id);
  }

  // ---- topics ----

  @Roles('editor', 'admin')
  @Get('topics')
  listTopics(): Promise<AdminTopic[]> {
    return this.content.listTopics();
  }

  @Roles('editor', 'admin')
  @Post('topics')
  createTopic(@Body({ schema: CreateTopicRequestSchema }) body: CreateTopicRequest): Promise<AdminTopic> {
    return this.content.createTopic(body);
  }

  @Roles('editor', 'admin')
  @Patch('topics/:id')
  updateTopic(
    @CurrentUser() user: AuthUser,
    @IdParam() id: string,
    @Body({ schema: UpdateTopicRequestSchema }) body: UpdateTopicRequest,
  ): Promise<AdminTopic> {
    return this.content.updateTopic(user, id, body);
  }

  // ---- question sets ----

  @Roles('editor', 'admin')
  @Get('question-sets')
  listQuestionSets(@Query({ schema: ListAdminQuestionSetsQuerySchema }) q: ListAdminQuestionSetsQuery): Promise<AdminQuestionSet[]> {
    return this.content.listQuestionSets(q);
  }

  @Roles('editor', 'admin')
  @Post('question-sets')
  createQuestionSet(@Body({ schema: CreateQuestionSetRequestSchema }) body: CreateQuestionSetRequest): Promise<AdminQuestionSetDetail> {
    return this.content.createQuestionSet(body);
  }

  @Roles('editor', 'admin')
  @Get('question-sets/:id')
  getQuestionSet(
    @IdParam() id: string,
    @Query({ schema: QuestionSetVersionQuerySchema }) q: QuestionSetVersionQuery,
  ): Promise<AdminQuestionSetDetail> {
    return this.content.getQuestionSet(id, q.versionNo);
  }

  @Roles('editor', 'admin')
  @Put('question-sets/:id/content')
  saveContent(
    @IdParam() id: string,
    @Body({ schema: UpdateQuestionSetContentRequestSchema }) body: UpdateQuestionSetContentRequest,
  ): Promise<AdminQuestionSetDetail> {
    return this.content.saveQuestionSetContent(id, body.content);
  }

  @Roles('editor', 'admin')
  @Delete('question-sets/:id')
  @HttpCode(204)
  deleteQuestionSet(@IdParam() id: string): Promise<void> {
    return this.content.deleteQuestionSet(id);
  }
}
