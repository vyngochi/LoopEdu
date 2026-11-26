import { eq } from 'drizzle-orm';
import { DEFAULT_BLUEPRINT_RULES, type CreateQuestionSetRequest } from '@loopedu/shared';
import { createTestDb } from '../../../common/testing/test-db.js';
import { questionSetVersions, questionSets, topicRequests, users } from '../../../db/schema/index.js';
import type { Database } from '../../../db/database.js';
import { CatalogRepository } from '../../catalog/catalog.repository.js';
import { CatalogService } from '../../catalog/catalog.service.js';
import { ContentAdminRepository } from '../../content-admin/content-admin.repository.js';
import { ContentAdminService } from '../../content-admin/content-admin.service.js';
import { PracticeRepository } from '../practice.repository.js';
import { PracticeService } from '../practice.service.js';

let db: Database;
let close: () => Promise<void>;
let admin: ContentAdminService;
let practice: PracticeService;
let topicId: string;
let alice: string;
let bob: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  admin = new ContentAdminService(new ContentAdminRepository(db));
  practice = new PracticeService(new PracticeRepository(db), new CatalogService(new CatalogRepository(db)), admin);
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
