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
  await http.post('/api/v1/auth/magic-link').send({ email: 'review@example.com' }).expect(200);
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

describe('reviews (e2e)', () => {
  it('needs a signed-in learner', async () => {
    await send('get', '/reviews', false).expect(401);
    await send('get', `/review-tasks/${unknownId}`, false).expect(401);
    await send('post', `/review-tasks/${unknownId}/complete`, false).send({ selfRating: 'good', supportLevel: 'none' }).expect(401);
  });

  it('answers an empty due list for a learner with no reviews', async () => {
    const res = await send('get', '/reviews').expect(200);
    expect(res.body).toMatchObject({ total: 0, items: [] });
    expect(res.body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rejects malformed requests and answers NOT_FOUND for unknown tasks', async () => {
    for (const path of ['/reviews?limit=0', '/reviews?limit=500', '/reviews?offset=-1', '/reviews?status=all', `/review-tasks/${unknownId}?supportLevel=full`, '/review-tasks/nope']) {
      expect(ApiErrorSchema.parse((await send('get', path).expect(400)).body).code).toBe('VALIDATION_FAILED');
    }
    for (const body of [{}, { selfRating: 'good' }, { selfRating: 'great', supportLevel: 'none' }]) {
      await send('post', `/review-tasks/${unknownId}/complete`).send(body).expect(400);
    }
    expect(ApiErrorSchema.parse((await send('get', `/review-tasks/${unknownId}`).expect(404)).body).code).toBe('NOT_FOUND');
    await send('post', `/review-tasks/${unknownId}/complete`).send({ selfRating: 'good', supportLevel: 'none' }).expect(404);
  });
});
