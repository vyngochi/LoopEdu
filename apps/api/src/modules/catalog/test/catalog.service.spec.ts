import { eq } from 'drizzle-orm';
import { DEFAULT_BLUEPRINT_RULES, type ExamTrack, type SectionCode } from '@loopedu/shared';
import { createTestDb } from '../../../common/testing/test-db.js';
import {
  examBlueprints,
  questionSetVersions,
  questionSets,
  topicRequests,
  topics,
  users,
} from '../../../db/schema/index.js';
import type { Database } from '../../../db/database.js';
import { CatalogRepository } from '../catalog.repository.js';
import { CatalogService } from '../catalog.service.js';

let db: Database;
let close: () => Promise<void>;
let service: CatalogService;
let blueprintId: string;
let alice: string;
let bob: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  service = new CatalogService(new CatalogRepository(db));
  [{ id: alice }] = await db.insert(users).values({ email: 'alice@example.com' }).returning();
  [{ id: bob }] = await db.insert(users).values({ email: 'bob@example.com' }).returning();
  [{ id: blueprintId }] = await db
    .insert(examBlueprints)
    .values({ examType: 'ielts', version: 1, rulesJson: DEFAULT_BLUEPRINT_RULES.ielts })
    .returning();
}, 60_000);
afterAll(() => close());

const CONTENT = {
  topic: 'Technology',
  difficulty: 'intermediate',
  prompt: 'Describe a piece of technology you use regularly.',
  cue_points: ['what it is', 'when you started'],
  prep_seconds: 60,
  speaking_seconds: 120,
  idea_hints: ['daily communication'],
  // Must never reach the learner (AC-DIAGRAM-02, AC-PRACTICE-02).
  sample_answer: 'Hi, I am {{name}} from {{city}}.',
  patterns: [{ key: 'part_of_daily_routine' }],
  structure: { framework: 'mind_map_cue_points', nodes: [] },
};

interface Spec {
  slug: string;
  topicStatus?: 'draft' | 'published' | 'archived';
  setStatus?: 'draft' | 'pending_review' | 'published' | 'rejected';
  exam?: ExamTrack;
  section?: SectionCode;
  content?: object;
}

/** A topic with one question set and one version, in the requested states. Returns the set id. */
async function make({ slug, topicStatus = 'published', setStatus = 'published', exam = 'ielts', section = 'ielts_p2', content = CONTENT }: Spec) {
  const [topic] = await db.insert(topics).values({ slug, name: slug, status: topicStatus }).onConflictDoUpdate({ target: topics.slug, set: { name: slug } }).returning();
  const [set] = await db
    .insert(questionSets)
    .values({ topicId: topic.id, examType: exam, sectionCode: section, difficulty: 'intermediate' })
    .returning();
  const [version] = await db
    .insert(questionSetVersions)
    .values({ questionSetId: set.id, versionNo: 1, blueprintId, contentJson: content, contentHash: slug + section })
    .returning();
  await db.update(questionSets).set({ currentVersionId: version.id, status: setStatus }).where(eq(questionSets.id, set.id));
  return set.id;
}

const notFound = { response: { code: 'NOT_FOUND' } };
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('visibility (AC-PRACTICE-01)', () => {
  it('shows published sets only, hiding drafts, rejected sets and unpublished topics', async () => {
    const shown = await make({ slug: 'vis-published' });
    const draft = await make({ slug: 'vis-draft', setStatus: 'draft' });
    const rejected = await make({ slug: 'vis-rejected', setStatus: 'rejected' });
    const draftTopic = await make({ slug: 'vis-draft-topic', topicStatus: 'draft' });
    const archived = await make({ slug: 'vis-archived', topicStatus: 'archived' });

    const listed = ids(await service.listQuestionSets(alice, {}));
    expect(listed).toContain(shown);
    for (const hidden of [draft, rejected, draftTopic, archived]) {
      expect(listed).not.toContain(hidden);
      await expect(service.getQuestionSet(alice, hidden)).rejects.toMatchObject(notFound);
    }
  });

  it('gives a pending_review set only to the learner who requested it', async () => {
    const pending = await make({ slug: 'vis-pending', topicStatus: 'draft', setStatus: 'pending_review' });
    await db.insert(topicRequests).values({
      userId: alice,
      rawText: 'vis pending',
      normalizedText: 'vis pending',
      outcome: 'generated',
      questionSetId: pending,
    });

    expect(ids(await service.listQuestionSets(alice, {}))).toContain(pending);
    expect(await service.getQuestionSet(alice, pending)).toMatchObject({ status: 'pending_review' });
    expect(ids(await service.listQuestionSets(bob, {}))).not.toContain(pending);
    await expect(service.getQuestionSet(bob, pending)).rejects.toMatchObject(notFound);
  });

  it('hides a set that has no current version yet', async () => {
    const [topic] = await db.insert(topics).values({ slug: 'vis-no-version', name: 'x', status: 'published' }).returning();
    const [set] = await db
      .insert(questionSets)
      .values({ topicId: topic.id, examType: 'ielts', sectionCode: 'ielts_p1', difficulty: 'beginner' })
      .returning();
    expect(ids(await service.listQuestionSets(alice, {}))).not.toContain(set.id);
  });
});

describe('content', () => {
  it('returns the player fields in camelCase and nothing else', async () => {
    const id = await make({ slug: 'content-ielts' });
    const detail = await service.getQuestionSet(alice, id);
    expect(detail.content).toMatchObject({
      prompt: CONTENT.prompt,
      cuePoints: CONTENT.cue_points,
      prepSeconds: 60,
      speakingSeconds: 120,
      ideaHints: CONTENT.idea_hints,
    });
    const text = JSON.stringify(detail);
    for (const secret of ['sample_answer', 'sampleAnswer', '{{', 'patterns', 'structure']) {
      expect(text).not.toContain(secret);
    }
  });

  it('maps TOEIC questions with their own timers and the info table', async () => {
    const id = await make({
      slug: 'content-toeic',
      exam: 'toeic',
      section: 'toeic_respond_info',
      content: {
        topic: 'Library events',
        difficulty: 'beginner',
        info_table: { title: 'Workshops', rows: [['Sat 9:00', 'Resume writing', 'Room A']] },
        read_seconds: 45,
        questions: [{ text: 'What time does it start?', prep_seconds: 3, response_seconds: 15 }],
        sample_answers: ['secret'],
      },
    });
    const { content } = await service.getQuestionSet(alice, id);
    expect(content.readSeconds).toBe(45);
    expect(content.infoTable?.rows).toHaveLength(1);
    expect(content.questions).toEqual([{ text: 'What time does it start?', prepSeconds: 3, responseSeconds: 15 }]);
    expect(JSON.stringify(content)).not.toContain('secret');
  });
});

describe('filters and topics', () => {
  it('filters by exam, section and topic slug', async () => {
    const p1 = await make({ slug: 'filter-a', section: 'ielts_p1', content: { ...CONTENT, questions: ['Do you like it?'], cue_points: undefined } });
    const p2 = await make({ slug: 'filter-b', section: 'ielts_p2' });
    const toeic = await make({ slug: 'filter-c', exam: 'toeic', section: 'toeic_opinion' });

    expect(ids(await service.listQuestionSets(alice, { section: 'ielts_p1' }))).toContain(p1);
    expect(ids(await service.listQuestionSets(alice, { section: 'ielts_p1' }))).not.toContain(p2);
    expect(ids(await service.listQuestionSets(alice, { exam: 'toeic' }))).toContain(toeic);
    expect(ids(await service.listQuestionSets(alice, { exam: 'ielts' }))).not.toContain(toeic);
    expect(ids(await service.listQuestionSets(alice, { topic: 'filter-b' }))).toEqual([p2]);
  });

  it('lists each topic once with its available sections', async () => {
    await make({ slug: 'multi', section: 'ielts_p1', content: { ...CONTENT, questions: ['Q?'] } });
    await make({ slug: 'multi', section: 'ielts_p2' });
    const found = (await service.listTopics(alice, 'ielts')).filter((t) => t.slug === 'multi');
    expect(found).toHaveLength(1);
    expect(found[0].sections.sort()).toEqual(['ielts_p1', 'ielts_p2']);
  });
});
