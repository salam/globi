# Accessibility Marker Descriptions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix accessibility outputs (descriptions + llms.txt) that report zero markers due to property name mismatch, add back-face occlusion, and include marker description/calloutLabel content.

**Architecture:** Property name normalization happens in `ViewStateQuery.project()` (not the renderer). Back-face occlusion via `isPointOccluded()` added to the 3D renderer and checked in `ViewStateQuery.project()`. Description content enhanced in `viewDescriber.js` and `llmsTxt.js` using a `description → calloutLabel → name` fallback chain.

**Tech Stack:** Vanilla JS, Node.js test runner (`node --test`), Three.js (renderer internals)

**Spec:** `docs/superpowers/specs/2026-03-14-accessibility-marker-descriptions-design.md`

---

## Chunk 1: ViewStateQuery property normalization + occlusion

### Task 1: Fix `ViewStateQuery.project()` to normalize property names

**Files:**
- Modify: `tests/view-state-query.test.js`
- Modify: `src/accessibility/viewStateQuery.js`

**Context:** The existing test mock (`mockGlobeRenderer`) incorrectly returns `{ x, y }` — the real 3D renderer returns `{ clientX, clientY, visible }`. This masked the bug.

- [ ] **Step 1: Fix mock and write failing tests**

In `tests/view-state-query.test.js`, update `mockGlobeRenderer` to match the real 3D renderer's return shape (`{ clientX, clientY, visible }`), then add tests:

```javascript
// Replace existing mockGlobeRenderer (lines 5-15) with:
function mockGlobeRenderer(cameraState = { centerLat: 45, centerLon: 23, zoom: 1.5 }) {
  return {
    type: 'globe',
    getCameraState: () => cameraState,
    projectPointToClient(point) {
      // Real 3D renderer returns { clientX, clientY, visible }
      return { clientX: (point.lon + 180) * 2, clientY: (90 - point.lat) * 2, visible: true };
    },
    getCanvasRect: () => ({ left: 0, top: 0, width: 720, height: 360 }),
    hitTest: (x, y) => null,
  };
}
```

Add these tests after existing tests:

```javascript
describe('ViewStateQuery.project() property normalization', () => {
  it('normalizes { clientX, clientY } from 3D renderer to { x, y }', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockGlobeRenderer());
    const pt = vsq.project(52.5, 13.4, 0);
    assert.ok(pt !== null);
    assert.equal(typeof pt.x, 'number');
    assert.equal(typeof pt.y, 'number');
    assert.equal(pt.clientX, undefined, 'should not expose clientX');
  });

  it('passes through { x, y } from flat renderer unchanged', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockFlatRenderer());
    const pt = vsq.project(52.5, 13.4, 0);
    assert.ok(pt !== null);
    assert.equal(typeof pt.x, 'number');
    assert.equal(typeof pt.y, 'number');
  });

  it('getVisibleEntities finds markers with 3D renderer returning { clientX, clientY }', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockGlobeRenderer());
    const visible = vsq.getVisibleEntities(sampleScene());
    assert.ok(visible.markers.length > 0, 'should find at least one visible marker');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/view-state-query.test.js`
Expected: The new `normalizes { clientX, clientY }` test and `getVisibleEntities finds markers` test should FAIL because `project()` doesn't normalize yet. The existing `returns visible entities within viewport` test will also break since the mock now returns `{ clientX, clientY }`.

- [ ] **Step 3: Implement property normalization in `ViewStateQuery.project()`**

In `src/accessibility/viewStateQuery.js`, update the `project()` method:

```javascript
project(lat, lon, alt = 0) {
  if (!this.#renderer || typeof this.#renderer.projectPointToClient !== 'function') return null;
  let result;
  if (this.#renderer.projectPointToClient.length <= 1) {
    result = this.#renderer.projectPointToClient({ lat, lon, alt });
  } else {
    result = this.#renderer.projectPointToClient(lat, lon);
  }
  if (!result) return null;

  // Normalize: 3D renderer returns { clientX, clientY, visible }, flat returns { x, y }.
  // Note: the `visible` flag (v.z < 1 far-plane check) is intentionally not used —
  // the isPointOccluded() dot-product test is more precise for globe occlusion.
  const x = result.x ?? result.clientX;
  const y = result.y ?? result.clientY;
  if (x == null || y == null) return null;

  return { x, y };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/view-state-query.test.js`
Expected: ALL tests PASS.

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add tests/view-state-query.test.js src/accessibility/viewStateQuery.js && git commit -m "fix(BUG34): normalize projectPointToClient property names in ViewStateQuery.project()" -- tests/view-state-query.test.js src/accessibility/viewStateQuery.js
```

### Task 2: Add back-face occlusion via `isPointOccluded()`

**Files:**
- Modify: `tests/view-state-query.test.js`
- Modify: `src/renderer/threeGlobeRenderer.js`
- Modify: `src/accessibility/viewStateQuery.js`

- [ ] **Step 1: Write failing tests**

In `tests/view-state-query.test.js`, add a mock renderer with occlusion and tests:

```javascript
function mockGlobeRendererWithOcclusion(cameraState = { centerLat: 45, centerLon: 23, zoom: 1.5 }) {
  return {
    ...mockGlobeRenderer(cameraState),
    isPointOccluded(lat, lon) {
      // Simulate: points with lon > 180 are "behind" the globe
      return lon > 180 || lon < -180;
    },
  };
}

describe('ViewStateQuery back-face occlusion', () => {
  it('returns null for occluded points when renderer has isPointOccluded', () => {
    const vsq = new ViewStateQuery();
    const renderer = mockGlobeRendererWithOcclusion();
    renderer.isPointOccluded = () => true; // all points occluded
    vsq.setRenderer(renderer);
    const pt = vsq.project(52.5, 13.4, 0);
    assert.equal(pt, null, 'occluded point should return null');
  });

  it('returns point for non-occluded points', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockGlobeRendererWithOcclusion());
    const pt = vsq.project(52.5, 13.4, 0);
    assert.ok(pt !== null, 'non-occluded point should return { x, y }');
  });

  it('getVisibleEntities excludes occluded markers', () => {
    const vsq = new ViewStateQuery();
    const renderer = mockGlobeRendererWithOcclusion();
    renderer.isPointOccluded = (lat, lon) => lon > 100; // Tokyo (139.7) occluded, Berlin (13.4) not
    vsq.setRenderer(renderer);
    const scene = sampleScene();
    const visible = vsq.getVisibleEntities(scene);
    const names = visible.markers.map(m => m.name.en);
    assert.ok(names.includes('Berlin'), 'front-face Berlin should be visible');
    assert.ok(!names.includes('Tokyo'), 'back-face Tokyo should be excluded');
  });

  it('skips occlusion check when renderer lacks isPointOccluded', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockFlatRenderer());
    const pt = vsq.project(52.5, 13.4, 0);
    assert.ok(pt !== null, 'flat renderer has no occlusion — all points visible');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/view-state-query.test.js`
Expected: The occlusion tests FAIL because `project()` doesn't check `isPointOccluded` yet.

- [ ] **Step 3: Add occlusion check in `ViewStateQuery.project()`**

In `src/accessibility/viewStateQuery.js`, update `project()` to check occlusion before projecting:

```javascript
project(lat, lon, alt = 0) {
  if (!this.#renderer || typeof this.#renderer.projectPointToClient !== 'function') return null;

  // Check back-face occlusion if the renderer supports it
  if (typeof this.#renderer.isPointOccluded === 'function' && this.#renderer.isPointOccluded(lat, lon)) {
    return null;
  }

  let result;
  if (this.#renderer.projectPointToClient.length <= 1) {
    result = this.#renderer.projectPointToClient({ lat, lon, alt });
  } else {
    result = this.#renderer.projectPointToClient(lat, lon);
  }
  if (!result) return null;

  // Normalize: 3D renderer returns { clientX, clientY, visible }, flat returns { x, y }.
  // Note: the `visible` flag (v.z < 1 far-plane check) is intentionally not used —
  // the isPointOccluded() dot-product test is more precise for globe occlusion.
  const x = result.x ?? result.clientX;
  const y = result.y ?? result.clientY;
  if (x == null || y == null) return null;

  return { x, y };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/view-state-query.test.js`
Expected: ALL tests PASS.

- [ ] **Step 5: Add `isPointOccluded()` to the 3D renderer**

In `src/renderer/threeGlobeRenderer.js`, add the method after `projectPointToClient()` (after line ~790):

```javascript
isPointOccluded(lat, lon) {
  if (!this.#camera || !this.#globeGroup) return false;
  const cart = latLonToCartesian(lat, lon, 1, 0);
  const worldPos = new Vector3(cart.x, cart.y, cart.z);
  worldPos.applyQuaternion(this.#globeGroup.quaternion);
  const camPos = this.#camera.position;
  // Dot product: positive = front-facing, zero/negative = back-facing (occluded)
  return worldPos.dot(camPos) <= 0;
}
```

- [ ] **Step 6: Run all tests**

Run: `node --test`
Expected: ALL tests PASS (including existing tests — no regressions).

- [ ] **Step 7: Commit**

```bash
git restore --staged :/ && git add tests/view-state-query.test.js src/accessibility/viewStateQuery.js src/renderer/threeGlobeRenderer.js && git commit -m "feat(BUG34): add back-face occlusion check for 3D globe markers" -- tests/view-state-query.test.js src/accessibility/viewStateQuery.js src/renderer/threeGlobeRenderer.js
```

## Chunk 2: Description content enhancement

### Task 3: Add marker description to `viewDescriber.js`

**Files:**
- Modify: `tests/view-describer.test.js`
- Modify: `src/accessibility/viewDescriber.js`

- [ ] **Step 1: Write failing tests**

In `tests/view-describer.test.js`, update `sampleScene()` to include markers with `description` and `calloutLabel`, then add tests:

```javascript
// Add a third marker to sampleScene() markers array (after Tokyo):
{ id: 'm3', name: { en: 'Olympus Mons' }, description: { en: 'Largest volcano in the solar system' }, lat: 21.9, lon: -134.0, alt: 0, visualType: 'dot', category: 'landmarks', calloutMode: 'always' },
```

Add new describe block:

```javascript
describe('describeView description content', () => {
  it('brief includes description in parentheses when different from name', () => {
    const scene = sampleScene();
    const vsq = mockViewState({ markers: scene.markers });
    const text = describeView(scene, vsq, 'brief');
    assert.ok(text.includes('Olympus Mons (Largest volcano in the solar system)'),
      `Expected description in parentheses, got: ${text}`);
  });

  it('brief omits parentheses when description equals name', () => {
    const scene = sampleScene();
    const vsq = mockViewState({ markers: scene.markers });
    const text = describeView(scene, vsq, 'brief');
    // Berlin has no description, so fallback = name — no parentheses
    assert.ok(!text.includes('Berlin (Berlin)'), 'should not repeat name as description');
  });

  it('detailed includes description as indented line', () => {
    const scene = sampleScene();
    const vsq = mockViewState({ markers: scene.markers });
    const text = describeView(scene, vsq, 'detailed');
    assert.ok(text.includes('Largest volcano in the solar system'),
      `Expected description line, got: ${text}`);
  });

  it('falls back to calloutLabel when description is empty', () => {
    const scene = {
      ...sampleScene(),
      markers: [
        { id: 'm4', name: { en: 'ISS' }, calloutLabel: { en: 'International Space Station' }, lat: 10, lon: 20, alt: 0, visualType: 'model', category: 'default', calloutMode: 'always' },
      ],
    };
    const vsq = mockViewState({ markers: scene.markers });
    const text = describeView(scene, vsq, 'brief');
    assert.ok(text.includes('ISS (International Space Station)'),
      `Expected calloutLabel fallback, got: ${text}`);
  });

  it('falls back to name when both description and calloutLabel are empty', () => {
    const scene = sampleScene();
    const vsq = mockViewState({ markers: [scene.markers[0]] }); // Berlin, no description/calloutLabel
    const text = describeView(scene, vsq, 'brief');
    assert.ok(text.includes('Berlin'), 'should include name');
    assert.ok(!text.includes('Berlin ('), 'should not have parenthetical when falling back to name');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/view-describer.test.js`
Expected: Tests about description in parentheses and calloutLabel fallback FAIL.

- [ ] **Step 3: Implement `resolveDescription` and update brief/detailed**

In `src/accessibility/viewDescriber.js`, add `resolveDescription` helper and update both functions:

```javascript
function resolveDescription(marker, locale = 'en') {
  const desc = resolveName(marker.description, locale);
  if (desc) return desc;
  const label = resolveName(marker.calloutLabel, locale);
  if (label) return label;
  return resolveName(marker.name, locale);
}
```

Update `describeBrief` — replace the `markerNames` mapping (lines 59-60):

```javascript
const markerLabels = visible.markers.map((m) => {
  const name = resolveName(m.name, locale);
  const desc = resolveDescription(m, locale);
  return desc && desc !== name ? `${name} (${desc})` : name;
}).filter(Boolean);
const markerList = markerLabels.length > 0 ? markerLabels.join(', ') : 'none';
```

Update `describeDetailed` — after pushing the coordinate line (line 99), add description:

```javascript
for (const m of visible.markers) {
  const name = resolveName(m.name, locale);
  const coord = formatCoord(m.lat, m.lon);
  const cat = m.category && m.category !== 'default' ? `, ${m.category}` : '';
  lines.push(`  ${name} (${coord}${cat})`);
  const desc = resolveDescription(m, locale);
  if (desc && desc !== name) {
    lines.push(`    ${desc}`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/view-describer.test.js`
Expected: ALL tests PASS.

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add tests/view-describer.test.js src/accessibility/viewDescriber.js && git commit -m "feat(BUG34b): include marker description/calloutLabel in accessibility descriptions" -- tests/view-describer.test.js src/accessibility/viewDescriber.js
```

### Task 4: Add marker description to `llmsTxt.js`

**Files:**
- Modify: `tests/llms-txt.test.js`
- Modify: `src/io/llmsTxt.js`

- [ ] **Step 1: Write failing tests**

In `tests/llms-txt.test.js`, update `sampleScene()` markers to include `description` and `calloutLabel`, then add tests:

```javascript
// Update marker m1 in sampleScene() to add a description:
{ id: 'm1', name: { en: 'Berlin' }, description: { en: 'Capital of Germany' }, lat: 52.5, lon: 13.4, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'always' },
// Update marker m2 to add calloutLabel (no description):
{ id: 'm2', name: { en: 'Tokyo' }, calloutLabel: { en: 'Capital of Japan' }, lat: 35.7, lon: 139.7, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'hover' },
```

Add new tests:

```javascript
describe('formatLlmsTxt description content', () => {
  it('includes description field in marker line', () => {
    const output = formatLlmsTxt(sampleScene(), mockViewState());
    assert.ok(output.includes('Capital of Germany'),
      `Expected description in marker line, got: ${output}`);
  });

  it('falls back to calloutLabel when description is empty', () => {
    const output = formatLlmsTxt(sampleScene(), mockViewState());
    assert.ok(output.includes('Capital of Japan'),
      `Expected calloutLabel fallback, got: ${output}`);
  });

  it('omits desc field when no description or calloutLabel', () => {
    const scene = {
      ...sampleScene(),
      markers: [
        { id: 'm5', name: { en: 'Point' }, lat: 10, lon: 20, alt: 0, visualType: 'dot', category: 'default', calloutMode: 'always' },
      ],
    };
    const output = formatLlmsTxt(scene, mockViewState([scene.markers[0]], []));
    // Should have empty desc field, not the name repeated
    const markerLine = output.split('\n').find(l => l.includes('Point'));
    assert.ok(markerLine, 'marker line should exist');
    assert.ok(!markerLine.includes('Point | Point'), 'should not repeat name as description');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/llms-txt.test.js`
Expected: Tests about description field FAIL.

- [ ] **Step 3: Implement description in `formatLlmsTxt`**

In `src/io/llmsTxt.js`, add a `resolveDescription` helper and update marker formatting:

```javascript
function resolveDescription(marker, locale = 'en') {
  const desc = resolveName(marker.description, locale);
  if (desc) return desc;
  const label = resolveName(marker.calloutLabel, locale);
  return label || '';
}
```

Update the marker line in `formatLlmsTxt` (lines 56-60):

```javascript
for (const m of visibleMarkers) {
  const name = resolveName(m.name, locale);
  const coord = formatCoord(m.lat, m.lon);
  const desc = resolveDescription(m, locale);
  const parts = [name, coord, m.category ?? '', m.visualType ?? '', `callout=${m.calloutMode ?? 'always'}`, desc];
  lines.push(`- ${parts.join(' | ')}`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/llms-txt.test.js`
Expected: ALL tests PASS.

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add tests/llms-txt.test.js src/io/llmsTxt.js && git commit -m "feat(BUG34b): include marker description/calloutLabel in llms.txt output" -- tests/llms-txt.test.js src/io/llmsTxt.js
```

### Task 5: Update BUGFIXES.md and run full test suite

**Files:**
- Modify: `BUGFIXES.md`

- [ ] **Step 1: Add bug entries to BUGFIXES.md**

Append after the last entry:

```markdown
- [ ] BUG34 - Accessibility descriptions and llms.txt report zero visible markers. The 3D renderer's `projectPointToClient` returns `{ clientX, clientY, visible }` but `ViewStateQuery.inViewport()` reads `.x`/`.y` — since `x` is always `undefined`, no marker passes the viewport check. Also no back-face occlusion for globe markers. Fixed by normalizing property names in `ViewStateQuery.project()` and adding `isPointOccluded()` dot-product test to the 3D renderer.
- [ ] BUG34b - Marker `description` and `calloutLabel` fields never included in accessibility brief/detailed descriptions or dynamic llms.txt output. Only marker names were shown. Fixed by adding `resolveDescription` fallback chain (description → calloutLabel → name) to viewDescriber.js and llmsTxt.js.
```

- [ ] **Step 2: Run full test suite**

Run: `node --test`
Expected: ALL tests PASS.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Mark bugs as fixed in BUGFIXES.md**

Change `[ ]` to `[✔️]` for both BUG34 and BUG34b.

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add BUGFIXES.md && git commit -m "docs: add BUG34 and BUG34b to BUGFIXES.md" -- BUGFIXES.md
```
