import { Injectable } from '@nestjs/common';
import {
  BlueprintRulesSchema,
  QuestionContentSchema,
  type AdminQuestionSet,
  type AdminQuestionSetDetail,
  type AdminTopic,
  type Blueprint,
  type CreateBlueprintRequest,
  type CreateQuestionSetRequest,
  type CreateTopicRequest,
  type ExamTrack,
  type ListAdminQuestionSetsQuery,
  type QuestionContent,
  type UpdateTopicRequest,
} from '@loopedu/shared';
import { ApiException } from '../../common/api-exception.js';
import type { AuthUser } from '../../common/current-user.js';
import { isUniqueViolation } from '../../common/pg-errors.js';
import { ContentAdminRepository, type BlueprintRow, type TopicRow } from './content-admin.repository.js';

const toBlueprint = (r: BlueprintRow): Blueprint => ({
  id: r.id,
  examType: r.examType,
  version: r.version,
  status: r.status,
  rules: BlueprintRulesSchema.parse(r.rulesJson),
  approvedBy: r.approvedBy,
  createdAt: r.createdAt.toISOString(),
});

const toTopic = (r: TopicRow): AdminTopic => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  status: r.status,
  origin: r.origin,
  requestCount: r.requestCount,
  createdAt: r.createdAt.toISOString(),
});

type SetRow = Awaited<ReturnType<ContentAdminRepository['listQuestionSets']>>[number];

const toAdminSet = (r: SetRow): AdminQuestionSet => ({
  id: r.id,
  topic: { id: r.topicId, slug: r.topicSlug, name: r.topicName },
  examType: r.examType,
  sectionCode: r.sectionCode,
  difficulty: r.difficulty,
  status: r.status,
  currentVersionId: r.currentVersionId,
  latestVersionNo: Number(r.latestVersionNo),
  latestVersionPublished: r.latestVersionPublished,
});

const NO_BLUEPRINT = 'No active blueprint for this exam type; activate one first';

@Injectable()
export class ContentAdminService {
  constructor(private readonly repo: ContentAdminRepository) {}

  async listBlueprints(examType?: ExamTrack): Promise<Blueprint[]> {
    return (await this.repo.list(examType)).map(toBlueprint);
  }

  async createBlueprint(actorId: string, req: CreateBlueprintRequest): Promise<Blueprint> {
    try {
      return toBlueprint(await this.repo.createDraft(actorId, req.examType, req.rules));
    } catch (e) {
      if (isUniqueViolation(e)) throw new ApiException('CONFLICT', 'Another blueprint version was created at the same time; retry');
      throw e;
    }
  }

  async activateBlueprint(actorId: string, id: string): Promise<Blueprint> {
    let row;
    try {
      row = await this.repo.activate(actorId, id);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ApiException('CONFLICT', 'Another blueprint was activated at the same time; retry');
      throw e;
    }
    if (!row) throw new ApiException('NOT_FOUND', 'Blueprint not found');
    if (row === 'not_draft') throw new ApiException('CONFLICT', 'A retired blueprint cannot be activated; create a new version');
    return toBlueprint(row);
  }

  // ---- topics ----

  async listTopics(): Promise<AdminTopic[]> {
    return (await this.repo.listTopics()).map(toTopic);
  }

  async createTopic(req: CreateTopicRequest): Promise<AdminTopic> {
    try {
      return toTopic(await this.repo.createTopic(req.slug, req.name));
    } catch (e) {
      if (isUniqueViolation(e)) throw new ApiException('CONFLICT', 'A topic with this slug already exists');
      throw e;
    }
  }

  /** Editors may rename; publishing or archiving a topic is an admin action (permission matrix). */
  async updateTopic(user: AuthUser, id: string, req: UpdateTopicRequest): Promise<AdminTopic> {
    if (req.status && !user.roles.includes('admin')) throw new ApiException('FORBIDDEN', 'Only an admin can change a topic status');
    const row = await this.repo.updateTopic(user.id, id, req);
    if (!row) throw new ApiException('NOT_FOUND', 'Topic not found');
    return toTopic(row);
  }

  // ---- question sets ----

  async listQuestionSets(q: ListAdminQuestionSetsQuery): Promise<AdminQuestionSet[]> {
    return (await this.repo.listQuestionSets({ status: q.status, exam: q.exam, section: q.section, topicSlug: q.topic })).map(toAdminSet);
  }

  /** Preview: everything stored for a version, sample answers and structure included. */
  async getQuestionSet(id: string, versionNo?: number): Promise<AdminQuestionSetDetail> {
    const row = await this.repo.getQuestionSet(id, versionNo);
    if (!row) throw new ApiException('NOT_FOUND', 'Question set or version not found');
    return {
      ...toAdminSet(row),
      version: {
        id: row.versionId,
        versionNo: row.versionNo,
        blueprintId: row.blueprintId,
        contentHash: row.contentHash,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        content: QuestionContentSchema.parse(row.contentJson),
      },
    };
  }

  async createQuestionSet(req: CreateQuestionSetRequest): Promise<AdminQuestionSetDetail> {
    const created = await this.repo.createQuestionSet(req.topicId, req.examType, req.sectionCode, req.content);
    if (created === 'no_topic') throw new ApiException('NOT_FOUND', 'Topic not found');
    if (created === 'no_blueprint') throw new ApiException('CONFLICT', NO_BLUEPRINT);
    return this.getQuestionSet(created.id);
  }

  async saveQuestionSetContent(id: string, content: QuestionContent): Promise<AdminQuestionSetDetail> {
    const result = await this.repo.saveQuestionSetContent(id, content);
    if (result === 'not_found') throw new ApiException('NOT_FOUND', 'Question set not found');
    if (result === 'rejected') throw new ApiException('CONFLICT', 'A rejected question set cannot be edited');
    if (result === 'no_blueprint') throw new ApiException('CONFLICT', NO_BLUEPRINT);
    if (result === 'difficulty') throw new ApiException('VALIDATION_FAILED', 'Difficulty cannot change after the set is created');
    return this.getQuestionSet(id);
  }

  async deleteQuestionSet(id: string): Promise<void> {
    const result = await this.repo.deleteDraftQuestionSet(id);
    if (result === 'not_found') throw new ApiException('NOT_FOUND', 'Question set not found');
    if (result === 'not_draft') throw new ApiException('CONFLICT', 'Only a set that was never published can be deleted');
  }
}
