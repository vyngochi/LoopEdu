import { Injectable } from '@nestjs/common';
import { localDateIn, reviewDueDates } from '@loopedu/shared';
import type { Tx } from '../../db/database.js';
import { ReviewRepository } from './review.repository.js';

@Injectable()
export class ReviewService {
  constructor(private readonly repo: ReviewRepository) {}

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
}
