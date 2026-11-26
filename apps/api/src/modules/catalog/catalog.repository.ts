import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, eq, exists, ne, or, sql } from 'drizzle-orm';
import type { ExamTrack, SectionCode } from '@loopedu/shared';
import type { Database } from '../../db/database.js';
import { questionSetVersions, questionSets, topicRequests, topics } from '../../db/schema/index.js';

export interface CatalogFilters {
  exam?: ExamTrack;
  section?: SectionCode;
  topicSlug?: string;
}

const columns = {
  id: questionSets.id,
  topicId: topics.id,
  topicSlug: topics.slug,
  topicName: topics.name,
  examType: questionSets.examType,
  sectionCode: questionSets.sectionCode,
  difficulty: questionSets.difficulty,
  status: questionSets.status,
  versionId: questionSetVersions.id,
  versionNo: questionSetVersions.versionNo,
};

@Injectable()
export class CatalogRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Sets this learner may see (AC-PRACTICE-01): published ones, plus pending_review ones generated for
   * a topic request of their own. Drafts and rejected sets never match.
   */
  private visible(userId: string) {
    return or(
      and(eq(questionSets.status, 'published'), eq(topics.status, 'published')),
      and(
        eq(questionSets.status, 'pending_review'),
        ne(topics.status, 'archived'),
        exists(
          this.db
            .select({ one: sql`1` })
            .from(topicRequests)
            .where(and(eq(topicRequests.userId, userId), eq(topicRequests.questionSetId, questionSets.id))),
        ),
      ),
    );
  }

  // The inner join on the current version also drops sets that have none yet.
  private base() {
    return this.db
      .select({ ...columns, contentJson: questionSetVersions.contentJson })
      .from(questionSets)
      .innerJoin(topics, eq(topics.id, questionSets.topicId))
      .innerJoin(questionSetVersions, eq(questionSetVersions.id, questionSets.currentVersionId));
  }

  // shortcut: no pagination, the catalog is a few dozen topics per track; add it past ~200 sets.
  list(userId: string, f: CatalogFilters) {
    return this.base()
      .where(
        and(
          this.visible(userId),
          f.exam ? eq(questionSets.examType, f.exam) : undefined,
          f.section ? eq(questionSets.sectionCode, f.section) : undefined,
          f.topicSlug ? eq(topics.slug, f.topicSlug) : undefined,
        ),
      )
      .orderBy(asc(topics.name), asc(questionSets.sectionCode), asc(questionSets.difficulty), asc(questionSets.id));
  }

  /** A version by id, whatever the set's status now: sessions and reviews stay pinned to what was studied. */
  async getVersion(versionId: string) {
    const [row] = await this.db
      .select({ ...columns, blueprintId: questionSetVersions.blueprintId, contentJson: questionSetVersions.contentJson })
      .from(questionSetVersions)
      .innerJoin(questionSets, eq(questionSets.id, questionSetVersions.questionSetId))
      .innerJoin(topics, eq(topics.id, questionSets.topicId))
      .where(eq(questionSetVersions.id, versionId));
    return row ?? null;
  }

  async get(userId: string, id: string) {
    const [row] = await this.base().where(and(eq(questionSets.id, id), this.visible(userId)));
    return row ?? null;
  }
}
