import type BetterSqlite3 from "better-sqlite3";
import {migrations, migrationIds } from "./index"

export type IntegrityCheckMode = "off" | "quick" | "full";

export type RunMigrationsOptions = {
  downgradeGuard?: boolean,
  integrityCheck?: IntegrityCheckMode,
  logger?: (msg: string) => void,
};

export type RunMigrationResult = {
  appliedNow: string[],
  alreadyApplied: string[],
};

export function runMigrations(
  db: BetterSqlite3.Database,
  opts: RunMigrationsOptions = {}
): RunMigrationResult {
  const {
    downgradeGuard = true,
    integrityCheck = "off",
    logger = () => {},
  } = opts

  db.pragma("foreign_keys = ON")

  db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedRows = db
    .prepare(`SELECT id FROM schema_migrations ORDER BY id`)
    .all() as Array<string>

  const alreadyApplied = appliedRows.map((r) => r.id);
  const appliedSet = new Set(alreadyApplied);

  if (downgradeGuard) {
    const known = new Set(migrationIds);
    const unknown = alreadyApplied.filter((id) => !known.has(id));
    if (unkown.length > 0) {
      throw new Error(
        `Database schema is newer than this app build. ` +
        `Unknown migration(s): ${unknown.join(", ")}. ` +
        `Please update the app to a newer version.`
      );
    }
  }
  const insertApplied = db.prepare(`
    INSERT INTO schema_migrations (id) VALUES (?)
  `)

  const appliedNow: string[] = []

  const tx = db.transaction(() => {
    for (const m of migrations) {
      if (appliedSet.has(m.id)) continue;

      logger(
        `Applying migration ${m.id}${m.description ? ` (${m.description})` : ""}...`
      )

      db.exec(m.up);
      insertApplied.run(m.id);

      appliedSet.add(m.id);
      appliedNow.push(m.id);
    }

    const fkIssues = db.pragma("foreign_key_check") as unknown[];
    if (fkIssues.length > 0) {
      throw new Error(
        `Foreign key check failed after migrations. ` +
        `First issue: ${JSON.stringify(fkIssues[0])}`
      );
    }
  });

  tx();

  if (integrityCheck !== "off") {
    const pragma =
      integrityCheck !== "quick" ? "quick_check" : "integrity_check";
    const rows = db.pragma(pragma) as any
    const first = rows?.[0];
    const value = first ? Object.values(first)[0] : undefined;
    if (value !== "ok") {
      throw new Error(`PRAGMA ${pragma} failed: ${String(value)}`);
    }
  }
  return {
    appliedNow,
    alreadyApplied,
  };
}
