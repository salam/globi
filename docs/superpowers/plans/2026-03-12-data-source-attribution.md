# Data Source Attribution Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display data source attribution on the globe viewer with an abbreviated bottom-right label and a slide-in panel with full details, dynamically updated based on viewport visibility.

**Architecture:** Extend the scene schema with `dataSources[]` and `sourceId` on entities. A new `AttributionManager` handles DOM creation, visibility computation, and panel state. The globe-viewer web component wires it into the existing camera-update pipeline.

**Tech Stack:** Vanilla JS, Three.js (for `projectPointToClient`), Shadow DOM, CSS transitions, `node:test` for testing.

**Spec:** `docs/superpowers/specs/2026-03-12-data-source-attribution-design.md`

---

## Chunk 1: Schema & ViewerUI Extension

### Task 1: Add `showAttribution` to viewerUi

**Files:**
- Modify: `src/scene/viewerUi.js`
- Modify: `tests/viewer-ui.test.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/viewer-ui.test.js`:

```js
test('showAttribution defaults to true and can be toggled', () => {
  const defaults = getDefaultViewerUiConfig();
  assert.equal(defaults.showAttribution, true);

  const merged = mergeViewerUiConfig(defaults, { showAttribution: false });
  assert.equal(merged.showAttribution, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/viewer-ui.test.js`
Expected: FAIL — `defaults.showAttribution` is `undefined`

- [ ] **Step 3: Implement `showAttribution` in viewerUi.js**

In `src/scene/viewerUi.js`, add `showAttribution: true` to `DEFAULT_VIEWER_UI`. Add it to `normalizeViewerUiConfig`, `resolveViewerUiConfig`, and the `booleanFields` array in `validateViewerUiConfig`.

```js
// In DEFAULT_VIEWER_UI:
showAttribution: true,

// In normalizeViewerUiConfig:
showAttribution: value.showAttribution ?? DEFAULT_VIEWER_UI.showAttribution,

// In resolveViewerUiConfig:
showAttribution: pickBooleanOrDefault(normalized.showAttribution, DEFAULT_VIEWER_UI.showAttribution),

// In validateViewerUiConfig booleanFields array, add:
'showAttribution',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/viewer-ui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scene/viewerUi.js tests/viewer-ui.test.js
git commit -m "feat: add showAttribution to viewerUi config" -- src/scene/viewerUi.js tests/viewer-ui.test.js
```

---

### Task 2: Add `dataSources[]` and `sourceId` to scene schema

**Files:**
- Modify: `src/scene/schema.js`
- Modify: `tests/schema.test.js`

- [ ] **Step 1: Write failing tests for dataSources normalization**

Add to `tests/schema.test.js`:

```js
test('createEmptyScene includes empty dataSources array', () => {
  const scene = createEmptyScene();
  assert.deepEqual(scene.dataSources, []);
});

test('normalizeScene defaults dataSources to empty array', () => {
  const scene = normalizeScene({});
  assert.deepEqual(scene.dataSources, []);
});

test('normalizeScene normalizes dataSources entries', () => {
  const scene = normalizeScene({
    dataSources: [
      { id: 'src-1', name: 'Source One', shortName: 'S1', url: 'https://example.com' },
      { id: 'src-2', name: 'Source Two', shortName: 'S2', url: 'https://example.org', description: 'Desc', license: 'MIT' },
    ],
  });

  assert.equal(scene.dataSources.length, 2);
  assert.equal(scene.dataSources[0].id, 'src-1');
  assert.equal(scene.dataSources[0].description, '');
  assert.equal(scene.dataSources[0].license, '');
  assert.equal(scene.dataSources[1].description, 'Desc');
  assert.equal(scene.dataSources[1].license, 'MIT');
});

test('normalizeScene adds sourceId to markers, paths, arcs, regions', () => {
  const scene = normalizeScene({
    markers: [{ id: 'm1', name: 'M', lat: 0, lon: 0, sourceId: 'src-1' }],
    paths: [{ id: 'p1', name: 'P', points: [{ lat: 0, lon: 0 }, { lat: 1, lon: 1 }] }],
    arcs: [{ id: 'a1', name: 'A', start: { lat: 0, lon: 0 }, end: { lat: 1, lon: 1 }, sourceId: 'src-2' }],
    regions: [{ id: 'r1', name: 'R', geojson: { type: 'Polygon', coordinates: [] } }],
  });

  assert.equal(scene.markers[0].sourceId, 'src-1');
  assert.equal(scene.paths[0].sourceId, '');
  assert.equal(scene.arcs[0].sourceId, 'src-2');
  assert.equal(scene.regions[0].sourceId, '');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/schema.test.js`
Expected: FAIL — `dataSources` undefined, `sourceId` undefined

- [ ] **Step 3: Implement schema changes**

In `src/scene/schema.js`:

Add `normalizeDataSource` function:
```js
function normalizeDataSource(ds = {}) {
  return {
    id: String(ds.id ?? ''),
    name: String(ds.name ?? ''),
    shortName: String(ds.shortName ?? ''),
    url: String(ds.url ?? ''),
    description: String(ds.description ?? ''),
    license: String(ds.license ?? ''),
  };
}
```

In `createEmptyScene`, add `dataSources: [],` after `timeRange: null,`.

In `normalizeScene`, add after the `timeRange` line:
```js
dataSources: Array.isArray(scene.dataSources) ? scene.dataSources.map(normalizeDataSource) : [],
```

In `normalizeMarker`, add after the `timestamp` line:
```js
sourceId: typeof marker.sourceId === 'string' ? marker.sourceId : '',
```

In `normalizePath`, add after `animationDuration`:
```js
sourceId: typeof path.sourceId === 'string' ? path.sourceId : '',
```

In `normalizeArc`, add after `animationTime`:
```js
sourceId: typeof arc.sourceId === 'string' ? arc.sourceId : '',
```

In `normalizeRegion`, add after `altitude`:
```js
sourceId: typeof region.sourceId === 'string' ? region.sourceId : '',
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/schema.test.js`
Expected: PASS

- [ ] **Step 5: Write failing validation tests**

Add to `tests/schema.test.js`:

```js
test('validateScene accepts valid dataSources', () => {
  const scene = createEmptyScene();
  scene.dataSources = [
    { id: 'src-1', name: 'Source', shortName: 'S', url: 'https://x.com' },
  ];
  scene.markers = [{ id: 'm1', name: { en: 'M' }, description: { en: '' }, lat: 0, lon: 0, sourceId: 'src-1' }];
  const result = validateScene(scene);
  assert.equal(result.valid, true);
});

test('validateScene reports duplicate dataSources ids', () => {
  const scene = createEmptyScene();
  scene.dataSources = [
    { id: 'dup', name: 'A', shortName: 'A', url: 'https://a.com' },
    { id: 'dup', name: 'B', shortName: 'B', url: 'https://b.com' },
  ];
  const result = validateScene(scene);
  assert.ok(result.errors.some((e) => e.includes('duplicate')));
});

test('validateScene reports missing dataSources name', () => {
  const scene = createEmptyScene();
  scene.dataSources = [
    { id: 'src-1', name: '', shortName: 'S', url: 'https://x.com' },
  ];
  const result = validateScene(scene);
  assert.ok(result.errors.some((e) => e.includes('name')));
});

test('validateScene warns on unresolved sourceId', () => {
  const scene = createEmptyScene();
  scene.dataSources = [
    { id: 'src-1', name: 'Source', shortName: 'S', url: 'https://x.com' },
  ];
  scene.markers = [{ id: 'm1', name: { en: 'M' }, description: { en: '' }, lat: 0, lon: 0, sourceId: 'unknown' }];
  const result = validateScene(scene);
  assert.ok(result.errors.some((e) => e.includes('sourceId')));
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `node --test tests/schema.test.js`
Expected: FAIL — no validation for dataSources yet

- [ ] **Step 7: Implement validation for dataSources and sourceId**

In `validateScene`, after the `validateViewerUiConfig` call, add:

```js
const dataSourceIds = new Set();
scene.dataSources.forEach((ds, index) => {
  const pointer = `dataSources[${index}]`;
  if (typeof ds.id !== 'string' || !ID_PATTERN.test(ds.id)) {
    errors.push(`${pointer}.id must match ${ID_PATTERN}`);
  } else if (dataSourceIds.has(ds.id)) {
    errors.push(`${pointer}.id duplicate id: ${ds.id}`);
  } else {
    dataSourceIds.add(ds.id);
  }
  if (typeof ds.name !== 'string' || ds.name.length === 0) {
    errors.push(`${pointer}.name must be a non-empty string`);
  }
  if (typeof ds.shortName !== 'string' || ds.shortName.length === 0) {
    errors.push(`${pointer}.shortName must be a non-empty string`);
  }
  if (typeof ds.url !== 'string' || ds.url.length === 0) {
    errors.push(`${pointer}.url must be a non-empty string`);
  }
});
```

Then, inside each entity validation loop (markers, paths, arcs, regions), after the existing checks, add a sourceId check. For example in the markers loop:

```js
if (marker.sourceId && !dataSourceIds.has(marker.sourceId)) {
  errors.push(`${pointer}.sourceId references unknown dataSources id: ${marker.sourceId}`);
}
```

Same pattern for paths, arcs, regions.

- [ ] **Step 8: Run tests to verify they pass**

Run: `node --test tests/schema.test.js`
Expected: PASS

- [ ] **Step 9: Run full test suite**

Run: `node --test`
Expected: All tests pass (existing tests unaffected)

- [ ] **Step 10: Commit**

```bash
git add src/scene/schema.js tests/schema.test.js
git commit -m "feat: add dataSources and sourceId to scene schema" -- src/scene/schema.js tests/schema.test.js
```

---

## Chunk 2: AttributionManager Core Logic

### Task 3: Create AttributionManager with source categorization

**Files:**
- Create: `src/renderer/attributionManager.js`
- Create: `tests/attribution-manager.test.js`

- [ ] **Step 1: Write failing tests for source categorization**

Create `tests/attribution-manager.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { AttributionManager } from '../src/renderer/attributionManager.js';

function makeScene({ dataSources = [], markers = [], paths = [], arcs = [], regions = [] } = {}) {
  return { dataSources, markers, paths, arcs, regions };
}

test('categorizeSources returns empty arrays when no dataSources', () => {
  const mgr = new AttributionManager();
  const result = mgr.categorizeSources(makeScene(), () => null, { left: 0, top: 0, right: 800, bottom: 600 });

  assert.deepEqual(result.visible, []);
  assert.deepEqual(result.outsideView, []);
  assert.deepEqual(result.noData, []);
});

test('categorizeSources puts source with visible marker in visible', () => {
  const mgr = new AttributionManager();
  const scene = makeScene({
    dataSources: [{ id: 'src-1', name: 'Source', shortName: 'S', url: '#' }],
    markers: [{ id: 'm1', lat: 10, lon: 20, alt: 0, sourceId: 'src-1' }],
  });
  const projectFn = () => ({ clientX: 400, clientY: 300, visible: true });
  const rect = { left: 0, top: 0, right: 800, bottom: 600 };

  const result = mgr.categorizeSources(scene, projectFn, rect);

  assert.equal(result.visible.length, 1);
  assert.equal(result.visible[0].id, 'src-1');
  assert.equal(result.outsideView.length, 0);
  assert.equal(result.noData.length, 0);
});

test('categorizeSources puts source with off-screen marker in outsideView', () => {
  const mgr = new AttributionManager();
  const scene = makeScene({
    dataSources: [{ id: 'src-1', name: 'Source', shortName: 'S', url: '#' }],
    markers: [{ id: 'm1', lat: 10, lon: 20, alt: 0, sourceId: 'src-1' }],
  });
  const projectFn = () => ({ clientX: 400, clientY: 300, visible: false });
  const rect = { left: 0, top: 0, right: 800, bottom: 600 };

  const result = mgr.categorizeSources(scene, projectFn, rect);

  assert.equal(result.visible.length, 0);
  assert.equal(result.outsideView.length, 1);
  assert.equal(result.outsideView[0].id, 'src-1');
});

test('categorizeSources puts unreferenced source in noData', () => {
  const mgr = new AttributionManager();
  const scene = makeScene({
    dataSources: [{ id: 'src-1', name: 'Source', shortName: 'S', url: '#' }],
    markers: [{ id: 'm1', lat: 10, lon: 20, alt: 0, sourceId: '' }],
  });
  const projectFn = () => ({ clientX: 400, clientY: 300, visible: true });
  const rect = { left: 0, top: 0, right: 800, bottom: 600 };

  const result = mgr.categorizeSources(scene, projectFn, rect);

  assert.equal(result.noData.length, 1);
  assert.equal(result.noData[0].id, 'src-1');
});

test('categorizeSources checks arc start and end points', () => {
  const mgr = new AttributionManager();
  const scene = makeScene({
    dataSources: [{ id: 'src-1', name: 'Source', shortName: 'S', url: '#' }],
    arcs: [{ id: 'a1', start: { lat: 0, lon: 0, alt: 0 }, end: { lat: 10, lon: 10, alt: 0 }, sourceId: 'src-1' }],
  });
  let callCount = 0;
  const projectFn = () => {
    callCount++;
    return callCount === 2
      ? { clientX: 400, clientY: 300, visible: true }
      : { clientX: 400, clientY: 300, visible: false };
  };
  const rect = { left: 0, top: 0, right: 800, bottom: 600 };

  const result = mgr.categorizeSources(scene, projectFn, rect);
  assert.equal(result.visible.length, 1);
});

test('categorizeSources samples region geojson vertices', () => {
  const mgr = new AttributionManager();
  const scene = makeScene({
    dataSources: [{ id: 'src-1', name: 'Source', shortName: 'S', url: '#' }],
    regions: [{
      id: 'r1',
      geojson: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
      sourceId: 'src-1',
    }],
  });
  const projectFn = (point) => {
    if (point.lon === 10 && point.lat === 10) return { clientX: 400, clientY: 300, visible: true };
    return { clientX: 400, clientY: 300, visible: false };
  };
  const rect = { left: 0, top: 0, right: 800, bottom: 600 };

  const result = mgr.categorizeSources(scene, projectFn, rect);
  assert.equal(result.visible.length, 1);
});

test('buildAbbreviatedText joins visible source shortNames with middle dot', () => {
  const mgr = new AttributionManager();
  const sources = [
    { id: 'a', shortName: 'NE' },
    { id: 'b', shortName: 'RC' },
    { id: 'c', shortName: 'ISS' },
  ];

  assert.equal(mgr.buildAbbreviatedText(sources), 'NE \u00B7 RC \u00B7 ISS');
});

test('buildAbbreviatedText returns empty string for no sources', () => {
  const mgr = new AttributionManager();
  assert.equal(mgr.buildAbbreviatedText([]), '');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/attribution-manager.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement AttributionManager core**

Create `src/renderer/attributionManager.js` with:

1. An inline SVG constant `ATTRIBUTION_ICON` (the icon from `assets/noun-attribution-6854685.svg`)
2. Helper functions: `extractEntityPoints(entity, kind)`, `sampleRegionVertices(geojson)`, `isPointVisible(point, projectFn, canvasRect)`
3. The `AttributionManager` class with methods:
   - `buildSourceIndex(scene)` — returns `Map<sourceId, Array<{entity, kind}>>`
   - `categorizeSources(scene, projectFn, canvasRect)` — returns `{ visible, outsideView, noData }`
   - `buildAbbreviatedText(visibleSources)` — returns middle-dot separated shortNames
   - `attach(container)` — creates label + panel DOM
   - `update(scene, projectFn, canvasRect)` — refreshes label text and panel content
   - `togglePanel()`, `closePanel()`, `isPanelOpen()`
   - `setVisible(visible)`, `dispose()`

**Key implementation details:**

For the label element:
- Use `document.createElement('div')` with class `attribution-label`
- Set the icon via safe DOM: create an SVG element or use a template element to parse the SVG, then append it. Use `textContent` for the abbreviated text portion, not innerHTML with user data
- Add click listener that calls `togglePanel()`

For the panel element:
- Build all content with `document.createElement` and `textContent` for all user-visible strings
- Links use `document.createElement('a')` with `.href`, `.target`, `.rel`, `.textContent` set via properties
- Close button uses `textContent = '\u00D7'`

For DOM updates in `update()`:
- Clear label children, re-append icon SVG element and a text node for the abbreviated text
- If panel is open, rebuild panel content via DOM methods

**Important:** Do NOT use innerHTML with any dynamic data. Use textContent for text, createElement for structure, and property assignment for attributes. The icon SVG is a static constant — parse it once in the constructor using a template element.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/attribution-manager.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/attributionManager.js tests/attribution-manager.test.js && git commit -m "feat: add AttributionManager with source categorization logic" -- src/renderer/attributionManager.js tests/attribution-manager.test.js
```

---

## Chunk 3: Globe Viewer Integration

### Task 4: Expose `getCanvasRect()` on the renderer

**Files:**
- Modify: `src/renderer/threeGlobeRenderer.js`
- Modify: `src/controller/globeController.js`

- [ ] **Step 1: Add `getCanvasRect()` to ThreeGlobeRenderer**

In `src/renderer/threeGlobeRenderer.js`, add after the `projectPointToClient` method:

```js
getCanvasRect() {
  if (!this.#webglRenderer) return null;
  return this.#webglRenderer.domElement.getBoundingClientRect();
}
```

- [ ] **Step 2: Expose it through GlobeController**

In `src/controller/globeController.js`, add a method:

```js
getCanvasRect() {
  if (typeof this.#renderer.getCanvasRect === 'function') {
    return this.#renderer.getCanvasRect();
  }
  return null;
}
```

- [ ] **Step 3: Run existing tests to verify no regressions**

Run: `node --test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/renderer/threeGlobeRenderer.js src/controller/globeController.js
git commit -m "feat: expose getCanvasRect on renderer and controller" -- src/renderer/threeGlobeRenderer.js src/controller/globeController.js
```

---

### Task 5: Integrate AttributionManager into globe-viewer.js

**Files:**
- Modify: `src/components/globe-viewer.js`

- [ ] **Step 1: Add CSS styles for attribution to the TEMPLATE**

In the `<style>` section of `TEMPLATE` in `src/components/globe-viewer.js`, add before `</style>`:

```css
.attribution-label {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 10;
  font-size: 10px;
  color: rgba(200, 215, 240, 0.7);
  background: rgba(6, 16, 38, 0.6);
  border: 1px solid rgba(75, 107, 163, 0.4);
  border-radius: 12px;
  padding: 3px 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  user-select: none;
  transition: background 0.15s;
  max-width: calc(100% - 24px);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.attribution-label:hover {
  background: rgba(6, 16, 38, 0.85);
  color: #d9e7ff;
}

.attribution-icon {
  width: 12px;
  height: 12px;
  fill: currentColor;
  flex-shrink: 0;
}

.attribution-panel {
  position: absolute;
  top: 0;
  right: -280px;
  width: 280px;
  height: 100%;
  background: rgba(6, 16, 38, 0.92);
  border-left: 1px solid #2c4169;
  z-index: 20;
  overflow-y: auto;
  padding: 12px;
  transition: right 0.25s ease;
  font-size: 12px;
  color: #cbdcf8;
  box-sizing: border-box;
}

.attribution-panel.open {
  right: 0;
}

.attribution-close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: #cbdcf8;
  font-size: 18px;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
}

.attribution-close:hover {
  color: #ffffff;
}

.attribution-section {
  margin-bottom: 14px;
}

.attribution-section.muted {
  opacity: 0.5;
}

.attribution-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(200, 215, 240, 0.6);
  margin: 0 0 6px;
}

.attribution-entry {
  margin-bottom: 10px;
  padding-left: 0;
}

.attribution-name {
  font-weight: 600;
  color: #e8effc;
  margin-bottom: 2px;
}

.attribution-desc {
  color: rgba(200, 215, 240, 0.7);
  margin-bottom: 2px;
}

.attribution-license {
  color: rgba(200, 215, 240, 0.5);
  font-size: 10px;
  margin-bottom: 2px;
}

.attribution-link {
  color: #6ba3d9;
  text-decoration: none;
  font-size: 10px;
  word-break: break-all;
}

.attribution-link:hover {
  text-decoration: underline;
  color: #8fc5f0;
}
```

- [ ] **Step 2: Import and wire up AttributionManager**

At the top of `src/components/globe-viewer.js`, add:
```js
import { AttributionManager } from '../renderer/attributionManager.js';
```

Add a private field in the class:
```js
#attributionManager = new AttributionManager();
```

In `connectedCallback()`, after `this.#updateNavigationHud();` (around line 519), add:
```js
this.#attributionManager.attach(this.#root);
this.#updateAttribution(currentScene);
```

- [ ] **Step 3: Add update and visibility methods**

Add a private method `#updateAttribution(scene)`:
```js
#updateAttribution(scene) {
  const viewerUi = this.#viewerUi;
  if (!viewerUi.showAttribution) {
    this.#attributionManager.setVisible(false);
    return;
  }
  this.#attributionManager.setVisible(true);

  const projectFn = (point) => this.#controller?.projectPointToClient(point) ?? null;
  const canvasRect = this.#controller?.getCanvasRect();
  if (!canvasRect) return;
  this.#attributionManager.update(scene, projectFn, canvasRect);
}
```

Add a private field for debouncing:
```js
#attributionDebounce = 0;
```

- [ ] **Step 4: Hook into camera update pipeline**

In `#updateNavigationHud()`, at the end of the method, add:
```js
clearTimeout(this.#attributionDebounce);
this.#attributionDebounce = setTimeout(() => {
  const scene = this.#currentScene ?? this.#controller?.getScene();
  if (scene) this.#updateAttribution(scene);
}, 200);
```

In `#applyViewerUi(scene)`, after the compass/scale/navHud hidden settings, add:
```js
this.#attributionManager.setVisible(this.#viewerUi.showAttribution);
```

- [ ] **Step 5: Wire panel dismissal on click-outside and escape**

In the stage `pointerup` handler (`#onPointerUp`), after the existing click detection, add:
```js
if (isClick && this.#attributionManager.isPanelOpen()) {
  this.#attributionManager.closePanel();
}
```

In `#onKeyboard(event)`, add before the arrow key handling:
```js
if (event.key === 'Escape' && this.#attributionManager.isPanelOpen()) {
  this.#attributionManager.closePanel();
  return;
}
```

- [ ] **Step 6: Handle sceneChange attribution update**

In `connectedCallback()`, inside the `this.#controller.on('sceneChange', ...)` callback, after the existing calls, add:
```js
this.#updateAttribution(scene);
```

- [ ] **Step 7: Clean up in disconnectedCallback**

In `disconnectedCallback()`, add:
```js
this.#attributionManager.dispose();
```

- [ ] **Step 8: Run full test suite**

Run: `node --test`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add src/components/globe-viewer.js
git commit -m "feat: integrate AttributionManager into globe-viewer" -- src/components/globe-viewer.js
```

---

## Chunk 4: Example Loader Updates

### Task 6: Add dataSources and sourceId to all example loaders

**Files:**
- Modify: `src/examples/loaders.js`
- Modify: `tests/examples.test.js`

- [ ] **Step 1: Write failing tests for dataSources on examples**

Add to `tests/examples.test.js`:

```js
test('loadAllCapitalsExample includes dataSources and sourceId on entities', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng,unMember': [
      { name: { common: 'Test' }, capital: ['Testville'], capitalInfo: { latlng: [10, 20] }, cca3: 'TST', unMember: false },
    ],
  }));
  const scene = await loadAllCapitalsExample({ fetchImpl });

  assert.ok(Array.isArray(scene.dataSources));
  assert.ok(scene.dataSources.length >= 2);
  assert.ok(scene.dataSources.some((ds) => ds.id === 'rest-countries'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));

  const marker = scene.markers.find((m) => m.id === 'cap-tst');
  assert.equal(marker.sourceId, 'rest-countries');

  const landmass = scene.regions.find((r) => r.id.startsWith('landmass-'));
  assert.equal(landmass.sourceId, 'natural-earth');
});

test('loadContinentsAndSeasExample includes dataSources with natural-earth', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson': { type: 'FeatureCollection', features: [] },
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_marine_polys.geojson': { type: 'FeatureCollection', features: [] },
  }));
  const scene = await loadContinentsAndSeasExample({ fetchImpl });

  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
  assert.ok(scene.regions.every((r) => r.sourceId === 'natural-earth'));
});

test('loadIssRealtimeExample includes dataSources for ISS and Natural Earth', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://api.wheretheiss.at/v1/satellites/25544': { latitude: 12.5, longitude: 89.1, altitude: 420, velocity: 27600 },
    'https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=9997300,9997900,9998500,9999100,9999700,10000300,10000900,10001500,10002100,10002700&units=kilometers': [
      { timestamp: 9997300, latitude: 1, longitude: 2, altitude: 410 },
    ],
  }));
  const scene = await loadIssRealtimeExample({ fetchImpl, nowMs: 10000000 * 1000 });

  assert.ok(scene.dataSources.some((ds) => ds.id === 'wheretheiss'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));

  const issMarker = scene.markers.find((m) => m.id === 'iss-current');
  assert.equal(issMarker.sourceId, 'wheretheiss');
});

test('loadCarriersOpenSourceExample includes dataSources', async () => {
  const fetchImpl = createFetchStub(withLandRoute({ '/data/vessels-osint.json': [] }));
  const scene = await loadCarriersOpenSourceExample({ fetchImpl });
  assert.ok(scene.dataSources.some((ds) => ds.id === 'osint-vessels'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
});

test('loadVesselTrackingExample includes dataSources', async () => {
  const fetchImpl = createFetchStub(withLandRoute({ '/data/vessels.json': [] }));
  const scene = await loadVesselTrackingExample({ fetchImpl });
  assert.ok(scene.dataSources.some((ds) => ds.id === 'osint-vessels'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'ais-feeds'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
});

test('loadCivilShippingExample includes dataSources', async () => {
  const fetchImpl = createFetchStub(withLandRoute({ '/data/vessels-civil-sample.json': [] }));
  const scene = await loadCivilShippingExample({ fetchImpl });
  assert.ok(scene.dataSources.some((ds) => ds.id === 'ais-sample'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
});

test('loadUkraineConflictOpenSourceExample includes dataSources', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson': { type: 'FeatureCollection', features: [] },
  }));
  const scene = await loadUkraineConflictOpenSourceExample({ fetchImpl });
  assert.ok(scene.dataSources.some((ds) => ds.id === 'geo-countries'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/examples.test.js`
Expected: FAIL — `scene.dataSources` is undefined

- [ ] **Step 3: Add dataSources definitions as constants**

At the top of `src/examples/loaders.js` (after the URL constants), add:

```js
const DS_REST_COUNTRIES = Object.freeze({ id: 'rest-countries', name: 'REST Countries API', shortName: 'RC', url: 'https://restcountries.com/', description: 'Open API for country data including capitals and memberships' });
const DS_NATURAL_EARTH = Object.freeze({ id: 'natural-earth', name: 'Natural Earth', shortName: 'NE', url: 'https://www.naturalearthdata.com/', license: 'Public Domain', description: 'Public domain map dataset for cartography' });
const DS_WHERETHEISS = Object.freeze({ id: 'wheretheiss', name: 'Where the ISS at?', shortName: 'ISS', url: 'https://wheretheiss.at/', description: 'Real-time ISS position and orbital data' });
const DS_GEO_COUNTRIES = Object.freeze({ id: 'geo-countries', name: 'Geo Countries', shortName: 'GC', url: 'https://github.com/datasets/geo-countries', license: 'ODC PDDL', description: 'Country boundary polygons' });
const DS_OSINT_VESSELS = Object.freeze({ id: 'osint-vessels', name: 'Curated OSINT Reports', shortName: 'OSINT', url: '#', description: 'Curated open-source intelligence reports' });
const DS_AIS_FEEDS = Object.freeze({ id: 'ais-feeds', name: 'AIS Feeds', shortName: 'AIS', url: '#', description: 'Automatic Identification System vessel feeds' });
const DS_AIS_SAMPLE = Object.freeze({ id: 'ais-sample', name: 'AIS Sample Data', shortName: 'AIS', url: '#', description: 'Sample AIS vessel data' });
```

- [ ] **Step 4: Update `loadLandmassRegions` to accept and apply sourceId**

Modify `normalizeLandmassRegions` to accept a `sourceId` parameter:

```js
function normalizeLandmassRegions(rawLandGeojson, sourceId = '') {
```

And add `sourceId` to each returned region object (after `altitude`):
```js
sourceId,
```

Update `loadLandmassRegions` to pass through:
```js
async function loadLandmassRegions(fetchImpl, sourceId = '') {
  const landRaw = await safeFetchJson(fetchImpl, NATURAL_EARTH_LAND_URL);
  return normalizeLandmassRegions(landRaw, sourceId);
}
```

- [ ] **Step 5: Update each example loader**

**loadAllCapitalsExample:** Change `loadLandmassRegions(fetchImpl)` to `loadLandmassRegions(fetchImpl, 'natural-earth')`. Add `sourceId` param to `normalizeCapitalMarker`: `function normalizeCapitalMarker(country = {}, index = 0, sourceId = '')` and add `sourceId,` to its return object. Call with `.map((c, i) => normalizeCapitalMarker(c, i, 'rest-countries'))`. Add `dataSources: [DS_REST_COUNTRIES, DS_NATURAL_EARTH],` to the returned scene.

**loadContinentsAndSeasExample:** Change `loadLandmassRegions` to pass `'natural-earth'`. Add `sourceId: 'natural-earth'` to all continent label markers, sea regions, and sea label markers. Add `dataSources: [DS_NATURAL_EARTH],`.

**loadIssRealtimeExample:** Change `loadLandmassRegions` to pass `'natural-earth'`. Add `sourceId: 'wheretheiss'` to ISS marker, history markers, and the orbit path. Add `dataSources: [DS_WHERETHEISS, DS_NATURAL_EARTH],`.

**loadUkraineConflictOpenSourceExample:** Change `loadLandmassRegions` to pass `'natural-earth'`. Add `sourceId: 'geo-countries'` to Ukraine boundary region and advisory markers. Add `dataSources: [DS_GEO_COUNTRIES, DS_NATURAL_EARTH],`.

**loadCarriersOpenSourceExample:** Change `loadLandmassRegions` to pass `'natural-earth'`. Add `sourceId: 'osint-vessels'` to vessel markers (via `createVesselMarker`), trail paths (via `createVesselTrailPath`), and advisory marker. Add `dataSources: [DS_OSINT_VESSELS, DS_NATURAL_EARTH],`.

**loadVesselTrackingExample:** Change `loadLandmassRegions` to pass `'natural-earth'`. For multi-source mapping: use `'osint-vessels'` for source='osint' and `'ais-feeds'` for source='ais'. Add `dataSources: [DS_OSINT_VESSELS, DS_AIS_FEEDS, DS_NATURAL_EARTH],`.

**loadCivilShippingExample:** Change `loadLandmassRegions` to pass `'natural-earth'`. Add `sourceId: 'ais-sample'` to civil vessel markers, advisory marker, and strait labels. Add `dataSources: [DS_AIS_SAMPLE, DS_NATURAL_EARTH],`.

**Note:** `createVesselMarker` and `createVesselTrailPath` and `createCivilVesselMarker` need an optional `sourceId` parameter or the caller sets it on the returned object. Simplest: add `sourceId` param to each, defaulting to `''`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test tests/examples.test.js`
Expected: PASS

- [ ] **Step 7: Run full test suite**

Run: `node --test`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/examples/loaders.js tests/examples.test.js
git commit -m "feat: add dataSources and sourceId to all example loaders" -- src/examples/loaders.js tests/examples.test.js
```

---

## Chunk 5: Manual Testing & Documentation

### Task 7: Manual on-device testing

**Files:** None (testing only)

- [ ] **Step 1: Start the dev server**

Run: `npx vite` (or whatever the project uses)

- [ ] **Step 2: Test each example**

For each of the 7 examples:
1. Load the example
2. Verify the attribution label appears bottom-right with the correct shortNames
3. Zoom in — verify only visible sources appear in the label
4. Click the label — verify the panel slides in from the right
5. Verify selectable text and clickable links
6. Verify the three sections appear correctly
7. Dismiss via: label click, click-outside, x button, Escape key

- [ ] **Step 3: Test edge cases**

1. Load empty scene (Unload All) — verify no attribution label
2. Zoom to a single point — verify only that source's shortName shows
3. Pan rapidly — verify debounced updates don't cause jank

### Task 8: Update documentation

**Files:**
- Modify: `FEATURES.md`
- Modify: `RELEASE_NOTES.md`

- [ ] **Step 1: Update FEATURES.md**

Add a new entry for the data source attribution feature.

- [ ] **Step 2: Update RELEASE_NOTES.md**

Add a release note entry describing the new attribution label and panel.

- [ ] **Step 3: Commit**

```bash
git add FEATURES.md RELEASE_NOTES.md
git commit -m "docs: add data source attribution to features and release notes" -- FEATURES.md RELEASE_NOTES.md
```
