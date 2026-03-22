const fs = require("fs")
const path = require("path")

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "../src/main/db/migrations"
);

function timestamp() {
  return new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14); // "20260321170012"
}

function buildMigrationSource(id, description) {
  const identifier = `m_${id}`
  const humanDescription = description.replace(/_/g, " ");

  return [
    `import type { Migration } from "./types";`,
    ``,
    `const ${identifier}: Migration = {`,
    `  id: "${id}",`,
    `  description: "${humanDescription}",`,
    `  up: \``,
    `    -- TODO: write your migration SQL here`,
    `  \`,`,
    `};`,
    ``,
    `export default ${identifier};`,
    ``,
  ].join("\n");
}

const description = process.argv[2];

if (!description) {
  console.error("Usage: node scripts/create-migration.js <description>");
  console.error("Example: node scripts/create-migration.js add_users");
  process.exit(1);
}

if (!/^[a-z][a-z0-9_]*$/.test(description)) {
  console.error("Description must be lowercase, alphanumeric, with underscores (e.g. add_users)");
  process.exit(1);
}

const id = `${timestamp()}_${description}`;
const filePath = path.join(MIGRATIONS_DIR, `${id}.ts`);

if (fs.existsSync(filePath)) {
  console.error(`File already exists: ${filePath}`);
  process.exit(1);
}

fs.writeFileSync(filePath, buildMigrationSource(id, description));
console.log(`Created: src/main/db/migrations/${id}.ts`);
console.log(`\nRemember to import and register it in index.ts.`);
