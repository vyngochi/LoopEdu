import { and, eq } from 'drizzle-orm';
import { DEFAULT_BLUEPRINT_RULES, type CreateQuestionSetRequest } from '@loopedu/shared';
import { createTestDb } from '../../../common/testing/test-db.js';
import { learningItems, practiceSessions, questionSetVersions, questionSets, reviewTasks, topicRequests, users } from '../../../db/schema/index.js';
import type { Database } from '../../../db/database.js';
import { CatalogRepository } from '../../catalog/catalog.repository.js';
import { CatalogService } from '../../catalog/catalog.service.js';
import { ContentAdminRepository } from '../../content-admin/content-admin.repository.js';
import { ContentAdminService } from '../../content-admin/content-admin.service.js';
import type { AuthService } from '../../auth/auth.service.js';
import { ReviewRepository } from '../../review/review.repository.js';
import { ReviewService } from '../../review/review.service.js';
import { PracticeRepository } from '../practice.repository.js';
import { PracticeService } from '../practice.service.js';

let db: Database;
let close: () => Promise<void>;
let admin: ContentAdminService;
let practice: PracticeService;
let topicId: string;
let alice: string;
let bob: string;
let timezone = 'Asia/Ho_Chi_Minh';

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  admin = new ContentAdminService(new ContentAdminRepository(db));
  const auth = { me: async () => ({ profile: { timezone } }) } as unknown as AuthService;
  practice = new PracticeService(
    new PracticeRepository(db),
    new CatalogService(new CatalogRepository(db)),
    admin,
    new ReviewService(new ReviewRepository()),
    auth,
  );
  [{ id: alice }] = await db.insert(users).values({ email: 'alice@example.com' }).returning();
  [{ id: bob }] = await db.insert(users).values({ email: 'bob@example.com' }).returning();
  for (const examType of ['ielts', 'toeic'] as const) {
    const bp = await admin.createBlueprint(alice, { examType, rules: DEFAULT_BLUEPRINT_RULES[examType] });
    await admin.activateBlueprint(alice, bp.id);
  }
  topicId = (await admin.createTopic({ slug: 'tech', name: 'Technology' })).id;
  await admin.updateTopic({ id: alice, roles: ['admin'] }, topicId, { status: 'published' });
}, 60_000);
afterAll(() => close());
afterEach(() => vi.useRealTimers());

const part2 = {
  topic: 'Technology',
  difficulty: 'intermediate' as const,
  prompt: 'Describe a piece of technology you use regularly.',
  cue_points: ['what it is', 'why it matters'],
  prep_seconds: 60,
  speaking_seconds: 120,
  idea_hints: ['daily communication'],
  useful_expressions: ['part of my daily routine'],
  sample_answer: 'I am {{name}} from {{city}}. I use it every day.',
  personalization_defaults: { name: 'Lan', city: 'Hanoi' },
};

/** Creates a set and publishes it the way B15 will: stamp the version, flip the status. */
async function published(req: Partial<CreateQuestionSetRequest> & { content?: object } = {}) {
  const created = await admin.createQuestionSet({
    topicId,
    examType: 'ielts',
    sectionCode: 'ielts_p2',
    ...req,
    content: (req.content ?? part2) as CreateQuestionSetRequest['content'],
  });
  await db.update(questionSetVersions).set({ publishedAt: new Date() }).where(eq(questionSetVersions.id, created.version.id));
  await db.update(questionSets).set({ status: 'published' }).where(eq(questionSets.id, created.id));
  return created;
}

const notFound = { response: { code: 'NOT_FOUND' } };

describe('starting a session (AC-PRACTICE-01)', () => {
  it('pins the session to the current version of a published set', async () => {
    const set = await published();
    const session = await practice.start(alice, { questionSetId: set.id, supportLevel: 'sample' });
    expect(session).toMatchObject({ status: 'in_progress', questionSet: { id: set.id, versionNo: 1 } });

    // A newer draft version does not change what the session shows.
    await admin.saveQuestionSetContent(set.id, { ...part2, prompt: 'Describe an app.' });
    expect((await practice.get(alice, session.id)).content.prompt).toBe(part2.prompt);
  });

  it('refuses drafts and other learners pending sets', async () => {
    const draft = await admin.createQuestionSet({ topicId, examType: 'ielts', sectionCode: 'ielts_p2', content: part2 });
    await expect(practice.start(alice, { questionSetId: draft.id, supportLevel: 'sample' })).rejects.toMatchObject(notFound);

    await db.update(questionSets).set({ status: 'pending_review' }).where(eq(questionSets.id, draft.id));
    await db.insert(topicRequests).values({ userId: alice, rawText: 'x', normalizedText: 'x', outcome: 'generated', questionSetId: draft.id });
    expect((await practice.start(alice, { questionSetId: draft.id, supportLevel: 'none' })).questionSet.id).toBe(draft.id);
    await expect(practice.start(bob, { questionSetId: draft.id, supportLevel: 'none' })).rejects.toMatchObject(notFound);
  });

  it('shows a session only to its owner', async () => {
    const set = await published();
    const session = await practice.start(alice, { questionSetId: set.id, supportLevel: 'sample' });
    await expect(practice.get(bob, session.id)).rejects.toMatchObject(notFound);
    await expect(practice.get(alice, crypto.randomUUID())).rejects.toMatchObject(notFound);
  });
});

describe('support levels (AC-PRACTICE-02, AC-DIAGRAM-02)', () => {
  it('gives the rendered sample at "sample", hints at "diagram" and nothing at "none"', async () => {
    const set = await published();
    const start = (supportLevel: 'sample' | 'diagram' | 'none') => practice.start(alice, { questionSetId: set.id, supportLevel });

    const sample = await start('sample');
    expect(sample.sampleAnswers).toEqual(['I am Lan from Hanoi. I use it every day.']);
    expect(sample.content.ideaHints).toEqual(['daily communication']);

    const keywords = await start('diagram');
    expect(keywords.sampleAnswers).toBeNull();
    expect(keywords.content.ideaHints).toEqual(['daily communication']);

    const none = await start('none');
    expect(none.sampleAnswers).toBeNull();
    expect(none.content.ideaHints).toBeUndefined();
    expect(none.content.usefulExpressions).toBeUndefined();

    for (const s of [sample, keywords, none]) {
      expect(JSON.stringify(s)).not.toMatch(/structure|patterns|\{\{/);
    }
  });

  it('never shows a raw placeholder, even when the set declares no default', async () => {
    const set = await published({ content: { ...part2, personalization_defaults: undefined, sample_answer: 'Hi, I am {{name}}, a {{unknown}} fan.' } });
    const { sampleAnswers } = await practice.start(alice, { questionSetId: set.id, supportLevel: 'sample' });
    expect(sampleAnswers).toEqual(['Hi, I am a learner, a fan.']);
  });
});

describe('timing', () => {
  it('uses the set timers for Part 2 and the blueprint for Part 1 questions', async () => {
    const p2 = await published();
    expect((await practice.start(alice, { questionSetId: p2.id, supportLevel: 'none' })).timing).toEqual({
      readSeconds: 0,
      steps: [{ prepSeconds: 60, speakSeconds: 120 }],
    });

    const p1 = await published({
      sectionCode: 'ielts_p1',
      content: { topic: 'Technology', difficulty: 'beginner', questions: ['Q1?', 'Q2?', 'Q3?'] },
    });
    const { timing } = await practice.start(alice, { questionSetId: p1.id, supportLevel: 'none' });
    expect(timing.steps).toEqual(Array(3).fill({ prepSeconds: 0, speakSeconds: 40 }));
  });

  it('uses each TOEIC question own timers and the reading time of the information table', async () => {
    const set = await published({
      examType: 'toeic',
      sectionCode: 'toeic_respond_info',
      content: {
        topic: 'Library events',
        difficulty: 'beginner',
        info_table: { title: 'Workshops', rows: [['Sat 9:00', 'Resume writing', 'Room A']] },
        read_seconds: 45,
        questions: [
          { text: 'When does it start?', prep_seconds: 3, response_seconds: 15 },
          { text: 'Tell me about Saturday.', prep_seconds: 3, response_seconds: 30 },
        ],
        sample_answers: ['At nine.', 'There is one workshop.'],
      },
    });
    const session = await practice.start(alice, { questionSetId: set.id, supportLevel: 'sample' });
    expect(session.timing).toEqual({
      readSeconds: 45,
      steps: [
        { prepSeconds: 3, speakSeconds: 15 },
        { prepSeconds: 3, speakSeconds: 30 },
      ],
    });
    expect(session.sampleAnswers).toEqual(['At nine.', 'There is one workshop.']);
  });
});

describe('completing a session (AC-PRACTICE-03)', () => {
  const start = async (user = alice) => {
    const set = await published();
    return practice.start(user, { questionSetId: set.id, supportLevel: 'sample' });
  };

  it('records the self-rating and completion time', async () => {
    const session = await start();
    const done = await practice.complete(alice, session.id, { selfRating: 'partial' });
    expect(done).toMatchObject({ id: session.id, status: 'completed', selfRating: 'partial' });
    expect(done.completedAt).not.toBeNull();
    expect(await practice.get(alice, session.id)).toMatchObject({ status: 'completed', selfRating: 'partial' });
  });

  it('answers a repeated request with the same stored result', async () => {
    const session = await start();
    const first = await practice.complete(alice, session.id, { selfRating: 'good' });
    const again = await practice.complete(alice, session.id, { selfRating: 'good' });
    expect(again.completedAt).toBe(first.completedAt);
  });

  it('transitions once when the same request arrives in parallel', async () => {
    const session = await start();
    const results = await Promise.all(Array.from({ length: 5 }, () => practice.complete(alice, session.id, { selfRating: 'good' })));
    expect(new Set(results.map((r) => r.completedAt)).size).toBe(1);
  });

  it('refuses a different rating after completion, an abandoned session, other learners and unknown ids', async () => {
    const session = await start();
    await practice.complete(alice, session.id, { selfRating: 'good' });
    await expect(practice.complete(alice, session.id, { selfRating: 'not_yet' })).rejects.toMatchObject({ response: { code: 'CONFLICT' } });

    const abandoned = await start();
    await db.update(practiceSessions).set({ status: 'abandoned' }).where(eq(practiceSessions.id, abandoned.id));
    await expect(practice.complete(alice, abandoned.id, { selfRating: 'good' })).rejects.toMatchObject({ response: { code: 'CONFLICT' } });

    const mine = await start();
    await expect(practice.complete(bob, mine.id, { selfRating: 'good' })).rejects.toMatchObject(notFound);
    await expect(practice.get(alice, mine.id)).resolves.toMatchObject({ status: 'in_progress', selfRating: null });
    await expect(practice.complete(alice, crypto.randomUUID(), { selfRating: 'good' })).rejects.toMatchObject(notFound);
  });
});

describe('review schedule on first completion (AC-REVIEW-01, AC-REVIEW-02)', () => {
  /** Completes a session of `setId` at a fixed instant, in a given timezone. */
  async function completeAt(user: string, setId: string, instant: string, tz = 'Asia/Ho_Chi_Minh') {
    timezone = tz;
    const session = await practice.start(user, { questionSetId: setId, supportLevel: 'sample' });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(instant));
    try {
      return await practice.complete(user, session.id, { selfRating: 'good' });
    } finally {
      vi.useRealTimers();
    }
  }

  const scheduleOf = async (user: string, versionId: string) => {
    const [item] = await db.select().from(learningItems).where(and(eq(learningItems.userId, user), eq(learningItems.questionSetVersionId, versionId)));
    const tasks = item ? await db.select().from(reviewTasks).where(eq(reviewTasks.learningItemId, item.id)).orderBy(reviewTasks.milestoneDays) : [];
    return { item, tasks };
  };
  const dues = (tasks: { milestoneDays: number | null; dueOn: string }[]) => tasks.map((t) => [t.milestoneDays, t.dueOn]);

  it('creates D+3, D+7 and D+21 from the learner local date, across a month end', async () => {
    const set = await published();
    await completeAt(alice, set.id, '2027-01-29T10:00:00Z');
    const { item, tasks } = await scheduleOf(alice, set.version.id);
    expect(item).toMatchObject({ anchorLocalDate: '2027-01-29', anchorTimezone: 'Asia/Ho_Chi_Minh' });
    expect(dues(tasks)).toEqual([[3, '2027-02-01'], [7, '2027-02-05'], [21, '2027-02-19']]);
    expect(tasks.every((t) => t.kind === 'scheduled' && t.completedAt === null)).toBe(true);
  });

  it('uses the learner timezone, so 20:00 UTC on New Year Eve is already January 1 in Vietnam', async () => {
    const set = await published();
    await completeAt(alice, set.id, '2026-12-31T20:00:00Z');
    expect(dues((await scheduleOf(alice, set.version.id)).tasks)).toEqual([[3, '2027-01-04'], [7, '2027-01-08'], [21, '2027-01-22']]);

    const other = await published();
    await completeAt(bob, other.id, '2026-12-31T20:00:00Z', 'America/Los_Angeles');
    const { item, tasks } = await scheduleOf(bob, other.version.id);
    expect(item.anchorLocalDate).toBe('2026-12-31');
    expect(dues(tasks)).toEqual([[3, '2027-01-03'], [7, '2027-01-07'], [21, '2027-01-21']]);
  });

  it('counts the leap day', async () => {
    const set = await published();
    await completeAt(alice, set.id, '2028-02-28T10:00:00Z');
    expect(dues((await scheduleOf(alice, set.version.id)).tasks)).toEqual([[3, '2028-03-02'], [7, '2028-03-06'], [21, '2028-03-20']]);
  });

  it('never reschedules: a later session of the same version, even in another timezone, adds nothing', async () => {
    const set = await published();
    await completeAt(alice, set.id, '2027-03-10T05:00:00Z');
    const before = await scheduleOf(alice, set.version.id);
    await completeAt(alice, set.id, '2027-03-20T05:00:00Z', 'America/New_York');
    const after = await scheduleOf(alice, set.version.id);
    expect(after.item.id).toBe(before.item.id);
    expect(after.item.anchorTimezone).toBe('Asia/Ho_Chi_Minh');
    expect(dues(after.tasks)).toEqual(dues(before.tasks));
    expect(after.tasks).toHaveLength(3);
  });

  it('creates exactly one schedule for repeated and parallel completions', async () => {
    const set = await published();
    const session = await practice.start(alice, { questionSetId: set.id, supportLevel: 'sample' });
    await Promise.all(Array.from({ length: 5 }, () => practice.complete(alice, session.id, { selfRating: 'good' })));
    const { tasks } = await scheduleOf(alice, set.version.id);
    expect(tasks).toHaveLength(3);
  });

  it('gives each learner their own schedule and none before completion', async () => {
    const set = await published();
    await practice.start(alice, { questionSetId: set.id, supportLevel: 'sample' });
    expect((await scheduleOf(alice, set.version.id)).item).toBeUndefined();
    await completeAt(alice, set.id, '2027-04-01T05:00:00Z');
    await completeAt(bob, set.id, '2027-04-02T05:00:00Z');
    expect((await scheduleOf(bob, set.version.id)).item.anchorLocalDate).toBe('2027-04-02');
    expect((await scheduleOf(alice, set.version.id)).item.anchorLocalDate).toBe('2027-04-01');
  });

  it('keeps pointing a review at the version that was studied (AC-REVIEW-03)', async () => {
    const set = await published();
    await completeAt(alice, set.id, '2027-05-01T05:00:00Z');
    await admin.saveQuestionSetContent(set.id, { ...part2, prompt: 'A newer version.' });
    const { item } = await scheduleOf(alice, set.version.id);
    expect(item.questionSetVersionId).toBe(set.version.id);
    expect((await practice.get(alice, item.firstSessionId)).content.prompt).toBe(part2.prompt);
  });
});
