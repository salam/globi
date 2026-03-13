#!/usr/bin/env node
/**
 * Build script for the Globi website — produces a self-contained _site/ folder
 * ready to upload to any static web host.
 *
 * Usage:  node tools/build-site.mjs
 *
 * Output structure:
 *   _site/
 *     index.html, styles.css, app.js, globi-logo.png, llms.txt, skill.md
 *     dist/          — bundled library for CDN / embed users
 *     editor/        — visual editor
 *     examples/      — example gallery + individual examples
 *     assets/        — logo, screenshots
 *     data/          — vessel JSON etc.
 */

import { build } from 'esbuild';
import {
  mkdirSync, cpSync, readFileSync, writeFileSync, readdirSync, statSync,
  rmSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, '_site');

// ── helpers ──────────────────────────────────────────────────────────

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  cpSync(src, dest, { recursive: true });
}

function copyFile(src, dest) {
  cpSync(src, dest);
}

/** Strip the <script type="importmap">…</script> block from HTML. */
function stripImportmap(html) {
  return html.replace(/<script\s+type="importmap"[\s\S]*?<\/script>\s*/i, '');
}

/**
 * For HTML files with an inline <script type="module">,
 * extract the script body, bundle it with esbuild, and replace
 * the inline script with a reference to the bundled file.
 */
async function bundleInlineScript(htmlPath, outDir, outName) {
  let html = readFileSync(htmlPath, 'utf8');

  // Extract inline module script
  const match = html.match(/<script\s+type="module">([\s\S]*?)<\/script>/i);
  if (!match) return html; // nothing to bundle

  const scriptBody = match[1];

  // Bundle with esbuild using stdin
  await build({
    stdin: {
      contents: scriptBody,
      resolveDir: dirname(htmlPath),
      loader: 'js',
    },
    bundle: true,
    format: 'esm',
    target: ['es2022'],
    outfile: resolve(outDir, outName),
    minify: true,
    write: true,
  });

  // Replace inline script with external reference
  html = html.replace(
    /<script\s+type="module">[\s\S]*?<\/script>/i,
    `<script type="module" src="${outName}"></script>`,
  );

  // Also strip the importmap (no longer needed)
  html = stripImportmap(html);

  return html;
}

// ── main ─────────────────────────────────────────────────────────────

async function run() {
  const t0 = performance.now();

  // Clean output
  rmSync(OUT, { recursive: true, force: true });
  ensureDir(OUT);

  // 1. Build dist/ (library bundles)
  console.log('  Building dist/ ...');
  execFileSync('node', ['tools/build.mjs'], { cwd: ROOT, stdio: 'inherit' });
  copyDir(resolve(ROOT, 'dist'), resolve(OUT, 'dist'));

  // 2. Build globi.world/ (landing page)
  console.log('  Building landing page ...');
  await build({
    entryPoints: [resolve(ROOT, 'globi.world/app.js')],
    bundle: true,
    format: 'esm',
    target: ['es2022'],
    outfile: resolve(OUT, 'app.js'),
    minify: true,
  });

  // Copy landing page HTML (strip importmap, point to bundled app.js)
  let landingHtml = readFileSync(resolve(ROOT, 'globi.world/index.html'), 'utf8');
  landingHtml = stripImportmap(landingHtml);
  // Fix editor/examples links (they are now at same level, not ../)
  landingHtml = landingHtml.replace(/\.\.\/editor\//g, 'editor/');
  landingHtml = landingHtml.replace(/\.\.\/examples\//g, 'examples/');
  writeFileSync(resolve(OUT, 'index.html'), landingHtml);

  // Copy landing page static assets
  for (const f of ['styles.css', 'globi-logo.png', 'llms.txt', 'skill.md']) {
    const src = resolve(ROOT, 'globi.world', f);
    try { copyFile(src, resolve(OUT, f)); } catch { /* skip missing */ }
  }

  // Copy PHP API and data/.htaccess
  if (statSync(resolve(ROOT, 'globi.world/api'), { throwIfNoEntry: false })) {
    copyDir(resolve(ROOT, 'globi.world/api'), resolve(OUT, 'api'));
  }
  ensureDir(resolve(OUT, 'data'));
  const htaccess = resolve(ROOT, 'globi.world/data/.htaccess');
  if (statSync(htaccess, { throwIfNoEntry: false })) {
    copyFile(htaccess, resolve(OUT, 'data/.htaccess'));
  }

  // 3. Build editor/
  console.log('  Building editor ...');
  ensureDir(resolve(OUT, 'editor'));
  await build({
    entryPoints: [resolve(ROOT, 'editor/app.js')],
    bundle: true,
    format: 'esm',
    target: ['es2022'],
    outfile: resolve(OUT, 'editor/app.js'),
    minify: true,
  });

  let editorHtml = readFileSync(resolve(ROOT, 'editor/index.html'), 'utf8');
  editorHtml = stripImportmap(editorHtml);
  editorHtml = editorHtml.replace(/\.\.\/examples\//g, '../examples/');
  writeFileSync(resolve(OUT, 'editor/index.html'), editorHtml);
  copyFile(resolve(ROOT, 'editor/styles.css'), resolve(OUT, 'editor/styles.css'));

  // 4. Build examples/
  console.log('  Building examples ...');
  ensureDir(resolve(OUT, 'examples'));

  const exampleFiles = readdirSync(resolve(ROOT, 'examples'))
    .filter(f => f.endsWith('.html'));

  for (const file of exampleFiles) {
    const srcPath = resolve(ROOT, 'examples', file);

    if (file === 'index.html') {
      // Gallery index — no inline script to bundle, just fix asset paths
      let galleryHtml = readFileSync(srcPath, 'utf8');
      galleryHtml = galleryHtml.replace(/\.\.\/assets\//g, '../assets/');
      galleryHtml = galleryHtml.replace(/\.\.\/editor\//g, '../editor/');
      writeFileSync(resolve(OUT, 'examples/index.html'), galleryHtml);
      continue;
    }

    // Bundle inline script for each example
    const jsName = file.replace('.html', '.js');
    const html = await bundleInlineScript(
      srcPath,
      resolve(OUT, 'examples'),
      jsName,
    );
    writeFileSync(resolve(OUT, 'examples', file), html);
  }

  // 5. Copy assets/
  console.log('  Copying assets ...');
  if (statSync(resolve(ROOT, 'assets'), { throwIfNoEntry: false })) {
    copyDir(resolve(ROOT, 'assets'), resolve(OUT, 'assets'));
  }

  // 6. Copy data/
  console.log('  Copying data ...');
  if (statSync(resolve(ROOT, 'data'), { throwIfNoEntry: false })) {
    copyDir(resolve(ROOT, 'data'), resolve(OUT, 'data'));
  }

  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
  console.log(`\n  Site build complete → _site/`);
  console.log(`  Done in ${elapsed}s\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
