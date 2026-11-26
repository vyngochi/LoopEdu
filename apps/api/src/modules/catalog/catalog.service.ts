import { Injectable } from '@nestjs/common';
import {
  QuestionContentSchema,
  type LearnerQuestionContent,
  type ListQuestionSetsQuery,
  type QuestionSetDetail,
  type QuestionSetSummary,
  type Topic,
} from '@loopedu/shared';
import { ApiException } from '../../common/api-exception.js';
import { CatalogRepository } from './catalog.repository.js';

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
function toLearnerContent(json: unknown): LearnerQuestionContent {
  const c = QuestionContentSchema.parse(json);
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
  constructor(private readonly repo: CatalogRepository) {}

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

  /** A draft or another learner's pending set looks the same as a missing one, so ids cannot be probed. */
  async getQuestionSet(userId: string, id: string): Promise<QuestionSetDetail> {
    const row = await this.repo.get(userId, id);
    if (!row) throw new ApiException('NOT_FOUND', 'Question set not found');
    return { ...toSummary(row), content: toLearnerContent(row.contentJson) };
  }
}
