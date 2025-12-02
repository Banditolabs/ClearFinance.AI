import type Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import type { Migration } from './types'

/*
1.Read all files under migrations/migrations/ ( const files)
2.Require them at runtime (const mod)
3.Expect a default export matching Migration  (const migration)
4.Sort by id
5.Run only missing migrations (tracked in schema_migrations table)
*/
function loadMigrations(): Migration[] {
  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d+_.*\.(js|ts)$/.test(file))
    .sort(); // We sort here because migrations take a timestamp prefix

    const migrations: Migration[] = []

    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(fullPath)
      const migration: Migration = mod.default ?? mod.migration ?? mod;

      if (
        !migration || 
        typeof migration.id !== 'number' ||
        typeof migration.name !== 'string' ||
        typeof migration.up !== 'function'
      ) {
        console.warn(`[migrations] Skipping invalid migration file: ${file}`);
        continue;
      }
      migrations.push(migration)
    }

    migrations.sort((a, b) => a.id - b.id)
    return migrations
}