#!/usr/bin/env node

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { config: null, output: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--config' && argv[i + 1]) {
      args.config = argv[++i];
    } else if (argv[i] === '--output' && argv[i + 1]) {
      args.output = argv[++i];
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function resolvePath(userPath, fallbackRelative) {
  if (userPath) {
    return resolve(process.cwd(), userPath);
  }
  return resolve(PROJECT_ROOT, fallbackRelative);
}

// ---------------------------------------------------------------------------
// Config loader
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  osint: { enabled: true, path: 'data/vessels-osint.json' },
  aishub: { enabled: false, apiKey: '' },
  vesselfinder: { enabled: false, apiKey: '' },
};

async function loadConfig(configPath) {
  try {
    const raw = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

// ---------------------------------------------------------------------------
// OSINT adapter
// ---------------------------------------------------------------------------

async function fetchOSINT(config) {
  const osintPath = resolvePath(null, config.osint?.path ?? 'data/vessels-osint.json');
  console.log(`  [osint] Reading ${osintPath}`);
  const raw = await readFile(osintPath, 'utf-8');
  const vessels = JSON.parse(raw);
  console.log(`  [osint] Loaded ${vessels.length} vessels`);
  return vessels.map(v => ({ ...v, source: 'osint' }));
}

// ---------------------------------------------------------------------------
// AISHub adapter
// ---------------------------------------------------------------------------

async function fetchAISHub(config, mmsiList) {
  if (!config.aishub?.enabled || !config.aishub?.apiKey) {
    return [];
  }
  if (mmsiList.length === 0) return [];

  const key = config.aishub.apiKey;
  const mmsiParam = mmsiList.join(',');
  const url =
    `http://data.aishub.net/ws.php?username=${encodeURIComponent(key)}` +
    `&format=1&output=json&compress=0&mmsi=${mmsiParam}`;

  console.log(`  [aishub] Querying ${mmsiList.length} MMSIs...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  [aishub] HTTP ${res.status} — skipping`);
      return [];
    }
    const body = await res.json();

    // AISHub returns an array with [metadata, data] when format=1
    const records = Array.isArray(body) && body.length >= 2 ? body[1] : [];
    if (!Array.isArray(records)) {
      console.warn('  [aishub] Unexpected response shape — skipping');
      return [];
    }

    const vessels = records.map(r => ({
      mmsi: String(r.MMSI),
      name: r.NAME?.trim() ?? '',
      lat: Number(r.LATITUDE),
      lon: Number(r.LONGITUDE),
      speed: r.SPEED != null ? Number(r.SPEED) / 10 : undefined,
      heading: r.HEADING != null ? Number(r.HEADING) : undefined,
      timestamp: r.TIME ? new Date(r.TIME * 1000).toISOString() : new Date().toISOString(),
      source: 'aishub',
      confidence: 'exact',
    }));
    console.log(`  [aishub] Received ${vessels.length} positions`);
    return vessels;
  } catch (err) {
    console.warn(`  [aishub] Fetch failed: ${err.message} — skipping`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// VesselFinder adapter
// ---------------------------------------------------------------------------

async function fetchVesselFinder(config, mmsiList) {
  if (!config.vesselfinder?.enabled || !config.vesselfinder?.apiKey) {
    return [];
  }
  if (mmsiList.length === 0) return [];

  const key = config.vesselfinder.apiKey;
  const mmsiParam = mmsiList.join(',');
  const url =
    `https://api.vesselfinder.com/vessels?userkey=${encodeURIComponent(key)}` +
    `&mmsi=${mmsiParam}`;

  console.log(`  [vesselfinder] Querying ${mmsiList.length} MMSIs...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  [vesselfinder] HTTP ${res.status} — skipping`);
      return [];
    }
    const body = await res.json();
    const aisRecords = body?.AIS ?? [];
    if (!Array.isArray(aisRecords)) {
      console.warn('  [vesselfinder] Unexpected response shape — skipping');
      return [];
    }

    const vessels = aisRecords.map(r => ({
      mmsi: String(r.MMSI),
      name: r.NAME?.trim() ?? r.SHIPNAME?.trim() ?? '',
      lat: Number(r.LATITUDE),
      lon: Number(r.LONGITUDE),
      speed: r.SPEED != null ? Number(r.SPEED) : undefined,
      timestamp: r.TIMESTAMP ? new Date(r.TIMESTAMP).toISOString() : new Date().toISOString(),
      source: 'vesselfinder',
      confidence: 'exact',
    }));
    console.log(`  [vesselfinder] Received ${vessels.length} positions`);
    return vessels;
  } catch (err) {
    console.warn(`  [vesselfinder] Fetch failed: ${err.message} — skipping`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Name normalizer (for fallback matching)
// ---------------------------------------------------------------------------

function normalizeName(name) {
  return (name ?? '')
    .toUpperCase()
    .replace(/\(.*?\)/g, '')     // strip parenthetical designations
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Trail deduplication
// ---------------------------------------------------------------------------

const DEG_THRESHOLD = 0.1;
const HOUR_MS = 3600_000;

function deduplicateTrail(trail) {
  if (trail.length <= 1) return trail;

  const sorted = [...trail].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const kept = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const entry = sorted[i];
    const isDuplicate = kept.some(k => {
      const dLat = Math.abs(k.lat - entry.lat);
      const dLon = Math.abs(k.lon - entry.lon);
      const dTime = Math.abs(
        new Date(k.timestamp).getTime() - new Date(entry.timestamp).getTime()
      );
      return dLat < DEG_THRESHOLD && dLon < DEG_THRESHOLD && dTime < HOUR_MS;
    });
    if (!isDuplicate) {
      kept.push(entry);
    }
  }
  return kept;
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

function mergeVessels(osintVessels, aisResults) {
  // Index OSINT vessels by MMSI and normalized name
  const byMmsi = new Map();
  const byName = new Map();
  const merged = osintVessels.map(v => ({ ...v, trail: [...(v.trail ?? [])] }));

  for (const vessel of merged) {
    if (vessel.mmsi) byMmsi.set(vessel.mmsi, vessel);
    const nName = normalizeName(vessel.name);
    if (nName) byName.set(nName, vessel);
  }

  for (const ais of aisResults) {
    const match = (ais.mmsi && byMmsi.get(ais.mmsi)) ||
                  byName.get(normalizeName(ais.name)) ||
                  null;

    if (!match) continue;

    const aisTime = new Date(ais.timestamp).getTime();
    const existingTime = new Date(match.timestamp).getTime();

    if (aisTime > existingTime) {
      // AIS is newer — push old position into trail, promote AIS
      match.trail.push({
        lat: match.lat,
        lon: match.lon,
        timestamp: match.timestamp,
        source: match.source,
      });
      match.lat = ais.lat;
      match.lon = ais.lon;
      match.timestamp = ais.timestamp;
      match.source = ais.source;
      match.confidence = ais.confidence;
    } else {
      // AIS is older — add to trail
      match.trail.push({
        lat: ais.lat,
        lon: ais.lon,
        timestamp: ais.timestamp,
        source: ais.source,
      });
    }
  }

  // Deduplicate and sort trails
  for (const vessel of merged) {
    vessel.trail = deduplicateTrail(vessel.trail);
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  console.log('=== Vessel Aggregator ===\n');

  // 1. Load config
  const configPath = resolvePath(args.config, 'data/vessel-sources.config.json');
  console.log(`[config] Loading from ${configPath}`);
  const config = await loadConfig(configPath);

  const enabledSources = ['osint'];
  if (config.aishub?.enabled && config.aishub?.apiKey) enabledSources.push('aishub');
  if (config.vesselfinder?.enabled && config.vesselfinder?.apiKey) enabledSources.push('vesselfinder');
  console.log(`[config] Enabled sources: ${enabledSources.join(', ')}\n`);

  // 2. Load OSINT baseline
  console.log('[fetch] Loading OSINT data...');
  const osintVessels = await fetchOSINT(config);
  const mmsiList = osintVessels
    .map(v => v.mmsi)
    .filter(Boolean);

  // 3. Fetch AIS sources in parallel
  console.log('[fetch] Querying AIS sources...');
  const [aishubResults, vesselfinderResults] = await Promise.all([
    fetchAISHub(config, mmsiList),
    fetchVesselFinder(config, mmsiList),
  ]);

  const allAIS = [...aishubResults, ...vesselfinderResults];
  console.log(`[fetch] Total AIS positions received: ${allAIS.length}\n`);

  // 4. Merge
  console.log('[merge] Merging sources...');
  const merged = mergeVessels(osintVessels, allAIS);

  // 5. Write output
  const outputPath = resolvePath(args.output, 'data/vessels.json');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');

  console.log(
    `\nAggregated ${merged.length} vessels from ${enabledSources.length} sources → ${outputPath}`
  );
}

// Guard: only run when executed directly (not when imported by tests)
const isDirectRun = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch(err => {
    console.error(`Fatal: ${err.message}`);
    process.exit(1);
  });
}

export {
  parseArgs,
  normalizeName,
  deduplicateTrail,
  mergeVessels,
  loadConfig,
  resolvePath,
  DEFAULT_CONFIG,
};
