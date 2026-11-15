import { createApp } from "../Back-end/src/app.js";
import { pool } from "../Back-end/src/database.js";
import { restoreApiRequestUrl } from "../Back-end/src/vercel-route.js";

const app = createApp(pool);

export default function handler(request, response) {
  if (!restoreApiRequestUrl(request)) {
    return response.status(400).json({ error: "Invalid API path." });
  }

  return app(request, response);
}
