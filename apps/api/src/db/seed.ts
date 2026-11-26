// Dev/staging seed: one admin, one editor, one learner and a starter topic. Safe to run repeatedly.
// Real content (blueprints, frameworks, question sets) comes from B05/B06/B25, not from here.
// Run with `node src/db/seed.ts` (Node 24 strips the types), so keep this file free of local imports.
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import pg from 'pg';
import { DEFAULT_BLUEPRINT_RULES } from '@loopedu/shared';

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

const SETS = [
  {
    slug: 'technology',
    topic: 'Technology',
    examType: 'ielts',
    section: 'ielts_p2',
    difficulty: 'intermediate',
    content: {
      prompt: 'Describe a piece of technology you use regularly.',
      cue_points: ['what it is', 'when you started using it', 'how you use it', 'why it is important to you'],
      prep_seconds: 60,
      speaking_seconds: 120,
      idea_hints: ['daily communication', 'study English', 'organise tasks'],
      useful_expressions: ['part of my daily routine', 'particularly useful'],
      sample_answer:
        'I would like to talk about my smartphone. I started using it three years ago, and it is part of my daily routine. I am {{name}}, and in {{city}} I use it to study English every day.',
      personalization_defaults: { name: 'a learner', city: 'my city', occupation: 'a student', hobby: 'reading' },
    },
  },
  {
    slug: 'technology',
    topic: 'Technology',
    examType: 'ielts',
    section: 'ielts_p1',
    difficulty: 'beginner',
    content: {
      questions: ['Do you use a computer every day?', 'What do you usually use your phone for?', 'Is technology important to you?'],
      sample_answer: 'Yes, I use my laptop every day for study and work.',
      personalization_defaults: { name: 'a learner', city: 'my city', occupation: 'a student', hobby: 'reading' },
    },
  },
  {
    slug: 'library-events',
    topic: 'Library events',
    examType: 'toeic',
    section: 'toeic_respond_info',
    difficulty: 'beginner',
    content: {
      info_table: {
        title: 'Riverside Library – Weekend Workshops',
        rows: [
          ['Sat 9:00', 'Resume writing', 'Room A'],
          ['Sat 14:00', 'Public speaking', 'Room B'],
        ],
      },
      read_seconds: 45,
      questions: [
        { text: 'What time does the resume writing workshop start?', prep_seconds: 3, response_seconds: 15 },
        { text: 'Where is the public speaking workshop held?', prep_seconds: 3, response_seconds: 15 },
        { text: 'Tell me about all the workshops on Saturday.', prep_seconds: 3, response_seconds: 30 },
      ],
      sample_answers: [
        'The resume writing workshop starts at nine on Saturday morning.',
        'It is held in Room B.',
        'There are two workshops on Saturday. Resume writing is at nine in Room A, and public speaking is at two in Room B.',
      ],
    },
  },
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
  // Version 1 of each blueprint, active and approved by the dev admin. Production gets blueprints through
  // the admin API after the TOEIC structure is checked against ETS (PRD risk table).
  for (const examType of ['ielts', 'toeic'] as const) {
    await client.query(
      `insert into exam_blueprints (exam_type, version, status, rules_json, approved_by)
       values ($1, 1, 'active', $2, (select id from users where email = $3))
       on conflict (exam_type, version) do nothing`,
      [examType, JSON.stringify(DEFAULT_BLUEPRINT_RULES[examType]), USERS[0].email],
    );
  }
  // Published sample sets (PRD tech 11.3 examples) so the catalog has something to show. Skipped when the
  // topic already has a set for that section, so the seed stays repeatable.
  for (const s of SETS) {
    await client.query(
      `insert into topics (slug, name, status, origin) values ($1, $2, 'published', 'admin') on conflict (slug) do nothing`,
      [s.slug, s.topic],
    );
    const { rows: existing } = await client.query(
      `select 1 from question_sets qs join topics t on t.id = qs.topic_id where t.slug = $1 and qs.section_code = $2`,
      [s.slug, s.section],
    );
    if (existing.length > 0) continue;
    const content = { topic: s.topic, difficulty: s.difficulty, ...s.content };
    const { rows: [set] } = await client.query<{ id: string }>(
      `insert into question_sets (topic_id, exam_type, section_code, difficulty)
       values ((select id from topics where slug = $1), $2, $3, $4) returning id`,
      [s.slug, s.examType, s.section, s.difficulty],
    );
    const json = JSON.stringify(content);
    const { rows: [version] } = await client.query<{ id: string }>(
      `insert into question_set_versions (question_set_id, version_no, blueprint_id, content_json, content_hash, published_at)
       values ($1, 1, (select id from exam_blueprints where exam_type = $2 and status = 'active'), $3, $4, now()) returning id`,
      [set.id, s.examType, json, createHash('sha256').update(json).digest('hex')],
    );
    await client.query(`update question_sets set current_version_id = $1, status = 'published' where id = $2`, [
      version.id,
      set.id,
    ]);
  }
  await client.query('commit');
  console.log(`Seeded ${USERS.length} users, ${SETS.length} sets and 2 blueprints (${env})`);
} catch (e) {
  await client.query('rollback');
  throw e;
} finally {
  await client.end();
}
