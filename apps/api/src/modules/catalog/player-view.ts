import {
  renderPlaceholders,
  type BlueprintRules,
  type PlayerStep,
  type PlayerView,
  type QuestionContent,
  type SectionCode,
} from '@loopedu/shared';

/**
 * Timers per question: what the set declares, else the blueprint it was written under. Resolved here so
 * the player never guesses (Part 1 questions carry no timers of their own).
 */
export function planTiming(section: SectionCode, c: QuestionContent, rules: BlueprintRules): PlayerView['timing'] {
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
export function renderSamples(c: QuestionContent): string[] {
  const samples = c.sample_answers ?? (c.sample_answer ? [c.sample_answer] : []);
  return samples.map((s) => renderPlaceholders(s, c.personalization_defaults));
}
