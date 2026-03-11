# Globe Surface Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the default earth texture, add country border outlines, and render ocean/continent labels as curved surface text.

**Architecture:** Three independent features layered onto the existing Three.js globe renderer. Each follows the established manager pattern (`update()`/`dispose()`). Borders use WebGL `LineSegments` from Natural Earth 110m GeoJSON. Labels use Canvas2D-textured curved mesh strips on the sphere. Both use create-once, toggle-visibility semantics.

**Tech Stack:** Three.js (LineSegments, BufferGeometry, CanvasTexture, MeshBasicMaterial), Canvas2D for text rendering, Natural Earth 110m GeoJSON for border data.

**Spec:** `docs/superpowers/specs/2026-03-11-globe-surface-improvements-design.md`

---

## File Structure

| File | Responsibility | New/Modified |
| ---- | -------------- | ------------ |
| `src/renderer/threeGlobeRenderer.js` | Integrate default texture, border + label managers, groups, destroy | Modified |
| `src/renderer/borderManager.js` | Build and toggle country border LineSegments from GeoJSON | New |
| `src/renderer/geoLabelManager.js` | Build and toggle curved surface text meshes for oceans/continents | New |
| `src/scene/celestial.js` | Default `showBorders`/`showLabels` to `true` in `resolvePlanetConfig()` | Modified |
| `src/scene/schema.js` | Validate `showBorders`/`showLabels` as booleans | Modified |
| `assets/ne_110m_countries.geojson` | Bundled Natural Earth 110m country boundary data | New |
| `editor/index.html` | Checkboxes for borders/labels toggles | Modified |
| `editor/app.js` | Wire toggles to scene planet config | Modified |
| `tests/border-manager.test.js` | Unit tests for BorderManager | New |
| `tests/geo-label-manager.test.js` | Unit tests for GeoLabelManager | New |
| `tests/celestial.test.js` | Add tests for new defaults | Modified |
| `tests/schema.test.js` | Add tests for new schema fields | Modified |

---

## Chunk 1: Schema & Default Texture

### Task 1: Add `showBorders` and `showLabels` to planet config

**Files:**
- Modify: `src/scene/celestial.js:186-202` (preset branch) and `:209-225` (custom branch)
- Modify: `src/scene/schema.js:204-219` (validation)
- Test: `tests/celestial.test.js`
- Test: `tests/schema.test.js`

- [ ] **Step 1: Write failing tests for new planet defaults**

In `tests/celestial.test.js`, add `resolvePlanetConfig` to the existing static import at the top of the file:

```js
import {
  CELESTIAL_PRESET_IDS,
  listCelestialPresets,
  getCelestialPreset,
  isCelestialPresetId,
  resolvePlanetConfig,
} from '../src/scene/celestial.js';
```

Then add these tests:

```js
test('resolvePlanetConfig defaults showBorders and showLabels to true', () => {
  const earth = resolvePlanetConfig('earth');
  assert.equal(earth.showBorders, true);
  assert.equal(earth.showLabels, true);

  const custom = resolvePlanetConfig({ id: 'myplanet' });
  assert.equal(custom.showBorders, true);
  assert.equal(custom.showLabels, true);
});

test('resolvePlanetConfig preserves explicit showBorders/showLabels false', () => {
  const planet = resolvePlanetConfig({ id: 'earth', showBorders: false, showLabels: false });
  assert.equal(planet.showBorders, false);
  assert.equal(planet.showLabels, false);
});
```

In `tests/schema.test.js`, add:

```js
test('normalizeScene defaults showBorders and showLabels to true', () => {
  const normalized = normalizeScene({});
  assert.equal(normalized.planet.showBorders, true);
  assert.equal(normalized.planet.showLabels, true);
});

test('validateScene accepts showBorders and showLabels booleans', () => {
  const scene = createEmptyScene();
  scene.planet.showBorders = false;
  scene.planet.showLabels = false;
  const result = validateScene(scene);
  assert.equal(result.valid, true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/celestial.test.js tests/schema.test.js`
Expected: FAIL — `showBorders` is `undefined`

- [ ] **Step 3: Add defaults to `resolvePlanetConfig()`**

In `src/scene/celestial.js`, add to `resolvePlanetConfig()`. In the **preset branch** return object (lines 186-202), add these two lines **before the closing `};`**, after the `lightingTimestamp` line:

```js
      showBorders: planet.showBorders !== false,
      showLabels: planet.showLabels !== false,
```

In the **custom branch** return object (lines 209-225), add the same two lines **before the closing `};`**, after the `lightingTimestamp` line:

```js
      showBorders: planet.showBorders !== false,
      showLabels: planet.showLabels !== false,
```

In `clonePreset()` (line ~138-144), add defaults:

```js
function clonePreset(preset) {
  return {
    ...preset,
    lightingMode: 'fixed',
    lightingTimestamp: '',
    showBorders: true,
    showLabels: true,
  };
}
```

- [ ] **Step 4: Add validation in `schema.js`**

In `validateScene()`, after the `lightingTimestamp` validation block (line ~219), add:

```js
if (scene.planet.showBorders !== undefined && typeof scene.planet.showBorders !== 'boolean') {
  errors.push('planet.showBorders must be a boolean');
}
if (scene.planet.showLabels !== undefined && typeof scene.planet.showLabels !== 'boolean') {
  errors.push('planet.showLabels must be a boolean');
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/celestial.test.js tests/schema.test.js`
Expected: ALL PASS

- [ ] **Step 6: Run full test suite**

Run: `node --test`
Expected: ALL PASS (no regressions)

- [ ] **Step 7: Commit**

```bash
git restore --staged :/ && git add src/scene/celestial.js src/scene/schema.js tests/celestial.test.js tests/schema.test.js && git commit -m "feat: add showBorders and showLabels to planet config schema" -- src/scene/celestial.js src/scene/schema.js tests/celestial.test.js tests/schema.test.js
```

---

### Task 2: Load default earth texture at init

**Files:**
- Modify: `src/renderer/threeGlobeRenderer.js:213-260` (init method)

- [ ] **Step 1: Add default texture loading after earth mesh creation**

In `threeGlobeRenderer.js`, after line 241 (`globeGroup.add(earthMesh);`), add:

```js
// Load default day texture for Earth
this.#loadTexture('assets/earth_day_2k.jpg', 'dayTexture');
```

This uses the existing `#loadTexture` method which handles async loading, caching, applying to the shader uniform, and error events.

- [ ] **Step 2: On-device test in editor**

Open `editor/index.html` in a browser. The globe should immediately show the earth photo texture without loading any example scene.

Verify:
- Earth texture is visible on load
- Loading an example scene with a different `textureUri` overrides the default
- No console errors

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add src/renderer/threeGlobeRenderer.js && git commit -m "fix: load default earth texture at init to prevent null-texture artifacts" -- src/renderer/threeGlobeRenderer.js
```

---

## Chunk 2: Country Border Outlines

### Task 3: Download and bundle Natural Earth 110m countries GeoJSON

**Files:**
- Create: `assets/ne_110m_countries.geojson`

- [ ] **Step 1: Download the data**

**IMPORTANT:** Use the Natural Earth 110m URL (small, ~120KB). Do NOT use `datasets/geo-countries` which is 10m resolution (~23MB).

```bash
curl -L 'https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.geojson' -o assets/ne_110m_countries.geojson
```

Fallback if NACIS CDN is down: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson`

- [ ] **Step 2: Verify the file is 110m (small) and valid**

```bash
ls -lh assets/ne_110m_countries.geojson
node -e "const d = JSON.parse(require('fs').readFileSync('assets/ne_110m_countries.geojson','utf8')); console.log('Type:', d.type, 'Features:', d.features.length);"
```

Expected: File size ~120-250KB (NOT megabytes). `Type: FeatureCollection Features: ~177`
If file is >1MB, the wrong resolution was downloaded — re-download from the 110m URL.

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add assets/ne_110m_countries.geojson && git commit -m "data: bundle Natural Earth 110m country boundaries GeoJSON" -- assets/ne_110m_countries.geojson
```

---

### Task 4: Implement BorderManager

**Files:**
- Create: `src/renderer/borderManager.js`
- Test: `tests/border-manager.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/border-manager.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { BorderManager } from '../src/renderer/borderManager.js';
import { Group } from 'three';

const SIMPLE_GEOJSON = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    },
  }],
};

const MULTI_GEOJSON = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
        [[[10, 10], [15, 10], [15, 15], [10, 15], [10, 10]]],
      ],
    },
  }],
};

test('BorderManager creates LineSegments from Polygon', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { show: true });
  assert.ok(group.children.length >= 1);
  const child = group.children[0];
  assert.ok(child.geometry.attributes.position.count > 0);
});

test('BorderManager creates LineSegments from MultiPolygon', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, MULTI_GEOJSON, { show: true });
  assert.ok(group.children.length >= 1);
});

test('BorderManager toggles visibility without rebuilding', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { show: true });
  const childCount = group.children.length;

  manager.update(group, SIMPLE_GEOJSON, { show: false });
  assert.equal(group.visible, false);
  assert.equal(group.children.length, childCount);

  manager.update(group, SIMPLE_GEOJSON, { show: true });
  assert.equal(group.visible, true);
});

test('BorderManager handles empty FeatureCollection', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, { type: 'FeatureCollection', features: [] }, { show: true });
  assert.equal(group.children.length, 0);
});

test('BorderManager handles null geojson gracefully', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, null, { show: true });
  assert.equal(group.children.length, 0);
});

test('BorderManager dispose clears geometry', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { show: true });
  manager.dispose();
  assert.equal(group.children.length, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/border-manager.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement BorderManager**

Create `src/renderer/borderManager.js`:

```js
import {
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { latLonToCartesian } from '../math/geo.js';

const BORDER_ALTITUDE = 0.002;
const BORDER_COLOR = 0xffffff;
const BORDER_OPACITY = 0.35;

export class BorderManager {
  #group = null;
  #built = false;

  update(group, geojson, { show = true } = {}) {
    this.#group = group;
    group.visible = show;

    if (this.#built || !geojson) return;
    if (!geojson.features || geojson.features.length === 0) return;

    const vertices = [];

    for (const feature of geojson.features) {
      const geom = feature.geometry;
      if (!geom) continue;

      const polygons = geom.type === 'Polygon'
        ? [geom.coordinates]
        : geom.type === 'MultiPolygon'
          ? geom.coordinates
          : [];

      for (const polygon of polygons) {
        const ring = polygon[0];
        if (!Array.isArray(ring) || ring.length < 4) continue;

        for (let i = 0; i < ring.length - 1; i++) {
          const [lon0, lat0] = ring[i];
          const [lon1, lat1] = ring[i + 1];
          const a = latLonToCartesian(lat0, lon0, 1, BORDER_ALTITUDE);
          const b = latLonToCartesian(lat1, lon1, 1, BORDER_ALTITUDE);
          vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }

    if (vertices.length === 0) return;

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(vertices), 3));

    const material = new LineBasicMaterial({
      color: BORDER_COLOR,
      transparent: true,
      opacity: BORDER_OPACITY,
      depthWrite: false,
    });

    const lines = new LineSegments(geometry, material);
    lines.userData = { kind: 'borders' };
    group.add(lines);
    this.#built = true;
  }

  dispose() {
    if (!this.#group) return;
    const toRemove = [...this.#group.children];
    for (const child of toRemove) {
      this.#group.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
    this.#built = false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/border-manager.test.js`
Expected: ALL PASS

- [ ] **Step 5: Run full test suite**

Run: `node --test`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add src/renderer/borderManager.js tests/border-manager.test.js && git commit -m "feat: add BorderManager for country outline rendering" -- src/renderer/borderManager.js tests/border-manager.test.js
```

---

### Task 5: Integrate BorderManager into ThreeGlobeRenderer

**Files:**
- Modify: `src/renderer/threeGlobeRenderer.js`

- [ ] **Step 1: Add imports, fields, group, and integration**

In `threeGlobeRenderer.js`:

1. Add import at top (after existing manager imports):
```js
import { BorderManager } from './borderManager.js';
```

2. Add private fields (near line 58-62, with other managers):
```js
#borderManager = new BorderManager();
#borderGroup = null;
#borderGeoJson = null;
```

3. In `init()`, after `#regionGroup` setup (line ~256), add:
```js
this.#borderGroup = new Group();
globeGroup.add(this.#borderGroup);
```

4. After creating all groups, add async GeoJSON fetch.

**Note on race condition:** If no `renderScene()` has been called yet when the fetch completes, `#lastScene` is null and borders won't be built immediately. This is fine — the next `renderScene()` call will pick up the cached GeoJSON and build the borders then.

```js
fetch('assets/ne_110m_countries.geojson')
  .then(r => r.ok ? r.json() : null)
  .then(data => {
    if (data) {
      this.#borderGeoJson = data;
      if (this.#lastScene) {
        const show = this.#lastScene.planet?.showBorders !== false;
        this.#borderManager.update(this.#borderGroup, data, { show });
        this.#dirty = true;
      }
    }
  })
  .catch(() => {});
```

5. In `renderScene()`, after region manager update (line ~275), add:
```js
if (this.#borderGroup && this.#borderGeoJson) {
  const showBorders = (scene.planet ?? {}).showBorders !== false;
  this.#borderManager.update(this.#borderGroup, this.#borderGeoJson, { show: showBorders });
}
```

6. In `destroy()`, after `#calloutManager?.dispose()` (line ~512), add:
```js
this.#borderManager?.dispose();
```

- [ ] **Step 2: Run full test suite**

Run: `node --test`
Expected: ALL PASS

- [ ] **Step 3: On-device test in editor**

Open `editor/index.html`. After a moment, country borders should appear as white outlines over the earth texture. Load the "Continents + Seas" example to verify borders coexist with regions.

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add src/renderer/threeGlobeRenderer.js && git commit -m "feat: integrate BorderManager into globe renderer with async GeoJSON loading" -- src/renderer/threeGlobeRenderer.js
```

---

## Chunk 3: Ocean & Continent Surface Labels

### Task 6: Implement GeoLabelManager

**Files:**
- Create: `src/renderer/geoLabelManager.js`
- Test: `tests/geo-label-manager.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/geo-label-manager.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { GeoLabelManager, GEO_LABELS } from '../src/renderer/geoLabelManager.js';
import { Group } from 'three';

test('GEO_LABELS contains 12 entries (7 continents + 5 oceans)', () => {
  assert.equal(GEO_LABELS.length, 12);
  const continents = GEO_LABELS.filter(l => l.style === 'continent');
  const oceans = GEO_LABELS.filter(l => l.style === 'ocean');
  assert.equal(continents.length, 7);
  assert.equal(oceans.length, 5);
});

test('GeoLabelManager creates meshes for all labels', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  assert.equal(group.children.length, 12);
});

test('GeoLabelManager toggles visibility without rebuilding', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  assert.equal(group.children.length, 12);

  manager.update(group, { showLabels: false });
  assert.equal(group.visible, false);
  assert.equal(group.children.length, 12);

  manager.update(group, { showLabels: true });
  assert.equal(group.visible, true);
});

test('GeoLabelManager dispose clears all meshes', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  manager.dispose();
  assert.equal(group.children.length, 0);
});

test('each label mesh has position attribute with vertices', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  for (const child of group.children) {
    assert.ok(child.geometry.attributes.position.count > 0, `mesh for ${child.userData.label} has no vertices`);
  }
});

test('label meshes have depthWrite false and transparent true', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  for (const child of group.children) {
    assert.equal(child.material.depthWrite, false);
    assert.equal(child.material.transparent, true);
  }
});

test('each label mesh has userData with label text', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  manager.update(group, { showLabels: true });
  const labelTexts = group.children.map(c => c.userData.label);
  assert.ok(labelTexts.includes('AFRICA'));
  assert.ok(labelTexts.includes('Pacific Ocean'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/geo-label-manager.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement GeoLabelManager**

Create `src/renderer/geoLabelManager.js`:

```js
import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
} from 'three';
import { latLonToCartesian } from '../math/geo.js';

const DEG_TO_RAD = Math.PI / 180;
const LABEL_ALTITUDE = 0.003;
const QUAD_SEGMENTS = 32;

export const GEO_LABELS = [
  { text: 'AFRICA',        lat: 0,   lon: 22,   heading: 0,   style: 'continent' },
  { text: 'ASIA',          lat: 45,  lon: 90,   heading: 0,   style: 'continent' },
  { text: 'EUROPE',        lat: 52,  lon: 15,   heading: 0,   style: 'continent' },
  { text: 'NORTH AMERICA', lat: 45,  lon: -100, heading: 0,   style: 'continent' },
  { text: 'SOUTH AMERICA', lat: -15, lon: -58,  heading: -20, style: 'continent' },
  { text: 'OCEANIA',       lat: -25, lon: 135,  heading: 0,   style: 'continent' },
  { text: 'ANTARCTICA',    lat: -82, lon: 0,    heading: 0,   style: 'continent' },
  { text: 'Pacific Ocean',  lat: 0,   lon: -160, heading: -10, style: 'ocean' },
  { text: 'Atlantic Ocean', lat: 15,  lon: -35,  heading: -60, style: 'ocean' },
  { text: 'Indian Ocean',   lat: -20, lon: 75,   heading: -30, style: 'ocean' },
  { text: 'Arctic Ocean',   lat: 80,  lon: 0,    heading: 0,   style: 'ocean' },
  { text: 'Southern Ocean',  lat: -65, lon: 0,    heading: 0,   style: 'ocean' },
];

const STYLES = {
  continent: {
    fontSize: 48,
    fontStyle: '600 48px "Avenir Next", "Segoe UI", system-ui, sans-serif',
    fillStyle: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 8,
    arcDeg: 30,
  },
  ocean: {
    fontSize: 40,
    fontStyle: 'italic 40px "Avenir Next", "Segoe UI", system-ui, sans-serif',
    fillStyle: 'rgba(150, 190, 255, 0.3)',
    letterSpacing: 4,
    arcDeg: 25,
  },
};

function nextPow2(n) {
  let v = 1;
  while (v < n) v *= 2;
  return v;
}

function renderTextToCanvas(text, style) {
  const cfg = STYLES[style];
  const measure = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(1, 1)
    : createFallbackCanvas(1, 1);
  const mCtx = measure.getContext('2d');
  mCtx.font = cfg.fontStyle;
  const textWidth = mCtx.measureText(text).width + cfg.letterSpacing * text.length;
  const textHeight = cfg.fontSize * 1.4;

  const cw = nextPow2(Math.ceil(textWidth + 16));
  const ch = nextPow2(Math.ceil(textHeight + 8));
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(cw, ch)
    : createFallbackCanvas(cw, ch);
  const ctx = canvas.getContext('2d');

  ctx.font = cfg.fontStyle;
  ctx.fillStyle = cfg.fillStyle;
  ctx.textBaseline = 'middle';

  let x = 8;
  for (const char of text) {
    ctx.fillText(char, x, ch / 2);
    x += mCtx.measureText(char).width + cfg.letterSpacing;
  }

  return { canvas, width: cw, height: ch };
}

function createFallbackCanvas(w, h) {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return { width: w, height: h, getContext: () => createMockContext() };
}

function createMockContext() {
  return {
    font: '',
    fillStyle: '',
    textBaseline: '',
    measureText: () => ({ width: 10 }),
    fillText: () => {},
  };
}

function buildCurvedStrip(lat, lon, heading, arcDeg, aspectRatio) {
  const halfArc = (arcDeg / 2) * DEG_TO_RAD;
  const stripHeight = (arcDeg / aspectRatio) * DEG_TO_RAD;
  const halfHeight = stripHeight / 2;
  const headingRad = heading * DEG_TO_RAD;
  const latRad = lat * DEG_TO_RAD;
  const lonRad = lon * DEG_TO_RAD;

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= QUAD_SEGMENTS; i++) {
    const t = i / QUAD_SEGMENTS;
    const along = -halfArc + t * 2 * halfArc;

    for (let j = 0; j < 2; j++) {
      const across = j === 0 ? -halfHeight : halfHeight;

      const dLon = along * Math.cos(headingRad) - across * Math.sin(headingRad);
      const dLat = along * Math.sin(headingRad) + across * Math.cos(headingRad);

      const pLat = latRad + dLat;
      const pLon = lonRad + dLon;

      const cart = latLonToCartesian(
        pLat / DEG_TO_RAD,
        pLon / DEG_TO_RAD,
        1,
        LABEL_ALTITUDE,
      );
      positions.push(cart.x, cart.y, cart.z);
      uvs.push(t, 1 - j);
    }

    if (i < QUAD_SEGMENTS) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class GeoLabelManager {
  #group = null;
  #built = false;

  update(group, { showLabels = true } = {}) {
    this.#group = group;
    group.visible = showLabels;

    if (this.#built) return;

    for (const label of GEO_LABELS) {
      const cfg = STYLES[label.style];
      const { canvas, width, height } = renderTextToCanvas(label.text, label.style);
      const aspectRatio = width / height;

      // CanvasTexture accepts the mock canvas object in Node.js tests —
      // Three.js just stores the reference; actual GPU upload only happens in browser.
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;

      const geometry = buildCurvedStrip(
        label.lat, label.lon, label.heading, cfg.arcDeg, aspectRatio,
      );

      const material = new MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
      });

      const mesh = new Mesh(geometry, material);
      mesh.userData = { kind: 'geoLabel', label: label.text };
      group.add(mesh);
    }

    this.#built = true;
  }

  dispose() {
    if (!this.#group) return;
    const toRemove = [...this.#group.children];
    for (const child of toRemove) {
      this.#group.remove(child);
      child.geometry?.dispose();
      if (child.material?.map) child.material.map.dispose();
      child.material?.dispose();
    }
    this.#built = false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/geo-label-manager.test.js`
Expected: ALL PASS

- [ ] **Step 5: Run full test suite**

Run: `node --test`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add src/renderer/geoLabelManager.js tests/geo-label-manager.test.js && git commit -m "feat: add GeoLabelManager for curved surface text labels" -- src/renderer/geoLabelManager.js tests/geo-label-manager.test.js
```

---

### Task 7: Integrate GeoLabelManager into ThreeGlobeRenderer

**Files:**
- Modify: `src/renderer/threeGlobeRenderer.js`

- [ ] **Step 1: Add imports, fields, group, and integration**

In `threeGlobeRenderer.js`:

1. Add import:
```js
import { GeoLabelManager } from './geoLabelManager.js';
```

2. Add private fields:
```js
#geoLabelManager = new GeoLabelManager();
#geoLabelGroup = null;
```

3. In `init()`, after `#borderGroup` setup, add:
```js
this.#geoLabelGroup = new Group();
globeGroup.add(this.#geoLabelGroup);
```

4. In `renderScene()`, after border manager update, add:
```js
if (this.#geoLabelGroup) {
  const showLabels = (scene.planet ?? {}).showLabels !== false;
  this.#geoLabelManager.update(this.#geoLabelGroup, { showLabels });
}
```

5. In `destroy()`, after border manager dispose, add:
```js
this.#geoLabelManager?.dispose();
```

- [ ] **Step 2: Run full test suite**

Run: `node --test`
Expected: ALL PASS

- [ ] **Step 3: On-device test in editor**

Open `editor/index.html`. Verify:
- Continent names appear in white on the land masses
- Ocean names appear in blue-tinted text on water
- Text curves with the globe as you rotate
- Text hides when on the far side of the globe

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add src/renderer/threeGlobeRenderer.js && git commit -m "feat: integrate GeoLabelManager into globe renderer" -- src/renderer/threeGlobeRenderer.js
```

---

## Chunk 4: Editor Toggles & Final Polish

### Task 8: Add editor toggles for borders and labels

**Files:**
- Modify: `editor/index.html`
- Modify: `editor/app.js`

- [ ] **Step 1: Add checkboxes to editor HTML**

In `editor/index.html`, after the "Viewer UI" `<details>` block (line ~68), and before the "Load Example Scene" section, add inside the Viewer UI stack:

```html
<label class="row inspect-mode-row"><input id="show-borders" type="checkbox" checked /> Show country borders</label>
<label class="row inspect-mode-row"><input id="show-labels" type="checkbox" checked /> Show geographic labels</label>
```

- [ ] **Step 2: Wire checkboxes in app.js**

In `editor/app.js`:

1. Add element refs near other element refs:
```js
const showBordersCheckbox = document.getElementById('show-borders');
const showLabelsCheckbox = document.getElementById('show-labels');
```

2. Add event listeners (near other checkbox listeners):
```js
showBordersCheckbox.addEventListener('change', () => {
  scene.planet.showBorders = showBordersCheckbox.checked;
  renderToViewer();
});

showLabelsCheckbox.addEventListener('change', () => {
  scene.planet.showLabels = showLabelsCheckbox.checked;
  renderToViewer();
});
```

- [ ] **Step 3: On-device test**

Open editor. Toggle checkboxes:
- Unchecking "Show country borders" hides borders
- Unchecking "Show geographic labels" hides labels
- Re-checking shows them again
- Loading an example scene respects the toggle state

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add editor/index.html editor/app.js && git commit -m "feat: add editor toggles for country borders and geographic labels" -- editor/index.html editor/app.js
```

---

### Task 9: Final integration test & cleanup

**Files:**
- Run all tests
- On-device visual QA

- [ ] **Step 1: Run full test suite**

Run: `node --test`
Expected: ALL PASS

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: PASS (or fix any lint issues)

- [ ] **Step 3: Full on-device QA in editor**

Open `editor/index.html` and verify all of the following:

1. Earth texture loads immediately (no example needed)
2. Country borders appear as white outlines after brief loading delay
3. Continent labels appear as curved white text on land
4. Ocean labels appear as curved blue-tinted italic text on water
5. Rotating the globe: labels and borders move with the surface
6. Backface: labels hidden when facing away
7. Zoom in: borders stay crisp (line geometry)
8. Toggle checkboxes: borders and labels toggle on/off
9. Load "Continents + Seas" example: borders + regions coexist
10. Load "World Capitals" example: borders + markers coexist
11. No console errors

- [ ] **Step 4: Tune label positions if needed**

If any continent/ocean labels are poorly positioned (overlapping, wrong location), adjust the lat/lon/heading values in `GEO_LABELS` array in `src/renderer/geoLabelManager.js`. Commit any adjustments.

- [ ] **Step 5: Update FEATURES.md and RELEASE_NOTES.md**

Mark relevant feature items as complete in `FEATURES.md`. Add release notes to `RELEASE_NOTES.md`.

- [ ] **Step 6: Final commit**

```bash
git restore --staged :/ && git add FEATURES.md RELEASE_NOTES.md && git commit -m "docs: update FEATURES.md and RELEASE_NOTES.md for globe surface improvements" -- FEATURES.md RELEASE_NOTES.md
```
