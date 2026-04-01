export type { Migration } from "./types";
import m_20260331194356_initial_schema from "./20260331194356_initial_schema";

export const migrations = [
  m_20260331194356_initial_schema,
];

/** For debugging */
export const migrationIds = migrations.map((m) => m.id);

function validateMigrationRegtistry() {
  const seen = new Set<string>();

  for (const m of migrations) {
    if (!m.id || typeof m.id !== "string") {
      throw new Error("Migration registry error: migration is missing a valid id.");
    }
    if (seen.has(m.id)) {
      throw new Error(`Migration registry error: duplicate migration id "${m.id}".`);
    }
    seen.add(m.id);
  }

  // Catch out-of-order registration at import time
  for (let i = 1; i < migrations.length; i++) {
    if (migrations[i - 1]!.id.localeCompare(migrations[i]!.id) > 0) {
      throw new Error(
        `Migration registry error: migrations are not ordered. ` +
        `"${migrations[i - 1]!.id}" should come after "${migrations[i]!.id}".`
      );
    }
  }
}

validateMigrationRegtistry();
