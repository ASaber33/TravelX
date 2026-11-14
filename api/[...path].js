import { createApp } from "../Back-end/src/app.js";
import { pool } from "../Back-end/src/database.js";

export default createApp(pool);
