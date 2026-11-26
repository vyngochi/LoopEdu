import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { BlueprintRules, ExamTrack, QuestionContent, SectionCode } from '@loopedu/shared';
import type { Database } from '../../db/database.js';
import {
  adminAuditLogs,
  examBlueprints,
  questionSetVersions,
  questionSets,
  topics,
  validationReports,
} from '../../db/schema/index.js';

export type BlueprintRow = typeof examBlueprints.$inferSelect;
export type TopicRow = typeof topics.$inferSelect;
type SetStatus = typeof questionSets.$inferSelect.status;
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

// Keys sorted so the same content always hashes the same, whatever order the editor sent the fields in.
const sortKeys = (_: string, v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
    : v;
const hashContent = (content: QuestionContent) =>
  createHash('sha256').update(JSON.stringify(content, sortKeys)).digest('hex');

// Scalar subqueries, so a row carries the latest version whichever version the detail view joins.
const latestNo = sql<number>`(select max(version_no) from question_set_versions where question_set_id = ${questionSets.id})`;
const latestPublished = sql<boolean>`exists (select 1 from question_set_versions where question_set_id = ${questionSets.id} and version_no = (select max(version_no) from question_set_versions where question_set_id = ${questionSets.id}) and published_at is not null)`;

const setColumns = {
  id: questionSets.id,
  topicId: topics.id,
  topicSlug: topics.slug,
  topicName: topics.name,
  examType: questionSets.examType,
  sectionCode: questionSets.sectionCode,
  difficulty: questionSets.difficulty,
  status: questionSets.status,
  currentVersionId: questionSets.currentVersionId,
  latestVersionNo: latestNo,
  latestVersionPublished: latestPublished,
};

@Injectable()
export class ContentAdminRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  // ---- blueprints ----

  list(examType?: ExamTrack): Promise<BlueprintRow[]> {
    return this.db
      .select()
      .from(examBlueprints)
      .where(examType ? eq(examBlueprints.examType, examType) : undefined)
      .orderBy(examBlueprints.examType, desc(examBlueprints.version));
  }

  /** Next version number and audit row in one transaction; a concurrent insert trips the unique (type, version). */
  createDraft(actorId: string, examType: ExamTrack, rules: BlueprintRules): Promise<BlueprintRow> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(examBlueprints)
        .values({
          examType,
          rulesJson: rules,
          version: sql`(select coalesce(max(version), 0) + 1 from exam_blueprints where exam_type = ${examType})`,
        })
        .returning();
      await tx.insert(adminAuditLogs).values({
        actorId,
        action: 'blueprint.create',
        targetType: 'exam_blueprint',
        targetId: row.id,
        changesJson: { examType, version: row.version },
      });
      return row;
    });
  }

  /**
   * Draft → active, retiring the current active version of the same exam. Returns null when the
   * blueprint does not exist; an already-active one is returned unchanged, so a retry is harmless.
   */
  activate(actorId: string, id: string): Promise<BlueprintRow | null | 'not_draft'> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(examBlueprints).where(eq(examBlueprints.id, id)).for('update');
      if (!current) return null;
      if (current.status === 'active') return current;
      if (current.status !== 'draft') return 'not_draft';

      const retired = await tx
        .update(examBlueprints)
        .set({ status: 'retired' })
        .where(and(eq(examBlueprints.examType, current.examType), eq(examBlueprints.status, 'active')))
        .returning({ version: examBlueprints.version });
      const [row] = await tx
        .update(examBlueprints)
        .set({ status: 'active', approvedBy: actorId })
        .where(eq(examBlueprints.id, id))
        .returning();
      await tx.insert(adminAuditLogs).values({
        actorId,
        action: 'blueprint.activate',
        targetType: 'exam_blueprint',
        targetId: id,
        changesJson: { examType: row.examType, version: row.version, retiredVersion: retired[0]?.version ?? null },
      });
      return row;
    });
  }

  // ---- topics ----

  listTopics() {
    return this.db.select().from(topics).orderBy(asc(topics.name));
  }

  async createTopic(slug: string, name: string) {
    const [row] = await this.db.insert(topics).values({ slug, name }).returning();
    return row;
  }

  /** A status change is audited in the same transaction. Null when the topic is missing. */
  updateTopic(actorId: string, id: string, patch: { name?: string; status?: TopicRow['status'] }) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(topics).where(eq(topics.id, id)).for('update');
      if (!current) return null;
      const [row] = await tx.update(topics).set(patch).where(eq(topics.id, id)).returning();
      if (patch.status && patch.status !== current.status) {
        await tx.insert(adminAuditLogs).values({
          actorId,
          action: 'topic.status',
          targetType: 'topic',
          targetId: id,
          changesJson: { from: current.status, to: patch.status },
        });
      }
      return row;
    });
  }

  // ---- question sets ----

  private activeBlueprintId(tx: Tx, examType: ExamTrack) {
    return tx
      .select({ id: examBlueprints.id })
      .from(examBlueprints)
      .where(and(eq(examBlueprints.examType, examType), eq(examBlueprints.status, 'active')))
      .then((r) => r[0]?.id ?? null);
  }

  // shortcut: no pagination, drafts are a few hundred rows at most; add it when the question bank grows.
  listQuestionSets(f: { status?: SetStatus; exam?: ExamTrack; section?: SectionCode; topicSlug?: string }) {
    return this.db
      .select(setColumns)
      .from(questionSets)
      .innerJoin(topics, eq(topics.id, questionSets.topicId))
      .where(
        and(
          f.status ? eq(questionSets.status, f.status) : undefined,
          f.exam ? eq(questionSets.examType, f.exam) : undefined,
          f.section ? eq(questionSets.sectionCode, f.section) : undefined,
          f.topicSlug ? eq(topics.slug, f.topicSlug) : undefined,
        ),
      )
      .orderBy(asc(topics.name), asc(questionSets.sectionCode), asc(questionSets.id));
  }

  /** One set with the requested version (the latest by default); null when either is missing. */
  async getQuestionSet(id: string, versionNo?: number) {
    const [row] = await this.db
      .select({
        ...setColumns,
        versionId: questionSetVersions.id,
        versionNo: questionSetVersions.versionNo,
        blueprintId: questionSetVersions.blueprintId,
        contentHash: questionSetVersions.contentHash,
        publishedAt: questionSetVersions.publishedAt,
        contentJson: questionSetVersions.contentJson,
      })
      .from(questionSets)
      .innerJoin(topics, eq(topics.id, questionSets.topicId))
      .innerJoin(
        questionSetVersions,
        and(
          eq(questionSetVersions.questionSetId, questionSets.id),
          eq(questionSetVersions.versionNo, versionNo ?? latestNo),
        ),
      )
      .where(eq(questionSets.id, id));
    return row ?? null;
  }

  /** New draft set with version 1 under the active blueprint. Returns the id, or why it was refused. */
  createQuestionSet(
    topicId: string,
    examType: ExamTrack,
    sectionCode: SectionCode,
    content: QuestionContent,
  ): Promise<{ id: string } | 'no_topic' | 'no_blueprint'> {
    return this.db.transaction(async (tx) => {
      const [topic] = await tx.select({ id: topics.id }).from(topics).where(eq(topics.id, topicId));
      if (!topic) return 'no_topic';
      const blueprintId = await this.activeBlueprintId(tx, examType);
      if (!blueprintId) return 'no_blueprint';
      const [set] = await tx
        .insert(questionSets)
        .values({ topicId, examType, sectionCode, difficulty: content.difficulty })
        .returning({ id: questionSets.id });
      const [version] = await tx
        .insert(questionSetVersions)
        .values({ questionSetId: set.id, versionNo: 1, blueprintId, contentJson: content, contentHash: hashContent(content) })
        .returning({ id: questionSetVersions.id });
      await tx.update(questionSets).set({ currentVersionId: version.id }).where(eq(questionSets.id, set.id));
      return { id: set.id };
    });
  }

  /**
   * Saves editor changes. An unpublished latest version is edited in place; when the latest version is
   * already published (learners use it), a new version is added and the published one stays untouched.
   */
  saveQuestionSetContent(
    id: string,
    content: QuestionContent,
  ): Promise<'ok' | 'not_found' | 'rejected' | 'difficulty' | 'no_blueprint'> {
    return this.db.transaction(async (tx) => {
      const [set] = await tx.select().from(questionSets).where(eq(questionSets.id, id)).for('update');
      if (!set) return 'not_found';
      if (set.status === 'rejected') return 'rejected';
      if (content.difficulty !== set.difficulty) return 'difficulty';
      const [latest] = await tx
        .select()
        .from(questionSetVersions)
        .where(eq(questionSetVersions.questionSetId, id))
        .orderBy(desc(questionSetVersions.versionNo))
        .limit(1);
      if (!latest.publishedAt) {
        await tx
          .update(questionSetVersions)
          .set({ contentJson: content, contentHash: hashContent(content) })
          .where(eq(questionSetVersions.id, latest.id));
        return 'ok';
      }
      const blueprintId = await this.activeBlueprintId(tx, set.examType);
      if (!blueprintId) return 'no_blueprint';
      await tx.insert(questionSetVersions).values({
        questionSetId: id,
        versionNo: latest.versionNo + 1,
        blueprintId,
        contentJson: content,
        contentHash: hashContent(content),
      });
      return 'ok';
    });
  }

  /** Hard delete, only for sets still in draft (never published, so never studied). */
  deleteDraftQuestionSet(id: string): Promise<'ok' | 'not_found' | 'not_draft'> {
    return this.db.transaction(async (tx) => {
      const [set] = await tx.select().from(questionSets).where(eq(questionSets.id, id)).for('update');
      if (!set) return 'not_found';
      if (set.status !== 'draft') return 'not_draft';
      // An unpublished (back to draft) set may still hold a version people studied.
      const [published] = await tx
        .select({ id: questionSetVersions.id })
        .from(questionSetVersions)
        .where(and(eq(questionSetVersions.questionSetId, id), isNotNull(questionSetVersions.publishedAt)))
        .limit(1);
      if (published) return 'not_draft';
      const versionIds = tx
        .select({ id: questionSetVersions.id })
        .from(questionSetVersions)
        .where(eq(questionSetVersions.questionSetId, id));
      await tx.update(questionSets).set({ currentVersionId: null }).where(eq(questionSets.id, id));
      await tx.delete(validationReports).where(inArray(validationReports.versionId, versionIds));
      await tx.delete(questionSetVersions).where(eq(questionSetVersions.questionSetId, id));
      await tx.delete(questionSets).where(eq(questionSets.id, id));
      return 'ok';
    });
  }
}
