import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile(resolve(import.meta.dirname, '../../.env'));
} catch {
  // No .env file: rely on the environment.
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  // Only needed by commands that talk to the DB (studio, check against a live DB); generate works offline.
  dbCredentials: { url: process.env.DATABASE_MIGRATION_URL ?? '' },
  strict: true,
});
