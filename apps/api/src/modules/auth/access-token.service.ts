import { Injectable } from '@nestjs/common';
import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'jose';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Signs and verifies the 15-minute access JWT (RS256). Keys are read from the env on first use. */
@Injectable()
export class AccessTokenService {
  private privateKey?: ReturnType<typeof importPKCS8>;
  private publicKey?: ReturnType<typeof importSPKI>;

  // PEM keys in .env often carry literal "\n" instead of line breaks.
  private pem(name: 'JWT_PRIVATE_KEY' | 'JWT_PUBLIC_KEY') {
    const value = process.env[name]?.replace(/\\n/g, '\n');
    if (!value) throw new Error(`${name} is not set`);
    return value;
  }

  sign(userId: string): Promise<string> {
    this.privateKey ??= importPKCS8(this.pem('JWT_PRIVATE_KEY'), 'RS256');
    return this.privateKey.then((key) =>
      new SignJWT()
        .setProtectedHeader({ alg: 'RS256' })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
        .sign(key),
    );
  }

  /** Returns the user id, or null for a bad, forged or expired token. */
  async verify(token: string): Promise<string | null> {
    this.publicKey ??= importSPKI(this.pem('JWT_PUBLIC_KEY'), 'RS256');
    try {
      const { payload } = await jwtVerify(token, await this.publicKey, { algorithms: ['RS256'] });
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
