import { eq } from 'drizzle-orm';
import { DEFAULT_BLUEPRINT_RULES, type CreateQuestionSetRequest } from '@loopedu/shared';
import { createTestDb } from '../../../common/testing/test-db.js';
import { adminAuditLogs, questionSetVersions, questionSets, users } from '../../../db/schema/index.js';
import type { Database } from '../../../db/database.js';
import { ContentAdminRepository } from '../content-admin.repository.js';
import { ContentAdminService } from '../content-admin.service.js';

let db: Database;
let close: () => Promise<void>;
let service: ContentAdminService;
let adminId: string;
let topicId: string;

const admin = () => ({ id: adminId, roles: ['admin' as const] });
const editor = () => ({ id: adminId, roles: ['editor' as const] });

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  service = new ContentAdminService(new ContentAdminRepository(db));
  [{ id: adminId }] = await db.insert(users).values({ email: 'admin@example.com' }).returning();
  topicId = (await service.createTopic({ slug: 'tech', name: 'Technology' })).id;
}, 60_000);
afterAll(() => close());

const content = (over: object = {}) => ({
  topic: 'Technology',
  difficulty: 'intermediate' as const,
  prompt: 'Describe a piece of technology you use regularly.',
  cue_points: ['what it is', 'why it matters'],
  sample_answer: 'I use my phone every day.',
  ...over,
});
const request = (over: Partial<CreateQuestionSetRequest> = {}): CreateQuestionSetRequest => ({
  topicId,
  examType: 'ielts',
  sectionCode: 'ielts_p2',
  content: content(),
  ...over,
});

/** Mimics B15 publishing: stamps the latest version and flips the set. */
async function publish(setId: string) {
  const [v] = await db.select().from(questionSetVersions).where(eq(questionSetVersions.questionSetId, setId));
  await db.update(questionSetVersions).set({ publishedAt: new Date() }).where(eq(questionSetVersions.id, v.id));
  await db.update(questionSets).set({ status: 'published' }).where(eq(questionSets.id, setId));
}

const code = (c: string) => ({ response: { code: c } });

describe('creating', () => {
  it('needs an active blueprint and an existing topic', async () => {
    await expect(service.createQuestionSet(request())).rejects.toMatchObject(code('CONFLICT'));

    const bp = await service.createBlueprint(adminId, { examType: 'ielts', rules: DEFAULT_BLUEPRINT_RULES.ielts });
    await service.activateBlueprint(adminId, bp.id);
    await expect(service.createQuestionSet(request({ topicId: crypto.randomUUID() }))).rejects.toMatchObject(code('NOT_FOUND'));

    const set = await service.createQuestionSet(request());
    expect(set).toMatchObject({ status: 'draft', difficulty: 'intermediate', latestVersionNo: 1, latestVersionPublished: false });
    expect(set.currentVersionId).toBe(set.version.id);
    expect(set.version).toMatchObject({ versionNo: 1, blueprintId: bp.id, publishedAt: null });
    expect(set.version.content.sample_answer).toBe('I use my phone every day.');
  });

  it('hashes the same content identically whatever the field order', async () => {
    const a = await service.createQuestionSet(request({ content: content() }));
    const reordered = Object.fromEntries(Object.entries(content()).reverse()) as ReturnType<typeof content>;
    const b = await service.createQuestionSet(request({ content: reordered }));
    expect(b.version.contentHash).toBe(a.version.contentHash);
  });
});

describe('editing', () => {
  it('changes an unpublished version in place and keeps one version', async () => {
    const set = await service.createQuestionSet(request());
    const edited = await service.saveQuestionSetContent(set.id, content({ prompt: 'Describe an app you like.' }));
    expect(edited.latestVersionNo).toBe(1);
    expect(edited.version.content.prompt).toBe('Describe an app you like.');
    expect(edited.version.contentHash).not.toBe(set.version.contentHash);
  });

  it('adds a new version on a published set and leaves the published one untouched', async () => {
    const set = await service.createQuestionSet(request());
    await publish(set.id);

    const v2 = await service.saveQuestionSetContent(set.id, content({ prompt: 'Version two.' }));
    expect(v2).toMatchObject({ latestVersionNo: 2, latestVersionPublished: false, currentVersionId: set.version.id });
    expect(v2.version).toMatchObject({ versionNo: 2, publishedAt: null });

    // A second edit works on the draft version, not a third one.
    const again = await service.saveQuestionSetContent(set.id, content({ prompt: 'Version two, revised.' }));
    expect(again.latestVersionNo).toBe(2);

    const original = await service.getQuestionSet(set.id, 1);
    expect(original.version.content.prompt).toBe(set.version.content.prompt);
    expect(original.version.publishedAt).not.toBeNull();
  });

  it('refuses a difficulty change, a rejected set and unknown ids', async () => {
    const set = await service.createQuestionSet(request());
    await expect(service.saveQuestionSetContent(set.id, content({ difficulty: 'advanced' }))).rejects.toMatchObject(code('VALIDATION_FAILED'));
    await db.update(questionSets).set({ status: 'rejected' }).where(eq(questionSets.id, set.id));
    await expect(service.saveQuestionSetContent(set.id, content())).rejects.toMatchObject(code('CONFLICT'));
    await expect(service.saveQuestionSetContent(crypto.randomUUID(), content())).rejects.toMatchObject(code('NOT_FOUND'));
    await expect(service.getQuestionSet(set.id, 9)).rejects.toMatchObject(code('NOT_FOUND'));
  });

  it('serialises parallel edits of a published set into one new version', async () => {
    const set = await service.createQuestionSet(request());
    await publish(set.id);
    await Promise.all([1, 2, 3].map((n) => service.saveQuestionSetContent(set.id, content({ prompt: `Edit ${n}` }))));
    expect((await service.getQuestionSet(set.id)).latestVersionNo).toBe(2);
  });
});

describe('deleting', () => {
  it('removes a draft with its versions but never a set that was published', async () => {
    const draft = await service.createQuestionSet(request());
    await service.deleteQuestionSet(draft.id);
    await expect(service.getQuestionSet(draft.id)).rejects.toMatchObject(code('NOT_FOUND'));
    expect(await db.select().from(questionSetVersions).where(eq(questionSetVersions.questionSetId, draft.id))).toEqual([]);

    const published = await service.createQuestionSet(request());
    await publish(published.id);
    await expect(service.deleteQuestionSet(published.id)).rejects.toMatchObject(code('CONFLICT'));

    // Back to draft after an unpublish: the studied version still blocks the delete.
    await db.update(questionSets).set({ status: 'draft' }).where(eq(questionSets.id, published.id));
    await expect(service.deleteQuestionSet(published.id)).rejects.toMatchObject(code('CONFLICT'));
    await expect(service.deleteQuestionSet(crypto.randomUUID())).rejects.toMatchObject(code('NOT_FOUND'));
  });
});

describe('listing', () => {
  it('filters by status, exam, section and topic slug', async () => {
    const other = await service.createTopic({ slug: 'travel', name: 'Travel' });
    const toeicBp = await service.createBlueprint(adminId, { examType: 'toeic', rules: DEFAULT_BLUEPRINT_RULES.toeic });
    await service.activateBlueprint(adminId, toeicBp.id);
    const toeic = await service.createQuestionSet(
      request({
        topicId: other.id,
        examType: 'toeic',
        sectionCode: 'toeic_opinion',
        content: content({ topic: 'Travel', prompt: 'Do you prefer trains or planes?' }),
      }),
    );
    await db.update(questionSets).set({ status: 'pending_review' }).where(eq(questionSets.id, toeic.id));

    const ids = async (q: object) => (await service.listQuestionSets(q)).map((s) => s.id);
    expect(await ids({ status: 'pending_review' })).toEqual([toeic.id]);
    expect(await ids({ exam: 'toeic' })).toEqual([toeic.id]);
    expect(await ids({ topic: 'travel', section: 'toeic_opinion' })).toEqual([toeic.id]);
    expect(await ids({ topic: 'travel', section: 'ielts_p2' })).toEqual([]);
  });
});

describe('topics', () => {
  it('rejects a duplicate slug', async () => {
    await expect(service.createTopic({ slug: 'tech', name: 'Again' })).rejects.toMatchObject(code('CONFLICT'));
  });

  it('lets an editor rename but only an admin change the status, and audits the change', async () => {
    const t = await service.createTopic({ slug: 'food', name: 'Food' });
    expect((await service.updateTopic(editor(), t.id, { name: 'Food and drink' })).name).toBe('Food and drink');
    await expect(service.updateTopic(editor(), t.id, { status: 'published' })).rejects.toMatchObject(code('FORBIDDEN'));

    expect((await service.updateTopic(admin(), t.id, { status: 'published' })).status).toBe('published');
    const logs = await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.targetId, t.id));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ action: 'topic.status', changesJson: { from: 'draft', to: 'published' } });

    await expect(service.updateTopic(admin(), crypto.randomUUID(), { name: 'x' })).rejects.toMatchObject(code('NOT_FOUND'));
  });
});
