#!/usr/bin/env node
/**
 * Build script for Globi — bundles the globi-viewer web component
 * into a single distributable file with all dependencies included.
 *
 * Usage:  node tools/build.mjs
 */

import { build } from 'esbuild';
import { mkdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Ensure dist/ exists
mkdirSync(resolve(ROOT, 'dist'), { recursive: true });

// Virtual entry: re-exports the public API and auto-registers the
// <globi-viewer> web component so consumers only need a single <script>.
const virtualEntry = `
export * from './src/components/globi-viewer.js';
import { registerGlobiViewer } from './src/components/globi-viewer.js';
registerGlobiViewer();
`;

const sharedOpts = {
  bundle: true,
  format: 'esm',
  target: ['es2022'],
};

// Each entry: { name, stdin | entryPoints, outName }
const entries = [
  {
    name: 'globi',
    stdin: { contents: virtualEntry, resolveDir: ROOT, loader: 'js' },
  },
  {
    name: 'globi-io',
    entryPoints: [resolve(ROOT, 'src/io/index.js')],
  },
  {
    name: 'globi-examples',
    entryPoints: [resolve(ROOT, 'src/examples/index.js')],
  },
];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

async function run() {
  const t0 = performance.now();

  for (const entry of entries) {
    const opts = entry.stdin
      ? { ...sharedOpts, stdin: entry.stdin }
      : { ...sharedOpts, entryPoints: entry.entryPoints };

    // Non-minified build (for debugging)
    await build({
      ...opts,
      outfile: resolve(ROOT, `dist/${entry.name}.js`),
      minify: false,
      sourcemap: true,
    });

    // Minified build (production)
    await build({
      ...opts,
      outfile: resolve(ROOT, `dist/${entry.name}.min.js`),
      minify: true,
      sourcemap: false,
    });
  }

  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

  // Print results
  const files = entries.flatMap(e => [`dist/${e.name}.js`, `dist/${e.name}.min.js`]);
  console.log('\n  Globi build complete\n');
  for (const f of files) {
    const fullPath = resolve(ROOT, f);
    const { size } = statSync(fullPath);
    console.log(`  ${f.padEnd(32)} ${formatSize(size)}`);
  }
  console.log(`\n  Done in ${elapsed}s\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
