import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { app } from "electron";

let db: Database.Database | null = null;

function ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function resolveDbPath() {
    // Production: per-user app data directory
    const userDataDir = app.getPath("userData");
    const dbDir = path.join(userDataDir, "database");
    ensureDir(dbDir);
    return path.join(dbDir, "finance.db");
}

export function getDb(): Database.Database {
    if (db) return db;

    const dbPath = resolveDbPath();

    db = new Database(dbPath);

    // Production defaults (safe + stable)
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");

    // Create tables (no migrations for now)
    initializeSchema(db);

    return db;
}

export function closeDb() {
    if (!db) return;
    db.close();
    db = null;
}

function initializeSchema(db: Database.Database) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      institution TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      category TEXT,
      raw_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_account_date
      ON transactions (account_id, date);
  `);
}
