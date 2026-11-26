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

  const http = request(app.getHttpServer());
  await http.post('/api/v1/auth/magic-link').send({ email: 'practice@example.com' }).expect(200);
  const verify = await http.post('/api/v1/auth/verify').send({ token: new URL(mails.at(-1)!.link).searchParams.get('token') }).expect(200);
  token = verify.body.accessToken;
}, 60_000);

afterAll(async () => {
  await app.close();
  await closeDb();
});

const send = (method: 'get' | 'post', path: string, authed = true) => {
  const r = request(app.getHttpServer())[method](`/api/v1${path}`);
  return authed ? r.set({ Authorization: `Bearer ${token}` }) : r;
};
const unknownId = '3f2b8c1e-6a52-4d0e-9a41-0c5f7a1d2b34';

describe('practice sessions (e2e)', () => {
  it('needs a signed-in learner', async () => {
    await send('post', '/practice-sessions', false).send({ questionSetId: unknownId }).expect(401);
    await send('get', `/practice-sessions/${unknownId}`, false).expect(401);
    await send('post', `/practice-sessions/${unknownId}/complete`, false).send({ selfRating: 'good' }).expect(401);
  });

  it('rejects malformed requests and answers NOT_FOUND for unknown ids', async () => {
    for (const body of [{}, { questionSetId: 'nope' }, { questionSetId: unknownId, supportLevel: 'full' }]) {
      const res = await send('post', '/practice-sessions').send(body).expect(400);
      expect(ApiErrorSchema.parse(res.body).code).toBe('VALIDATION_FAILED');
    }
    for (const res of [await send('post', '/practice-sessions').send({ questionSetId: unknownId }).expect(404), await send('get', `/practice-sessions/${unknownId}`).expect(404)]) {
      expect(ApiErrorSchema.parse(res.body).code).toBe('NOT_FOUND');
    }
  });

  it('validates the completion request and answers NOT_FOUND for an unknown session', async () => {
    for (const body of [{}, { selfRating: 'great' }]) {
      const res = await send('post', `/practice-sessions/${unknownId}/complete`).send(body).expect(400);
      expect(ApiErrorSchema.parse(res.body).code).toBe('VALIDATION_FAILED');
    }
    const res = await send('post', `/practice-sessions/${unknownId}/complete`).send({ selfRating: 'good' }).expect(404);
    expect(ApiErrorSchema.parse(res.body).code).toBe('NOT_FOUND');
  });
});
