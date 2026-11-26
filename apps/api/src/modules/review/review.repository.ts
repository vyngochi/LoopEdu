import { Injectable } from '@nestjs/common';
import { REVIEW_OFFSETS_DAYS } from '@loopedu/shared';
import type { Tx } from '../../db/database.js';
import { learningItems, reviewTasks } from '../../db/schema/index.js';

@Injectable()
export class ReviewRepository {
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
}
