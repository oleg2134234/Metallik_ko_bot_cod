// There is no Cloudflare account access in this environment (no `wrangler login`),
// so migrations can't be applied with `wrangler d1 execute`/`migrations apply`, and
// `drizzle-orm/d1/migrator` can't read files from disk once this runs inside a deployed
// Worker isolate. Instead, migration SQL is inlined at build time via `?raw` and applied
// idempotently on first use, so both local dev (`vinext dev`) and a freshly deployed
// Worker self-heal their schema on the first request that touches the database.
const migrationModules = import.meta.glob('../drizzle/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

let ready: Promise<void> | null = null;

export function ensureSchema(db: D1Database): Promise<void> {
  if (!ready) {
    ready = applyMigrations(db).catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function applyMigrations(db: D1Database) {
  const files = Object.keys(migrationModules).sort();
  const statements = files.flatMap((file) => toIdempotentStatements(migrationModules[file]));
  if (statements.length === 0) return;
  await db.batch(statements.map((sql) => db.prepare(sql)));
}

function toIdempotentStatements(sql: string): string[] {
  return sql
    .split('--> statement-breakpoint')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0 && !chunk.toUpperCase().startsWith('PRAGMA'))
    .map((chunk) =>
      chunk
        .replace(/^CREATE TABLE `/, 'CREATE TABLE IF NOT EXISTS `')
        .replace(/^CREATE INDEX `/, 'CREATE INDEX IF NOT EXISTS `'),
    );
}
