import "../src/env.js";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "../src/database.js";

const migrationsDirectory = resolve(import.meta.dirname, "../db");

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDirectory))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();
  const { rows } = await pool.query("SELECT name FROM public.schema_migrations");
  const applied = new Set(rows.map((row) => row.name));

  for (const name of files) {
    if (applied.has(name)) continue;

    console.log(`Applying ${name}...`);
    await pool.query(await readFile(resolve(migrationsDirectory, name), "utf8"));
    await pool.query("INSERT INTO public.schema_migrations (name) VALUES ($1)", [name]);
  }

  console.log("Database migrations are up to date.");
} finally {
  await pool.end();
}
