import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const backendRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(backendRoot, "..");
const outputDirectory = resolve(backendRoot, "dist");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(resolve(projectRoot, "index.html"), resolve(outputDirectory, "index.html"));
await cp(resolve(projectRoot, "Front-end"), resolve(outputDirectory, "Front-end"), {
    recursive: true,
    force: true
});

console.log("TravelX static site copied to dist/.");
