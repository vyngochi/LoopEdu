import { Injectable } from '@nestjs/common';
import {
  type CompletePracticeSessionRequest,
  type CreatePracticeSessionRequest,
  type PracticeSession,
} from '@loopedu/shared';
import { ApiException } from '../../common/api-exception.js';
import { AuthService } from '../auth/auth.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { ReviewService } from '../review/review.service.js';
import { PracticeRepository, type PracticeSessionRow } from './practice.repository.js';

@Injectable()
export class PracticeService {
  constructor(
    private readonly repo: PracticeRepository,
    private readonly catalog: CatalogService,
    private readonly reviews: ReviewService,
    private readonly auth: AuthService,
  ) {}

  /** Starts a session pinned to the set's current version (AC-PRACTICE-01: only sets this learner may see). */
  async start(userId: string, req: CreatePracticeSessionRequest): Promise<PracticeSession> {
    const versionId = await this.catalog.resolveStartableVersion(userId, req.questionSetId);
    return this.view(await this.repo.create(userId, versionId, req.supportLevel));
  }

  async get(userId: string, id: string): Promise<PracticeSession> {
    const row = await this.repo.findOwned(userId, id);
    if (!row) throw new ApiException('NOT_FOUND', 'Practice session not found');
    return this.view(row);
  }

  /**
   * Finishes a session with the learner's self-rating (AC-PRACTICE-03) and, for the first completion of that
   * version, schedules the 3-7-21 reviews in the same transaction. Repeating the same request returns the stored
   * result; a different rating, or a session that is not in progress, is a CONFLICT.
   */
  async complete(userId: string, id: string, req: CompletePracticeSessionRequest): Promise<PracticeSession> {
    // shortcut: a learner who never set a timezone (skipped onboarding) is scheduled in UTC; onboarding requires one.
    const timezone = (await this.auth.me(userId)).profile.timezone ?? 'UTC';
    const done = await this.repo.complete(userId, id, req.selfRating, (tx, s) =>
      this.reviews.scheduleFirstCompletion(tx, {
        userId,
        questionSetVersionId: s.questionSetVersionId,
        sessionId: s.id,
        timezone,
        completedAt: s.completedAt ?? new Date(),
      }),
    );
    if (done) return this.view(done);
    const existing = await this.repo.findOwned(userId, id);
    if (!existing) throw new ApiException('NOT_FOUND', 'Practice session not found');
    if (existing.status === 'completed' && existing.selfRating === req.selfRating) return this.view(existing);
    throw new ApiException('CONFLICT', 'This session is already finished');
  }

  private async view(row: PracticeSessionRow): Promise<PracticeSession> {
    return {
      id: row.id,
      status: row.status,
      supportLevel: row.supportLevel,
      startedAt: row.startedAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      selfRating: row.selfRating,
      ...(await this.catalog.playerView(row.questionSetVersionId, row.supportLevel)),
    };
  }
}
