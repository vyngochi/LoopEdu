// Applies pending SQL migrations from apps/api/drizzle. Runs on every deploy, before the API starts.
// Uses DATABASE_MIGRATION_URL (a DB user allowed to change the schema); the app itself uses DATABASE_URL.
// Run with `node src/db/migrate.ts` (Node 24 strips the types), so keep this file free of local imports.
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

try {
  process.loadEnvFile(resolve(import.meta.dirname, '../../../../.env'));
} catch {
  // No .env file: rely on the environment.
}

const url = process.env.DATABASE_MIGRATION_URL;
if (!url) throw new Error('DATABASE_MIGRATION_URL is not set');

const db = drizzle(url);
try {
  await migrate(db, { migrationsFolder: resolve(import.meta.dirname, '../../drizzle') });
  console.log('Migrations applied');
} finally {
  await db.$client.end();
}
