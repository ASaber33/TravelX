import "./env.js";
import { createApp } from "./app.js";
import { pool } from "./database.js";

const port = Number(process.env.PORT || 3001);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const server = createApp(pool).listen(port, () => {
  console.log(`TravelX API listening on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}
