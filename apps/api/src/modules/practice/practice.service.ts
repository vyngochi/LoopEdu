import { Injectable } from '@nestjs/common';
import {
  renderPlaceholders,
  type BlueprintRules,
  type CompletePracticeSessionRequest,
  type CreatePracticeSessionRequest,
  type PlayerStep,
  type PracticeSession,
  type QuestionContent,
  type SectionCode,
} from '@loopedu/shared';
import { ApiException } from '../../common/api-exception.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { ContentAdminService } from '../content-admin/content-admin.service.js';
import { PracticeRepository, type PracticeSessionRow } from './practice.repository.js';

/**
 * Timers per question: what the set declares, else the blueprint it was written under. Resolved here so
 * the player never guesses (Part 1 questions carry no timers of their own).
 */
export function planTiming(section: SectionCode, c: QuestionContent, rules: BlueprintRules): PracticeSession['timing'] {
  const rule = rules.sections[section];
  if (!rule) throw new Error(`Blueprint has no rules for ${section}`);
  const step = (prep?: number, speak?: number): PlayerStep => ({
    prepSeconds: prep ?? c.prep_seconds ?? rule.prepSeconds,
    speakSeconds: speak ?? c.speaking_seconds ?? rule.speakSeconds.max,
  });
  const steps = c.questions?.length
    ? c.questions.map((q) => (typeof q === 'string' ? step() : step(q.prep_seconds, q.response_seconds)))
    : [step()];
  return { readSeconds: c.read_seconds ?? rule.readSeconds, steps };
}

/** Sample answers with placeholders filled in; empty when the set has none (e.g. TOEIC read aloud). */
function renderSamples(c: QuestionContent): string[] {
  const samples = c.sample_answers ?? (c.sample_answer ? [c.sample_answer] : []);
  return samples.map((s) => renderPlaceholders(s, c.personalization_defaults));
}

@Injectable()
export class PracticeService {
  constructor(
    private readonly repo: PracticeRepository,
    private readonly catalog: CatalogService,
    private readonly blueprints: ContentAdminService,
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
   * Finishes a session with the learner's self-rating (AC-PRACTICE-03). Repeating the same request returns
   * the stored result; a different rating, or a session that is not in progress, is a CONFLICT.
   */
  async complete(userId: string, id: string, req: CompletePracticeSessionRequest): Promise<PracticeSession> {
    const done = await this.repo.complete(userId, id, req.selfRating);
    if (done) return this.view(done);
    const existing = await this.repo.findOwned(userId, id);
    if (!existing) throw new ApiException('NOT_FOUND', 'Practice session not found');
    if (existing.status === 'completed' && existing.selfRating === req.selfRating) return this.view(existing);
    throw new ApiException('CONFLICT', 'This session is already finished');
  }

  /** What the player gets: only the help the chosen support level allows (AC-DIAGRAM-02). */
  private async view(row: PracticeSessionRow): Promise<PracticeSession> {
    const v = await this.catalog.getVersion(row.questionSetVersionId);
    const level = row.supportLevel;
    const { ideaHints, usefulExpressions, ...content } = v.content;
    return {
      id: row.id,
      status: row.status,
      supportLevel: level,
      startedAt: row.startedAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      selfRating: row.selfRating,
      questionSet: v.set,
      content: level === 'none' ? content : { ...content, ideaHints, usefulExpressions },
      sampleAnswers: level === 'sample' ? renderSamples(v.raw) : null,
      timing: planTiming(v.set.sectionCode, v.raw, await this.blueprints.getBlueprintRules(v.blueprintId)),
    };
  }
}
