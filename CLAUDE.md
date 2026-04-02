# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Electron app in dev mode
npm run build        # Type check + build
npm run start        # Preview built app

# Testing
npm test             # Run all tests with Vitest
# To run a single test file:
npx vitest run tests/db/runmigrations.spec.ts

# Code Quality
npm run lint         # ESLint (cached)
npm run format       # Prettier
npm run typecheck    # Type check both main and renderer

# Migrations
node scripts/create-migration.js <description>  # Generate a new migration file
```

## Architecture

This is an **Electron + React + TypeScript** desktop app using `electron-vite` for the build toolchain.

### Process Separation

The app has three distinct processes with strict boundaries:

- **`src/main/`** — Node.js/Electron main process. Owns the database, file system, and native APIs. Entry: `src/main/index.ts`.
- **`src/preload/`** — Bridge layer. Exposes a controlled API to the renderer via `contextBridge`. Types declared in `src/preload/index.d.ts`.
- **`src/renderer/src/`** — React UI. Has no direct access to Node.js APIs; must go through the preload bridge. Path alias `@renderer` maps to `src/renderer/src/`.

### Database Layer (`src/main/db/`)

Uses `better-sqlite3` (synchronous) stored at the user data directory as `clearfinance.sqlite`. WAL mode and foreign keys are enabled.

**Migration system** (`src/main/db/migrations/`):
- Migrations are registered in `index.ts` as an ordered array — the registry must stay sorted by ID.
- `runMigrations.ts` handles transactional application, schema version tracking in a `schema_migrations` table, downgrade protection, and optional integrity checks.
- Generate new migrations with `node scripts/create-migration.js <description>` — produces a timestamped file in `src/main/db/migrations/`.

### Testing

Tests live in `tests/` and use **Vitest** with a fork pool. The DB tests use in-memory SQLite and `vi.mock()` to inject test migrations, keeping them fully isolated from the real migration registry.

### TypeScript Config

Two separate configs for the two runtimes:
- `tsconfig.node.json` — main + preload (Node/Electron APIs)
- `tsconfig.web.json` — renderer (DOM + React JSX)

## Product Context

### What This App Is

A self-hosted household finance app. One installation = one household. All profiles share full data visibility — there is no per-transaction privacy. The first profile created becomes Admin automatically.

### Local AI / RAG Pipeline

All AI runs on the host machine. No financial data ever leaves the device.

The pipeline has four components:
1. **Local LLM** — Ollama + Mistral 7B or Llama 3. Decides the category given transaction context.
2. **Embedding model** — sentence-transformers. Converts transaction descriptions to vectors.
3. **Vector database** — ChromaDB or SQLite-vec. Stores past transactions as searchable patterns; grows smarter as the household adds data.
4. **RAG pipeline** — ties the three together. On each new transaction: embed → find similar past transactions → LLM categorises using those as examples.

**Feedback loop:** when a user corrects a category, the correction is stored back in the vector DB and becomes a reference point for future similar transactions.

**Cold start:** a generic starter dataset of common transaction descriptions is pre-loaded. Real household data gradually takes over as the primary reference.

**Performance requirement:** categorisation must be non-blocking. The transaction saves immediately; the AI suggestion can arrive asynchronously. Target under 2 seconds; if slower, update after save.

### Security Non-Negotiables

These are hard requirements, not suggestions:

- Database encrypted at rest — raw SQLite with financial data is unacceptable
- Sensitive fields (account numbers, balances) encrypted at column level
- HTTPS enforced on local network — no plain HTTP
- Sessions expire after inactivity; lockout after repeated failed login attempts
- Admin recovery code generated once at first install
- Re-authentication required for sensitive actions (viewing account numbers, exporting data)
- Soft deletes only — records are marked deleted, never erased
- Audit log per profile; Admin can view the full log
- App must not be exposed beyond the local network
- Vector database encrypted at rest

### Data Model & Schema Decisions

Tables: `households`, `profiles`, `sessions`, `bank_accounts`, `categories`, `transactions`, `budgets`, `audit_log`.

Key decisions baked into the schema:
- **Amounts are integers** — stored as the smallest currency unit (pence, cents). Never use floats for money.
- **All timestamps are Unix integers** — `unixepoch()` default, stored as `INTEGER`.
- **Soft deletes everywhere** — `deleted_at INTEGER` on all user-facing tables. Never hard-delete user data.
- **Column-level encryption** — `account_number_encrypted` and `sort_code_encrypted` on `bank_accounts` are encrypted by application code before storage. The column names signal this contract.
- **`category_confirmed`** — `0` means an AI suggestion awaiting user review; `1` means the user has confirmed or set the category.
- **`is_system` on categories** — system categories (seeded in the initial migration) cannot be deleted.
- **`audit_log` is append-only** — no `deleted_at`, no updates. `profile_id` may be NULL for system events; `metadata` is a JSON blob.
- **First profile = Admin** — enforced in application code, not the DB (no constraint). `role` CHECK is `'admin' | 'member'`.

### Plaid Integration

Planned for a future phase to replace manual statement import (which has been removed from onboarding). When implemented: app never sees raw bank credentials, Plaid access tokens stored encrypted, read-only access only.
