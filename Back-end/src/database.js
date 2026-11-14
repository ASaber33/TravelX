import "./env.js";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is missing. Copy .env.example to .env and add your DBeaver database connection URL."
  );
}

const parsedConnectionString = new URL(connectionString);
if (!["postgres:", "postgresql:"].includes(parsedConnectionString.protocol)) {
  throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on("error", (error) => {
  console.error("Unexpected idle PostgreSQL client error:", error.message);
});
