import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { SupportLevel } from '@loopedu/shared';
import type { Database } from '../../db/database.js';
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
}
