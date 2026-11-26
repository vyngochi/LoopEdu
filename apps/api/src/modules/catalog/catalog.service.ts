import { Injectable } from '@nestjs/common';
import {
  QuestionContentSchema,
  type LearnerQuestionContent,
  type PlayerView,
  type SupportLevel,
  type QuestionContent,
  type ListQuestionSetsQuery,
  type QuestionSetDetail,
  type QuestionSetSummary,
  type Topic,
} from '@loopedu/shared';
import { ApiException } from '../../common/api-exception.js';
import { ContentAdminService } from '../content-admin/content-admin.service.js';
import { CatalogRepository } from './catalog.repository.js';
import { planTiming, renderSamples } from './player-view.js';

type Row = Awaited<ReturnType<CatalogRepository['list']>>[number];

const toSummary = (r: Row): QuestionSetSummary => ({
  id: r.id,
  topic: { id: r.topicId, slug: r.topicSlug, name: r.topicName },
  examType: r.examType,
  sectionCode: r.sectionCode,
  difficulty: r.difficulty,
  versionId: r.versionId,
  versionNo: r.versionNo,
  // The query only returns these two (see visible() in the repository).
  status: r.status as 'published' | 'pending_review',
});

/** Allow-list projection: sample answers, patterns and structure in content_json are never copied. */
function toLearnerContent(c: QuestionContent): LearnerQuestionContent {
  return {
    prompt: c.prompt,
    cuePoints: c.cue_points,
    questions: c.questions?.map((q) =>
      typeof q === 'string' ? q : { text: q.text, prepSeconds: q.prep_seconds, responseSeconds: q.response_seconds },
    ),
    passage: c.passage,
    infoTable: c.info_table,
    readSeconds: c.read_seconds,
    prepSeconds: c.prep_seconds,
    speakingSeconds: c.speaking_seconds,
    ideaHints: c.idea_hints,
    usefulExpressions: c.useful_expressions,
  };
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly repo: CatalogRepository,
    private readonly blueprints: ContentAdminService,
  ) {}

  /** Topics that have at least one set this learner can open, with the sections available. */
  async listTopics(userId: string, exam?: ListQuestionSetsQuery['exam']): Promise<Topic[]> {
    const byTopic = new Map<string, Topic>();
    for (const r of await this.repo.list(userId, { exam })) {
      const t = byTopic.get(r.topicId) ?? { id: r.topicId, slug: r.topicSlug, name: r.topicName, sections: [] };
      if (!t.sections.includes(r.sectionCode)) t.sections.push(r.sectionCode);
      byTopic.set(r.topicId, t);
    }
    return [...byTopic.values()];
  }

  async listQuestionSets(userId: string, q: ListQuestionSetsQuery): Promise<QuestionSetSummary[]> {
    return (await this.repo.list(userId, { exam: q.exam, section: q.section, topicSlug: q.topic })).map(toSummary);
  }

  /** The version a learner would study now: the current version of a set they may see, else NOT_FOUND. */
  async resolveStartableVersion(userId: string, setId: string): Promise<string> {
    const row = await this.repo.get(userId, setId);
    if (!row) throw new ApiException('NOT_FOUND', 'Question set not found');
    return row.versionId;
  }

  /** A pinned version for a session or review. No visibility check: the caller already proved ownership. */
  async getVersion(versionId: string) {
    const row = await this.repo.getVersion(versionId);
    if (!row) throw new ApiException('NOT_FOUND', 'Question set version not found');
    const raw = QuestionContentSchema.parse(row.contentJson);
    return {
      set: {
        id: row.id,
        topic: { id: row.topicId, slug: row.topicSlug, name: row.topicName },
        examType: row.examType,
        sectionCode: row.sectionCode,
        difficulty: row.difficulty,
        versionNo: row.versionNo,
      },
      content: toLearnerContent(raw),
      raw,
      blueprintId: row.blueprintId,
    };
  }

  /**
   * What the player gets for one pinned version: only the help the support level allows (AC-DIAGRAM-02),
   * the sample with placeholders filled in (AC-PRACTICE-02) and timers from the set or its blueprint.
   */
  async playerView(versionId: string, level: SupportLevel): Promise<PlayerView> {
    const v = await this.getVersion(versionId);
    const { ideaHints, usefulExpressions, ...content } = v.content;
    return {
      questionSet: v.set,
      content: level === 'none' ? content : { ...content, ideaHints, usefulExpressions },
      sampleAnswers: level === 'sample' ? renderSamples(v.raw) : null,
      timing: planTiming(v.set.sectionCode, v.raw, await this.blueprints.getBlueprintRules(v.blueprintId)),
    };
  }

  /** A draft or another learner's pending set looks the same as a missing one, so ids cannot be probed. */
  async getQuestionSet(userId: string, id: string): Promise<QuestionSetDetail> {
    const row = await this.repo.get(userId, id);
    if (!row) throw new ApiException('NOT_FOUND', 'Question set not found');
    return { ...toSummary(row), content: toLearnerContent(QuestionContentSchema.parse(row.contentJson)) };
  }
}
