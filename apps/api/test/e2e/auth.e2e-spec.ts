import { INestApplication } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ApiErrorSchema, AuthSessionSchema, MeResponseSchema } from '@loopedu/shared';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { createTestDb, setTestJwtKeys } from '../../src/common/testing/test-db.js';
import { AuthMailer } from '../../src/modules/auth/auth.mailer.js';
import { GoogleIdTokenVerifier } from '../../src/modules/auth/google-id-token.verifier.js';

const ORIGIN = 'http://localhost:3000';
let app: INestApplication;
let closeDb: () => Promise<void>;
const mails: { to: string; link: string }[] = [];

beforeAll(async () => {
  await setTestJwtKeys();
  process.env.CORS_ORIGINS = ORIGIN;
  const testDb = await createTestDb();
  closeDb = testDb.close;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(getDrizzleToken())
    .useValue(testDb.db)
    .overrideProvider(AuthMailer)
    .useValue({ sendMagicLink: async (to: string, link: string) => void mails.push({ to, link }) })
    // Fake Google: the "ID token" is the email; "forged" is rejected.
    .overrideProvider(GoogleIdTokenVerifier)
    .useValue({
      verify: async (t: string) => (t === 'forged' ? null : { email: t, emailVerified: true }),
    })
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
const refreshCookie = (res: request.Response) =>
  (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('refresh_token='))!;

async function signIn(email: string) {
  await http().post('/api/v1/auth/magic-link').send({ email }).expect(200);
  const token = new URL(mails.at(-1)!.link).searchParams.get('token');
  return http().post('/api/v1/auth/verify').send({ token }).expect(200);
}

describe('auth (e2e)', () => {
  it('answers magic-link identically for any email and rejects a malformed one', async () => {
    const a = await http().post('/api/v1/auth/magic-link').send({ email: 'Known@Example.com' }).expect(200);
    const b = await http().post('/api/v1/auth/magic-link').send({ email: 'never-seen@example.com' }).expect(200);
    expect(a.body).toEqual(b.body);

    const bad = await http().post('/api/v1/auth/magic-link').send({ email: 'nope' }).expect(400);
    expect(ApiErrorSchema.parse(bad.body).code).toBe('VALIDATION_FAILED');
  });

  it('signs in, reads /me with the Bearer token, refreshes with the cookie, and logs out', async () => {
    const verified = await signIn('flow@example.com');
    const { accessToken } = AuthSessionSchema.parse(verified.body);
    const cookie = refreshCookie(verified);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(verified.body.refreshToken).toBeUndefined();

    const me = await http().get('/api/v1/me').set('Authorization', `Bearer ${accessToken}`).expect(200);
    expect(MeResponseSchema.parse(me.body)).toMatchObject({ email: 'flow@example.com', roles: ['learner'] });

    const refreshed = await http().post('/api/v1/auth/refresh').set('Origin', ORIGIN).set('Cookie', cookie).expect(200);
    AuthSessionSchema.parse(refreshed.body);
    const rotated = refreshCookie(refreshed);
    expect(rotated).not.toBe(cookie);

    await http().post('/api/v1/auth/logout').set('Origin', ORIGIN).set('Cookie', rotated).expect(204);
    await http().post('/api/v1/auth/refresh').set('Origin', ORIGIN).set('Cookie', rotated).expect(401);
  });

  it('protects routes: no token or a bad token is UNAUTHORIZED, health stays public', async () => {
    const none = await http().get('/api/v1/me').expect(401);
    expect(ApiErrorSchema.parse(none.body).code).toBe('UNAUTHORIZED');
    await http().get('/api/v1/me').set('Authorization', 'Bearer nonsense').expect(401);
    await http().get('/api/v1/health').expect(200);
  });

  it('refuses refresh and logout from a foreign or missing Origin (CSRF)', async () => {
    const cookie = refreshCookie(await signIn('csrf@example.com'));
    for (const path of ['refresh', 'logout']) {
      const res = await http().post(`/api/v1/auth/${path}`).set('Origin', 'https://evil.example').set('Cookie', cookie).expect(403);
      expect(ApiErrorSchema.parse(res.body).code).toBe('FORBIDDEN');
      await http().post(`/api/v1/auth/${path}`).set('Cookie', cookie).expect(403);
    }
    await http().post('/api/v1/auth/refresh').set('Origin', ORIGIN).expect(401);
  });

  it('rejects a bad link token', async () => {
    await http().post('/api/v1/auth/verify').send({ token: 'wrong' }).expect(401);
    await http().post('/api/v1/auth/verify').send({}).expect(400);
  });

  it('sets a password after magic-link sign-in, then signs in with email and password', async () => {
    const first = await signIn('pw@example.com');
    const { accessToken } = AuthSessionSchema.parse(first.body);
    const bearer = { Authorization: `Bearer ${accessToken}` };

    await http().post('/api/v1/auth/login').send({ email: 'pw@example.com', password: 'my long password' }).expect(401);
    await http().post('/api/v1/me/password').send({ password: 'short' }).set(bearer).expect(400);
    await http().post('/api/v1/me/password').send({ password: 'my long password' }).expect(401);
    const set = await http().post('/api/v1/me/password').send({ password: 'my long password' }).set(bearer).expect(200);
    expect(refreshCookie(set)).toMatch(/HttpOnly/i);

    const login = await http().post('/api/v1/auth/login').send({ email: 'PW@example.com', password: 'my long password' }).expect(200);
    const session = AuthSessionSchema.parse(login.body);
    const me = await http().get('/api/v1/me').set('Authorization', `Bearer ${session.accessToken}`).expect(200);
    expect(MeResponseSchema.parse(me.body).hasPassword).toBe(true);

    const bad = await http().post('/api/v1/auth/login').send({ email: 'pw@example.com', password: 'wrong wrong' }).expect(401);
    expect(ApiErrorSchema.parse(bad.body).code).toBe('UNAUTHORIZED');
  }, 30_000);

  it('signs in with Google: session cookie on success, UNAUTHORIZED for a bad token, 400 for a bad body', async () => {
    const ok = await http().post('/api/v1/auth/google').send({ idToken: 'g.e2e@example.com' }).expect(200);
    const { accessToken } = AuthSessionSchema.parse(ok.body);
    expect(refreshCookie(ok)).toMatch(/HttpOnly/i);
    const me = await http().get('/api/v1/me').set('Authorization', `Bearer ${accessToken}`).expect(200);
    expect(MeResponseSchema.parse(me.body)).toMatchObject({ email: 'g.e2e@example.com', roles: ['learner'] });

    const bad = await http().post('/api/v1/auth/google').send({ idToken: 'forged' }).expect(401);
    expect(ApiErrorSchema.parse(bad.body).code).toBe('UNAUTHORIZED');
    await http().post('/api/v1/auth/google').send({}).expect(400);
  });

  it('throttles login attempts per IP', async () => {
    const body = { email: 'throttle@example.com', password: 'whatever it is' };
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await http().post('/api/v1/auth/login').send(body)).status);
    expect(codes.at(-1)).toBe(429);
    expect(codes.slice(0, 3)).toEqual([401, 401, 401]);
  }, 30_000);
});
