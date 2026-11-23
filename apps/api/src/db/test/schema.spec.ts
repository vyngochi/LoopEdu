import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

// Runs every migration on an empty in-process Postgres (with pgvector), then probes the invariants.
let pg: PGlite;

beforeAll(async () => {
  pg = new PGlite({ extensions: { vector } });
  await migrate(drizzle(pg), { migrationsFolder: resolve(import.meta.dirname, '../../../drizzle') });
}, 60_000);
afterAll(() => pg.close());

const one = async (sql: string, params: unknown[] = []) =>
  (await pg.query<{ id: string }>(sql, params)).rows[0].id;

const newUser = (email: string) => one('insert into users (email) values ($1) returning id', [email]);
const newBlueprint = (version: number, status = 'draft') =>
  one(
    `insert into exam_blueprints (exam_type, version, status, rules_json, approved_by)
     values ('ielts', $1, $2, '{}', $3) returning id`,
    [version, status, null],
  );

/** topic -> question set -> version -> session -> learning item, for the review/voice tests. */
async function newLearningItem(tag: string) {
  const user = await newUser(`${tag}@example.com`);
  const topic = await one(`insert into topics (slug, name) values ($1, 'T') returning id`, [tag]);
  const set = await one(
    `insert into question_sets (topic_id, exam_type, section_code, difficulty)
     values ($1, 'ielts', 'ielts_p2', 'intermediate') returning id`,
    [topic],
  );
  const bp = await newBlueprint(Math.floor(Math.random() * 1e6));
  const version = await one(
    `insert into question_set_versions (question_set_id, version_no, blueprint_id, content_json, content_hash)
     values ($1, 1, $2, '{}', 'h') returning id`,
    [set, bp],
  );
  const session = await one(
    `insert into practice_sessions (user_id, question_set_version_id, status, completed_at, self_rating)
     values ($1, $2, 'completed', now(), 'good') returning id`,
    [user, version],
  );
  const item = await one(
    `insert into learning_items (user_id, question_set_version_id, anchor_local_date, anchor_timezone, first_session_id)
     values ($1, $2, '2026-11-23', 'Asia/Ho_Chi_Minh', $3) returning id`,
    [user, version, session],
  );
  return { user, version, session, item };
}

describe('migrations from an empty database', () => {
  it('create the 24 tables of spec section 11', async () => {
    const { rows } = await pg.query<{ n: number }>(
      `select count(*)::int as n from pg_tables where schemaname = 'public'`,
    );
    expect(rows[0].n).toBe(24);
  });

  it('index topic embeddings with HNSW and answer a cosine query', async () => {
    const { rows } = await pg.query(`select 1 from pg_indexes where indexname = 'topics_embedding_hnsw'`);
    expect(rows).toHaveLength(1);
    const vec = `[${Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0)).join(',')}]`;
    await pg.query(`insert into topics (slug, name, embedding) values ('vec-topic', 'V', $1)`, [vec]);
    const { rows: near } = await pg.query<{ slug: string }>(
      `select slug from topics order by embedding <=> $1 limit 1`,
      [vec],
    );
    expect(near[0].slug).toBe('vec-topic');
  });
});

describe('constraints', () => {
  it('rejects a section that does not belong to the exam', async () => {
    const topic = await one(`insert into topics (slug, name) values ('mismatch', 'M') returning id`);
    await expect(
      pg.query(
        `insert into question_sets (topic_id, exam_type, section_code, difficulty)
         values ($1, 'toeic', 'ielts_p1', 'beginner')`,
        [topic],
      ),
    ).rejects.toThrow(/question_sets_section_matches_exam/);
  });

  it('rejects a published set without a current version', async () => {
    const topic = await one(`insert into topics (slug, name) values ('nover', 'N') returning id`);
    await expect(
      pg.query(
        `insert into question_sets (topic_id, exam_type, section_code, difficulty, status)
         values ($1, 'ielts', 'ielts_p1', 'beginner', 'published')`,
        [topic],
      ),
    ).rejects.toThrow(/question_sets_published_has_version/);
  });

  it('allows one active blueprint per exam, and only with an approver', async () => {
    await expect(newBlueprint(9001, 'active')).rejects.toThrow(/exam_blueprints_active_approved/);
    const admin = await newUser('approver@example.com');
    const make = (version: number) =>
      pg.query(
        `insert into exam_blueprints (exam_type, version, status, rules_json, approved_by)
         values ('toeic', $1, 'active', '{}', $2)`,
        [version, admin],
      );
    await make(1);
    await expect(make(2)).rejects.toThrow(/exam_blueprints_one_active/);
  });

  it('lets a learning item exist once per user and version', async () => {
    const { user, version, session } = await newLearningItem('dup-item');
    await expect(
      pg.query(
        `insert into learning_items (user_id, question_set_version_id, anchor_local_date, anchor_timezone, first_session_id)
         values ($1, $2, '2026-11-24', 'UTC', $3)`,
        [user, version, session],
      ),
    ).rejects.toThrow(/learning_items_user_version_unique/);
  });

  it('keeps one review task per milestone and one pending extra task', async () => {
    const { item } = await newLearningItem('reviews');
    const scheduled = (days: number) =>
      pg.query(
        `insert into review_tasks (learning_item_id, kind, milestone_days, due_on)
         values ($1, 'scheduled', $2, '2026-12-01')`,
        [item, days],
      );
    await scheduled(3);
    await expect(scheduled(3)).rejects.toThrow(/review_tasks_item_milestone_unique/);
    await expect(scheduled(5)).rejects.toThrow(/review_tasks_kind_milestone/);

    const extra = () =>
      pg.query(`insert into review_tasks (learning_item_id, kind, due_on) values ($1, 'extra', '2026-11-24')`, [
        item,
      ]);
    await extra();
    await expect(extra()).rejects.toThrow(/review_tasks_one_pending_extra/);
    await pg.query(`update review_tasks set completed_at = now() where kind = 'extra' and learning_item_id = $1`, [
      item,
    ]);
    await extra(); // allowed again once the previous one is done
  });

  it('requires rating and time on a completed practice session', async () => {
    const { user, version } = await newLearningItem('incomplete');
    await expect(
      pg.query(
        `insert into practice_sessions (user_id, question_set_version_id, status) values ($1, $2, 'completed')`,
        [user, version],
      ),
    ).rejects.toThrow(/practice_sessions_completed_fields/);
  });

  it('deduplicates assessments by (user, idempotency key) and credits by request key', async () => {
    const { user } = await newLearningItem('voice');
    const assess = () =>
      pg.query(`insert into speaking_assessments (user_id, mode, idempotency_key) values ($1, 'free', 'k1')`, [user]);
    await assess();
    await expect(assess()).rejects.toThrow(/speaking_assessments_user_key_unique/);

    const credit = (key: string, period = '2026-11') =>
      pg.query(
        `insert into credit_ledger (user_id, period, entry_type, amount, request_key) values ($1, $2, 'grant', 5, $3)`,
        [user, period, key],
      );
    await credit('r1');
    await expect(credit('r1')).rejects.toThrow(/credit_ledger_request_key_unique/);
    await expect(credit('r2', '2026-13')).rejects.toThrow(/credit_ledger_period_format/);
  });

  it('stores a consent grant or a withdrawal, never both or neither', async () => {
    const user = await newUser('consent@example.com');
    const add = (cols: string) =>
      pg.query(`insert into consent_records (user_id, consent_type, policy_version, ${cols}) values ($1, 'voice', 'v1', now())`, [
        user,
      ]);
    await add('granted_at');
    await add('revoked_at');
    await expect(
      pg.query(`insert into consent_records (user_id, consent_type, policy_version) values ($1, 'voice', 'v1')`, [user]),
    ).rejects.toThrow(/consent_records_one_event/);
  });
});

describe('immutability triggers', () => {
  it('make credit_ledger, admin_audit_logs and consent_records append-only', async () => {
    const user = await newUser('ledger@example.com');
    const entry = await one(
      `insert into credit_ledger (user_id, period, entry_type, amount, request_key)
       values ($1, '2026-11', 'grant', 5, 'ledger-1') returning id`,
      [user],
    );
    await expect(pg.query(`update credit_ledger set amount = 99 where id = $1`, [entry])).rejects.toThrow(/append-only/);
    await expect(pg.query(`delete from credit_ledger where id = $1`, [entry])).rejects.toThrow(/append-only/);
    const log = await one(
      `insert into admin_audit_logs (actor_id, action, target_type) values ($1, 'x', 'user') returning id`,
      [user],
    );
    await expect(pg.query(`delete from admin_audit_logs where id = $1`, [log])).rejects.toThrow(/append-only/);
  });

  it('let the purge transaction delete a user together with their append-only rows', async () => {
    const user = await newUser('purge@example.com');
    await pg.query(
      `insert into credit_ledger (user_id, period, entry_type, amount, request_key) values ($1, '2026-11', 'grant', 5, 'purge-1')`,
      [user],
    );
    await expect(pg.query(`delete from users where id = $1`, [user])).rejects.toThrow(/append-only/);
    await pg.transaction(async (tx) => {
      await tx.query(`set local app.allow_purge = 'on'`);
      await tx.query(`delete from users where id = $1`, [user]);
    });
    const { rows } = await pg.query(`select 1 from credit_ledger where request_key = 'purge-1'`);
    expect(rows).toHaveLength(0);
  });

  it('freeze an active blueprint but still let it be retired', async () => {
    const admin = await newUser('freeze@example.com');
    const bp = await one(
      `insert into exam_blueprints (exam_type, version, status, rules_json, approved_by)
       values ('ielts', 500, 'active', '{"a":1}', $1) returning id`,
      [admin],
    );
    await expect(pg.query(`update exam_blueprints set rules_json = '{"a":2}' where id = $1`, [bp])).rejects.toThrow(
      /immutable/,
    );
    await expect(pg.query(`delete from exam_blueprints where id = $1`, [bp])).rejects.toThrow(/immutable/);
    await pg.query(`update exam_blueprints set status = 'retired' where id = $1`, [bp]);
  });

  it('freeze a published question set version', async () => {
    const { version } = await newLearningItem('frozen');
    await pg.query(`update question_set_versions set published_at = now() where id = $1`, [version]);
    await expect(
      pg.query(`update question_set_versions set content_json = '{"x":1}' where id = $1`, [version]),
    ).rejects.toThrow(/immutable/);
  });
});
