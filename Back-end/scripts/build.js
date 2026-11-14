import { cp, mkdir, rm } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { build } from 'esbuild';

const backendRoot = resolve(import.meta.dirname, '..');
const projectRoot = resolve(backendRoot, '..');
const outputDirectory = resolve(backendRoot, 'dist');

await mkdir(outputDirectory, { recursive: true });
await build({
    entryPoints: [resolve(projectRoot, 'Front-end/js/main.js')],
    outfile: resolve(projectRoot, 'Front-end/js/main-local.js'),
    bundle: true,
    splitting: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    nodePaths: [resolve(backendRoot, 'node_modules')],
    external: ['https://unpkg.com/*']
});
await cp(resolve(projectRoot, 'index.html'), resolve(outputDirectory, 'index.html'));
await cp(resolve(projectRoot, 'Front-end'), resolve(outputDirectory, 'Front-end'), {
    recursive: true,
    force: true
});

const chunkDirectory = resolve(outputDirectory, 'Front-end/js/chunks');
const chunkRelativePath = relative(outputDirectory, chunkDirectory);
if (isAbsolute(chunkRelativePath) || chunkRelativePath.startsWith('..')) {
    throw new Error('Refusing to clean generated chunks outside the build directory.');
}
await rm(chunkDirectory, { recursive: true, force: true });

await build({
    entryPoints: [resolve(projectRoot, 'Front-end/js/main.js')],
    outdir: resolve(outputDirectory, 'Front-end/js'),
    entryNames: 'main',
    chunkNames: 'chunks/[name]-[hash]',
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    nodePaths: [resolve(backendRoot, 'node_modules')],
    external: ['https://unpkg.com/*']
});

console.log('TravelX static site built in dist/.');
