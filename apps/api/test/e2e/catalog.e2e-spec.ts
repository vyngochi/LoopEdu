import { INestApplication } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ApiErrorSchema } from '@loopedu/shared';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { createTestDb, setTestJwtKeys } from '../../src/common/testing/test-db.js';
import { AuthMailer } from '../../src/modules/auth/auth.mailer.js';

let app: INestApplication;
let closeDb: () => Promise<void>;
let token: string;
const mails: { to: string; link: string }[] = [];

beforeAll(async () => {
  await setTestJwtKeys();
  process.env.CORS_ORIGINS = 'http://localhost:3000';
  const testDb = await createTestDb();
  closeDb = testDb.close;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(getDrizzleToken())
    .useValue(testDb.db)
    .overrideProvider(AuthMailer)
    .useValue({ sendMagicLink: async (to: string, link: string) => void mails.push({ to, link }) })
    .compile();
  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  await request(app.getHttpServer()).post('/api/v1/auth/magic-link').send({ email: 'cat@example.com' }).expect(200);
  const verify = await request(app.getHttpServer())
    .post('/api/v1/auth/verify')
    .send({ token: new URL(mails.at(-1)!.link).searchParams.get('token') })
    .expect(200);
  token = verify.body.accessToken;
}, 60_000);

afterAll(async () => {
  await app.close();
  await closeDb();
});

const get = (path: string, authed = true) => {
  const r = request(app.getHttpServer()).get(`/api/v1${path}`);
  return authed ? r.set({ Authorization: `Bearer ${token}` }) : r;
};

describe('catalog (e2e)', () => {
  it('needs a signed-in learner', async () => {
    for (const path of ['/topics', '/question-sets', '/question-sets/3f2b8c1e-6a52-4d0e-9a41-0c5f7a1d2b34']) {
      await get(path, false).expect(401);
    }
  });

  it('answers an empty catalog with empty lists', async () => {
    expect((await get('/topics?exam=ielts').expect(200)).body).toEqual([]);
    expect((await get('/question-sets?exam=toeic&section=toeic_opinion').expect(200)).body).toEqual([]);
  });

  it('rejects malformed filters and ids, and answers NOT_FOUND for an unknown set', async () => {
    for (const path of ['/topics?exam=gre', '/question-sets?section=ielts_p9', '/question-sets/not-a-uuid']) {
      expect(ApiErrorSchema.parse((await get(path).expect(400)).body).code).toBe('VALIDATION_FAILED');
    }
    const res = await get('/question-sets/3f2b8c1e-6a52-4d0e-9a41-0c5f7a1d2b34').expect(404);
    expect(ApiErrorSchema.parse(res.body).code).toBe('NOT_FOUND');
  });
});
