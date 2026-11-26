import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export interface GoogleIdentity {
  email: string;
  emailVerified: boolean;
}

/** Checks a Google ID token (signature, issuer, audience, expiry). Null for anything not valid. */
@Injectable()
export class GoogleIdTokenVerifier {
  async verify(idToken: string): Promise<GoogleIdentity | null> {
    const audience = process.env.GOOGLE_CLIENT_ID;
    if (!audience) throw new Error('GOOGLE_CLIENT_ID is not set');
    try {
      const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience,
        algorithms: ['RS256'],
      });
      if (typeof payload.email !== 'string') return null;
      return { email: payload.email.toLowerCase(), emailVerified: payload.email_verified === true };
    } catch {
      return null;
    }
  }
}
