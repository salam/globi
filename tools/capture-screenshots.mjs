#!/usr/bin/env node
/**
 * Automated screenshot & GIF capture for all Globi example pages.
 *
 * Usage:
 *   node tools/capture-screenshots.mjs              # stills + GIFs
 *   node tools/capture-screenshots.mjs --stills     # stills only
 *   node tools/capture-screenshots.mjs --gifs       # GIFs only
 *   node tools/capture-screenshots.mjs --example=iss-realtime  # single example
 *
 * Prerequisites:
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 *   brew install ffmpeg          (for GIF conversion)
 *
 * Outputs:
 *   assets/screenshots/<name>.png   — 960x540 still
 *   assets/screenshots/<name>.gif   — 480x270 ~3 s animated GIF
 */

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'screenshots');
const VIEWPORT = { width: 960, height: 540 };
const GIF_SCALE = 480;
const GIF_DURATION_MS = 3000;
const GIF_FPS = 12;

// ── Example definitions ─────────────────────────────────────────────────────

const EXAMPLES = [
  // Earth
  { name: 'all-capitals',        wait: 4000 },
  { name: 'continents-and-seas', wait: 4000 },
  { name: 'iss-realtime',        wait: 6000, gif: true },
  { name: 'naval-vessels',       wait: 4000 },
  { name: 'vessel-tracking',     wait: 4000 },
  { name: 'civil-shipping',      wait: 4000 },
  { name: 'ukraine-conflict',    wait: 4000 },
  { name: 'hannibal-route',      wait: 4000 },
  { name: 'battle-of-midway',    wait: 5000, viewport: { width: 1200, height: 540 } },
  { name: 'indiana-jones',       wait: 4000, gif: true },
  // Beyond Earth
  { name: 'moon-landings',       wait: 5000 },
  { name: 'mars-landings',       wait: 5000 },
  { name: 'europa-water',        wait: 5000 },
  { name: 'titan-lakes',         wait: 5000 },
  // Theme variants
  { name: 'wireframe',           wait: 4000 },
  { name: 'grayscale',           wait: 4000 },
];

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const stillsOnly = args.includes('--stills');
const gifsOnly = args.includes('--gifs');
const singleExample = args.find(a => a.startsWith('--example='))?.split('=')[1];
const doStills = !gifsOnly;
const doGifs = !stillsOnly;

// ── Helpers ─────────────────────────────────────────────────────────────────

function hasFfmpeg() {
  try { execFileSync('which', ['ffmpeg'], { stdio: 'ignore' }); return true; }
  catch { return false; }
}

async function waitForGlobe(page, ms) {
  // Wait for <globi-viewer> to be in the DOM, then an extra delay for
  // WebGL texture loading and initial render frames.
  await page.waitForSelector('globi-viewer', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function captureStill(page, name) {
  const outPath = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: outPath, type: 'png' });
  console.log(`  [still] ${outPath}`);
}

async function captureGif(page, context, name, durationMs) {
  if (!hasFfmpeg()) {
    console.log(`  [gif]  skipped ${name} (ffmpeg not found)`);
    return;
  }

  const gifPath = path.join(OUT, `${name}.gif`);

  // Start a fresh context with video recording
  const recContext = await context.browser().newContext({
    viewport: page.viewportSize(),
    recordVideo: {
      dir: OUT,
      size: page.viewportSize(),
    },
  });
  const recPage = await recContext.newPage();
  await recPage.goto(page.url(), { waitUntil: 'domcontentloaded' });
  await waitForGlobe(recPage, 2000);

  // Record for the specified duration
  await recPage.waitForTimeout(durationMs);

  // Close to finalize video
  const videoPath = await recPage.video().path();
  await recContext.close();

  // ffmpeg: webm -> high-quality GIF with palette generation
  try {
    execFileSync('ffmpeg', [
      '-y',
      '-i', videoPath,
      '-vf', `fps=${GIF_FPS},scale=${GIF_SCALE}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`,
      '-t', String(durationMs / 1000),
      '-loop', '0',
      gifPath,
    ], { stdio: 'ignore' });
    console.log(`  [gif]  ${gifPath}`);
  } catch (e) {
    console.log(`  [gif]  FAILED ${name}: ${e.message}`);
  }

  // Clean up temp video file
  try { unlinkSync(videoPath); } catch {}
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUT, { recursive: true });

  const baseUrl = process.env.BASE_URL || 'http://localhost:4173';

  console.log(`Capturing screenshots from ${baseUrl}/examples/`);
  console.log(`Output: ${OUT}\n`);

  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  const targets = singleExample
    ? EXAMPLES.filter(e => e.name === singleExample)
    : EXAMPLES;

  if (targets.length === 0) {
    console.error(`No example found matching "${singleExample}"`);
    process.exit(1);
  }

  for (const example of targets) {
    const url = `${baseUrl}/examples/${example.name}.html`;
    console.log(`\n${example.name}`);

    const vp = example.viewport || VIEWPORT;
    await page.setViewportSize(vp);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await waitForGlobe(page, example.wait);
    } catch (e) {
      console.log(`  SKIP (page load failed): ${e.message}`);
      continue;
    }

    if (doStills) {
      await captureStill(page, example.name);
    }

    if (doGifs && example.gif) {
      await captureGif(page, context, example.name, GIF_DURATION_MS);
    }
  }

  await context.close();
  await browser.close();

  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
