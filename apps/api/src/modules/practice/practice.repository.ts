import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { SelfRating, SupportLevel } from '@loopedu/shared';
import type { Database, Tx } from '../../db/database.js';
import { practiceSessions } from '../../db/schema/index.js';

export type PracticeSessionRow = typeof practiceSessions.$inferSelect;

@Injectable()
export class PracticeRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async create(userId: string, questionSetVersionId: string, supportLevel: SupportLevel) {
    const [row] = await this.db.insert(practiceSessions).values({ userId, questionSetVersionId, supportLevel }).returning();
    return row;
  }

  /** Only the owner's session; another user's id looks like a missing one. */
  async findOwned(userId: string, id: string): Promise<PracticeSessionRow | null> {
    const [row] = await this.db
      .select()
      .from(practiceSessions)
      .where(and(eq(practiceSessions.id, id), eq(practiceSessions.userId, userId)));
    return row ?? null;
  }

  /**
   * in_progress → completed in one conditional UPDATE, so parallel or repeated calls transition at most once.
   * `onCompleted` runs in the same transaction, only for the call that made the transition (the review schedule
   * must exist exactly when the completion does). Null when the session is not the user's or no longer in progress.
   */
  complete(
    userId: string,
    id: string,
    selfRating: SelfRating,
    onCompleted: (tx: Tx, session: PracticeSessionRow) => Promise<unknown>,
  ): Promise<PracticeSessionRow | null> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(practiceSessions)
        .set({ status: 'completed', completedAt: new Date(), selfRating })
        .where(and(eq(practiceSessions.id, id), eq(practiceSessions.userId, userId), eq(practiceSessions.status, 'in_progress')))
        .returning();
      if (row) await onCompleted(tx, row);
      return row ?? null;
    });
  }
}
