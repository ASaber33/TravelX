import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(sourceDirectory, "../.env.local") });
dotenv.config({ path: resolve(sourceDirectory, "../.env") });
