import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// OWASP scrypt setting (N=2^16, r=8, p=2). Needs ~64 MB per hash, hence the raised maxmem.
const PARAMS = { N: 65536, r: 8, p: 2, maxmem: 256 * 1024 * 1024 } satisfies ScryptOptions;
const KEY_LENGTH = 64;

const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, PARAMS, (err, key) => (err ? reject(err) : resolve(key))),
  );

/** `scrypt$<salt>$<hash>` (base64). Parameters are fixed in code; change them with a new prefix. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await derive(password, salt)).toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
