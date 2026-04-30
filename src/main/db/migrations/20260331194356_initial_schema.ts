import type { Migration } from "./types";

const m_20260331194356_initial_schema: Migration = {
  id: "20260331194356_initial_schema",
  description: "initial schema",
  up: `
    -- -------------------------------------------------------------------------
    -- Households: top-level container — one per install
    -- -------------------------------------------------------------------------
    CREATE TABLE households (
      id          TEXT PRIMARY KEY,
      name        TEXT    NOT NULL DEFAULT 'My Household',
      currency    TEXT    NOT NULL DEFAULT 'USD',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- -------------------------------------------------------------------------
    -- Profiles: household members
    -- First profile created = admin (enforced in application code)
    -- -------------------------------------------------------------------------
    CREATE TABLE profiles (
      id                    TEXT PRIMARY KEY,
      household_id          TEXT NOT NULL REFERENCES households(id),
      name                  TEXT    NOT NULL,
      email                 TEXT    NOT NULL UNIQUE,
      password_hash         TEXT    NOT NULL,
      role                  TEXT    NOT NULL DEFAULT 'member'
                                    CHECK(role IN ('admin', 'member')),
      recovery_code_hash    TEXT,           -- admin only; shown once at creation
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until          INTEGER,        -- unix timestamp; NULL = not locked
      deleted_at            INTEGER,
      created_at            INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at            INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- -------------------------------------------------------------------------
    -- Sessions: active login sessions
    -- -------------------------------------------------------------------------
    CREATE TABLE sessions (
      id             TEXT    PRIMARY KEY,   -- random token
      profile_id     TEXT NOT NULL REFERENCES profiles(id),
      created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at     INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- -------------------------------------------------------------------------
    -- Bank accounts: assigned to a profile; transactions visible to all
    -- account_number_encrypted and sort_code_encrypted are encrypted at the
    -- application layer before storage — never stored in plain text
    -- -------------------------------------------------------------------------
    CREATE TABLE bank_accounts (
      id                       TEXT PRIMARY KEY,
      profile_id               TEXT NOT NULL REFERENCES profiles(id),
      name                     TEXT    NOT NULL,
      account_number_encrypted TEXT,
      sort_code_encrypted      TEXT,
      deleted_at               INTEGER,
      created_at               INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at               INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- -------------------------------------------------------------------------
    -- Categories: system defaults + user-created
    -- is_system = 1 rows are seeded below and cannot be deleted
    -- -------------------------------------------------------------------------
    CREATE TABLE categories (
      id          TEXT PRIMARY KEY,
      name        TEXT    NOT NULL UNIQUE,
      is_system   INTEGER NOT NULL DEFAULT 0,
      deleted_at  INTEGER,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- -------------------------------------------------------------------------
    -- Transactions: core data
    -- amount_pence stores value as the smallest currency unit (pence, cents, etc.)
    -- to avoid floating point issues entirely
    -- category_confirmed: 0 = AI suggestion pending user review, 1 = confirmed
    -- -------------------------------------------------------------------------
    CREATE TABLE transactions (
      id                 TEXT PRIMARY KEY,
      profile_id         TEXT NOT NULL REFERENCES profiles(id),
      bank_account_id    TEXT REFERENCES bank_accounts(id),
      amount_pence       INTEGER NOT NULL CHECK(amount_pence > 0),
      type               TEXT    NOT NULL CHECK(type IN ('expense', 'income')),
      category_id        TEXT REFERENCES categories(id),
      category_confirmed INTEGER NOT NULL DEFAULT 0,
      description        TEXT,
      note               TEXT,
      date               INTEGER NOT NULL,  -- unix timestamp of transaction date
      deleted_at         INTEGER,
      created_at         INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at         INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- -------------------------------------------------------------------------
    -- Budgets: per profile per category; set after sufficient transaction history
    -- -------------------------------------------------------------------------
    CREATE TABLE budgets (
      id           TEXT PRIMARY KEY,
      profile_id   TEXT NOT NULL REFERENCES profiles(id),
      category_id  TEXT NOT NULL REFERENCES categories(id),
      amount_pence INTEGER NOT NULL CHECK(amount_pence > 0),
      period       TEXT    NOT NULL DEFAULT 'monthly'
                           CHECK(period IN ('monthly', 'weekly')),
      created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at   INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(profile_id, category_id, period)
    );

    -- -------------------------------------------------------------------------
    -- Audit log: who did what and when — admin-visible, never deleted
    -- profile_id may be NULL for system-level events
    -- metadata is a JSON blob for additional context
    -- -------------------------------------------------------------------------
    CREATE TABLE audit_log (
      id          TEXT PRIMARY KEY,
      profile_id  TEXT REFERENCES profiles(id),
      action      TEXT    NOT NULL,
      entity_type TEXT,
      entity_id   TEXT,
      metadata    TEXT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- -------------------------------------------------------------------------
    -- Indexes
    -- -------------------------------------------------------------------------
    CREATE INDEX idx_transactions_profile_id  ON transactions(profile_id);
    CREATE INDEX idx_transactions_date        ON transactions(date);
    CREATE INDEX idx_transactions_category_id ON transactions(category_id);
    CREATE INDEX idx_sessions_profile_id      ON sessions(profile_id);
    CREATE INDEX idx_sessions_expires_at      ON sessions(expires_at);
    CREATE INDEX idx_audit_log_profile_id     ON audit_log(profile_id);
    CREATE INDEX idx_audit_log_created_at     ON audit_log(created_at);

    -- -------------------------------------------------------------------------
    -- Seed: system categories (is_system = 1, cannot be deleted)
    -- -------------------------------------------------------------------------
    INSERT INTO categories (id, name, is_system) VALUES
      ('4596d610-763f-46ad-b3c7-b00a6f3212c3', 'Groceries',     1),
      ('9c108d31-6ea7-4e31-95b1-52f7040541ed', 'Dining Out',    1),
      ('0a670028-83d1-4c74-95ac-1da0e18f11e4', 'Transport',     1),
      ('66165a04-ae86-41a6-8319-8b7bba79905a', 'Housing',       1),
      ('fee1a4a2-a7d2-4a0a-839f-f6d6282d47d4', 'Utilities',     1),
      ('a8115ed8-50a3-4200-924e-a0e1552cfdd7', 'Healthcare',    1),
      ('e751ea64-181a-43e3-9254-d14f1f46a36d', 'Entertainment', 1),
      ('6fb5be0a-534a-41d1-9a60-449a0ff6e9f6', 'Shopping',      1),
      ('5cda74b9-3ac5-4e38-8260-77b6d9056792', 'Personal Care', 1),
      ('89def4db-9011-43c4-a3be-02db05c948a6', 'Education',     1),
      ('4d936bf0-2cc4-4e9b-a01b-790c1705dd87', 'Travel',        1),
      ('a98327ec-8cca-4e53-bd31-636dfb919365', 'Insurance',     1),
      ('88a192ed-e9c6-49f3-a478-abff9d3d98ee', 'Savings',       1),
      ('d7831a0c-d81e-4bbc-9146-9e42d90ca489', 'Income',        1),
      ('1a6cdb3c-d9f4-4722-a03a-10f0fece6c97', 'Other',         1);
  `
};

export default m_20260331194356_initial_schema;
