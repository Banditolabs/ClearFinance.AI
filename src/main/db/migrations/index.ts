export type { Migration } from "./types";

export const migrations = [

];

/** Useful for guards / debugging */
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
