import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, count, eq, isNull, lte } from 'drizzle-orm';
import { REVIEW_OFFSETS_DAYS, type SelfRating, type SupportLevel } from '@loopedu/shared';
import type { Database, Tx } from '../../db/database.js';
import { learningItems, reviewTasks } from '../../db/schema/index.js';

const taskColumns = {
  id: reviewTasks.id,
  kind: reviewTasks.kind,
  milestoneDays: reviewTasks.milestoneDays,
  dueOn: reviewTasks.dueOn,
  completedAt: reviewTasks.completedAt,
  selfRating: reviewTasks.selfRating,
  supportLevel: reviewTasks.supportLevel,
  questionSetVersionId: learningItems.questionSetVersionId,
};

export type ReviewTaskRow = NonNullable<Awaited<ReturnType<ReviewRepository['findOwned']>>>;

@Injectable()
export class ReviewRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Creates the learning item and its three scheduled tasks inside the caller's transaction. The unique
   * (user, version) makes this a no-op for any later session of the same version, so an existing schedule is
   * never recalculated or duplicated. Returns whether this call created the schedule.
   */
  async createSchedule(
    tx: Tx,
    item: { userId: string; questionSetVersionId: string; firstSessionId: string; anchorLocalDate: string; anchorTimezone: string },
    dueDates: string[],
  ): Promise<boolean> {
    const [created] = await tx.insert(learningItems).values(item).onConflictDoNothing().returning({ id: learningItems.id });
    if (!created) return false;
    await tx
      .insert(reviewTasks)
      .values(REVIEW_OFFSETS_DAYS.map((milestoneDays, i) => ({ learningItemId: created.id, kind: 'scheduled' as const, milestoneDays, dueOn: dueDates[i] })))
      .onConflictDoNothing();
    return true;
  }

  /** Pending tasks due on or before `today` (overdue ones included), oldest due date first, plus the total. */
  async listDue(userId: string, today: string, limit: number, offset: number) {
    const due = and(eq(learningItems.userId, userId), isNull(reviewTasks.completedAt), lte(reviewTasks.dueOn, today));
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ id: reviewTasks.id, kind: reviewTasks.kind, milestoneDays: reviewTasks.milestoneDays, dueOn: reviewTasks.dueOn, versionId: learningItems.questionSetVersionId })
        .from(reviewTasks)
        .innerJoin(learningItems, eq(learningItems.id, reviewTasks.learningItemId))
        .where(due)
        .orderBy(asc(reviewTasks.dueOn), asc(reviewTasks.id))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(reviewTasks).innerJoin(learningItems, eq(learningItems.id, reviewTasks.learningItemId)).where(due),
    ]);
    return { rows, total };
  }

  /** Only the owner's task; another learner's id looks like a missing one. */
  async findOwned(userId: string, id: string) {
    const [row] = await this.db
      .select(taskColumns)
      .from(reviewTasks)
      .innerJoin(learningItems, eq(learningItems.id, reviewTasks.learningItemId))
      .where(and(eq(reviewTasks.id, id), eq(learningItems.userId, userId)));
    return row ?? null;
  }

  /** pending → completed in one conditional UPDATE, so repeats and parallel calls transition at most once. */
  async complete(id: string, selfRating: SelfRating, supportLevel: SupportLevel): Promise<boolean> {
    const [row] = await this.db
      .update(reviewTasks)
      .set({ completedAt: new Date(), selfRating, supportLevel })
      .where(and(eq(reviewTasks.id, id), isNull(reviewTasks.completedAt)))
      .returning({ id: reviewTasks.id });
    return Boolean(row);
  }
}
