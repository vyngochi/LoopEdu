import { eq } from 'drizzle-orm';
import { createTestDb, setTestJwtKeys } from '../../../common/testing/test-db.js';
import { authTokens, profiles, userRoles, users } from '../../../db/schema/index.js';
import type { Database } from '../../../db/database.js';
import { AccessTokenService } from '../access-token.service.js';
import type { AuthMailer } from '../auth.mailer.js';
import { AuthRepository } from '../auth.repository.js';
import { AuthService } from '../auth.service.js';
import type { GoogleIdTokenVerifier } from '../google-id-token.verifier.js';

let db: Database;
let close: () => Promise<void>;
let sent: { to: string; link: string }[];
let service: AuthService;

beforeAll(async () => {
  await setTestJwtKeys();
  ({ db, close } = await createTestDb());
}, 60_000);
afterAll(() => close());

beforeEach(() => {
  sent = [];
  const mailer = {
    sendMagicLink: vi.fn(async (to: string, link: string) => void sent.push({ to, link })),
  } as unknown as AuthMailer;
  service = new AuthService(new AuthRepository(db), new AccessTokenService(), mailer, googleVerifier);
});

// Fake Google: the "ID token" is just the identity as JSON, anything else is invalid.
const googleVerifier = {
  verify: async (t: string) => {
    try {
      return JSON.parse(t) as { email: string; emailVerified: boolean };
    } catch {
      return null;
    }
  },
} as unknown as GoogleIdTokenVerifier;
const googleToken = (email: string, emailVerified = true) => JSON.stringify({ email, emailVerified });

const tokenOf = (link: string) => new URL(link).searchParams.get('token')!;
const unauthorized = { response: { code: 'UNAUTHORIZED' } };

/** Requests a link for a fresh address and returns the token from the "email". */
async function linkFor(email: string, ip = '10.0.0.1') {
  await service.requestMagicLink(email, ip);
  return tokenOf(sent.at(-1)!.link);
}

describe('requestMagicLink', () => {
  it('creates the learner with a role and profile, and stores only the token hash', async () => {
    const token = await linkFor('new@example.com');

    const [user] = await db.select().from(users).where(eq(users.email, 'new@example.com'));
    expect(await db.select().from(userRoles).where(eq(userRoles.userId, user.id))).toEqual([
      { userId: user.id, role: 'learner' },
    ]);
    expect(await db.select().from(profiles).where(eq(profiles.userId, user.id))).toHaveLength(1);
    const [row] = await db.select().from(authTokens).where(eq(authTokens.userId, user.id));
    expect(row.tokenHash).not.toContain(token);
    expect(row.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(15 * 60 * 1000);
  });

  it('treats a known and an unknown email the same: both get a mail and no second account', async () => {
    await service.requestMagicLink('same@example.com', '10.0.0.2');
    await service.requestMagicLink('same@example.com', '10.0.0.2');
    expect(sent).toHaveLength(2);
    expect(await db.select().from(users).where(eq(users.email, 'same@example.com'))).toHaveLength(1);
  });

  it('does not fail when the mail cannot be sent', async () => {
    const failing = { sendMagicLink: vi.fn().mockRejectedValue(new Error('smtp down')) } as unknown as AuthMailer;
    const svc = new AuthService(new AuthRepository(db), new AccessTokenService(), failing, googleVerifier);
    await expect(svc.requestMagicLink('smtp@example.com', '10.0.0.3')).resolves.toBeUndefined();
  });

  it('allows 5 links per hour per email, then QUOTA_EXCEEDED', async () => {
    for (let i = 0; i < 5; i++) await service.requestMagicLink('limit@example.com', `10.1.0.${i}`);
    await expect(service.requestMagicLink('limit@example.com', '10.1.0.9')).rejects.toMatchObject({
      response: { code: 'QUOTA_EXCEEDED' },
    });
  });

  it('allows 20 links per hour per IP, then QUOTA_EXCEEDED', async () => {
    for (let i = 0; i < 20; i++) await service.requestMagicLink(`ip${i}@example.com`, '10.2.0.1');
    await expect(service.requestMagicLink('ip20@example.com', '10.2.0.1')).rejects.toMatchObject({
      response: { code: 'QUOTA_EXCEEDED' },
    });
  });

  it('sends nothing to a soft-deleted account', async () => {
    await service.requestMagicLink('gone@example.com', '10.3.0.1');
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.email, 'gone@example.com'));
    sent = [];
    await service.requestMagicLink('gone@example.com', '10.3.0.1');
    expect(sent).toHaveLength(0);
  });
});

describe('verify', () => {
  it('signs the user in once: the same link a second time, even in parallel, is rejected', async () => {
    const token = await linkFor('once@example.com');
    const results = await Promise.allSettled([service.verify(token, null), service.verify(token, null)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: unauthorized });

    const [user] = await db.select().from(users).where(eq(users.email, 'once@example.com'));
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.lastLoginAt).not.toBeNull();
  });

  it('rejects an expired or unknown link', async () => {
    const token = await linkFor('late@example.com');
    await db.update(authTokens).set({ expiresAt: new Date(Date.now() - 1000) });
    await expect(service.verify(token, null)).rejects.toMatchObject(unauthorized);
    await expect(service.verify('not-a-real-token', null)).rejects.toMatchObject(unauthorized);
  });

  it('issues an access token that authenticate() accepts, with the live roles', async () => {
    const session = await service.verify(await linkFor('jwt@example.com'), null);
    const user = await service.authenticate(session.accessToken);
    expect(user.roles).toEqual(['learner']);

    await db.insert(userRoles).values({ userId: user.id, role: 'editor' });
    expect((await service.authenticate(session.accessToken)).roles.sort()).toEqual(['editor', 'learner']);
  });
});

describe('loginWithGoogle', () => {
  it('signs up a new account on first use and signs the same one in next time', async () => {
    const first = await service.loginWithGoogle(googleToken('g.new@example.com'), null);
    const { id } = await service.authenticate(first.accessToken);
    expect((await service.me(id)).roles).toEqual(['learner']);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    expect(user.emailVerifiedAt).not.toBeNull();

    const second = await service.loginWithGoogle(googleToken('g.new@example.com'), null);
    expect((await service.authenticate(second.accessToken)).id).toBe(id);
  });

  it('signs in the existing account that has the same email', async () => {
    const { id } = await service.authenticate((await service.verify(await linkFor('g.same@example.com'), null)).accessToken);
    const session = await service.loginWithGoogle(googleToken('g.same@example.com'), null);
    expect((await service.authenticate(session.accessToken)).id).toBe(id);
  });

  it('rejects an invalid token, an unverified email and a soft-deleted account', async () => {
    await expect(service.loginWithGoogle('garbage', null)).rejects.toMatchObject(unauthorized);
    await expect(service.loginWithGoogle(googleToken('g.unver@example.com', false), null)).rejects.toMatchObject(unauthorized);

    await service.loginWithGoogle(googleToken('g.gone@example.com'), null);
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.email, 'g.gone@example.com'));
    await expect(service.loginWithGoogle(googleToken('g.gone@example.com'), null)).rejects.toMatchObject(unauthorized);
  });
});

describe('authenticate', () => {
  it('rejects garbage, a token signed with another key, and a deleted account', async () => {
    await expect(service.authenticate('garbage')).rejects.toMatchObject(unauthorized);

    const session = await service.verify(await linkFor('del@example.com'), null);
    const otherKeys = await import('jose').then((j) => j.generateKeyPair('RS256'));
    const forged = await new (await import('jose')).SignJWT()
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject((await service.authenticate(session.accessToken)).id)
      .setExpirationTime('5m')
      .sign(otherKeys.privateKey);
    await expect(service.authenticate(forged)).rejects.toMatchObject(unauthorized);

    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.email, 'del@example.com'));
    await expect(service.authenticate(session.accessToken)).rejects.toMatchObject(unauthorized);
  });
});

describe('refresh and logout', () => {
  it('rotates the refresh token, and replaying the old one revokes every session of that user', async () => {
    const first = await service.verify(await linkFor('rot@example.com'), null);
    const second = await service.refresh(first.refreshToken, null);
    expect(second.refreshToken).not.toBe(first.refreshToken);

    await expect(service.refresh(first.refreshToken, null)).rejects.toMatchObject(unauthorized);
    // The replay is treated as theft: the new token is dead too.
    await expect(service.refresh(second.refreshToken, null)).rejects.toMatchObject(unauthorized);
  });

  it('logout revokes the token without touching other sessions', async () => {
    const email = 'out@example.com';
    const a = await service.verify(await linkFor(email), null);
    const b = await service.verify(await linkFor(email), null);
    await service.logout(a.refreshToken);

    await expect(service.refresh(a.refreshToken, null)).rejects.toMatchObject(unauthorized);
    await expect(service.refresh(b.refreshToken, null)).resolves.toBeDefined();
  });

  it('rejects an expired refresh token', async () => {
    const session = await service.verify(await linkFor('exp@example.com'), null);
    await db.update(authTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(authTokens.purpose, 'refresh'));
    await expect(service.refresh(session.refreshToken, null)).rejects.toMatchObject(unauthorized);
  });
});

describe('me', () => {
  it('returns the account with its empty profile', async () => {
    const { id } = await service.authenticate((await service.verify(await linkFor('me@example.com'), null)).accessToken);
    const me = await service.me(id);
    expect(me).toMatchObject({ email: 'me@example.com', roles: ['learner'] });
    expect(me.profile).toMatchObject({ timezone: null, birthYear: null, guardianConsent: false, hobbyKeys: [] });
  });
});

describe('password sign-in', () => {
  const PASSWORD = 'correct horse battery';

  /** Signs in by magic link, sets the password, and returns the first session. */
  async function accountWithPassword(email: string) {
    const session = await service.verify(await linkFor(email), null);
    const { id } = await service.authenticate(session.accessToken);
    await service.setPassword(id, PASSWORD, undefined, null);
    return { id, session };
  }

  it('refuses every failure with the same error: no password set, unknown email, wrong password', async () => {
    await linkFor('nopw@example.com');
    await accountWithPassword('haspw@example.com');
    const failures = await Promise.all([
      service.login('nopw@example.com', PASSWORD, null).catch((e) => e),
      service.login('nobody@example.com', PASSWORD, null).catch((e) => e),
      service.login('haspw@example.com', 'wrong password', null).catch((e) => e),
    ]);
    for (const e of failures) expect(e.response).toEqual({ code: 'UNAUTHORIZED', message: 'Incorrect email or password' });
  });

  it('signs in with the right password, stores a hash and reports it in /me', async () => {
    const { id } = await accountWithPassword('login@example.com');
    const [row] = await db.select().from(users).where(eq(users.id, id));
    expect(row.passwordHash).toMatch(/^scrypt\$/);
    expect(row.passwordHash).not.toContain(PASSWORD);

    const session = await service.login('login@example.com', PASSWORD, null);
    expect((await service.authenticate(session.accessToken)).id).toBe(id);
    expect((await service.me(id)).hasPassword).toBe(true);
  });

  it('locks the account after 5 wrong passwords, even for the right one; a magic link unlocks it', async () => {
    await accountWithPassword('lock@example.com');
    for (let i = 0; i < 5; i++) await expect(service.login('lock@example.com', 'nope nope nope', null)).rejects.toBeDefined();
    await expect(service.login('lock@example.com', PASSWORD, null)).rejects.toMatchObject(unauthorized);

    await service.verify(await linkFor('lock@example.com', '10.9.0.1'), null);
    await expect(service.login('lock@example.com', PASSWORD, null)).resolves.toBeDefined();
  }, 30_000);

  it('a success resets the failure count', async () => {
    await accountWithPassword('reset@example.com');
    for (let i = 0; i < 4; i++) await expect(service.login('reset@example.com', 'bad bad bad', null)).rejects.toBeDefined();
    await service.login('reset@example.com', PASSWORD, null);
    for (let i = 0; i < 4; i++) await expect(service.login('reset@example.com', 'bad bad bad', null)).rejects.toBeDefined();
    await expect(service.login('reset@example.com', PASSWORD, null)).resolves.toBeDefined();
  }, 30_000);

  it('changing the password needs the current one and signs the other sessions out', async () => {
    const { id, session: old } = await accountWithPassword('change@example.com');
    await expect(service.setPassword(id, 'a brand new one', undefined, null)).rejects.toMatchObject({ response: { code: 'FORBIDDEN' } });
    await expect(service.setPassword(id, 'a brand new one', 'wrong', null)).rejects.toMatchObject({ response: { code: 'FORBIDDEN' } });

    const fresh = await service.setPassword(id, 'a brand new one', PASSWORD, null);
    await expect(service.refresh(old.refreshToken, null)).rejects.toMatchObject(unauthorized);
    await expect(service.refresh(fresh.refreshToken, null)).resolves.toBeDefined();
    await expect(service.login('change@example.com', PASSWORD, null)).rejects.toMatchObject(unauthorized);
    await expect(service.login('change@example.com', 'a brand new one', null)).resolves.toBeDefined();
  }, 30_000);
});
