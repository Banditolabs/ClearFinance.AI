import type { Migration } from "./types";

const m_20260331194356_initial_schema: Migration = {
  id: "20260331194356_initial_schema",
  description: "initial schema",
  up: `
    -- -------------------------------------------------------------------------
    -- Households: top-level container — one per install
    -- -------------------------------------------------------------------------
    CREATE TABLE households (
      id          INTEGER PRIMARY KEY,
      name        TEXT    NOT NULL DEFAULT 'My Household',
      currency    TEXT    NOT NULL DEFAULT 'USD',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- -------------------------------------------------------------------------
    -- Profiles: household members
    -- First profile created = admin (enforced in application code)
    -- -------------------------------------------------------------------------
    CREATE TABLE profiles (
      id                    INTEGER PRIMARY KEY,
      household_id          INTEGER NOT NULL REFERENCES households(id),
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
      profile_id     INTEGER NOT NULL REFERENCES profiles(id),
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
      id                       INTEGER PRIMARY KEY,
      profile_id               INTEGER NOT NULL REFERENCES profiles(id),
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
      id          INTEGER PRIMARY KEY,
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
      id                 INTEGER PRIMARY KEY,
      profile_id         INTEGER NOT NULL REFERENCES profiles(id),
      bank_account_id    INTEGER REFERENCES bank_accounts(id),
      amount_pence       INTEGER NOT NULL CHECK(amount_pence > 0),
      type               TEXT    NOT NULL CHECK(type IN ('expense', 'income')),
      category_id        INTEGER REFERENCES categories(id),
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
      id           INTEGER PRIMARY KEY,
      profile_id   INTEGER NOT NULL REFERENCES profiles(id),
      category_id  INTEGER NOT NULL REFERENCES categories(id),
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
      id          INTEGER PRIMARY KEY,
      profile_id  INTEGER REFERENCES profiles(id),
      action      TEXT    NOT NULL,
      entity_type TEXT,
      entity_id   INTEGER,
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
    INSERT INTO categories (name, is_system) VALUES
      ('Groceries',     1),
      ('Dining Out',    1),
      ('Transport',     1),
      ('Housing',       1),
      ('Utilities',     1),
      ('Healthcare',    1),
      ('Entertainment', 1),
      ('Shopping',      1),
      ('Personal Care', 1),
      ('Education',     1),
      ('Travel',        1),
      ('Insurance',     1),
      ('Savings',       1),
      ('Income',        1),
      ('Other',         1);
  `,
};

export default m_20260331194356_initial_schema;
