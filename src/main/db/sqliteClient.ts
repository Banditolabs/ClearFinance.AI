import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import path from "path";
import { app } from "electron";
import { runMigrations } from "./migrations/runMigrations";

let db: BetterSqlite3.Database | null = null;

function getDbPath(): string {
  const userDataDir = app.getPath("userData");
  return path.join(userDataDir, "clearfinance.sqlite");
}

export function getDb(): BetterSqlite3.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

export function initDb(
  logger: (msg: string) => void = console.log
): BetterSqlite3.Database {
  if (db) return db;

  const dbPath = getDbPath();
  logger(`Opening database at ${dbPath}`);

  db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const result = runMigrations(db, {
    downgradeGuard: true,
    integrityCheck: "quick",
    logger,
  });

  if (result.appliedNow.length > 0) {
    logger(`Applied ${result.appliedNow.length} migration(s): ${result.appliedNow.join(", ")}`);
  } else {
    logger("Database schema is up to date.");
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}



