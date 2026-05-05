import postgres from "../node_modules/postgres/cjs/src/index.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_URL = "postgresql://postgres.flgmlswdtnzdqikavcjl:qHf4zFeI2Gh25pl7@aws-1-us-east-1.pooler.supabase.com:5432/postgres";

const sql = postgres(DATABASE_URL, { ssl: "require", max: 1 });

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Uso: node scripts/run-migration.mjs <arquivo.sql> [arquivo2.sql ...]");
  process.exit(1);
}

for (const file of files) {
  const filePath = resolve(__dirname, "..", file);
  const content = readFileSync(filePath, "utf8");
  console.log(`\nRodando: ${file}`);
  try {
    await sql.unsafe(content);
    console.log(`✓ ${file} — OK`);
  } catch (err) {
    console.error(`✗ ${file} — ERRO:`, err.message);
    await sql.end();
    process.exit(1);
  }
}

await sql.end();
console.log("\nMigrations concluídas.");
