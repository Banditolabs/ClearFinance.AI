export type Migration = {
  /** Unique, ordered id. Use m###_description for deterministic ordering. */
  id: string;
  /** SQL to apply. Keep migrations fast + deterministic. */
  up: string;
  description?: string;
};
