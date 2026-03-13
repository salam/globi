# Surface-Grab Drag Rotation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixed-coefficient screen-delta drag with true surface-grab rotation using Three.js raycasting.

**Architecture:** On pointer-down, raycast to find the geographic lat/lon under the cursor (the "grab point"). On each pointer-move, raycast again and compute the geographic delta between the grab point and the current point under cursor. Apply that delta via `panBy()`. When the cursor leaves the globe disk, fall back to zoom-scaled screen deltas. Remove inertia entirely.

**Tech Stack:** Three.js (Raycaster, Vector2, Vector3, Quaternion), Node.js test runner

**Spec:** `docs/superpowers/specs/2026-03-11-surface-grab-drag-design.md`

---

## Chunk 1: Renderer — screenToLatLon + pauseIdleRotation

### Task 1: Add `screenToLatLon` to ThreeGlobeRenderer

**Files:**
- Modify: `src/renderer/threeGlobeRenderer.js:26` (add `cartesianToLatLon` import)
- Modify: `src/renderer/threeGlobeRenderer.js:363-425` (add method near `hitTest`)
- Test: `tests/three-renderer.test.js`

- [ ] **Step 1: Write failing test for `screenToLatLon` API existence**

```js
test('screenToLatLon is a function on the renderer', () => {
  const renderer = new ThreeGlobeRenderer();
  assert.equal(typeof renderer.screenToLatLon, 'function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/three-renderer.test.js`
Expected: FAIL — `screenToLatLon` is not defined

- [ ] **Step 3: Implement `screenToLatLon` on ThreeGlobeRenderer**

In `src/renderer/threeGlobeRenderer.js`:

1. Add `cartesianToLatLon` to the import from `'../math/geo.js'` (line 26):
```js
import { latLonToCartesian, cartesianToLatLon } from '../math/geo.js';
```

2. Add the method after `hitTest()` (after line 425):
```js
/**
 * Convert screen (client) coordinates to geographic lat/lon by raycasting
 * against the earth mesh. Returns { lat, lon } or null if off-globe.
 */
screenToLatLon(clientX, clientY) {
  if (!this.#webglRenderer || !this.#camera || !this.#earthMesh) {
    return null;
  }

  const canvas = this.#webglRenderer.domElement;
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new Raycaster();
  raycaster.setFromCamera(new Vector2(ndcX, ndcY), this.#camera);
  const hits = raycaster.intersectObject(this.#earthMesh);
  if (hits.length === 0) return null;

  const worldPoint = hits[0].point.clone();
  const inverseRotation = this.#globeGroup.quaternion.clone().invert();
  worldPoint.applyQuaternion(inverseRotation);

  const geo = cartesianToLatLon(worldPoint.x, worldPoint.y, worldPoint.z);
  return { lat: geo.lat, lon: geo.lon };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/three-renderer.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/threeGlobeRenderer.js tests/three-renderer.test.js && git commit -m "feat: add screenToLatLon to ThreeGlobeRenderer" -- src/renderer/threeGlobeRenderer.js tests/three-renderer.test.js
```

### Task 2: Add `pauseIdleRotation` / `resumeIdleRotation` to ThreeGlobeRenderer

**Files:**
- Modify: `src/renderer/threeGlobeRenderer.js:520-521` (near `#rotationSpeed`)
- Test: `tests/three-renderer.test.js`

- [ ] **Step 1: Write failing tests for pause/resume**

```js
test('pauseIdleRotation and resumeIdleRotation are functions', () => {
  const renderer = new ThreeGlobeRenderer();
  assert.equal(typeof renderer.pauseIdleRotation, 'function');
  assert.equal(typeof renderer.resumeIdleRotation, 'function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/three-renderer.test.js`
Expected: FAIL

- [ ] **Step 3: Implement pause/resume idle rotation**

In `src/renderer/threeGlobeRenderer.js`, add a `#savedRotationSpeed` field near `#rotationSpeed` (line 521):
```js
#savedRotationSpeed = null;
```

Add public methods after `getCameraState()` (after line 98):
```js
pauseIdleRotation() {
  if (this.#savedRotationSpeed === null) {
    this.#savedRotationSpeed = this.#rotationSpeed;
    this.#rotationSpeed = 0;
  }
}

resumeIdleRotation() {
  if (this.#savedRotationSpeed !== null) {
    this.#rotationSpeed = this.#savedRotationSpeed;
    this.#savedRotationSpeed = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/three-renderer.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/threeGlobeRenderer.js tests/three-renderer.test.js && git commit -m "feat: add pauseIdleRotation/resumeIdleRotation to renderer" -- src/renderer/threeGlobeRenderer.js tests/three-renderer.test.js
```

### Task 3: Add `screenToLatLon` and idle rotation passthrough to GlobeController

**Files:**
- Modify: `src/controller/globeController.js:140-150` (add methods near `panBy`)
- Test: `tests/controller.test.js`

- [ ] **Step 1: Write failing tests**

Add `screenToLatLon`, `pauseIdleRotation`, `resumeIdleRotation` to MockRenderer:
```js
screenToLatLon(clientX, clientY) {
  this.calls.push(['screenToLatLon', clientX, clientY]);
  return { lat: 10, lon: 20 };
}

pauseIdleRotation() {
  this.calls.push(['pauseIdleRotation']);
}

resumeIdleRotation() {
  this.calls.push(['resumeIdleRotation']);
}
```

Add test:
```js
test('GlobeController proxies screenToLatLon to renderer', () => {
  const renderer = new MockRenderer();
  const controller = new GlobeController({ renderer });
  const result = controller.screenToLatLon(100, 200);
  assert.deepEqual(result, { lat: 10, lon: 20 });
  assert.ok(renderer.calls.some(c => c[0] === 'screenToLatLon'));
});

test('GlobeController proxies pauseIdleRotation and resumeIdleRotation', () => {
  const renderer = new MockRenderer();
  const controller = new GlobeController({ renderer });
  controller.pauseIdleRotation();
  controller.resumeIdleRotation();
  assert.ok(renderer.calls.some(c => c[0] === 'pauseIdleRotation'));
  assert.ok(renderer.calls.some(c => c[0] === 'resumeIdleRotation'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/controller.test.js`
Expected: FAIL

- [ ] **Step 3: Implement controller passthroughs**

In `src/controller/globeController.js`, after `panBy()` (after line 144):
```js
screenToLatLon(clientX, clientY) {
  if (typeof this.#renderer.screenToLatLon === 'function') {
    return this.#renderer.screenToLatLon(clientX, clientY);
  }
  return null;
}

pauseIdleRotation() {
  if (typeof this.#renderer.pauseIdleRotation === 'function') {
    this.#renderer.pauseIdleRotation();
  }
}

resumeIdleRotation() {
  if (typeof this.#renderer.resumeIdleRotation === 'function') {
    this.#renderer.resumeIdleRotation();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/controller.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/controller/globeController.js tests/controller.test.js && git commit -m "feat: add screenToLatLon and idle rotation control to controller" -- src/controller/globeController.js tests/controller.test.js
```

## Chunk 2: Globe Viewer — Surface-Grab Drag Logic

### Task 4: Write drag behavior tests (TDD — tests first)

**Files:**
- Create: `tests/surface-grab-drag.test.js`

These tests exercise the drag logic through a mock controller. They verify the surface-grab contract before implementation.

- [ ] **Step 1: Create test file with mock controller and all drag behavior tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Mock controller that records calls and returns configurable screenToLatLon results.
 */
class MockDragController {
  constructor() {
    this.calls = [];
    this._screenToLatLonResult = null;
    this._cameraState = { centerLon: 0, centerLat: 0, zoom: 1 };
  }

  screenToLatLon(clientX, clientY) {
    this.calls.push(['screenToLatLon', clientX, clientY]);
    return typeof this._screenToLatLonResult === 'function'
      ? this._screenToLatLonResult(clientX, clientY)
      : this._screenToLatLonResult;
  }

  panBy(deltaLon, deltaLat) {
    this.calls.push(['panBy', deltaLon, deltaLat]);
  }

  getCameraState() {
    return { ...this._cameraState };
  }

  pauseIdleRotation() {
    this.calls.push(['pauseIdleRotation']);
  }

  resumeIdleRotation() {
    this.calls.push(['resumeIdleRotation']);
  }

  hitTest() { return null; }
}

// --- Surface grab produces correct panBy deltas ---

test('surface grab: panBy delta moves grab point to track cursor', () => {
  // If grab point is (lat=10, lon=20) and cursor now maps to (lat=12, lon=25),
  // deltaLon = 20 - 25 = -5, deltaLat = 10 - 12 = -2
  // panBy(-5, -2) → centerLon -= -5 → centerLon += 5 (moves east, correct)
  const ctrl = new MockDragController();
  const grabLatLon = { lat: 10, lon: 20 };
  const currentLatLon = { lat: 12, lon: 25 };

  const deltaLon = grabLatLon.lon - currentLatLon.lon;
  const deltaLat = grabLatLon.lat - currentLatLon.lat;

  assert.equal(deltaLon, -5);
  assert.equal(deltaLat, -2);

  ctrl.panBy(deltaLon, deltaLat);
  const panCall = ctrl.calls.find(c => c[0] === 'panBy');
  assert.deepEqual(panCall, ['panBy', -5, -2]);
});

// --- Off-disk fallback uses zoom-scaled deltas ---

test('off-disk fallback: coefficient scales inversely with zoom', () => {
  // globeScreenRadius = min(width, height) * 0.45 * zoom
  // coefficient = (180 / Math.PI) / globeScreenRadius
  const width = 800;
  const height = 600;
  const zoom1 = 1;
  const zoom2 = 2;

  const radius1 = Math.min(width, height) * 0.45 * zoom1; // 270
  const radius2 = Math.min(width, height) * 0.45 * zoom2; // 540
  const coeff1 = (180 / Math.PI) / radius1;
  const coeff2 = (180 / Math.PI) / radius2;

  // Zoomed in = smaller coefficient = less rotation per pixel
  assert.ok(coeff2 < coeff1);
  assert.ok(Math.abs(coeff1 / coeff2 - 2) < 0.001, 'coefficient should halve when zoom doubles');
});

// --- No inertia after pointer-up ---

test('no inertia: no panBy calls after pointer up', () => {
  const ctrl = new MockDragController();
  // Simulate: pointer down, move, up — then check no further panBy calls
  ctrl.panBy(5, 3); // during drag
  const callCountAtUp = ctrl.calls.length;

  // After pointer up, no more panBy should be called
  // (This is a contract test — the implementation must not call panBy after up)
  assert.equal(ctrl.calls.filter(c => c[0] === 'panBy').length, 1);
  // No additional calls added
  assert.equal(ctrl.calls.length, callCountAtUp);
});

// --- Click detection (< 6px travel) ---

test('click detection: travel < 6 is a click, not a drag', () => {
  const travels = [0, 1, 3, 5, 5.9];
  for (const t of travels) {
    assert.ok(t < 6, `travel ${t} should be detected as click`);
  }
  assert.ok(6 >= 6, 'travel 6 is NOT a click');
  assert.ok(10 >= 6, 'travel 10 is NOT a click');
});

// --- Re-anchoring when cursor returns to disk ---

test('re-anchor: grabLatLon updates when cursor returns to disk after off-disk', () => {
  const ctrl = new MockDragController();
  // Sequence: grab at (10, 20), go off-disk, come back — should re-anchor
  let grabLatLon = { lat: 10, lon: 20 };
  let wasOffDisk = false;

  // Move off-disk
  ctrl._screenToLatLonResult = null;
  wasOffDisk = true;

  // Move back on-disk — new position is (15, 30)
  ctrl._screenToLatLonResult = { lat: 15, lon: 30 };
  const currentLatLon = ctrl.screenToLatLon(400, 300);

  if (currentLatLon && wasOffDisk) {
    // Re-anchor
    grabLatLon = { lat: currentLatLon.lat, lon: currentLatLon.lon };
    wasOffDisk = false;
  }

  assert.deepEqual(grabLatLon, { lat: 15, lon: 30 });
  assert.equal(wasOffDisk, false);
});

// --- Idle rotation paused during drag ---

test('idle rotation: paused on pointer down, resumed on pointer up', () => {
  const ctrl = new MockDragController();
  ctrl.pauseIdleRotation();
  // ... drag happens ...
  ctrl.resumeIdleRotation();

  assert.ok(ctrl.calls.some(c => c[0] === 'pauseIdleRotation'));
  assert.ok(ctrl.calls.some(c => c[0] === 'resumeIdleRotation'));
  const pauseIdx = ctrl.calls.findIndex(c => c[0] === 'pauseIdleRotation');
  const resumeIdx = ctrl.calls.findIndex(c => c[0] === 'resumeIdleRotation');
  assert.ok(pauseIdx < resumeIdx, 'pause must come before resume');
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `node --test tests/surface-grab-drag.test.js`
Expected: All PASS (these test the contract/math, not the implementation yet)

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add tests/surface-grab-drag.test.js && git commit -m "test: add surface-grab drag behavior tests" -- tests/surface-grab-drag.test.js
```

### Task 5: Rewrite `#onPointerDown` for surface grab

**Files:**
- Modify: `src/components/globi-viewer.js:805-821`

- [ ] **Step 1: Rewrite `#onPointerDown`**

Replace the existing `#onPointerDown` method (lines 805-821) with:

```js
#onPointerDown(event) {
  event.preventDefault();
  this.#stopFocusAnimation();
  this.#controller.pauseIdleRotation();

  this.#drag.active = true;
  this.#drag.pointerId = event.pointerId;
  this.#drag.x = event.clientX;
  this.#drag.y = event.clientY;
  this.#drag.ts = performance.now();
  this.#drag.travel = 0;

  // Surface grab: find the geographic point under the cursor
  const grabLatLon = this.#controller.screenToLatLon(event.clientX, event.clientY);
  this.#drag.grabLatLon = grabLatLon; // null if off-disk
  this.#drag.wasOffDisk = !grabLatLon;

  // Store zoom for off-disk fallback scaling
  const camState = this.#controller.getCameraState();
  this.#drag.zoom = camState.zoom;

  this.#stage.setPointerCapture?.(event.pointerId);
}
```

- [ ] **Step 2: Verify project still compiles**

Run: `npm test`
Expected: PASS (no test changes yet, just structural refactor)

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add src/components/globi-viewer.js && git commit -m "refactor: rewrite onPointerDown for surface grab" -- src/components/globi-viewer.js
```

### Task 6: Rewrite `#onPointerMove` for surface grab with off-disk fallback

**Files:**
- Modify: `src/components/globi-viewer.js:823-841`

- [ ] **Step 1: Rewrite `#onPointerMove`**

Replace the existing `#onPointerMove` method (lines 823-841) with:

```js
#onPointerMove(event) {
  if (!this.#drag.active || this.#drag.pointerId !== event.pointerId || !this.#controller) {
    return;
  }

  const dx = event.clientX - this.#drag.x;
  const dy = event.clientY - this.#drag.y;
  this.#drag.travel += Math.abs(dx) + Math.abs(dy);

  if (this.#drag.grabLatLon) {
    // Surface-grab mode: raycast to find current lat/lon under cursor
    const currentLatLon = this.#controller.screenToLatLon(event.clientX, event.clientY);

    if (currentLatLon) {
      // On-disk: compute geographic delta so grab point tracks cursor
      const deltaLon = this.#drag.grabLatLon.lon - currentLatLon.lon;
      const deltaLat = this.#drag.grabLatLon.lat - currentLatLon.lat;
      this.#controller.panBy(deltaLon, deltaLat);

      // If we were off-disk and came back, re-anchor to avoid jump
      if (this.#drag.wasOffDisk) {
        this.#drag.grabLatLon = this.#controller.screenToLatLon(event.clientX, event.clientY);
        this.#drag.wasOffDisk = false;
      }
    } else {
      // Off-disk fallback: zoom-scaled screen deltas
      this.#drag.wasOffDisk = true;
      this.#panByScreenDelta(dx, dy);
    }
  } else {
    // Started off-disk: always use screen-delta fallback
    this.#panByScreenDelta(dx, dy);
  }

  this.#drag.x = event.clientX;
  this.#drag.y = event.clientY;
  this.#drag.ts = performance.now();
  this.#updateNavigationHud();
}
```

- [ ] **Step 2: Add `#panByScreenDelta` helper method**

Add this private method near the other drag methods:

```js
#panByScreenDelta(dx, dy) {
  const canvas = this.#stage.querySelector('canvas') ?? this.#stage;
  const rect = canvas.getBoundingClientRect();
  const globeScreenRadius = Math.min(rect.width, rect.height) * 0.45 * this.#drag.zoom;
  const coefficient = (180 / Math.PI) / globeScreenRadius;
  this.#controller.panBy(dx * coefficient, -dy * coefficient);
}
```

- [ ] **Step 3: Verify project still compiles**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add src/components/globi-viewer.js && git commit -m "feat: rewrite onPointerMove for surface grab with off-disk fallback" -- src/components/globi-viewer.js
```

### Task 7: Rewrite `#onPointerUp` — remove inertia

**Files:**
- Modify: `src/components/globi-viewer.js:844-884`

- [ ] **Step 1: Rewrite `#onPointerUp` and remove `#startInertia`**

Replace `#onPointerUp` (lines 844-858):
```js
#onPointerUp(event) {
  if (!this.#drag.active || this.#drag.pointerId !== event.pointerId) {
    return;
  }
  this.#drag.active = false;
  this.#drag.grabLatLon = null;
  this.#drag.wasOffDisk = false;
  this.#stage.releasePointerCapture?.(event.pointerId);
  this.#controller.resumeIdleRotation();

  const isClick = this.#drag.travel < 6;
  if (isClick) {
    const hit = this.inspectAt(event.clientX, event.clientY);
    if (hit || this.#inspectMode) return;
  }
  // No inertia — globe stops immediately
}
```

Delete `#startInertia` method entirely (lines 860-884).

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add src/components/globi-viewer.js && git commit -m "feat: remove inertia, resume idle rotation on pointer up" -- src/components/globi-viewer.js
```

## Chunk 3: Cleanup and Full Test Suite

### Task 8: Clean up unused inertia state

**Files:**
- Modify: `src/components/globi-viewer.js`

- [ ] **Step 1: Remove unused inertia references**

Search for `#inertiaFrame`, `vx`, `vy` in `globi-viewer.js`. Remove:
- The `#inertiaFrame` field declaration (if separate from initialization)
- Any remaining `vx`/`vy` references on the drag state
- The `cancelAnimationFrame(this.#inertiaFrame)` in `#onPointerDown` (already handled — inertia no longer exists, but the field may still be referenced in `disconnectedCallback`)

Keep the `cancelAnimationFrame` in `disconnectedCallback` as a safety net if `#inertiaFrame` is still declared. If not, remove both.

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add src/components/globi-viewer.js && git commit -m "chore: remove unused inertia state from globi-viewer" -- src/components/globi-viewer.js
```

### Task 9: Update existing tests and add API test for new renderer method

**Files:**
- Modify: `tests/three-renderer.test.js`

- [ ] **Step 1: Add `screenToLatLon` to the public API existence test**

Update the existing test `'ThreeGlobeRenderer exports the expected public API'` to include:
```js
assert.equal(typeof renderer.screenToLatLon, 'function');
assert.equal(typeof renderer.pauseIdleRotation, 'function');
assert.equal(typeof renderer.resumeIdleRotation, 'function');
```

- [ ] **Step 2: Add test that screenToLatLon returns null without init**

```js
test('screenToLatLon returns null when renderer is not initialized', () => {
  const renderer = new ThreeGlobeRenderer();
  const result = renderer.screenToLatLon(100, 200);
  assert.equal(result, null);
});
```

- [ ] **Step 3: Run tests**

Run: `node --test tests/three-renderer.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add tests/three-renderer.test.js && git commit -m "test: add screenToLatLon and idle rotation API tests" -- tests/three-renderer.test.js
```

### Task 10: Run full test suite and verify

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 2: If any tests fail, fix them**

Common issues to check:
- Tests that reference `#startInertia` or inertia behavior
- Tests that mock the drag flow and expect velocity tracking

- [ ] **Step 3: Final commit if fixes were needed**

```bash
git restore --staged :/ && git add tests/ && git commit -m "fix: update tests for surface-grab drag changes"
```

### Task 11: Update FEATURES.md and RELEASE_NOTES.md

**Files:**
- Modify: `FEATURES.md`
- Modify: `RELEASE_NOTES.md`

- [ ] **Step 1: Add feature entry to FEATURES.md**

- [ ] **Step 2: Add entry to RELEASE_NOTES.md**

Add under current release section:
```
* Surface-grab drag rotation — grabbing the globe now feels like physically turning a ball; the point under your finger stays anchored to the cursor
* Drag sensitivity now scales with zoom level automatically
* Removed momentum/inertia after drag release — globe stops immediately
```

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add FEATURES.md RELEASE_NOTES.md && git commit -m "docs: add surface-grab drag to features and release notes" -- FEATURES.md RELEASE_NOTES.md
```
