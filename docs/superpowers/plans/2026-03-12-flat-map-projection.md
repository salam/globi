# Flat Map Projection Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 2D flat map projection mode (Azimuthal Equidistant, Orthographic, Equirectangular) as an alternative to the 3D globe, sharing the same scene data and interactions.

**Architecture:** A new `FlatMapRenderer` renders to a 2D `<canvas>`, completely separate from the Three.js globe renderer. Both renderers share the same `SceneStore` and `GlobeController`. A pluggable projection system in `src/math/projections/` maps `(lat, lon)` to `(x, y)` and back. The controller holds both renderers and delegates to the active one via `#activeRenderer`.

**Tech Stack:** Canvas 2D API, existing Three.js renderer (unchanged), node:test for tests

**Spec:** `docs/superpowers/specs/2026-03-12-flat-map-projection-design.md`

---

## Chunk 1: Projection Math

### Task 1: Azimuthal Equidistant Projection

**Files:**
- Create: `src/math/projections/azimuthalEquidistant.js`
- Create: `tests/projections.test.js`

- [ ] **Step 0: Create projections directory**

Run: `mkdir -p src/math/projections`

- [ ] **Step 1: Write failing tests for azimuthalEquidistant**

```javascript
// tests/projections.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { azimuthalEquidistant } from '../src/math/projections/azimuthalEquidistant.js';

test('azimuthalEquidistant – project center maps to origin', () => {
  const { x, y } = azimuthalEquidistant.project(45, 90, 45, 90);
  assert.ok(Math.abs(x) < 1e-10);
  assert.ok(Math.abs(y) < 1e-10);
});

test('azimuthalEquidistant – project north pole from equator/0', () => {
  // From (0,0), north pole is 90 degrees away -> radial distance = pi/2
  const { x, y } = azimuthalEquidistant.project(90, 0, 0, 0);
  assert.ok(Math.abs(x) < 1e-10, 'x should be ~0');
  assert.ok(Math.abs(y - Math.PI / 2) < 1e-6, `y should be pi/2, got ${y}`);
});

test('azimuthalEquidistant – project antipodal point', () => {
  // Antipode of (0,0) is (0,180), distance = pi
  const { x, y } = azimuthalEquidistant.project(0, 180, 0, 0);
  const r = Math.sqrt(x * x + y * y);
  assert.ok(Math.abs(r - Math.PI) < 1e-6, `radius should be pi, got ${r}`);
});

test('azimuthalEquidistant – inverse round-trips', () => {
  const centerLat = 30, centerLon = -60;
  const lat = 45, lon = -30;
  const { x, y } = azimuthalEquidistant.project(lat, lon, centerLat, centerLon);
  const inv = azimuthalEquidistant.inverse(x, y, centerLat, centerLon);
  assert.ok(inv !== null);
  assert.ok(Math.abs(inv.lat - lat) < 1e-6, `lat round-trip: expected ${lat}, got ${inv.lat}`);
  assert.ok(Math.abs(inv.lon - lon) < 1e-6, `lon round-trip: expected ${lon}, got ${inv.lon}`);
});

test('azimuthalEquidistant – isVisible always true (full globe)', () => {
  assert.ok(azimuthalEquidistant.isVisible(0, 180, 0, 0));
  assert.ok(azimuthalEquidistant.isVisible(-90, 0, 45, 90));
});

test('azimuthalEquidistant – inverse returns null beyond pi', () => {
  const result = azimuthalEquidistant.inverse(0, Math.PI + 0.1, 0, 0);
  assert.equal(result, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/projections.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement azimuthalEquidistant**

```javascript
// src/math/projections/azimuthalEquidistant.js
const { sin, cos, atan2, sqrt, asin, PI } = Math;
const RAD = PI / 180;
const DEG = 180 / PI;

/**
 * Azimuthal Equidistant projection.
 * Radial distance from center = great-circle distance.
 * Full globe visible (disc radius = pi).
 */
export const azimuthalEquidistant = {
  project(lat, lon, centerLat, centerLon) {
    const phi = lat * RAD;
    const lam = lon * RAD;
    const phi0 = centerLat * RAD;
    const lam0 = centerLon * RAD;

    const cosC = sin(phi0) * sin(phi) + cos(phi0) * cos(phi) * cos(lam - lam0);
    const c = Math.acos(Math.max(-1, Math.min(1, cosC)));

    if (c < 1e-10) return { x: 0, y: 0 };

    const k = c / sin(c);
    const x = k * cos(phi) * sin(lam - lam0);
    const y = k * (cos(phi0) * sin(phi) - sin(phi0) * cos(phi) * cos(lam - lam0));
    return { x, y };
  },

  inverse(x, y, centerLat, centerLon) {
    const rho = sqrt(x * x + y * y);
    if (rho > PI + 1e-6) return null;
    if (rho < 1e-10) return { lat: centerLat, lon: centerLon };

    const phi0 = centerLat * RAD;
    const lam0 = centerLon * RAD;
    const c = rho;
    const sinC = sin(c);
    const cosC = cos(c);

    const phi = asin(cosC * sin(phi0) + (y * sinC * cos(phi0)) / rho);
    const lam = lam0 + atan2(
      x * sinC,
      rho * cos(phi0) * cosC - y * sin(phi0) * sinC
    );

    let lonDeg = lam * DEG;
    // Normalize to [-180, 180]
    lonDeg = ((lonDeg + 180) % 360 + 360) % 360 - 180;
    return { lat: phi * DEG, lon: lonDeg };
  },

  isVisible(/* lat, lon, centerLat, centerLon */) {
    return true; // Full globe is visible
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/projections.test.js`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/math/projections/azimuthalEquidistant.js tests/projections.test.js && git commit -m "feat: add azimuthal equidistant projection" -- src/math/projections/azimuthalEquidistant.js tests/projections.test.js
```

---

### Task 2: Orthographic Projection

**Files:**
- Create: `src/math/projections/orthographic.js`
- Modify: `tests/projections.test.js`

- [ ] **Step 1: Write failing tests for orthographic**

Append to `tests/projections.test.js`:

```javascript
import { orthographic } from '../src/math/projections/orthographic.js';

test('orthographic – project center maps to origin', () => {
  const { x, y } = orthographic.project(0, 0, 0, 0);
  assert.ok(Math.abs(x) < 1e-10);
  assert.ok(Math.abs(y) < 1e-10);
});

test('orthographic – project 90 deg east from center (0,0)', () => {
  const { x, y } = orthographic.project(0, 90, 0, 0);
  assert.ok(Math.abs(x - 1) < 1e-6, `x should be 1, got ${x}`);
  assert.ok(Math.abs(y) < 1e-6, `y should be 0, got ${y}`);
});

test('orthographic – inverse round-trips for visible point', () => {
  const centerLat = 20, centerLon = 40;
  const lat = 30, lon = 50;
  const { x, y } = orthographic.project(lat, lon, centerLat, centerLon);
  const inv = orthographic.inverse(x, y, centerLat, centerLon);
  assert.ok(inv !== null);
  assert.ok(Math.abs(inv.lat - lat) < 1e-4);
  assert.ok(Math.abs(inv.lon - lon) < 1e-4);
});

test('orthographic – isVisible false for back hemisphere', () => {
  assert.equal(orthographic.isVisible(0, 180, 0, 0), false);
});

test('orthographic – isVisible true for front hemisphere', () => {
  assert.ok(orthographic.isVisible(0, 45, 0, 0));
});

test('orthographic – inverse returns null outside disc', () => {
  const result = orthographic.inverse(1.5, 0, 0, 0);
  assert.equal(result, null);
});
```

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `node --test tests/projections.test.js`
Expected: New orthographic tests FAIL

- [ ] **Step 3: Implement orthographic**

```javascript
// src/math/projections/orthographic.js
const { sin, cos, atan2, sqrt, asin, PI } = Math;
const RAD = PI / 180;
const DEG = 180 / PI;

/**
 * Orthographic projection.
 * Hemisphere-only disc (radius = 1). Back-hemisphere clipped.
 */
export const orthographic = {
  project(lat, lon, centerLat, centerLon) {
    const phi = lat * RAD;
    const lam = lon * RAD;
    const phi0 = centerLat * RAD;
    const lam0 = centerLon * RAD;

    const x = cos(phi) * sin(lam - lam0);
    const y = cos(phi0) * sin(phi) - sin(phi0) * cos(phi) * cos(lam - lam0);
    return { x, y };
  },

  inverse(x, y, centerLat, centerLon) {
    const rho = sqrt(x * x + y * y);
    if (rho > 1 + 1e-6) return null;

    const phi0 = centerLat * RAD;
    const lam0 = centerLon * RAD;
    const c = asin(Math.min(1, rho));
    const sinC = sin(c);
    const cosC = cos(c);

    const phi = (rho < 1e-10)
      ? phi0
      : asin(cosC * sin(phi0) + (y * sinC * cos(phi0)) / rho);

    const lam = lam0 + atan2(
      x * sinC,
      rho * cos(phi0) * cosC - y * sin(phi0) * sinC
    );

    let lonDeg = lam * DEG;
    lonDeg = ((lonDeg + 180) % 360 + 360) % 360 - 180;
    return { lat: phi * DEG, lon: lonDeg };
  },

  isVisible(lat, lon, centerLat, centerLon) {
    const phi = lat * RAD;
    const lam = lon * RAD;
    const phi0 = centerLat * RAD;
    const lam0 = centerLon * RAD;
    const cosC = sin(phi0) * sin(phi) + cos(phi0) * cos(phi) * cos(lam - lam0);
    return cosC > 0;
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/projections.test.js`
Expected: All 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/math/projections/orthographic.js tests/projections.test.js && git commit -m "feat: add orthographic projection" -- src/math/projections/orthographic.js tests/projections.test.js
```

---

### Task 3: Equirectangular Projection

**Files:**
- Create: `src/math/projections/equirectangular.js`
- Modify: `tests/projections.test.js`

- [ ] **Step 1: Write failing tests for equirectangular**

Append to `tests/projections.test.js`:

```javascript
import { equirectangular } from '../src/math/projections/equirectangular.js';

test('equirectangular – project center maps to origin', () => {
  const { x, y } = equirectangular.project(30, 60, 30, 60);
  assert.ok(Math.abs(x) < 1e-10);
  assert.ok(Math.abs(y) < 1e-10);
});

test('equirectangular – x is longitude delta in radians', () => {
  const { x, y } = equirectangular.project(0, 45, 0, 0);
  assert.ok(Math.abs(x - 45 * Math.PI / 180) < 1e-6);
  assert.ok(Math.abs(y) < 1e-6);
});

test('equirectangular – y is latitude delta in radians', () => {
  const { x, y } = equirectangular.project(60, 0, 30, 0);
  assert.ok(Math.abs(x) < 1e-6);
  assert.ok(Math.abs(y - 30 * Math.PI / 180) < 1e-6);
});

test('equirectangular – inverse round-trips', () => {
  const centerLat = -10, centerLon = 120;
  const lat = 50, lon = -170;
  const { x, y } = equirectangular.project(lat, lon, centerLat, centerLon);
  const inv = equirectangular.inverse(x, y, centerLat, centerLon);
  assert.ok(inv !== null);
  assert.ok(Math.abs(inv.lat - lat) < 1e-6);
  const normExpected = ((lon + 180) % 360 + 360) % 360 - 180;
  const normActual = ((inv.lon + 180) % 360 + 360) % 360 - 180;
  assert.ok(Math.abs(normActual - normExpected) < 1e-4);
});

test('equirectangular – wraps longitude across antimeridian', () => {
  const { x } = equirectangular.project(0, -170, 0, 170);
  const expectedX = 20 * Math.PI / 180;
  assert.ok(Math.abs(x - expectedX) < 1e-6, `x should be ${expectedX}, got ${x}`);
});

test('equirectangular – isVisible always true', () => {
  assert.ok(equirectangular.isVisible(90, 0, 0, 0));
  assert.ok(equirectangular.isVisible(-90, 180, 45, -45));
});

test('equirectangular – inverse returns null beyond poles', () => {
  // y that would push lat beyond 90
  const result = equirectangular.inverse(0, 2, 0, 0);
  assert.equal(result, null, 'should return null for lat > 90');
});
```

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `node --test tests/projections.test.js`
Expected: New equirectangular tests FAIL

- [ ] **Step 3: Implement equirectangular**

```javascript
// src/math/projections/equirectangular.js
const { PI } = Math;
const RAD = PI / 180;
const DEG = 180 / PI;

/**
 * Equirectangular (Plate Carree) projection.
 * x = (lon - centerLon) in radians, y = (lat - centerLat) in radians.
 * Wraps longitude across antimeridian.
 */
export const equirectangular = {
  project(lat, lon, centerLat, centerLon) {
    let deltaLon = lon - centerLon;
    // Wrap to [-180, 180]
    deltaLon = ((deltaLon + 180) % 360 + 360) % 360 - 180;
    return {
      x: deltaLon * RAD,
      y: (lat - centerLat) * RAD,
    };
  },

  inverse(x, y, centerLat, centerLon) {
    const lat = centerLat + y * DEG;
    if (lat > 90 || lat < -90) return null;
    let lon = centerLon + x * DEG;
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
    return { lat, lon };
  },

  isVisible(/* lat, lon, centerLat, centerLon */) {
    return true;
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/projections.test.js`
Expected: All 18 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/math/projections/equirectangular.js tests/projections.test.js && git commit -m "feat: add equirectangular projection" -- src/math/projections/equirectangular.js tests/projections.test.js
```

---

### Task 4: Projection Registry

**Files:**
- Create: `src/math/projections/index.js`
- Modify: `tests/projections.test.js`

- [ ] **Step 1: Write failing tests for registry**

Append to `tests/projections.test.js`:

```javascript
import { getProjection, PROJECTION_NAMES } from '../src/math/projections/index.js';

test('registry – getProjection returns known projections', () => {
  assert.ok(getProjection('azimuthalEquidistant'));
  assert.ok(getProjection('orthographic'));
  assert.ok(getProjection('equirectangular'));
});

test('registry – getProjection returns null for unknown', () => {
  assert.equal(getProjection('mercator'), null);
  assert.equal(getProjection('globe'), null);
});

test('registry – PROJECTION_NAMES lists all flat projections', () => {
  assert.deepEqual(PROJECTION_NAMES.sort(), ['azimuthalEquidistant', 'equirectangular', 'orthographic']);
});

test('registry – every projection has project, inverse, isVisible', () => {
  for (const name of PROJECTION_NAMES) {
    const p = getProjection(name);
    assert.equal(typeof p.project, 'function', `${name}.project`);
    assert.equal(typeof p.inverse, 'function', `${name}.inverse`);
    assert.equal(typeof p.isVisible, 'function', `${name}.isVisible`);
  }
});
```

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `node --test tests/projections.test.js`
Expected: New registry tests FAIL

- [ ] **Step 3: Implement registry**

```javascript
// src/math/projections/index.js
import { azimuthalEquidistant } from './azimuthalEquidistant.js';
import { orthographic } from './orthographic.js';
import { equirectangular } from './equirectangular.js';

const registry = {
  azimuthalEquidistant,
  orthographic,
  equirectangular,
};

export const PROJECTION_NAMES = Object.keys(registry);

export function getProjection(name) {
  return registry[name] || null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/projections.test.js`
Expected: All 22 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/math/projections/index.js tests/projections.test.js && git commit -m "feat: add projection registry" -- src/math/projections/index.js tests/projections.test.js
```

---

## Chunk 2: Schema & ViewerUI Updates

### Task 5: Add `projection` to Scene Schema

**Files:**
- Modify: `src/scene/schema.js` (lines 8-24 createEmptyScene, lines 250-273 normalizeScene, lines 314-498 validateScene)
- Modify: `tests/schema.test.js`

- [ ] **Step 1: Write failing tests for projection in schema**

Add to `tests/schema.test.js`:

```javascript
test('normalizeScene – defaults projection to globe', () => {
  const scene = normalizeScene({});
  assert.equal(scene.projection, 'globe');
});

test('normalizeScene – preserves valid projection', () => {
  const scene = normalizeScene({ projection: 'azimuthalEquidistant' });
  assert.equal(scene.projection, 'azimuthalEquidistant');
});

test('normalizeScene – unknown projection normalizes to globe', () => {
  const scene = normalizeScene({ projection: 'mercator' });
  assert.equal(scene.projection, 'globe');
});

test('validateScene – rejects unknown projection with error', () => {
  const { valid, errors } = validateScene({ projection: 'mercator' });
  assert.ok(errors.some(e => e.includes('projection')));
});

test('validateScene – accepts all valid projections', () => {
  for (const p of ['globe', 'azimuthalEquidistant', 'orthographic', 'equirectangular']) {
    const { errors } = validateScene({ projection: p });
    const projErrors = errors.filter(e => e.includes('projection'));
    assert.equal(projErrors.length, 0, `projection '${p}' should be valid`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/schema.test.js`
Expected: New projection tests FAIL

- [ ] **Step 3: Implement projection in schema**

In `src/scene/schema.js`:

1. Add constant near top (after line 6):
```javascript
const VALID_PROJECTIONS = ['globe', 'azimuthalEquidistant', 'orthographic', 'equirectangular'];
```

2. In `createEmptyScene()` (around line 8-24), add to the returned object:
```javascript
projection: 'globe',
```

3. In `normalizeScene()` (around line 250-273), add after theme normalization:
```javascript
const projection = VALID_PROJECTIONS.includes(input.projection) ? input.projection : 'globe';
```
And include `projection` in the returned object.

4. In `validateScene()` (around line 314-498), add projection validation:
```javascript
if (raw.projection !== undefined && !VALID_PROJECTIONS.includes(raw.projection)) {
  errors.push(`scene.projection must be one of: ${VALID_PROJECTIONS.join(', ')}`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/schema.test.js`
Expected: All tests PASS

- [ ] **Step 5: Run full test suite**

Run: `node --test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add src/scene/schema.js tests/schema.test.js && git commit -m "feat: add projection field to scene schema" -- src/scene/schema.js tests/schema.test.js
```

---

### Task 6: Add `showProjectionToggle` to ViewerUI Config

**Files:**
- Modify: `src/scene/viewerUi.js` (lines 4-14 defaults, lines 28-41 normalize, lines 69-92 validate)
- Modify: `tests/viewer-ui.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/viewer-ui.test.js`. First ensure these functions are imported at the top of the file (add to existing import line if needed):

```javascript
import { getDefaultViewerUiConfig, normalizeViewerUiConfig, resolveViewerUiConfig } from '../src/scene/viewerUi.js';
```

Then add tests:

```javascript
test('getDefaultViewerUiConfig – includes showProjectionToggle true', () => {
  const config = getDefaultViewerUiConfig();
  assert.equal(config.showProjectionToggle, true);
});

test('normalizeViewerUiConfig – defaults showProjectionToggle to true', () => {
  const config = normalizeViewerUiConfig({});
  assert.equal(config.showProjectionToggle, true);
});

test('resolveViewerUiConfig – coerces showProjectionToggle to boolean', () => {
  const config = resolveViewerUiConfig({ showProjectionToggle: 'false' });
  assert.equal(config.showProjectionToggle, false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/viewer-ui.test.js`
Expected: New tests FAIL

- [ ] **Step 3: Add `showProjectionToggle` to viewerUi.js**

In `src/scene/viewerUi.js`:

1. Add to default config object (line ~13):
```javascript
showProjectionToggle: true,
```

2. The normalize, resolve, and validate functions **explicitly enumerate each field** — they do NOT iterate over defaults generically. You must add `showProjectionToggle` to all three functions:
   - In `normalizeViewerUiConfig()`: add `showProjectionToggle: input.showProjectionToggle ?? defaults.showProjectionToggle`
   - In `resolveViewerUiConfig()`: add boolean coercion for `showProjectionToggle` (same pattern as other boolean fields)
   - In `validateViewerUiConfig()`: add type check for `showProjectionToggle` (same pattern as other boolean fields)

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/viewer-ui.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/scene/viewerUi.js tests/viewer-ui.test.js && git commit -m "feat: add showProjectionToggle to viewerUi config" -- src/scene/viewerUi.js tests/viewer-ui.test.js
```

---

## Chunk 3: FlatMapRenderer Core

> **Note on file structure:** The spec lists 8 separate sub-renderer modules (flatMapMarkerRenderer.js, etc.). This plan starts with rendering logic inline in flatMapRenderer.js for faster iteration. Once the flat map is working end-to-end, extract each `#render*()` method into its own module as a refactoring step if the file grows unwieldy. The texture projector is separate from the start because it has distinct caching/lifecycle concerns.

### Task 7: FlatMapRenderer Skeleton + Texture Projector

**Files:**
- Create: `src/renderer/flatMapRenderer.js`
- Create: `src/renderer/flatMapTextureProjector.js`
- Create: `tests/flat-map-renderer.test.js`

- [ ] **Step 1: Write failing tests for FlatMapRenderer init and basic lifecycle**

```javascript
// tests/flat-map-renderer.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

test('FlatMapRenderer – exports a class', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  assert.equal(typeof FlatMapRenderer, 'function');
});

test('FlatMapRenderer – has required public API methods', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const methods = [
    'init', 'renderScene', 'flyTo', 'panBy', 'zoomBy',
    'screenToLatLon', 'hitTest', 'projectPointToClient',
    'filterMarkers', 'filterCallouts', 'getCameraState',
    'resize', 'destroy', 'pauseIdleRotation', 'resumeIdleRotation',
  ];
  const renderer = new FlatMapRenderer();
  for (const m of methods) {
    assert.equal(typeof renderer[m], 'function', `missing method: ${m}`);
  }
});

test('FlatMapRenderer – getCameraState returns defaults', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  const state = renderer.getCameraState();
  assert.equal(state.centerLat, 0);
  assert.equal(state.centerLon, 0);
  assert.equal(state.zoom, 1);
});

test('FlatMapRenderer – panBy updates center', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.panBy(10, 5);
  const state = renderer.getCameraState();
  assert.equal(state.centerLon, 10);
  assert.equal(state.centerLat, 5);
});

test('FlatMapRenderer – zoomBy clamps to range', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.zoomBy(100);
  assert.ok(renderer.getCameraState().zoom <= 4);
  renderer.zoomBy(-100);
  assert.ok(renderer.getCameraState().zoom >= 0.3);
});

test('FlatMapRenderer – flyTo sets center and zoom', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.flyTo({ lat: 45, lon: -90, zoom: 2 });
  const state = renderer.getCameraState();
  assert.equal(state.centerLat, 45);
  assert.equal(state.centerLon, -90);
  assert.equal(state.zoom, 2);
});

test('FlatMapRenderer – pauseIdleRotation is no-op', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  assert.doesNotThrow(() => renderer.pauseIdleRotation());
  assert.doesNotThrow(() => renderer.resumeIdleRotation());
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/flat-map-renderer.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement FlatMapRenderer skeleton**

Create `src/renderer/flatMapRenderer.js` with:

**Important:** The constructor must NOT touch the DOM (no `document.createElement`, no `OffscreenCanvas`). DOM access only happens in `init()`. This allows the class to be instantiated in Node.js tests and in the controller constructor before a container is available.

- Constructor: initializes default camera state (centerLat=0, centerLon=0, zoom=1), default projection ('azimuthalEquidistant')
- `init(container, options)`: creates `<canvas>` and overlay `<div>`, sets up DPI scaling
- `setProjection(name)` / `getProjectionName()`: switch active projection via registry
- `renderScene(scene)`: stores scene, marks dirty, calls `#render()`
- `flyTo(target, options)`: updates center/zoom, re-renders
- `panBy(deltaLon, deltaLat)`: updates center (clamp lat to [-89.999, 89.999], wrap lon to [-180, 180])
- `zoomBy(deltaScale)`: clamp zoom to [0.3, 4]
- `screenToLatLon(clientX, clientY)`: pixel -> projection coords -> `inverse()`
- `hitTest(clientX, clientY)`: screenToLatLon then proximity check vs markers
- `projectPointToClient(lat, lon)`: project -> pixel -> client coords
- `filterMarkers(predicate)` / `filterCallouts(predicate)`: store filter, mark dirty
- `getCameraState()`: returns `{ centerLat, centerLon, zoom }`
- `resize(w, h)`: resize canvas, re-render
- `destroy()`: remove DOM elements, null refs
- `pauseIdleRotation()` / `resumeIdleRotation()`: no-ops
- `show()` / `hide()`: toggle canvas/overlay display
- `startDrag()` / `endDrag()`: toggle low-res texture mode
- `#pixelToProjection(px, py)` / `#projectionToPixel(x, y)`: coordinate mapping
- `#getScale()`: pixels per projection-unit based on zoom
- `#render()`: clear, draw background, then each layer (graticule, borders, regions, paths, arcs, markers, geo labels, callouts)

For the render pipeline, implement inline:
- **Graticule**: lat/lon grid lines every 30 degrees, projected as polylines
- **Regions**: project GeoJSON polygon vertices, fill with canvas path
- **Paths**: densify via `densifyPath()`, project, draw polylines (import from `../math/geo.js`)
- **Arcs**: interpolate via `greatCircleArc()`, project, draw polylines with altitude opacity hint (import from `../math/geo.js`)
- **Markers**: project position, draw filled circles (dot), with altitude shadow hint for elevated markers. `model` type falls back to dot. `image` type falls back to dot initially.
- **Borders**: stub (filled in Task 11)
- **Geo labels**: stub (filled in Task 13)
- **Callouts**: stub (filled in Task 14)

Also create `src/renderer/flatMapTextureProjector.js`:
- `FlatMapTextureProjector` class
- `project(ctx, texture, projection, centerLat, centerLon, width, height, projectionToPixel, pixelToProjection, lowRes)`: for each pixel, use `inverse()` to get lat/lon, sample equirectangular texture at corresponding UV
- Uses `OffscreenCanvas` for work, caches result keyed by `centerLat,centerLon,width,height,lowRes`
- `invalidate()`: clear cache
- `destroy()`: null refs

**Note:** `FlatMapTextureProjector` uses `OffscreenCanvas` which is unavailable in Node.js. It is NOT unit-tested — it is only verified via the browser integration checklist (Task 15 Step 4). The `FlatMapRenderer` guards texture projection behind `if (this.#textureImage)` checks, so unit tests that never call `init()` or load textures will not hit DOM APIs.

Import and integrate texture projector into `FlatMapRenderer#render()` — draw texture before graticule.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/flat-map-renderer.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/flatMapRenderer.js src/renderer/flatMapTextureProjector.js tests/flat-map-renderer.test.js && git commit -m "feat: add FlatMapRenderer skeleton with core rendering" -- src/renderer/flatMapRenderer.js src/renderer/flatMapTextureProjector.js tests/flat-map-renderer.test.js
```

---

## Chunk 4: Controller Integration & Mode Switching

### Task 8: Update GlobeController for Dual Renderer

**Files:**
- Modify: `src/controller/globeController.js` (lines 45-68 constructor, lines 140-206 delegation)
- Modify: `src/renderer/flatMapRenderer.js` (add show/hide if not done)
- Modify: `tests/controller.test.js`

- [ ] **Step 1: Write failing tests for projection switching**

Add to `tests/controller.test.js`. The existing tests use `new GlobeController({ renderer: mockRenderer })`. Since `FlatMapRenderer` is now created internally by the controller, the controller needs a way to work without DOM. The approach: the controller lazily creates `FlatMapRenderer` only when needed, and the `FlatMapRenderer` constructor does no DOM work (DOM is deferred to `init()`). For tests, we don't call `init()`, so no DOM is needed.

```javascript
// Use the existing MockRenderer pattern from the test file
test('controller – defaults to globe projection', () => {
  const controller = new GlobeController({ renderer: new MockRenderer() });
  assert.equal(controller.getProjection(), 'globe');
});

test('controller – getProjection reflects setProjection', () => {
  const controller = new GlobeController({ renderer: new MockRenderer() });
  controller.setProjection('azimuthalEquidistant');
  assert.equal(controller.getProjection(), 'azimuthalEquidistant');
});

test('controller – setProjection back to globe', () => {
  const controller = new GlobeController({ renderer: new MockRenderer() });
  controller.setProjection('orthographic');
  assert.equal(controller.getProjection(), 'orthographic');
  controller.setProjection('globe');
  assert.equal(controller.getProjection(), 'globe');
});

test('controller – scene with projection triggers setProjection', () => {
  const controller = new GlobeController({ renderer: new MockRenderer() });
  controller.setScene({ projection: 'equirectangular', markers: [] });
  assert.equal(controller.getProjection(), 'equirectangular');
});

test('controller – switching between flat projections', () => {
  const controller = new GlobeController({ renderer: new MockRenderer() });
  controller.setProjection('azimuthalEquidistant');
  assert.equal(controller.getProjection(), 'azimuthalEquidistant');
  controller.setProjection('orthographic');
  assert.equal(controller.getProjection(), 'orthographic');
  controller.setProjection('equirectangular');
  assert.equal(controller.getProjection(), 'equirectangular');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/controller.test.js`
Expected: New tests FAIL

- [ ] **Step 3: Implement dual renderer in GlobeController**

In `src/controller/globeController.js`:

1. Import: `import { FlatMapRenderer } from '../renderer/flatMapRenderer.js';`
2. Add private fields: `#globeRenderer`, `#flatMapRenderer`, `#activeRenderer`, `#projection = 'globe'`
3. In constructor: create `FlatMapRenderer`, store both, set `#activeRenderer = #globeRenderer`
4. In init: also init flat map renderer (hidden initially)
5. Add `setProjection(name)`: switch `#activeRenderer`, show/hide canvases, sync camera state
6. Add `getProjection()`: return `#projection`
7. Update all delegation methods to use `this.#activeRenderer` instead of `this.#renderer`
8. In scene change handler: detect projection changes, call `setProjection()` if changed

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/controller.test.js`
Expected: All tests PASS

- [ ] **Step 5: Run full test suite**

Run: `node --test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add src/controller/globeController.js src/renderer/flatMapRenderer.js tests/controller.test.js && git commit -m "feat: wire dual renderer into GlobeController" -- src/controller/globeController.js src/renderer/flatMapRenderer.js tests/controller.test.js
```

---

### Task 9: Add Projection Toggle to globi-viewer.js

**Files:**
- Modify: `src/components/globi-viewer.js` (lines 339-346 template, lines 374-376 observedAttributes, lines 479-483 events)

- [ ] **Step 1: Add `projection` to observedAttributes**

Change from `['language', 'planet', 'theme', 'inspect-mode']` to `['language', 'planet', 'theme', 'inspect-mode', 'projection']`.

- [ ] **Step 2: Add projection toggle button to the template**

Add near the other toggle buttons:
```html
<button class="projection-toggle" title="Switch to map view" aria-label="Switch to map view">
  <!-- map icon SVG (shown in globe mode) -->
  <!-- globe icon SVG (shown in flat mode, display:none initially) -->
</button>
```

- [ ] **Step 3: Wire up toggle click handler**

On click: get current projection from controller, toggle between 'globe' and 'azimuthalEquidistant', update icons.

- [ ] **Step 4: Handle `projection` attribute changes in attributeChangedCallback**

Set projection on controller when attribute changes.

- [ ] **Step 5: Respect `showProjectionToggle` viewerUi config**

Hide button when `viewerUi.showProjectionToggle === false`.

- [ ] **Step 6: Test in browser**

Open editor (`npm run serve:editor`), verify:
1. Toggle button appears in controls bar
2. Clicking switches between globe and flat map
3. Setting `projection="azimuthalEquidistant"` attribute works
4. `showProjectionToggle: false` hides the button

- [ ] **Step 7: Commit**

```bash
git restore --staged :/ && git add src/components/globi-viewer.js && git commit -m "feat: add projection toggle button to globi-viewer" -- src/components/globi-viewer.js
```

---

## Chunk 5: Borders, Great-Circle Arcs, Geo Labels

### Task 10: Borders on Flat Map

**Files:**
- Modify: `src/renderer/flatMapRenderer.js`

- [ ] **Step 1: Load border GeoJSON in flat map renderer**

Fetch `assets/ne_110m_countries.geojson` asynchronously in init or first renderScene. Store in `#borderData`.

- [ ] **Step 2: Implement `#renderBorders()`**

Project GeoJSON polygon ring coordinates. Only show on Earth. Anti-meridian break detection: perform the break check in **pixel space** — if consecutive pixel x-coordinates differ by more than `canvas width / 2`, insert a `moveTo` break. This threshold works correctly at all zoom levels because the projection-to-pixel scaling is already applied. (The spec's "more than pi" criterion is in projection-coordinate space; `canvas width / 2` is the equivalent in pixel space at the default scale.)

- [ ] **Step 3: Test in browser**

Verify: borders appear on Earth in flat map mode, hidden on other bodies.

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add src/renderer/flatMapRenderer.js && git commit -m "feat: add border rendering to flat map" -- src/renderer/flatMapRenderer.js
```

---

### Task 11: Great-Circle Arcs and Densified Paths

**Files:**
- Modify: `src/renderer/flatMapRenderer.js`

- [ ] **Step 1: Import greatCircleArc and densifyPath from geo.js**

- [ ] **Step 2: Update `#renderArcs()` to use `greatCircleArc()`**

Interpolate arc start-to-end via `greatCircleArc()` with `maxAltitude: 0` (flatten). Add anti-meridian break detection. Altitude hint: vary `globalAlpha` based on `arc.maxAltitude`.

- [ ] **Step 3: Update `#renderPaths()` to use `densifyPath()`**

Densify waypoints before projecting. Add anti-meridian break detection.

- [ ] **Step 4: Test in browser**

Verify arcs follow great-circle curves, not straight lines.

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/flatMapRenderer.js && git commit -m "feat: great-circle arcs and densified paths on flat map" -- src/renderer/flatMapRenderer.js
```

---

### Task 12: Geo Labels on Flat Map

**Files:**
- Modify: `src/renderer/flatMapRenderer.js`

- [ ] **Step 1: Import `getBodyLabels` from bodyLabels.js**

- [ ] **Step 2: Implement `#renderGeoLabels()`**

Project label center positions, draw with `ctx.fillText()`. Font size = `10 * sqrt(zoom)`. Style: italic for oceans, blue tint for oceans, white/black for continents depending on theme. Cull labels outside viewport.

- [ ] **Step 3: Test in browser**

Verify: labels appear, scaled by zoom, styled per type.

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add src/renderer/flatMapRenderer.js && git commit -m "feat: add geo labels to flat map" -- src/renderer/flatMapRenderer.js
```

---

## Chunk 6: Callouts & Pointer Events

### Task 13: Callout Labels on Flat Map

**Files:**
- Modify: `src/renderer/flatMapRenderer.js`

- [ ] **Step 1: Implement `#renderCallouts()` via CSS overlay div**

Clear existing overlay children using DOM methods (remove children one by one via `while (el.firstChild) el.removeChild(el.firstChild)`). For each marker with `calloutMode === 'always'` that passes filters and is visible: create a `<div>`, set `textContent` to the label, position absolutely at projected coordinates with small offset. Append to overlay div.

- [ ] **Step 2: Call `#renderCallouts()` at the end of `#render()`**

- [ ] **Step 3: Test in browser**

Verify: marker labels appear next to markers in flat map mode.

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add src/renderer/flatMapRenderer.js && git commit -m "feat: add callout labels to flat map" -- src/renderer/flatMapRenderer.js
```

---

### Task 14: Pointer Events for Flat Map in globi-viewer.js

**Files:**
- Modify: `src/components/globi-viewer.js` (lines 1035-1137 pointer handlers)

- [ ] **Step 1: Update pointer handlers for flat map drag lifecycle**

Add `startDrag()` and `endDrag()` proxy methods to `GlobeController` that delegate to `#activeRenderer` (if the method exists). Then in `globi-viewer.js`:
In `#onPointerDown()`: call `this._controller.startDrag()`.
In `#onPointerUp()`: call `this._controller.endDrag()`.
The globe renderer ignores these calls (no such methods), the flat map renderer uses them for low-res texture mode.
The existing `panBy()` and `screenToLatLon()` calls already delegate through the controller to the active renderer — verify this works.

- [ ] **Step 2: Implement zoom-into-cursor**

In `globi-viewer.js`, modify `#onWheel()` to support zoom-into-cursor for flat map mode. Before calling `zoomBy()`, get the cursor's lat/lon via `screenToLatLon()`. After zooming, adjust center toward that lat/lon proportionally to the zoom delta. This gives web-map-style zoom behavior:

```javascript
// In #onWheel():
const cursorLatLon = this._controller.screenToLatLon(event.clientX, event.clientY);
const oldZoom = this._controller.getCameraState().zoom;
this._controller.zoomBy(delta);
const newZoom = this._controller.getCameraState().zoom;
if (cursorLatLon && oldZoom !== newZoom) {
  const factor = 1 - oldZoom / newZoom;
  const state = this._controller.getCameraState();
  this._controller.panBy(
    (cursorLatLon.lon - state.centerLon) * factor,
    (cursorLatLon.lat - state.centerLat) * factor
  );
}
```

- [ ] **Step 3: Verify off-disc fallback works**

When `screenToLatLon()` returns null (cursor outside projection boundary), the existing screen-delta fallback code should handle it. Verify.

- [ ] **Step 4: Test in browser**

Verify:
1. Mouse drag pans the flat map
2. Texture goes low-res during drag, full-res on release
3. Mouse wheel zooms into cursor position
4. Click on markers fires event
5. Keyboard nav works

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/components/globi-viewer.js src/controller/globeController.js && git commit -m "feat: wire pointer events and zoom-into-cursor for flat map" -- src/components/globi-viewer.js src/controller/globeController.js
```

---

### Task 14b: Scale Bar for Flat Map

**Files:**
- Modify: `src/components/globi-viewer.js` (scale bar computation)
- Modify: `src/renderer/flatMapRenderer.js`

- [ ] **Step 1: Add `getScaleAtCenter()` to FlatMapRenderer**

Compute distance-per-pixel at the projection center by measuring the great-circle distance between two points separated by 1 pixel:

```javascript
getScaleAtCenter() {
  if (!this.#width) return null;
  const scale = this.#getScale();
  // 1 pixel in projection units
  const projDelta = 1 / scale;
  // planet.radius is in Earth-radii (Earth=1, Mars=0.532, etc.)
  // Verify by checking src/scene/celestial.js — each preset has radius in Earth-radii
  const planetRadius = this.#scene?.planet?.radius ?? 1;
  const earthRadiusKm = 6371;
  return projDelta * planetRadius * earthRadiusKm;
}
```

Note: Verify that `scene.planet.radius` exists and uses Earth-radii units by reading `src/scene/celestial.js` before implementing.

- [ ] **Step 2: Wire scale bar in globi-viewer.js**

In the scale bar update logic, if flat map is active, use `getScaleAtCenter()` instead of the existing globe-based computation. Add `getScaleAtCenter()` proxy to `GlobeController`.

- [ ] **Step 3: Test in browser**

Verify: scale bar shows correct distance in flat map mode, updates on zoom.

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add src/renderer/flatMapRenderer.js src/components/globi-viewer.js && git commit -m "feat: scale bar for flat map mode" -- src/renderer/flatMapRenderer.js src/components/globi-viewer.js
```

---

## Chunk 7: Final Integration & Docs

### Task 15: Integration Tests & Full Test Pass

**Files:**
- Modify: `tests/flat-map-renderer.test.js`

- [ ] **Step 1: Add integration-level tests**

```javascript
test('FlatMapRenderer – screenToLatLon round-trips with projectPointToClient', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.flyTo({ lat: 30, lon: 60, zoom: 2 });
  const state = renderer.getCameraState();
  assert.equal(state.centerLat, 30);
  assert.equal(state.centerLon, 60);
  assert.equal(state.zoom, 2);
});

test('FlatMapRenderer – panBy wraps longitude', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.flyTo({ lat: 0, lon: 170, zoom: 1 });
  renderer.panBy(20, 0);
  const state = renderer.getCameraState();
  assert.ok(state.centerLon >= -180 && state.centerLon <= 180);
});

test('FlatMapRenderer – panBy clamps latitude', async () => {
  const { FlatMapRenderer } = await import('../src/renderer/flatMapRenderer.js');
  const renderer = new FlatMapRenderer();
  renderer.panBy(0, 100);
  assert.ok(renderer.getCameraState().centerLat < 90);
});
```

- [ ] **Step 2: Run all tests**

Run: `node --test`
Expected: All tests PASS

- [ ] **Step 3: Run linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Browser integration test checklist**

Open editor (`npm run serve:editor`). Verify:
1. Globe mode works as before (no regressions)
2. Toggle button switches to flat map
3. Flat map shows projected texture
4. Graticule lines visible
5. Borders visible (Earth only)
6. Markers render at correct positions
7. Marker callout labels appear
8. Arcs follow great-circle curves
9. Paths render correctly
10. Regions render with correct fill
11. Geo labels visible
12. Pan (drag) works smoothly
13. Zoom (wheel) works, centers on cursor
14. Keyboard nav (arrows, +/-) works
15. Click on marker fires event
16. Switch body (e.g., Mars) — texture, labels, borders update
17. Switch back to globe — same center preserved
18. Fullscreen works in flat map mode
19. Light/dark theme applies correctly
20. `showProjectionToggle: false` hides toggle

- [ ] **Step 5: Commit test additions**

```bash
git restore --staged :/ && git add tests/flat-map-renderer.test.js && git commit -m "test: add integration tests for flat map renderer" -- tests/flat-map-renderer.test.js
```

---

### Task 16: Update FEATURES.md, RELEASE_NOTES.md, User Docs

**Files:**
- Modify: `FEATURES.md`
- Modify: `RELEASE_NOTES.md`
- Modify: `docs/QUICK_START_EMBED.md`
- Modify: `docs/QUICK_START_CONTENT_CREATORS.md`

- [ ] **Step 1: Update FEATURES.md**

Add flat map projection feature checklist.

- [ ] **Step 2: Update RELEASE_NOTES.md**

Add to current release section:
- New flat map projection mode
- Three projection types
- UI toggle and programmatic control
- Full feature parity with globe

- [ ] **Step 3: Update embed quick start**

Add section on flat map mode with `projection` attribute usage.

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add FEATURES.md RELEASE_NOTES.md docs/QUICK_START_EMBED.md docs/QUICK_START_CONTENT_CREATORS.md && git commit -m "docs: add flat map projection documentation" -- FEATURES.md RELEASE_NOTES.md docs/QUICK_START_EMBED.md docs/QUICK_START_CONTENT_CREATORS.md
```
