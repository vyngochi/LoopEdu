import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema/index.js';

/** Type of the injected database: `@InjectDrizzle() private readonly db: Database`. */
export type Database = NodePgDatabase<typeof schema>;

/** The handle inside `db.transaction(async (tx) => ...)`, for repository methods that join a caller's transaction. */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];
