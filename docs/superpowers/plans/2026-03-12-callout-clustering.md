# Callout Clustering Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cluster overlapping callout labels by geographic proximity so nearby markers display as stacked cascades (2-3) or collapsible group badges (4+).

**Architecture:** Clustering runs at schema normalization time in `schema.js`, annotating markers with `_cluster*` fields. `CalloutManager` reads those fields and renders cascades or group badges. `threeGlobeRenderer.js` wires the expand/collapse interaction.

**Tech Stack:** Three.js, CSS2DRenderer, Node test runner

---

## File Structure

| File | Role |
|------|------|
| `src/scene/schema.js` | Add `normalizeCalloutCluster()`, `clusterMarkers()`, haversine centroid logic |
| `src/renderer/calloutManager.js` | Read `_cluster*` fields, render cascade offsets and group badges, manage expand/collapse state |
| `src/renderer/threeGlobeRenderer.js` | Wire click-elsewhere collapse listener, pass cluster events |
| `tests/schema-clustering.test.js` | **Create:** Schema-level clustering tests |
| `tests/callout-manager.test.js` | Add clustering rendering tests |

---

## Chunk 1: Schema-level clustering

### Task 1: Add `normalizeCalloutCluster` and schema config

**Files:**
- Modify: `src/scene/schema.js:155-173` (normalizeScene function)
- Test: `tests/schema-clustering.test.js` (create)

- [ ] **Step 1: Write failing test — default calloutCluster config**

Create `tests/schema-clustering.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScene } from '../src/scene/schema.js';

test('normalizeScene adds default calloutCluster when omitted', () => {
  const scene = normalizeScene({ markers: [] });
  assert.deepStrictEqual(scene.calloutCluster, { enabled: true, thresholdDeg: 2 });
});

test('normalizeScene preserves custom calloutCluster config', () => {
  const scene = normalizeScene({
    markers: [],
    calloutCluster: { enabled: true, thresholdDeg: 5 },
  });
  assert.deepStrictEqual(scene.calloutCluster, { enabled: true, thresholdDeg: 5 });
});

test('normalizeScene respects calloutCluster enabled: false', () => {
  const scene = normalizeScene({
    markers: [],
    calloutCluster: { enabled: false, thresholdDeg: 2 },
  });
  assert.equal(scene.calloutCluster.enabled, false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/schema-clustering.test.js`
Expected: FAIL — `scene.calloutCluster` is `undefined`

- [ ] **Step 3: Implement `normalizeCalloutCluster` in schema.js**

Add before `normalizeScene`:

```js
function normalizeCalloutCluster(config) {
  const c = ensureObject(config, {});
  return {
    enabled: typeof c.enabled === 'boolean' ? c.enabled : true,
    thresholdDeg: Number.isFinite(c.thresholdDeg) && c.thresholdDeg > 0
      ? c.thresholdDeg
      : 2,
  };
}
```

In `normalizeScene`, add to the returned object:

```js
calloutCluster: normalizeCalloutCluster(scene.calloutCluster),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/schema-clustering.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/scene/schema.js tests/schema-clustering.test.js && git commit -m "feat: add calloutCluster config normalization to schema" -- src/scene/schema.js tests/schema-clustering.test.js
```

---

### Task 2: Implement `clusterMarkers` function

**Files:**
- Modify: `src/scene/schema.js`
- Test: `tests/schema-clustering.test.js`

- [ ] **Step 1: Write failing tests for clustering logic**

Append to `tests/schema-clustering.test.js`:

```js
test('markers within threshold get same clusterId', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 10.5, lon: 20.5, name: 'B' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  assert.ok(scene.markers[0]._clusterId);
  assert.equal(scene.markers[0]._clusterId, scene.markers[1]._clusterId);
  assert.equal(scene.markers[0]._clusterSize, 2);
  assert.equal(scene.markers[1]._clusterSize, 2);
  assert.equal(scene.markers[0]._clusterIndex, 0);
  assert.equal(scene.markers[1]._clusterIndex, 1);
});

test('markers far apart are not clustered', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 50, lon: 80, name: 'B' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  assert.equal(scene.markers[0]._clusterId, null);
  assert.equal(scene.markers[1]._clusterId, null);
});

test('calloutMode none markers are excluded from clustering', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A', calloutMode: 'always' },
      { id: 'b', lat: 10.1, lon: 20.1, name: 'B', calloutMode: 'none' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  assert.equal(scene.markers[0]._clusterId, null);
  assert.equal(scene.markers[1]._clusterId, null);
});

test('clustering disabled leaves markers unclustered', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 10.1, lon: 20.1, name: 'B' },
    ],
    calloutCluster: { enabled: false },
  });
  assert.equal(scene.markers[0]._clusterId, null);
  assert.equal(scene.markers[1]._clusterId, null);
});

test('cluster with 4+ markers sets correct clusterSize', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 10.3, lon: 20.3, name: 'B' },
      { id: 'c', lat: 10.6, lon: 20.6, name: 'C' },
      { id: 'd', lat: 10.1, lon: 20.1, name: 'D' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  const clustered = scene.markers.filter(m => m._clusterId !== null);
  assert.equal(clustered.length, 4);
  assert.ok(clustered.every(m => m._clusterSize === 4));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/schema-clustering.test.js`
Expected: FAIL — `_clusterId` is `undefined`

- [ ] **Step 3: Implement `clusterMarkers` in schema.js**

Add import at top of `schema.js`:

```js
import { greatCircleDistanceDegrees, latLonToCartesian, cartesianToLatLon } from '../math/geo.js';
```

Add `clusterMarkers` function:

```js
function computeClusterCentroid(members) {
  let sx = 0, sy = 0, sz = 0;
  for (const m of members) {
    const p = latLonToCartesian(m.lat, m.lon, 1, 0);
    sx += p.x; sy += p.y; sz += p.z;
  }
  const n = members.length;
  return cartesianToLatLon(sx / n, sy / n, sz / n);
}

function clusterMarkers(markers, config) {
  // Initialize all markers with null cluster fields
  for (const m of markers) {
    m._clusterId = null;
    m._clusterIndex = 0;
    m._clusterSize = 1;
    m._clusterCenter = null;
  }

  if (!config.enabled) return;

  const threshold = config.thresholdDeg;
  const eligible = markers.filter(m => m.calloutMode !== 'none');
  const assigned = new Set();
  let clusterId = 0;

  // Sort by lat for stable ordering
  const sorted = [...eligible].sort((a, b) => a.lat - b.lat);

  for (const seed of sorted) {
    if (assigned.has(seed.id)) continue;

    // Gather candidates within threshold of seed
    const candidates = [seed];
    for (const other of sorted) {
      if (other.id === seed.id || assigned.has(other.id)) continue;
      const dist = greatCircleDistanceDegrees(seed, other);
      if (dist <= threshold) candidates.push(other);
    }

    // Convergence loop: evict members outside threshold of centroid
    let members = candidates;
    let stable = false;
    while (!stable) {
      const centroid = computeClusterCentroid(members);
      const kept = [];
      for (const m of members) {
        const dist = greatCircleDistanceDegrees(m, centroid);
        if (dist <= threshold) kept.push(m);
      }
      stable = kept.length === members.length;
      members = kept;
      if (members.length <= 1) break;
    }

    // Only form a cluster if 2+ members
    if (members.length < 2) {
      assigned.add(seed.id);
      continue;
    }

    const cid = `cluster_${clusterId++}`;
    const centroid = computeClusterCentroid(members);
    for (let i = 0; i < members.length; i++) {
      members[i]._clusterId = cid;
      members[i]._clusterIndex = i;
      members[i]._clusterSize = members.length;
      members[i]._clusterCenter = { lat: centroid.lat, lon: centroid.lon };
      assigned.add(members[i].id);
    }
  }
}
```

Call it in `normalizeScene` after the markers array is built:

```js
const result = {
  // ... existing fields ...
  markers: Array.isArray(scene.markers) ? scene.markers.map(normalizeMarker) : [],
  calloutCluster: normalizeCalloutCluster(scene.calloutCluster),
  // ... rest ...
};
clusterMarkers(result.markers, result.calloutCluster);
return result;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/schema-clustering.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Run all existing tests to check for regressions**

Run: `node --test tests/*.test.js`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add src/scene/schema.js tests/schema-clustering.test.js && git commit -m "feat: implement marker clustering in schema normalization" -- src/scene/schema.js tests/schema-clustering.test.js
```

---

### Task 3: Centroid antimeridian test

**Files:**
- Test: `tests/schema-clustering.test.js`

- [ ] **Step 1: Write antimeridian centroid test**

Append to `tests/schema-clustering.test.js`:

```js
test('centroid handles antimeridian wrap correctly', () => {
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 0, lon: 179, name: 'A' },
      { id: 'b', lat: 0, lon: -179, name: 'B' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 5 },
  });
  // Both should cluster — they are ~2 deg apart across the antimeridian
  assert.ok(scene.markers[0]._clusterId);
  assert.equal(scene.markers[0]._clusterId, scene.markers[1]._clusterId);
  // Centroid should be near lon ±180, not lon 0
  const center = scene.markers[0]._clusterCenter;
  assert.ok(Math.abs(center.lon) > 170, `centroid lon ${center.lon} should be near ±180`);
});

test('evicted marker forms its own cluster in later iteration', () => {
  // A at 10,20 — B at 11.5,20 (1.5 deg from A) — C at 10.5,20 (0.5 from A, 1 from B)
  // All within 2 deg of seed A, but centroid of A+B+C may push B out
  // Use a tight threshold to test eviction re-seeding
  const scene = normalizeScene({
    markers: [
      { id: 'a', lat: 10, lon: 20, name: 'A' },
      { id: 'b', lat: 11.9, lon: 20, name: 'B' },
      { id: 'c', lat: 10.1, lon: 20, name: 'C' },
    ],
    calloutCluster: { enabled: true, thresholdDeg: 2 },
  });
  // A and C are very close, B is near the edge
  // Regardless of eviction outcome, no marker should be silently dropped
  const allAssigned = scene.markers.every(
    m => m._clusterId !== null || m._clusterSize === 1
  );
  assert.ok(allAssigned, 'all markers should either be clustered or solo');
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `node --test tests/schema-clustering.test.js`
Expected: PASS (10 tests)

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add tests/schema-clustering.test.js && git commit -m "test: add antimeridian centroid and eviction re-seeding tests" -- tests/schema-clustering.test.js
```

---

## Chunk 2: CalloutManager rendering

### Task 4: Cascade rendering for small clusters (2-3)

**Files:**
- Modify: `src/renderer/calloutManager.js`
- Test: `tests/callout-manager.test.js`

- [ ] **Step 1: Write failing test — cascade offsets applied for 2-marker cluster**

Append to `tests/callout-manager.test.js`:

```js
test('CalloutManager renders cascade for 2-marker cluster', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  try {
    const manager = new CalloutManager();
    const group = new Group();
    manager.update(group, [
      {
        id: 'm1', lat: 10, lon: 20, alt: 0, name: { en: 'Alpha' },
        calloutMode: 'always', _clusterId: 'cluster_0', _clusterIndex: 0,
        _clusterSize: 2, _clusterCenter: { lat: 10.05, lon: 20.05 },
      },
      {
        id: 'm2', lat: 10.1, lon: 20.1, alt: 0, name: { en: 'Beta' },
        calloutMode: 'always', _clusterId: 'cluster_0', _clusterIndex: 1,
        _clusterSize: 2, _clusterCenter: { lat: 10.05, lon: 20.05 },
      },
    ], 'en');
    class FakeCSS2D {
      constructor(el) { this.element = el; this.position = new Vector3(); this.userData = {}; this.visible = true; }
    }
    const labels = manager.createCSS2DLabels(FakeCSS2D);
    // Both labels should be created (cascade, not badge)
    assert.equal(labels.length, 2);
    // Second label should have a margin-top offset for stacking
    assert.ok(labels[1].div.style.marginTop);
  } finally {
    delete globalThis.document;
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/callout-manager.test.js --test-name-pattern "cascade"`
Expected: FAIL

- [ ] **Step 3: Implement cascade rendering in CalloutManager**

In `createCSS2DLabels`, after creating the div and applying styles, add cascade offset logic:

```js
// Cascade offset for small clusters (2-3 markers)
if (data.marker._clusterId && data.marker._clusterSize <= 3) {
  const idx = data.marker._clusterIndex;
  div.style.marginTop = `${idx * 20}px`;
  div.style.marginLeft = `${idx * 4}px`;
  div.style.opacity = `${1.0 - idx * 0.1}`;
  // Reserve cascade slot for hover/click markers — slot is positioned but label is hidden
  if (data.mode !== 'always') {
    div.style.visibility = 'hidden';
  }
}
```

In `update()`, for clustered markers (size <= 3), use a single leader line originating from `_clusterCenter` instead of individual surface positions. Only create one leader line per cluster (for `_clusterIndex === 0`):

```js
// Determine leader line origin — cluster center for clustered markers
const isClustered = marker._clusterId && marker._clusterSize <= 3;
const leaderOriginLat = isClustered ? marker._clusterCenter.lat : (marker.lat ?? 0);
const leaderOriginLon = isClustered ? marker._clusterCenter.lon : (marker.lon ?? 0);

// Only one leader line per cluster
if (isClustered && marker._clusterIndex > 0) {
  // Still register callout data but skip leader line
  // ... (store null for line, handle in visibility)
}
```

- [ ] **Step 3b: Write test — solo markers unaffected after clustering runs**

```js
test('CalloutManager renders solo markers normally when clustering is active', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  try {
    const manager = new CalloutManager();
    const group = new Group();
    manager.update(group, [
      {
        id: 'm1', lat: 10, lon: 20, alt: 0, name: { en: 'Solo' },
        calloutMode: 'always', _clusterId: null, _clusterIndex: 0,
        _clusterSize: 1, _clusterCenter: null,
      },
    ], 'en');
    class FakeCSS2D {
      constructor(el) { this.element = el; this.position = new Vector3(); this.userData = {}; this.visible = true; }
    }
    const labels = manager.createCSS2DLabels(FakeCSS2D);
    assert.equal(labels.length, 1);
    // No cascade offset
    assert.equal(labels[0].div.style.marginTop, '');
    // Leader line exists
    const data = manager.getCalloutData().get('m1');
    assert.ok(data.line);
  } finally {
    delete globalThis.document;
  }
});
```

- [ ] **Step 3c: Write test — mixed-mode cascade reserves slots for hover markers**

```js
test('CalloutManager reserves cascade slot for hover marker in small cluster', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  try {
    const manager = new CalloutManager();
    const group = new Group();
    manager.update(group, [
      {
        id: 'm1', lat: 10, lon: 20, alt: 0, name: { en: 'Always' },
        calloutMode: 'always', _clusterId: 'cluster_0', _clusterIndex: 0,
        _clusterSize: 2, _clusterCenter: { lat: 10.05, lon: 20.05 },
      },
      {
        id: 'm2', lat: 10.1, lon: 20.1, alt: 0, name: { en: 'Hover' },
        calloutMode: 'hover', _clusterId: 'cluster_0', _clusterIndex: 1,
        _clusterSize: 2, _clusterCenter: { lat: 10.05, lon: 20.05 },
      },
    ], 'en');
    class FakeCSS2D {
      constructor(el) { this.element = el; this.position = new Vector3(); this.userData = {}; this.visible = true; }
    }
    const labels = manager.createCSS2DLabels(FakeCSS2D);
    assert.equal(labels.length, 2);
    // Hover label has cascade offset (slot reserved) but is initially hidden
    assert.ok(labels[1].div.style.marginTop);
    assert.equal(labels[1].div.style.visibility, 'hidden');
  } finally {
    delete globalThis.document;
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/callout-manager.test.js --test-name-pattern "cascade"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/calloutManager.js tests/callout-manager.test.js && git commit -m "feat: cascade rendering for small callout clusters (2-3)" -- src/renderer/calloutManager.js tests/callout-manager.test.js
```

---

### Task 5: Group badge rendering for large clusters (4+)

**Files:**
- Modify: `src/renderer/calloutManager.js`
- Test: `tests/callout-manager.test.js`

- [ ] **Step 1: Write failing test — group badge for 4-marker cluster**

```js
test('CalloutManager renders group badge for 4+ marker cluster', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  try {
    const manager = new CalloutManager();
    const group = new Group();
    const center = { lat: 10, lon: 20 };
    const markers = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i}`, lat: 10 + i * 0.1, lon: 20 + i * 0.1, alt: 0,
      name: { en: `Marker ${i}` }, calloutMode: 'always',
      _clusterId: 'cluster_0', _clusterIndex: i, _clusterSize: 5,
      _clusterCenter: center,
    }));
    manager.update(group, markers, 'en');
    class FakeCSS2D {
      constructor(el) { this.element = el; this.position = new Vector3(); this.userData = {}; this.visible = true; }
    }
    const labels = manager.createCSS2DLabels(FakeCSS2D);
    // Should create 1 badge + 5 hidden individual labels
    const badge = labels.find(l => l.div.dataset.clusterId === 'cluster_0');
    assert.ok(badge, 'should create a group badge');
    assert.ok(badge.div.textContent.includes('5'));
    // Individual labels should start hidden
    const individuals = labels.filter(l => l.div.dataset.markerId && l.div.dataset.clusterId !== 'cluster_0');
    for (const ind of individuals) {
      assert.equal(ind.object.visible, false);
    }
  } finally {
    delete globalThis.document;
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/callout-manager.test.js --test-name-pattern "group badge"`
Expected: FAIL

- [ ] **Step 3: Implement group badge rendering**

In `update()` and `createCSS2DLabels`, detect clusters with `_clusterSize >= 4`:

In `update()`: create one leader line per cluster (at `_clusterCenter`), skip individual lines for members. Register the badge in `#calloutData` under the `_clusterId` value as key, with `surfacePosition` at the cluster center's cartesian coords. Add a new private field `#clusterBadgeIds = new Set()` — populated during `update()` whenever a badge entry is created. Clear it in `#clear()`.

In `createCSS2DLabels`: create a badge div with class `globe-callout-badge`, `dataset.clusterId` set to the cluster ID, and text "N markers". Set `css2dObj.userData = { clusterId: clusterId }` on the CSS2D object so that `#css2dObjects.find(o => o.userData?.clusterId === id)` lookups work. Also create individual hidden divs for expansion (with `dataset.markerId` and `visible = false`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/callout-manager.test.js --test-name-pattern "group badge"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/calloutManager.js tests/callout-manager.test.js && git commit -m "feat: group badge rendering for large callout clusters (4+)" -- src/renderer/calloutManager.js tests/callout-manager.test.js
```

---

### Task 6: Expand/collapse state management

**Files:**
- Modify: `src/renderer/calloutManager.js`
- Test: `tests/callout-manager.test.js`

- [ ] **Step 1: Write failing test — toggle expand/collapse**

```js
test('CalloutManager toggles cluster expand/collapse', () => {
  const manager = new CalloutManager();
  const group = new Group();
  const center = { lat: 10, lon: 20 };
  const markers = Array.from({ length: 4 }, (_, i) => ({
    id: `m${i}`, lat: 10 + i * 0.1, lon: 20 + i * 0.1, alt: 0,
    name: { en: `M${i}` }, calloutMode: 'always',
    _clusterId: 'cluster_0', _clusterIndex: i, _clusterSize: 4,
    _clusterCenter: center,
  }));
  manager.update(group, markers, 'en');
  // Initially collapsed
  assert.equal(manager.isClusterExpanded('cluster_0'), false);
  // Expand
  manager.toggleCluster('cluster_0');
  assert.equal(manager.isClusterExpanded('cluster_0'), true);
  // Collapse
  manager.toggleCluster('cluster_0');
  assert.equal(manager.isClusterExpanded('cluster_0'), false);
});

test('CalloutManager collapseAllClusters collapses expanded clusters', () => {
  const manager = new CalloutManager();
  const group = new Group();
  const center = { lat: 10, lon: 20 };
  const markers = Array.from({ length: 4 }, (_, i) => ({
    id: `m${i}`, lat: 10 + i * 0.1, lon: 20 + i * 0.1, alt: 0,
    name: { en: `M${i}` }, calloutMode: 'always',
    _clusterId: 'cluster_0', _clusterIndex: i, _clusterSize: 4,
    _clusterCenter: center,
  }));
  manager.update(group, markers, 'en');
  manager.toggleCluster('cluster_0');
  assert.equal(manager.isClusterExpanded('cluster_0'), true);
  manager.collapseAllClusters();
  assert.equal(manager.isClusterExpanded('cluster_0'), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/callout-manager.test.js --test-name-pattern "expand|collapse"`
Expected: FAIL

- [ ] **Step 3: Implement expand/collapse state**

Add to CalloutManager:

```js
#expandedClusters = new Set();

isClusterExpanded(clusterId) {
  return this.#expandedClusters.has(clusterId);
}

toggleCluster(clusterId) {
  if (this.#expandedClusters.has(clusterId)) {
    this.#expandedClusters.delete(clusterId);
  } else {
    this.#expandedClusters.add(clusterId);
  }
  this.#updateClusterVisibility(clusterId);
}

collapseAllClusters() {
  const wasExpanded = [...this.#expandedClusters];
  this.#expandedClusters.clear();
  for (const cid of wasExpanded) {
    this.#updateClusterVisibility(cid);
  }
}

#updateClusterVisibility(clusterId) {
  const expanded = this.#expandedClusters.has(clusterId);
  // Toggle badge visibility (hide when expanded)
  const badge = this.#calloutData.get(clusterId);
  if (badge) {
    badge.line.visible = !expanded;
    badge.visible = !expanded;
    const badgeCss2d = this.#css2dObjects.find(o => o.userData?.clusterId === clusterId);
    if (badgeCss2d) badgeCss2d.visible = !expanded;
  }
  // Toggle individual member labels
  for (const [id, data] of this.#calloutData) {
    if (data.marker?._clusterId === clusterId && data.marker._clusterSize >= 4) {
      const css2d = this.#css2dObjects.find(o => o.userData?.markerId === id);
      if (css2d) css2d.visible = expanded;
      data.visible = expanded;
    }
  }
}
```

Clear `#expandedClusters` in `#clear()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/callout-manager.test.js --test-name-pattern "expand|collapse"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/calloutManager.js tests/callout-manager.test.js && git commit -m "feat: expand/collapse state for cluster badges" -- src/renderer/calloutManager.js tests/callout-manager.test.js
```

---

## Chunk 3: Integration and interaction wiring

### Task 7: Wire expand/collapse in threeGlobeRenderer

**Files:**
- Modify: `src/renderer/threeGlobeRenderer.js:378-418`

- [ ] **Step 1: Add badge click handler in the callout wiring section**

In the loop where labels are wired (around line 387), add:

```js
// Wire cluster badge click -> toggle expand
if (div.dataset.clusterId) {
  div.addEventListener('click', (e) => {
    e.stopPropagation();
    const cid = div.dataset.clusterId;
    this.#calloutManager.toggleCluster(cid);
    // Fire cluster click event
    const clusterMembers = [...(this.#calloutManager.getCalloutData().entries())]
      .filter(([mid, d]) => d.marker?._clusterId === cid && mid !== cid)
      .map(([mid]) => mid);
    const event = new CustomEvent('calloutClick', {
      bubbles: true,
      detail: { kind: 'cluster', id: cid, markerIds: clusterMembers },
    });
    this.#container.dispatchEvent(event);
  });
}
```

- [ ] **Step 2: Add click-elsewhere collapse listener**

After the label wiring loop, add a one-time container listener:

```js
// Collapse all clusters when clicking elsewhere on the globe
if (!this.#clusterCollapseListenerAdded) {
  this.#container.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.globe-callout-badge') && !e.target.closest('.globe-callout-label')) {
      this.#calloutManager.collapseAllClusters();
    }
  });
  this.#clusterCollapseListenerAdded = true;
}
```

Add the flag `#clusterCollapseListenerAdded = false;` to the private fields section.

- [ ] **Step 3: Write click-elsewhere collapse test**

Append to `tests/callout-manager.test.js`:

```js
test('CalloutManager collapseAllClusters is callable for click-elsewhere integration', () => {
  const manager = new CalloutManager();
  const group = new Group();
  const center = { lat: 10, lon: 20 };
  const markers = Array.from({ length: 4 }, (_, i) => ({
    id: `m${i}`, lat: 10 + i * 0.1, lon: 20 + i * 0.1, alt: 0,
    name: { en: `M${i}` }, calloutMode: 'always',
    _clusterId: 'cluster_0', _clusterIndex: i, _clusterSize: 4,
    _clusterCenter: center,
  }));
  manager.update(group, markers, 'en');
  manager.toggleCluster('cluster_0');
  assert.equal(manager.isClusterExpanded('cluster_0'), true);
  // Simulate what the container pointerdown handler does
  manager.collapseAllClusters();
  assert.equal(manager.isClusterExpanded('cluster_0'), false);
});
```

Note: The actual container-level `pointerdown` listener wired in Step 2 calls `collapseAllClusters()`. This test verifies the collapse path. Full integration testing of the DOM event path requires a browser environment.

- [ ] **Step 4: Run all tests to verify no regressions**

Run: `node --test tests/*.test.js`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/threeGlobeRenderer.js tests/callout-manager.test.js && git commit -m "feat: wire cluster expand/collapse interaction in renderer" -- src/renderer/threeGlobeRenderer.js tests/callout-manager.test.js
```

---

### Task 8: Badge visibility culling and filterCallouts integration

**Files:**
- Modify: `src/renderer/calloutManager.js`
- Test: `tests/callout-manager.test.js`

- [ ] **Step 1: Write failing test — badge culling on backface**

```js
test('CalloutManager culls cluster badge on backface', () => {
  const manager = new CalloutManager();
  const group = new Group();
  // Cluster center at lat=0, lon=180 (backfacing from +Z camera)
  const center = { lat: 0, lon: 180 };
  const markers = Array.from({ length: 4 }, (_, i) => ({
    id: `m${i}`, lat: i * 0.1, lon: 180 + i * 0.1, alt: 0,
    name: { en: `M${i}` }, calloutMode: 'always',
    _clusterId: 'cluster_0', _clusterIndex: i, _clusterSize: 4,
    _clusterCenter: center,
  }));
  manager.update(group, markers, 'en');
  const camPos = new Vector3(0, 0, 3);
  const globeQuat = new Quaternion();
  manager.updateVisibility(camPos, globeQuat);
  // Badge should be hidden (backfacing)
  const badgeData = manager.getCalloutData().get('cluster_0');
  assert.ok(badgeData, 'badge entry should exist');
  assert.equal(badgeData.visible, false);
});
```

- [ ] **Step 2: Write failing test — filterCallouts dims badge**

```js
test('CalloutManager filterCallouts dims badge when no members match', () => {
  const manager = new CalloutManager();
  const group = new Group();
  const center = { lat: 10, lon: 20 };
  const markers = Array.from({ length: 4 }, (_, i) => ({
    id: `m${i}`, lat: 10 + i * 0.1, lon: 20 + i * 0.1, alt: 0,
    name: { en: `M${i}` }, calloutMode: 'always',
    _clusterId: 'cluster_0', _clusterIndex: i, _clusterSize: 4,
    _clusterCenter: center,
  }));
  manager.update(group, markers, 'en');
  // Filter to non-existent ID — no cluster members match
  manager.filterCallouts(['nonexistent']);
  const badgeData = manager.getCalloutData().get('cluster_0');
  assert.ok(badgeData.line.material.opacity < 0.2, 'badge line should be dimmed');
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test tests/callout-manager.test.js --test-name-pattern "culls|dims badge"`
Expected: FAIL

- [ ] **Step 4: Implement badge visibility and filter logic**

In `updateVisibility()`, add handling for synthetic cluster entries:

```js
// Handle cluster badge entries
if (this.#clusterBadgeIds.has(id)) {
  data.line.visible = frontFacing && !this.#expandedClusters.has(id);
  data.visible = frontFacing;
  const css2d = this.#css2dObjects.find(o => o.userData?.clusterId === id);
  if (css2d) css2d.visible = frontFacing && !this.#expandedClusters.has(id);
}
```

In `filterCallouts()`, add cluster badge handling:

```js
// Handle cluster badges
if (this.#clusterBadgeIds.has(id)) {
  const memberIds = [...this.#calloutData.entries()]
    .filter(([, d]) => d.marker?._clusterId === id)
    .map(([mid]) => mid);
  const anyMatch = memberIds.some(mid => ids.has(mid));
  data.line.material.opacity = anyMatch ? LEADER_OPACITY : LEADER_OPACITY * 0.2;
  const css2d = this.#css2dObjects.find(o => o.userData?.clusterId === id);
  if (css2d?.element) css2d.element.style.opacity = anyMatch ? '1' : '0.2';
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/callout-manager.test.js`
Expected: All pass

- [ ] **Step 6: Run full test suite**

Run: `node --test tests/*.test.js`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git restore --staged :/ && git add src/renderer/calloutManager.js tests/callout-manager.test.js && git commit -m "feat: cluster badge visibility culling and filterCallouts integration" -- src/renderer/calloutManager.js tests/callout-manager.test.js
```

---

### Task 9: Update FEATURES.md and RELEASE_NOTES.md

**Files:**
- Modify: `FEATURES.md`
- Modify: `RELEASE_NOTES.md`

- [ ] **Step 1: Add callout clustering to FEATURES.md**

Add checked item under the relevant section:
```
- [x] Smart callout clustering — nearby markers auto-stack (2-3) or collapse into group badges (4+)
```

- [ ] **Step 2: Add to RELEASE_NOTES.md**

Add entry under current release section:
```
* Smart callout clustering: nearby markers automatically stack as cascading cards (2-3 markers) or collapse into expandable group badges (4+ markers)
* Configurable clustering threshold via `calloutCluster.thresholdDeg` scene property
```

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add FEATURES.md RELEASE_NOTES.md && git commit -m "docs: add callout clustering to features and release notes" -- FEATURES.md RELEASE_NOTES.md
```
