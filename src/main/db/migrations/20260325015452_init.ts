import type { Migration } from "./types";

const m_20260325015452_init: Migration = {
  id: "20260325015452_init",
  description: "init",
  up: `
    CREATE TABLE profiles (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  avatar_color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  institution TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  last_four TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CREATE TABLE profile_accounts (
--   id INTEGER PRIMARY KEY,
--   profile_id INTEGER NOT NULL,
--   account_id INTEGER NOT NULL,
--   relationship TEXT,
--   created_at TEXT NOT NULL DEFAULT (datetime('now')),
--   FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
--   FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
--   UNIQUE (profile_id, account_id)
-- );

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  category_id INTEGER,
  profile_id INTEGER,
  posted_at TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_profile_id ON transactions(profile_id);
CREATE INDEX idx_transactions_posted_at ON transactions(posted_at);
CREATE INDEX idx_profile_accounts_profile_id ON profile_accounts(profile_id);
CREATE INDEX idx_profile_accounts_account_id ON profile_accounts(account_id);
  `,
};

export default m_20260325015452_init;
