import { INestApplication } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { ApiErrorSchema, BlueprintSchema, DEFAULT_BLUEPRINT_RULES, type UserRole } from '@loopedu/shared';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { createTestDb, setTestJwtKeys } from '../../src/common/testing/test-db.js';
import type { Database } from '../../src/db/database.js';
import { userRoles, users } from '../../src/db/schema/index.js';
import { AuthMailer } from '../../src/modules/auth/auth.mailer.js';

let app: INestApplication;
let db: Database;
let closeDb: () => Promise<void>;
const mails: { to: string; link: string }[] = [];

beforeAll(async () => {
  await setTestJwtKeys();
  process.env.CORS_ORIGINS = 'http://localhost:3000';
  const testDb = await createTestDb();
  db = testDb.db;
  closeDb = testDb.close;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(getDrizzleToken())
    .useValue(db)
    .overrideProvider(AuthMailer)
    .useValue({ sendMagicLink: async (to: string, link: string) => void mails.push({ to, link }) })
    .compile();
  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
}, 60_000);

afterAll(async () => {
  await app.close();
  await closeDb();
});

const http = () => request(app.getHttpServer());
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

/** Signs in (creating the user), grants the role, and returns a token issued after the grant. */
async function tokenFor(email: string, role: UserRole) {
  const login = async () => {
    await http().post('/api/v1/auth/magic-link').send({ email }).expect(200);
    const token = new URL(mails.at(-1)!.link).searchParams.get('token');
    return (await http().post('/api/v1/auth/verify').send({ token }).expect(200)).body.accessToken as string;
  };
  await login();
  const [u] = await db.select().from(users).where(eq(users.email, email));
  await db.insert(userRoles).values({ userId: u.id, role }).onConflictDoNothing();
  return login();
}

const body = { examType: 'ielts', rules: DEFAULT_BLUEPRINT_RULES.ielts };

describe('admin blueprints (e2e)', () => {
  it('lets only admins create and activate; editors may read; learners get nothing', async () => {
    const learner = await tokenFor('bp-learner@example.com', 'learner');
    const editor = await tokenFor('bp-editor@example.com', 'editor');
    const admin = await tokenFor('bp-admin@example.com', 'admin');

    for (const t of [learner, editor]) {
      const res = await http().post('/api/v1/admin/blueprints').set(auth(t)).send(body).expect(403);
      expect(ApiErrorSchema.parse(res.body).code).toBe('FORBIDDEN');
    }
    await http().get('/api/v1/admin/blueprints').set(auth(learner)).expect(403);
    await http().get('/api/v1/admin/blueprints').expect(401);

    const created = BlueprintSchema.parse(
      (await http().post('/api/v1/admin/blueprints').set(auth(admin)).send(body).expect(201)).body,
    );
    await http().post(`/api/v1/admin/blueprints/${created.id}/activate`).set(auth(editor)).expect(403);
    const active = BlueprintSchema.parse(
      (await http().post(`/api/v1/admin/blueprints/${created.id}/activate`).set(auth(admin)).expect(200)).body,
    );
    expect(active.status).toBe('active');

    const listed = await http().get('/api/v1/admin/blueprints?examType=ielts').set(auth(editor)).expect(200);
    expect(listed.body.map((b: { id: string }) => b.id)).toContain(created.id);
  });

  it('rejects rules that do not fit the exam type', async () => {
    const admin = await tokenFor('bp-admin2@example.com', 'admin');
    const res = await http()
      .post('/api/v1/admin/blueprints')
      .set(auth(admin))
      .send({ examType: 'toeic', rules: DEFAULT_BLUEPRINT_RULES.ielts })
      .expect(400);
    expect(ApiErrorSchema.parse(res.body).code).toBe('VALIDATION_FAILED');
  });
});

describe('admin topics and question sets (e2e)', () => {
  const content = {
    topic: 'Technology',
    difficulty: 'intermediate',
    prompt: 'Describe a piece of technology you use regularly.',
    cue_points: ['what it is'],
    sample_answer: 'Sample for the editor only.',
  };

  it('lets an editor draft content, but not publish a topic, and keeps learners out', async () => {
    const editor = await tokenFor('qs-editor@example.com', 'editor');
    const admin = await tokenFor('qs-admin@example.com', 'admin');
    const learner = await tokenFor('qs-learner@example.com', 'learner');
    await http().post('/api/v1/admin/blueprints').set(auth(admin)).send(body).expect(201).then((r) =>
      http().post(`/api/v1/admin/blueprints/${r.body.id}/activate`).set(auth(admin)).expect(200),
    );

    await http().get('/api/v1/admin/topics').set(auth(learner)).expect(403);
    await http().post('/api/v1/admin/question-sets').set(auth(learner)).send({}).expect(403);

    const topic = (await http().post('/api/v1/admin/topics').set(auth(editor)).send({ slug: 'tech-e2e', name: 'Tech' }).expect(201)).body;
    await http().post('/api/v1/admin/topics').set(auth(editor)).send({ slug: 'tech-e2e', name: 'Dup' }).expect(409);
    await http().post('/api/v1/admin/topics').set(auth(editor)).send({ slug: 'Bad Slug', name: 'x' }).expect(400);
    await http().patch(`/api/v1/admin/topics/${topic.id}`).set(auth(editor)).send({ status: 'published' }).expect(403);
    await http().patch(`/api/v1/admin/topics/${topic.id}`).set(auth(admin)).send({ status: 'published' }).expect(200);

    const created = await http()
      .post('/api/v1/admin/question-sets')
      .set(auth(editor))
      .send({ topicId: topic.id, examType: 'ielts', sectionCode: 'ielts_p2', content })
      .expect(201);
    expect(created.body).toMatchObject({ status: 'draft', latestVersionNo: 1 });
    expect(created.body.version.content.sample_answer).toBe(content.sample_answer);

    const bad = await http()
      .post('/api/v1/admin/question-sets')
      .set(auth(editor))
      .send({ topicId: topic.id, examType: 'ielts', sectionCode: 'toeic_opinion', content })
      .expect(400);
    expect(ApiErrorSchema.parse(bad.body).code).toBe('VALIDATION_FAILED');

    const saved = await http()
      .put(`/api/v1/admin/question-sets/${created.body.id}/content`)
      .set(auth(editor))
      .send({ content: { ...content, prompt: 'Describe an app.' } })
      .expect(200);
    expect(saved.body.version.content.prompt).toBe('Describe an app.');

    // A draft is invisible to learners (AC-PRACTICE-01) but the editor can list and preview it.
    await http().get(`/api/v1/question-sets/${created.body.id}`).set(auth(learner)).expect(404);
    const listed = await http().get('/api/v1/admin/question-sets?status=draft&topic=tech-e2e').set(auth(editor)).expect(200);
    expect(listed.body.map((s: { id: string }) => s.id)).toEqual([created.body.id]);
    await http().get(`/api/v1/admin/question-sets/${created.body.id}?versionNo=1`).set(auth(editor)).expect(200);

    await http().delete(`/api/v1/admin/question-sets/${created.body.id}`).set(auth(editor)).expect(204);
    await http().get(`/api/v1/admin/question-sets/${created.body.id}`).set(auth(editor)).expect(404);
  });
});

