import { Injectable } from '@nestjs/common';
import {
  daysBetween,
  localDateIn,
  reviewDueDates,
  type CompleteReviewRequest,
  type ReviewList,
  type ReviewSession,
  type SupportLevel,
} from '@loopedu/shared';
import { ApiException } from '../../common/api-exception.js';
import type { Tx } from '../../db/database.js';
import { AuthService } from '../auth/auth.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { ReviewRepository, type ReviewTaskRow } from './review.repository.js';

@Injectable()
export class ReviewService {
  constructor(
    private readonly repo: ReviewRepository,
    private readonly catalog: CatalogService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Called inside the transaction that completes a practice session. The first completion of a version
   * anchors the 3-7-21 schedule on the learner's local date at that moment (AC-REVIEW-01); later sessions of
   * the same version, late reviews and timezone changes never move it (AC-REVIEW-02).
   */
  scheduleFirstCompletion(
    tx: Tx,
    s: { userId: string; questionSetVersionId: string; sessionId: string; timezone: string; completedAt: Date },
  ): Promise<boolean> {
    const anchorLocalDate = localDateIn(s.timezone, s.completedAt);
    return this.repo.createSchedule(
      tx,
      {
        userId: s.userId,
        questionSetVersionId: s.questionSetVersionId,
        firstSessionId: s.sessionId,
        anchorLocalDate,
        anchorTimezone: s.timezone,
      },
      reviewDueDates(anchorLocalDate),
    );
  }

  /** The learner's local date now, in the timezone stored on their profile. */
  private async today(userId: string): Promise<string> {
    // shortcut: a learner who never set a timezone (skipped onboarding) is read in UTC; onboarding requires one.
    const timezone = (await this.auth.me(userId)).profile.timezone ?? 'UTC';
    return localDateIn(timezone, new Date());
  }

  /** Due today or overdue, oldest first; overdue tasks are never hidden (AC-REVIEW-02). */
  async listDue(userId: string, limit: number, offset: number): Promise<ReviewList> {
    const today = await this.today(userId);
    const { rows, total } = await this.repo.listDue(userId, today, limit, offset);
    const items = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        kind: r.kind,
        milestoneDays: r.milestoneDays,
        dueOn: r.dueOn,
        daysOverdue: Math.max(0, daysBetween(r.dueOn, today)),
        // Reviews show the version that was studied, not the set's current one (AC-REVIEW-03).
        questionSet: (await this.catalog.playerView(r.versionId, 'none')).questionSet,
      })),
    );
    return { today, total, items };
  }

  /** Plays one task from the studied version at the chosen support level. A task that is not due yet is refused. */
  async getSession(userId: string, id: string, supportLevel: SupportLevel): Promise<ReviewSession> {
    const task = await this.owned(userId, id);
    await this.assertDue(userId, task);
    return this.view(task, supportLevel);
  }

  /**
   * Completes a due task with the learner's self-rating. Repeating the same request returns the stored
   * result; a different rating, or an already completed task with other values, is a CONFLICT.
   */
  async complete(userId: string, id: string, req: CompleteReviewRequest): Promise<ReviewSession> {
    const task = await this.owned(userId, id);
    if (task.completedAt) return this.replay(task, req);
    await this.assertDue(userId, task);
    if (await this.repo.complete(id, req.selfRating, req.supportLevel)) return this.view(await this.owned(userId, id), req.supportLevel);
    // Lost a race with a parallel call: the winner's values decide.
    return this.replay(await this.owned(userId, id), req);
  }

  private async owned(userId: string, id: string): Promise<ReviewTaskRow> {
    const task = await this.repo.findOwned(userId, id);
    if (!task) throw new ApiException('NOT_FOUND', 'Review task not found');
    return task;
  }

  private async assertDue(userId: string, task: ReviewTaskRow) {
    if (task.dueOn > (await this.today(userId))) throw new ApiException('CONFLICT', 'This review is not due yet');
  }

  private replay(task: ReviewTaskRow, req: CompleteReviewRequest): Promise<ReviewSession> {
    if (task.completedAt && task.selfRating === req.selfRating && task.supportLevel === req.supportLevel) return this.view(task, req.supportLevel);
    throw new ApiException('CONFLICT', 'This review is already completed');
  }

  private async view(task: ReviewTaskRow, supportLevel: SupportLevel): Promise<ReviewSession> {
    return {
      id: task.id,
      kind: task.kind,
      milestoneDays: task.milestoneDays,
      dueOn: task.dueOn,
      supportLevel,
      completedAt: task.completedAt?.toISOString() ?? null,
      selfRating: task.selfRating,
      ...(await this.catalog.playerView(task.questionSetVersionId, supportLevel)),
    };
  }
}
