// Sample answer personalisation (PRD tech 11.3): plain string replacement, never an LLM call.
// B21 adds the learner's profile values on top; until then every placeholder takes its default.

export const PLACEHOLDERS = ['name', 'city', 'occupation', 'hobby'] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

// Used when a set does not declare a default for a placeholder it uses.
export const FALLBACK_DEFAULTS: Record<Placeholder, string> = {
  name: 'a learner',
  city: 'my city',
  occupation: 'a student',
  hobby: 'reading',
};

/**
 * Replaces `{{key}}` with the set's default, then the fallback. A placeholder with no value anywhere is
 * removed rather than shown raw (AC-PRACTICE-02: the learner never sees `{{name}}`).
 */
export function renderPlaceholders(text: string, defaults: Record<string, string> = {}): string {
  return text
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => defaults[key] ?? FALLBACK_DEFAULTS[key as Placeholder] ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
