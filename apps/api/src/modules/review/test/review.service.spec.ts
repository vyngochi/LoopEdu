import { eq } from 'drizzle-orm';
import { DEFAULT_BLUEPRINT_RULES } from '@loopedu/shared';
import { createTestDb } from '../../../common/testing/test-db.js';
import { questionSetVersions, questionSets, users } from '../../../db/schema/index.js';
import type { Database } from '../../../db/database.js';
import type { AuthService } from '../../auth/auth.service.js';
import { CatalogRepository } from '../../catalog/catalog.repository.js';
import { CatalogService } from '../../catalog/catalog.service.js';
import { ContentAdminRepository } from '../../content-admin/content-admin.repository.js';
import { ContentAdminService } from '../../content-admin/content-admin.service.js';
import { PracticeRepository } from '../../practice/practice.repository.js';
import { PracticeService } from '../../practice/practice.service.js';
import { ReviewRepository } from '../review.repository.js';
import { ReviewService } from '../review.service.js';

let db: Database;
let close: () => Promise<void>;
let admin: ContentAdminService;
let practice: PracticeService;
let reviews: ReviewService;
let topicId: string;
let alice: string;
let bob: string;
const timezone = 'Asia/Ho_Chi_Minh';

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  admin = new ContentAdminService(new ContentAdminRepository(db));
  const catalog = new CatalogService(new CatalogRepository(db), admin);
  const auth = { me: async () => ({ profile: { timezone } }) } as unknown as AuthService;
  reviews = new ReviewService(new ReviewRepository(db), catalog, auth);
  practice = new PracticeService(new PracticeRepository(db), catalog, reviews, auth);
  [{ id: alice }] = await db.insert(users).values({ email: 'alice@example.com' }).returning();
  [{ id: bob }] = await db.insert(users).values({ email: 'bob@example.com' }).returning();
  const bp = await admin.createBlueprint(alice, { examType: 'ielts', rules: DEFAULT_BLUEPRINT_RULES.ielts });
  await admin.activateBlueprint(alice, bp.id);
  topicId = (await admin.createTopic({ slug: 'tech', name: 'Technology' })).id;
  await admin.updateTopic({ id: alice, roles: ['admin'] }, topicId, { status: 'published' });
}, 60_000);
afterAll(() => close());
afterEach(() => vi.useRealTimers());

const content = (prompt: string) => ({
  topic: 'Technology',
  difficulty: 'intermediate' as const,
  prompt,
  cue_points: ['what it is'],
  idea_hints: ['daily use'],
  sample_answer: 'I am {{name}}.',
  personalization_defaults: { name: 'Lan' },
});

async function published(prompt = 'Describe a gadget.') {
  const created = await admin.createQuestionSet({ topicId, examType: 'ielts', sectionCode: 'ielts_p2', content: content(prompt) });
  await db.update(questionSetVersions).set({ publishedAt: new Date() }).where(eq(questionSetVersions.id, created.version.id));
  await db.update(questionSets).set({ status: 'published' }).where(eq(questionSets.id, created.id));
  return created;
}

/** Runs `fn` with the clock set to `instant`. */
async function at<T>(instant: string, fn: () => Promise<T>): Promise<T> {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(instant));
  try {
    return await fn();
  } finally {
    vi.useRealTimers();
  }
}

/** Alice studies a set on 2027-06-01 (Vietnam time), so reviews fall due 06-04, 06-08 and 06-22. */
async function studied(user = alice, prompt?: string) {
  const set = await published(prompt);
  const session = await practice.start(user, { questionSetId: set.id, supportLevel: 'sample' });
  await at('2027-06-01T05:00:00Z', () => practice.complete(user, session.id, { selfRating: 'good' }));
  return set;
}

const list = (instant: string, user = alice, limit = 20, offset = 0) => at(instant, () => reviews.listDue(user, limit, offset));
const code = (c: string) => ({ response: { code: c } });

describe('what is due (AC-REVIEW-02)', () => {
  it('shows nothing before the first milestone, then each task on its due date', async () => {
    const set = await studied();
    const mine = (r: Awaited<ReturnType<typeof list>>) => r.items.filter((t) => t.questionSet.id === set.id);

    expect(mine(await list('2027-06-03T05:00:00Z'))).toEqual([]);
    expect(mine(await list('2027-06-04T05:00:00Z')).map((t) => [t.milestoneDays, t.dueOn, t.daysOverdue])).toEqual([[3, '2027-06-04', 0]]);
  });

  it('keeps missed tasks listed as overdue, oldest first, without moving the others', async () => {
    const set = await studied();
    const r = await list('2027-06-25T05:00:00Z');
    const mine = r.items.filter((t) => t.questionSet.id === set.id);
    expect(mine.map((t) => [t.milestoneDays, t.daysOverdue])).toEqual([[3, 21], [7, 17], [21, 3]]);
    expect(r.today).toBe('2027-06-25');
  });

  it('uses the learner local date, not UTC', async () => {
    const set = await studied();
    // 17:30 UTC on June 3 is already June 4 in Vietnam, so D+3 is due.
    const r = await list('2027-06-03T17:30:00Z');
    expect(r.items.some((t) => t.questionSet.id === set.id && t.milestoneDays === 3)).toBe(true);
  });

  it('pages through the list and reports the total', async () => {
    const all = await list('2028-01-01T00:00:00Z');
    expect(all.total).toBeGreaterThanOrEqual(3);
    const first = await list('2028-01-01T00:00:00Z', alice, 2, 0);
    const second = await list('2028-01-01T00:00:00Z', alice, 2, 2);
    expect(first.items).toHaveLength(2);
    expect(first.total).toBe(all.total);
    expect(second.items[0].id).toBe(all.items[2].id);
  });

  it('lists only the learner own tasks', async () => {
    await studied(alice);
    expect((await list('2028-01-01T00:00:00Z', bob)).items).toEqual([]);
  });
});

describe('doing a review', () => {
  const firstTaskOf = async (set: { id: string }) => (await list('2027-06-04T05:00:00Z')).items.find((t) => t.questionSet.id === set.id)!;

  it('completes a due task, removes it from the due list and records the rating and support level', async () => {
    const set = await studied();
    const task = await firstTaskOf(set);
    const done = await at('2027-06-04T05:00:00Z', () => reviews.complete(alice, task.id, { selfRating: 'partial', supportLevel: 'none' }));
    expect(done).toMatchObject({ id: task.id, selfRating: 'partial', supportLevel: 'none', milestoneDays: 3 });
    expect(done.completedAt).not.toBeNull();
    expect((await list('2027-06-04T05:00:00Z')).items.some((t) => t.id === task.id)).toBe(false);
  });

  it('answers a repeated request with the stored result and refuses a different one', async () => {
    const task = await firstTaskOf(await studied());
    const first = await at('2027-06-04T05:00:00Z', () => reviews.complete(alice, task.id, { selfRating: 'good', supportLevel: 'none' }));
    const again = await at('2027-06-04T06:00:00Z', () => reviews.complete(alice, task.id, { selfRating: 'good', supportLevel: 'none' }));
    expect(again.completedAt).toBe(first.completedAt);
    await expect(at('2027-06-04T06:00:00Z', () => reviews.complete(alice, task.id, { selfRating: 'not_yet', supportLevel: 'none' }))).rejects.toMatchObject(code('CONFLICT'));
  });

  it('transitions once when the same request arrives in parallel', async () => {
    const task = await firstTaskOf(await studied());
    const results = await at('2027-06-04T05:00:00Z', () =>
      Promise.all(Array.from({ length: 5 }, () => reviews.complete(alice, task.id, { selfRating: 'good', supportLevel: 'diagram' }))),
    );
    expect(new Set(results.map((r) => r.completedAt)).size).toBe(1);
  });

  it('refuses a task that is not due yet, another learner and unknown ids', async () => {
    const set = await studied();
    const task = await firstTaskOf(set);
    // The D+21 task of the same set is still in the future on June 4.
    const future = (await list('2027-06-22T05:00:00Z')).items.find((t) => t.questionSet.id === set.id && t.milestoneDays === 21)!;
    await expect(at('2027-06-04T05:00:00Z', () => reviews.getSession(alice, future.id, 'none'))).rejects.toMatchObject(code('CONFLICT'));
    await expect(at('2027-06-04T05:00:00Z', () => reviews.complete(alice, future.id, { selfRating: 'good', supportLevel: 'none' }))).rejects.toMatchObject(code('CONFLICT'));

    await expect(at('2027-06-04T05:00:00Z', () => reviews.getSession(bob, task.id, 'none'))).rejects.toMatchObject(code('NOT_FOUND'));
    await expect(at('2027-06-04T05:00:00Z', () => reviews.complete(bob, task.id, { selfRating: 'good', supportLevel: 'none' }))).rejects.toMatchObject(code('NOT_FOUND'));
    await expect(reviews.getSession(alice, crypto.randomUUID(), 'none')).rejects.toMatchObject(code('NOT_FOUND'));
  });

  it('applies the support level: no sample or hints at "none", sample at "sample"', async () => {
    const task = await firstTaskOf(await studied());
    const none = await at('2027-06-04T05:00:00Z', () => reviews.getSession(alice, task.id, 'none'));
    expect(none.sampleAnswers).toBeNull();
    expect(none.content.ideaHints).toBeUndefined();
    const sample = await at('2027-06-04T05:00:00Z', () => reviews.getSession(alice, task.id, 'sample'));
    expect(sample.sampleAnswers).toEqual(['I am Lan.']);
  });

  it('reviews the version that was studied even after a newer one is published (AC-REVIEW-03)', async () => {
    const set = await studied(alice, 'Old prompt.');
    const task = await firstTaskOf(set);

    const v2 = await admin.saveQuestionSetContent(set.id, content('New prompt.'));
    await db.update(questionSetVersions).set({ publishedAt: new Date() }).where(eq(questionSetVersions.id, v2.version.id));
    await db.update(questionSets).set({ currentVersionId: v2.version.id }).where(eq(questionSets.id, set.id));

    const review = await at('2027-06-04T05:00:00Z', () => reviews.getSession(alice, task.id, 'none'));
    expect(review.content.prompt).toBe('Old prompt.');
    expect(review.questionSet.versionNo).toBe(1);
    const fresh = await practice.start(bob, { questionSetId: set.id, supportLevel: 'none' });
    expect(fresh.content.prompt).toBe('New prompt.');
  });
});
