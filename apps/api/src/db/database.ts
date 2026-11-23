import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema/index.js';

/** Type of the injected database: `@InjectDrizzle() private readonly db: Database`. */
export type Database = NodePgDatabase<typeof schema>;
