import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose';
import * as schema from '../../db/schema/index.js';
import type { Database } from '../../db/database.js';

/** In-process Postgres with every migration applied. The cast is safe: both drivers share Drizzle's query API. */
export async function createTestDb() {
  const pg = new PGlite({ extensions: { vector } });
  const db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: resolve(import.meta.dirname, '../../../drizzle') });
  return { db: db as unknown as Database, close: () => pg.close() };
}

/** Sets a fresh RS256 key pair in the env so AccessTokenService can sign. */
export async function setTestJwtKeys() {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  process.env.JWT_PRIVATE_KEY = await exportPKCS8(privateKey);
  process.env.JWT_PUBLIC_KEY = await exportSPKI(publicKey);
}
