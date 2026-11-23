import { hashPassword, verifyPassword } from '../password.js';

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const stored = await hashPassword('s3cret passphrase');
    expect(await verifyPassword('s3cret passphrase', stored)).toBe(true);
    expect(await verifyPassword('s3cret passphrasf', stored)).toBe(false);
  });

  it('salts: the same password hashes differently each time', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('treats a malformed stored value as a mismatch instead of throwing', async () => {
    expect(await verifyPassword('x', 'plaintext')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$a$b')).toBe(false);
  });
});
