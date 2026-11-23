// Dev/staging seed: one admin, one editor, one learner and a starter topic. Safe to run repeatedly.
// Real content (blueprints, frameworks, question sets) comes from B05/B06/B25, not from here.
// Run with `node src/db/seed.ts` (Node 24 strips the types), so keep this file free of local imports.
import { resolve } from 'node:path';
import pg from 'pg';

try {
  process.loadEnvFile(resolve(import.meta.dirname, '../../../../.env'));
} catch {
  // No .env file: rely on the environment.
}

const env = process.env.APP_ENV ?? 'local';
if (!['local', 'staging'].includes(env)) {
  console.error(`Refusing to seed APP_ENV=${env}: production starts clean.`);
  process.exit(1);
}
const url = process.env.DATABASE_MIGRATION_URL;
if (!url) throw new Error('DATABASE_MIGRATION_URL is not set');

const USERS = [
  { email: 'admin@loopedu.local', role: 'admin', name: 'Dev Admin' },
  { email: 'editor@loopedu.local', role: 'editor', name: 'Dev Editor' },
  { email: 'learner@loopedu.local', role: 'learner', name: 'Dev Learner' },
] as const;

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query('begin');
  for (const u of USERS) {
    const { rows } = await client.query<{ id: string }>(
      `insert into users (email, email_verified_at) values ($1, now())
       on conflict (email) do update set email = excluded.email returning id`,
      [u.email],
    );
    const id = rows[0].id;
    await client.query(
      `insert into profiles (user_id, display_name, timezone, exam_track, birth_year)
       values ($1, $2, 'Asia/Ho_Chi_Minh', 'ielts', 1999) on conflict do nothing`,
      [id, u.name],
    );
    await client.query(
      `insert into user_roles (user_id, role) values ($1, $2) on conflict do nothing`,
      [id, u.role],
    );
  }
  await client.query(
    `insert into topics (slug, name, status, origin) values ('technology', 'Technology', 'published', 'admin')
     on conflict (slug) do nothing`,
  );
  await client.query('commit');
  console.log(`Seeded ${USERS.length} users and 1 topic (${env})`);
} catch (e) {
  await client.query('rollback');
  throw e;
} finally {
  await client.end();
}
