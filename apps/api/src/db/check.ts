// Checks that DATABASE_URL is reachable. Exit code 0 = connected, 1 = failed.
// Run with `node src/db/check.ts` (Node 24 strips the types), so keep this file free of local imports.
import { resolve } from 'node:path';
import pg from 'pg';

try {
  process.loadEnvFile(resolve(import.meta.dirname, '../../../../.env'));
} catch {
  // No .env file: rely on the environment.
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('FAIL  DATABASE_URL is not set');
  process.exit(1);
}

const { hostname, port, pathname } = new URL(url);
const target = `${hostname}:${port || 5432}${pathname}`; // never print the password

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
try {
  await client.connect();
  const { rows } = await client.query<{ version: string; user: string; vector: string | null; tables: string }>(`
    select current_setting('server_version') as version,
           current_user as user,
           (select extversion from pg_extension where extname = 'vector') as vector,
           (select count(*) from pg_tables where schemaname = 'public') as tables`);
  const r = rows[0];
  console.log(`OK    ${target}`);
  console.log(`      PostgreSQL ${r.version}, user ${r.user}, pgvector ${r.vector ?? 'not enabled'}, ${r.tables} tables`);
} catch (e) {
  const err = e as Error & { code?: string; errors?: Error[] };
  // "localhost" tries IPv6 and IPv4; the AggregateError then has an empty message of its own.
  const message = err.message || err.errors?.map((x) => x.message).join('; ');
  console.error(`FAIL  ${target}`);
  console.error(`      ${err.code ? `${err.code}: ` : ''}${message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
