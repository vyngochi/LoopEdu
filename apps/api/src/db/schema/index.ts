// Drizzle schema = source of truth for the database (PRD tech tab, section 11): 24 tables.
// One file per domain; enums and the shared `createdAt` column are split out so files never import each other in a loop.
// Rules SQL cannot express here (append-only, immutable once active/published) are triggers in drizzle/0003_invariants.sql.
export * from './enums.js';
export * from './identity.js';
export * from './catalog.js';
export * from './learning.js';
export * from './usage.js';
export * from './audit.js';
