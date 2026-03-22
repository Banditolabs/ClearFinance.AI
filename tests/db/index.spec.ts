import { describe, it, expect } from "vitest";
import { migrations, migrationIds } from "../../src/main/db/migrations/index";

describe("migration registry", () => {
  // it("has at least one migration", () => {
  //   expect(migrations.length).toBeGreaterThan(0);
  // });

  it("every migration has a non-empty string id", () => {
    for (const m of migrations) {
      expect(typeof m.id).toBe("string");
      expect(m.id.length).toBeGreaterThan(0);
    }
  });

  it("every migration has a non-empty up string", () => {
    for (const m of migrations) {
      expect(typeof m.up).toBe("string");
      expect(m.up.trim().length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate ids", () => {
    const seen = new Set<string>();
    for (const m of migrations) {
      expect(seen.has(m.id)).toBe(false);
      seen.add(m.id);
    }
  });

  it("ids are in sorted order", () => {
    for (let i = 1; i < migrations.length; i++) {
      const prev = migrations[i - 1]!.id;
      const curr = migrations[i]!.id;
      expect(
        prev.localeCompare(curr),
        `Expected "${prev}" to sort before "${curr}"`
      ).toBeLessThan(0);
    }
  });

  it("migrationIds matches the registry", () => {
    expect(migrationIds).toEqual(migrations.map((m) => m.id));
  });
});
