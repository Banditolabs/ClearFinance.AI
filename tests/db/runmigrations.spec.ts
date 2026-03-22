import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import { runMigrations } from "../../src/main/db/migrations/runMigrations";

// ─── Helpers ──────────────────────────────────────────────

function makeMigration(id: string, up: string) {
  return { id, up };
}

let testMigrations: Array<{ id: string; up: string; description?: string }> = [];

vi.mock("../../src/main/db/migrations/index", () => ({
  get migrations() {
    return testMigrations;
  },
  get migrationIds() {
    return testMigrations.map((m) => m.id);
  },
}));

// ─── Tests ────────────────────────────────────────────────

describe("runMigrations", () => {
  let db: BetterSqlite3.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    testMigrations = [];
  });

  it("creates the schema_migrations table", () => {
    runMigrations(db);

    const table = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`
      )
      .get() as { name: string } | undefined;

    expect(table).toBeDefined();
    expect(table!.name).toBe("schema_migrations");
  });

  it("applies pending migrations and records them", () => {
    testMigrations = [
      makeMigration("001_create_users", `
        CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      `),
    ];

    const result = runMigrations(db);

    expect(result.appliedNow).toEqual(["001_create_users"]);
    expect(result.alreadyApplied).toEqual([]);

    // Table was actually created
    const row = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`)
      .get() as { name: string } | undefined;
    expect(row).toBeDefined();

    // Migration was recorded
    const recorded = db
      .prepare(`SELECT id FROM schema_migrations`)
      .all() as Array<{ id: string }>;
    expect(recorded.map((r) => r.id)).toEqual(["001_create_users"]);
  });

  it("skips already-applied migrations", () => {
    testMigrations = [
      makeMigration("001_create_users", `
        CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      `),
    ];

    runMigrations(db);

    const result = runMigrations(db);

    expect(result.appliedNow).toEqual([]);
    expect(result.alreadyApplied).toEqual(["001_create_users"]);
  });

  it("applies only new migrations on subsequent runs", () => {
    testMigrations = [
      makeMigration("001_create_users", `
        CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      `),
    ];

    runMigrations(db);

    testMigrations = [
      makeMigration("001_create_users", `
        CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      `),
      makeMigration("002_create_posts", `
        CREATE TABLE posts (id TEXT PRIMARY KEY, title TEXT NOT NULL);
      `),
    ];

    const result = runMigrations(db);

    expect(result.appliedNow).toEqual(["002_create_posts"]);
    expect(result.alreadyApplied).toEqual(["001_create_users"]);
  });

  it("applies multiple migrations in order", () => {
    testMigrations = [
      makeMigration("001_create_users", `
        CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      `),
      makeMigration("002_add_email", `
        ALTER TABLE users ADD COLUMN email TEXT;
      `),
    ];

    const result = runMigrations(db);

    expect(result.appliedNow).toEqual(["001_create_users", "002_add_email"]);

    const info = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
    const columns = info.map((c) => c.name);
    expect(columns).toContain("email");
  });

  it("rolls back all migrations if one fails", () => {
    testMigrations = [
      makeMigration("001_create_users", `
        CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      `),
      makeMigration("002_bad_migration", `
        THIS IS NOT VALID SQL;
      `),
    ];

    expect(() => runMigrations(db)).toThrow();

    // schema_migrations exists (created outside the transaction) but should have no rows
    const rows = db.prepare(`SELECT id FROM schema_migrations`).all();
    expect(rows).toEqual([]);

    // The users table should not exist (rolled back)
    const usersTable = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`)
      .get();
    expect(usersTable).toBeUndefined();
  });

  describe("downgrade guard", () => {
    it("throws when the DB has unknown migrations", () => {
      testMigrations = [
        makeMigration("001_create_users", `
          CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        `),
      ];

      runMigrations(db);

      db.prepare(`INSERT INTO schema_migrations (id) VALUES (?)`).run("999_future");

      testMigrations = [
        makeMigration("001_create_users", `
          CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        `),
      ];

      expect(() => runMigrations(db, { downgradeGuard: true })).toThrow(
        /newer than this app build/
      );
    });

    it("does not throw when guard is disabled", () => {
      testMigrations = [
        makeMigration("001_create_users", `
          CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        `),
      ];

      runMigrations(db);

      db.prepare(`INSERT INTO schema_migrations (id) VALUES (?)`).run("999_future");

      testMigrations = [
        makeMigration("001_create_users", `
          CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        `),
      ];

      expect(() => runMigrations(db, { downgradeGuard: false })).not.toThrow();
    });
  });

  describe("foreign key check", () => {
    it("rolls back if a migration introduces FK violations", () => {
      testMigrations = [
        makeMigration("001_setup", `
          CREATE TABLE authors (id TEXT PRIMARY KEY);
          CREATE TABLE books (
            id TEXT PRIMARY KEY,
            author_id TEXT NOT NULL REFERENCES authors(id)
          );
        `),
        makeMigration("002_bad_data", `
          INSERT INTO books (id, author_id) VALUES ('book1', 'nonexistent');
        `),
      ];

      expect(() => runMigrations(db)).toThrow(/FOREIGN KEY constraint faile/i);

      const rows = db.prepare(`SELECT id FROM schema_migrations`).all();
      expect(rows).toEqual([]);
    });
  });

  describe("integrity check", () => {
    it("runs quick check without error on a healthy DB", () => {
      testMigrations = [
        makeMigration("001_create_users", `
          CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        `),
      ];

      expect(() =>
        runMigrations(db, { integrityCheck: "quick" })
      ).not.toThrow();
    });

    it("runs full check without error on a healthy DB", () => {
      testMigrations = [
        makeMigration("001_create_users", `
          CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        `),
      ];

      expect(() =>
        runMigrations(db, { integrityCheck: "full" })
      ).not.toThrow();
    });
  });

  describe("logger", () => {
    it("calls the logger for each applied migration", () => {
      const logs: string[] = [];

      testMigrations = [
        makeMigration("001_create_users", `
          CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        `),
      ];

      runMigrations(db, { logger: (msg) => logs.push(msg) });

      expect(logs.length).toBe(1);
      expect(logs[0]).toContain("001_create_users");
    });

    it("does not log when no migrations are pending", () => {
      const logs: string[] = [];

      testMigrations = [
        makeMigration("001_create_users", `
          CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        `),
      ];

      runMigrations(db);
      runMigrations(db, { logger: (msg) => logs.push(msg) });

      expect(logs).toEqual([]);
    });
  });
});
