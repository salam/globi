# Context Menu, Accessibility & Agent Interface Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add contextual right-click menu, screen reader descriptions, LLMs.txt output, and a `window.globi` agent interface to the Globi visualization component.

**Architecture:** Layered module stack with a shared `ViewStateQuery` foundation. Four new modules under `src/accessibility/` plus one in `src/io/`. Each module is independently testable and wired into the existing `<globi-viewer>` web component.

**Tech Stack:** Vanilla JS (ES modules), Three.js (existing), DOM APIs (Shadow DOM, Clipboard API, Custom Events)

**Spec:** `docs/superpowers/specs/2026-03-12-context-menu-accessibility-agent-interface-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/accessibility/viewStateQuery.js` | Shared view state queries (visibility, hit-test, viewport bounds) |
| `src/accessibility/contextMenu.js` | Right-click menu rendering, keyboard/touch triggers |
| `src/accessibility/viewDescriber.js` | Screen reader text generator (brief/detailed) |
| `src/accessibility/agentInterface.js` | `window.globi` API + DOM `data-*` attributes |
| `src/io/llmsTxt.js` | LLMs.txt plain-text formatter |
| `tests/view-state-query.test.js` | ViewStateQuery tests |
| `tests/context-menu.test.js` | ContextMenu tests |
| `tests/view-describer.test.js` | ViewDescriber tests |
| `tests/agent-interface.test.js` | AgentInterface tests |
| `tests/llms-txt.test.js` | LLMs.txt formatter tests |

---

## Chunk 0: Prerequisites

### Task 0: Verify rename and add getActiveRenderer + toggleLegend to controller

**Files:**
- Modify: `src/controller/globeController.js`
- Modify: `src/renderer/flatMapRenderer.js`

The `<globe-viewer>` → `<globi-viewer>` rename is already done. This task adds controller methods needed by later tasks.

- [ ] **Step 1: Add `getActiveRenderer()` to GlobeController**

In `src/controller/globeController.js`, add after `getCameraState()`:

```js
  getActiveRenderer() {
    return this.#activeRenderer;
  }
```

- [ ] **Step 2: Add `toggleLegend()` forwarding to GlobeController**

This is needed because the agent interface needs a public entry point. Add to `src/controller/globeController.js`:

```js
  // Emitted as an event for the viewer to handle (legend is a viewer-level UI concern)
  toggleLegend() {
    this.#emitter.emit('toggleLegend');
  }
```

- [ ] **Step 3: Add `getCanvasRect()` to FlatMapRenderer**

`FlatMapRenderer` is missing `getCanvasRect()` unlike `ThreeGlobeRenderer`. Add to `src/renderer/flatMapRenderer.js`:

```js
  getCanvasRect() {
    if (!this.#canvas) return null;
    return this.#canvas.getBoundingClientRect();
  }
```

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add src/controller/globeController.js src/renderer/flatMapRenderer.js && git commit -m "feat: add getActiveRenderer, toggleLegend to controller, getCanvasRect to flat renderer" -- src/controller/globeController.js src/renderer/flatMapRenderer.js
```

---

## Chunk 1: View State Query Layer

### Task 1: ViewStateQuery — Core queries

**Files:**
- Create: `src/accessibility/viewStateQuery.js`
- Create: `tests/view-state-query.test.js`

- [ ] **Step 1: Write failing tests for ViewStateQuery**

Create `tests/view-state-query.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ViewStateQuery } from '../src/accessibility/viewStateQuery.js';

// Mock renderer mimicking ThreeGlobeRenderer interface
function mockGlobeRenderer(cameraState = { centerLat: 45, centerLon: 23, zoom: 1.5 }) {
  return {
    type: 'globe',
    getCameraState: () => cameraState,
    projectPointToClient(point) {
      // Simple mock: returns screen coords proportional to lat/lon
      return { x: (point.lon + 180) * 2, y: (90 - point.lat) * 2 };
    },
    getCanvasRect: () => ({ left: 0, top: 0, width: 720, height: 360 }),
    hitTest: (x, y) => null,
  };
}

// Mock renderer mimicking FlatMapRenderer interface
function mockFlatRenderer(cameraState = { centerLat: 45, centerLon: 23, zoom: 1.5 }) {
  return {
    type: 'flat',
    getCameraState: () => cameraState,
    projectPointToClient(lat, lon) {
      return { x: (lon + 180) * 2, y: (90 - lat) * 2 };
    },
    getCanvasRect: () => ({ left: 0, top: 0, width: 720, height: 360 }),
    hitTest: (x, y) => null,
  };
}

function sampleScene() {
  return {
    version: 1,
    locale: 'en',
    theme: 'photo',
    planet: { id: 'earth', radius: 1 },
    projection: 'globe',
    markers: [
      { id: 'm1', name: { en: 'Berlin' }, lat: 52.5, lon: 13.4, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'always' },
      { id: 'm2', name: { en: 'Tokyo' }, lat: 35.7, lon: 139.7, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'hover' },
    ],
    arcs: [
      { id: 'a1', name: { en: 'Berlin-Tokyo' }, start: { lat: 52.5, lon: 13.4 }, end: { lat: 35.7, lon: 139.7 }, maxAltitude: 0.3, color: '#ff0' },
    ],
    paths: [],
    regions: [],
    filters: [],
    animations: [],
    dataSources: [],
    timeRange: null,
  };
}

describe('ViewStateQuery', () => {
  it('returns null view angle when no renderer set', () => {
    const vsq = new ViewStateQuery();
    const angle = vsq.getViewAngle();
    assert.equal(angle, null);
  });

  it('returns view angle from globe renderer', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockGlobeRenderer());
    const angle = vsq.getViewAngle();
    assert.equal(angle.lat, 45);
    assert.equal(angle.lon, 23);
    assert.equal(angle.zoom, 1.5);
  });

  it('returns view angle from flat renderer', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockFlatRenderer({ centerLat: 10, centerLon: 20, zoom: 2 }));
    const angle = vsq.getViewAngle();
    assert.equal(angle.lat, 10);
    assert.equal(angle.lon, 20);
    assert.equal(angle.zoom, 2);
  });

  it('returns visible entities within viewport', () => {
    const renderer = mockGlobeRenderer();
    const vsq = new ViewStateQuery();
    vsq.setRenderer(renderer);
    const scene = sampleScene();
    const visible = vsq.getVisibleEntities(scene);
    // Both markers project within 720x360 canvas
    assert.equal(visible.markers.length, 2);
    assert.equal(visible.arcs.length, 1);
  });

  it('returns empty visible entities when no renderer', () => {
    const vsq = new ViewStateQuery();
    const visible = vsq.getVisibleEntities(sampleScene());
    assert.deepEqual(visible, { markers: [], arcs: [], paths: [], regions: [] });
  });

  it('projects point uniformly across renderer types', () => {
    const vsq = new ViewStateQuery();
    // Globe renderer takes {lat, lon, alt}
    vsq.setRenderer(mockGlobeRenderer());
    const p1 = vsq.project(52.5, 13.4, 0);
    assert.ok(p1 !== null);

    // Flat renderer takes (lat, lon)
    vsq.setRenderer(mockFlatRenderer());
    const p2 = vsq.project(52.5, 13.4, 0);
    assert.ok(p2 !== null);
  });

  it('getViewportBounds returns bounding box', () => {
    const vsq = new ViewStateQuery();
    vsq.setRenderer(mockGlobeRenderer({ centerLat: 45, centerLon: 23, zoom: 1 }));
    const bounds = vsq.getViewportBounds();
    assert.ok(typeof bounds.north === 'number');
    assert.ok(typeof bounds.south === 'number');
    assert.ok(typeof bounds.east === 'number');
    assert.ok(typeof bounds.west === 'number');
    assert.ok(bounds.north > bounds.south);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/view-state-query.test.js`
Expected: FAIL — module `../src/accessibility/viewStateQuery.js` not found

- [ ] **Step 3: Implement ViewStateQuery**

Create `src/accessibility/viewStateQuery.js`:

```js
/**
 * ViewStateQuery — shared view state queries for accessibility and agent modules.
 *
 * Provides visibility filtering, hit-testing, and viewport bounds computation.
 * Abstracts over ThreeGlobeRenderer (projectPointToClient({lat,lon,alt}))
 * and FlatMapRenderer (projectPointToClient(lat, lon)).
 */
export class ViewStateQuery {
  #renderer = null;

  setRenderer(renderer) {
    this.#renderer = renderer;
  }

  getRenderer() {
    return this.#renderer;
  }

  /**
   * Normalized projection: always takes (lat, lon, alt) regardless of renderer type.
   * Returns {x, y} screen coords or null.
   */
  project(lat, lon, alt = 0) {
    if (!this.#renderer || typeof this.#renderer.projectPointToClient !== 'function') {
      return null;
    }
    // ThreeGlobeRenderer.projectPointToClient({lat, lon, alt}) — 1 object param
    // FlatMapRenderer.projectPointToClient(lat, lon) — 2 separate params
    // Use getCameraState as a proxy: FlatMapRenderer has no obliquity/globeGroup concept
    if (typeof this.#renderer.getGlobeGroup === 'function' || this.#renderer.projectPointToClient.length <= 1) {
      return this.#renderer.projectPointToClient({ lat, lon, alt });
    }
    return this.#renderer.projectPointToClient(lat, lon);
  }

  getViewAngle() {
    if (!this.#renderer || typeof this.#renderer.getCameraState !== 'function') {
      return null;
    }
    const cam = this.#renderer.getCameraState();
    return {
      lat: cam.centerLat,
      lon: cam.centerLon,
      zoom: cam.zoom,
    };
  }

  getViewportBounds() {
    if (!this.#renderer) return null;
    const cam = this.#renderer.getCameraState();
    // Approximate visible bounds based on zoom level
    // At zoom=1, roughly 90° in each direction; scales inversely with zoom
    const span = 90 / Math.max(cam.zoom, 0.3);
    return {
      north: Math.min(90, cam.centerLat + span),
      south: Math.max(-90, cam.centerLat - span),
      east: cam.centerLon + span,
      west: cam.centerLon - span,
    };
  }

  getVisibleEntities(scene) {
    const empty = { markers: [], arcs: [], paths: [], regions: [] };
    if (!this.#renderer || !scene) return empty;

    const rect = typeof this.#renderer.getCanvasRect === 'function'
      ? this.#renderer.getCanvasRect()
      : null;
    if (!rect) return empty;

    const inViewport = (screenPt) => {
      if (!screenPt) return false;
      return screenPt.x >= rect.left && screenPt.x <= rect.left + rect.width
        && screenPt.y >= rect.top && screenPt.y <= rect.top + rect.height;
    };

    const markers = (scene.markers ?? []).filter((m) => {
      const pt = this.project(m.lat, m.lon, m.alt ?? 0);
      return inViewport(pt);
    });

    const arcs = (scene.arcs ?? []).filter((a) => {
      const s = this.project(a.start.lat, a.start.lon, a.start.alt ?? 0);
      const e = this.project(a.end.lat, a.end.lon, a.end.alt ?? 0);
      return inViewport(s) || inViewport(e);
    });

    const paths = (scene.paths ?? []).filter((p) => {
      return (p.points ?? []).some((pt) => inViewport(this.project(pt.lat, pt.lon, pt.alt ?? 0)));
    });

    const bounds = this.getViewportBounds();
    const regions = (scene.regions ?? []).filter((r) => {
      if (!r.geojson) return false;
      const coords = extractCoords(r.geojson);
      // Check if any vertex is in viewport
      const anyVertexVisible = coords.some(([lon, lat]) => {
        const pt = this.project(lat, lon, 0);
        return inViewport(pt);
      });
      if (anyVertexVisible) return true;
      // Check if viewport center is inside polygon bounding box
      if (bounds && coords.length > 0) {
        return bboxContainsPoint(coords, bounds);
      }
      return false;
    });

    return { markers, arcs, paths, regions };
  }

  getEntityAtPoint(x, y) {
    if (!this.#renderer || typeof this.#renderer.hitTest !== 'function') {
      return null;
    }
    const result = this.#renderer.hitTest(x, y);
    if (!result) return null;
    // Normalize: ThreeGlobeRenderer returns {kind, entity, ...}
    // FlatMapRenderer returns raw marker object
    if (result.kind) {
      return { type: result.kind, entity: result.entity ?? result };
    }
    // Raw marker (has lat/lon but no .type) — treat as marker
    if (result.lat != null) {
      return { type: 'marker', entity: result };
    }
    return result;
  }
}

function extractCoords(geojson) {
  if (!geojson) return [];
  if (geojson.type === 'Polygon') {
    return (geojson.coordinates ?? []).flat();
  }
  if (geojson.type === 'MultiPolygon') {
    return (geojson.coordinates ?? []).flat(2);
  }
  return [];
}

function bboxContainsPoint(coords, viewportBounds) {
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const centerLat = (viewportBounds.north + viewportBounds.south) / 2;
  const centerLon = (viewportBounds.east + viewportBounds.west) / 2;
  return centerLat >= minLat && centerLat <= maxLat
    && centerLon >= minLon && centerLon <= maxLon;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/view-state-query.test.js`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/accessibility/viewStateQuery.js tests/view-state-query.test.js && git commit -m "feat: add ViewStateQuery — shared view state queries for accessibility" -- src/accessibility/viewStateQuery.js tests/view-state-query.test.js
```

---

## Chunk 2: LLMs.txt Formatter

### Task 2: LLMs.txt formatter

**Files:**
- Create: `src/io/llmsTxt.js`
- Create: `tests/llms-txt.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/llms-txt.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatLlmsTxt } from '../src/io/llmsTxt.js';

function sampleScene() {
  return {
    version: 1,
    locale: 'en',
    theme: 'photo',
    planet: { id: 'earth', radius: 1 },
    projection: 'globe',
    markers: [
      { id: 'm1', name: { en: 'Berlin' }, lat: 52.5, lon: 13.4, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'always' },
      { id: 'm2', name: { en: 'Tokyo' }, lat: 35.7, lon: 139.7, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'hover' },
    ],
    arcs: [
      { id: 'a1', name: { en: 'Berlin-Tokyo' }, start: { lat: 52.5, lon: 13.4 }, end: { lat: 35.7, lon: 139.7 }, maxAltitude: 0.3, color: '#ff0' },
    ],
    paths: [],
    regions: [],
    filters: [],
    animations: [],
    dataSources: [],
    timeRange: null,
  };
}

function mockViewState(visibleMarkers, visibleArcs) {
  return {
    getViewAngle: () => ({ lat: 45.2, lon: 23.4, zoom: 1.5 }),
    getViewportBounds: () => ({ north: 70, south: 20, east: 60, west: -15 }),
    getVisibleEntities: (scene) => ({
      markers: visibleMarkers ?? scene.markers,
      arcs: visibleArcs ?? scene.arcs,
      paths: [],
      regions: [],
    }),
  };
}

describe('formatLlmsTxt', () => {
  it('produces structured text with headers', () => {
    const scene = sampleScene();
    const vsq = mockViewState();
    const output = formatLlmsTxt(scene, vsq);
    assert.ok(output.includes('# Globi View State'));
    assert.ok(output.includes('body: earth'));
    assert.ok(output.includes('projection: globe'));
    assert.ok(output.includes('theme: photo'));
  });

  it('includes view angle', () => {
    const output = formatLlmsTxt(sampleScene(), mockViewState());
    assert.ok(output.includes('view: lat=45.2 lon=23.4 zoom=1.5'));
  });

  it('includes visible markers with total count', () => {
    const scene = sampleScene();
    const vsq = mockViewState([scene.markers[0]]); // only Berlin visible
    const output = formatLlmsTxt(scene, vsq);
    assert.ok(output.includes('# Visible Markers (1 of 2)'));
    assert.ok(output.includes('Berlin'));
    assert.ok(!output.includes('Tokyo'));
  });

  it('includes available actions section', () => {
    const output = formatLlmsTxt(sampleScene(), mockViewState());
    assert.ok(output.includes('# Available Actions'));
    assert.ok(output.includes('flyTo'));
  });

  it('handles empty scene', () => {
    const scene = { ...sampleScene(), markers: [], arcs: [], paths: [], regions: [] };
    const output = formatLlmsTxt(scene, mockViewState([], []));
    assert.ok(output.includes('# Visible Markers (0)'));
    assert.ok(output.includes('# Visible Arcs (0)'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/llms-txt.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement formatLlmsTxt**

Create `src/io/llmsTxt.js`:

```js
/**
 * LLMs.txt formatter — produces a compact, structured plain-text representation
 * of the current Globi view state for LLM consumption.
 *
 * Uses key=value and |-delimited fields for trivial parsing by any LLM.
 */

function formatCoord(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(1)}°${latDir} ${Math.abs(lon).toFixed(1)}°${lonDir}`;
}

function resolveName(name, locale = 'en') {
  if (typeof name === 'string') return name;
  if (name && typeof name === 'object') return name[locale] ?? name.en ?? Object.values(name)[0] ?? '';
  return '';
}

function formatBounds(bounds) {
  if (!bounds) return '';
  const n = `${Math.abs(bounds.north).toFixed(0)}°${bounds.north >= 0 ? 'N' : 'S'}`;
  const s = `${Math.abs(bounds.south).toFixed(0)}°${bounds.south >= 0 ? 'N' : 'S'}`;
  const e = `${Math.abs(bounds.east).toFixed(0)}°${bounds.east >= 0 ? 'E' : 'W'}`;
  const w = `${Math.abs(bounds.west).toFixed(0)}°${bounds.west >= 0 ? 'E' : 'W'}`;
  return `${s}–${n}, ${w}–${e}`;
}

export function formatLlmsTxt(scene, viewStateQuery) {
  const lines = [];
  const angle = viewStateQuery.getViewAngle();
  const bounds = viewStateQuery.getViewportBounds();
  const visible = viewStateQuery.getVisibleEntities(scene);
  const locale = scene.locale ?? 'en';

  // Header
  lines.push('# Globi View State');
  lines.push(`body: ${scene.planet?.id ?? 'earth'}`);
  lines.push(`projection: ${scene.projection ?? 'globe'}`);
  lines.push(`theme: ${scene.theme ?? 'photo'}`);
  if (angle) {
    lines.push(`view: lat=${angle.lat} lon=${angle.lon} zoom=${angle.zoom}`);
  }
  if (bounds) {
    lines.push(`viewport: ${formatBounds(bounds)}`);
  }
  lines.push('');

  // Markers
  const totalMarkers = scene.markers?.length ?? 0;
  const visibleMarkers = visible.markers;
  const markerCountLabel = totalMarkers > 0 && visibleMarkers.length < totalMarkers
    ? `${visibleMarkers.length} of ${totalMarkers}`
    : `${visibleMarkers.length}`;
  lines.push(`# Visible Markers (${markerCountLabel})`);
  for (const m of visibleMarkers) {
    const name = resolveName(m.name, locale);
    const coord = formatCoord(m.lat, m.lon);
    const parts = [name, coord, m.category ?? '', m.visualType ?? '', `callout=${m.calloutMode ?? 'always'}`];
    lines.push(`- ${parts.join(' | ')}`);
  }
  lines.push('');

  // Arcs
  const totalArcs = scene.arcs?.length ?? 0;
  const visibleArcs = visible.arcs;
  const arcCountLabel = totalArcs > 0 && visibleArcs.length < totalArcs
    ? `${visibleArcs.length} of ${totalArcs}`
    : `${visibleArcs.length}`;
  lines.push(`# Visible Arcs (${arcCountLabel})`);
  for (const a of visibleArcs) {
    const name = resolveName(a.name, locale);
    const parts = [name, `color=${a.color ?? ''}`, `altitude=${a.maxAltitude ?? 0}`];
    if (a.animationTime) parts.push('animated');
    lines.push(`- ${parts.join(' | ')}`);
  }
  lines.push('');

  // Paths
  const totalPaths = scene.paths?.length ?? 0;
  const visiblePaths = visible.paths;
  const pathCountLabel = totalPaths > 0 && visiblePaths.length < totalPaths
    ? `${visiblePaths.length} of ${totalPaths}`
    : `${visiblePaths.length}`;
  lines.push(`# Visible Paths (${pathCountLabel})`);
  for (const p of visiblePaths) {
    const name = resolveName(p.name, locale);
    lines.push(`- ${name} | ${(p.points?.length ?? 0)} points | color=${p.color ?? ''}`);
  }
  lines.push('');

  // Regions
  const totalRegions = scene.regions?.length ?? 0;
  const visibleRegions = visible.regions;
  const regionCountLabel = totalRegions > 0 && visibleRegions.length < totalRegions
    ? `${visibleRegions.length} of ${totalRegions}`
    : `${visibleRegions.length}`;
  lines.push(`# Visible Regions (${regionCountLabel})`);
  for (const r of visibleRegions) {
    const name = resolveName(r.name, locale);
    lines.push(`- ${name} | cap=${r.capColor ?? ''} | altitude=${r.altitude ?? 0}`);
  }
  lines.push('');

  // Active filters
  const filters = scene.filters ?? [];
  if (filters.length > 0) {
    lines.push('# Filters Active');
    for (const f of filters) {
      lines.push(`- ${f.label ?? f.id}: ${(f.options ?? []).length} options`);
    }
    lines.push('');
  }

  // Available actions
  lines.push('# Available Actions');
  lines.push('flyTo(lat, lon, zoom) | setTheme(name) | addMarker({...}) | toggleLegend() | setProjection(name) | rotate(dLat, dLon) | zoom(level) | describe(level) | export(format, scope)');

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/llms-txt.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/io/llmsTxt.js tests/llms-txt.test.js && git commit -m "feat: add LLMs.txt formatter for machine-readable view state" -- src/io/llmsTxt.js tests/llms-txt.test.js
```

---

## Chunk 3: View Describer

### Task 3: View Describer — screen reader text

**Files:**
- Create: `src/accessibility/viewDescriber.js`
- Create: `tests/view-describer.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/view-describer.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { describeView } from '../src/accessibility/viewDescriber.js';

function sampleScene() {
  return {
    version: 1,
    locale: 'en',
    theme: 'photo',
    planet: { id: 'earth', radius: 1 },
    projection: 'globe',
    markers: [
      { id: 'm1', name: { en: 'Berlin' }, lat: 52.5, lon: 13.4, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'always' },
      { id: 'm2', name: { en: 'Tokyo' }, lat: 35.7, lon: 139.7, alt: 0, visualType: 'dot', category: 'capital', calloutMode: 'hover' },
    ],
    arcs: [
      { id: 'a1', name: { en: 'Route' }, start: { lat: 52.5, lon: 13.4 }, end: { lat: 35.7, lon: 139.7 } },
    ],
    paths: [],
    regions: [],
    filters: [],
    animations: [],
    dataSources: [],
    timeRange: null,
  };
}

function mockViewState(opts = {}) {
  return {
    getViewAngle: () => opts.angle ?? { lat: 45, lon: 23, zoom: 1.5 },
    getViewportBounds: () => opts.bounds ?? { north: 70, south: 20, east: 60, west: -15 },
    getVisibleEntities: (scene) => ({
      markers: opts.markers ?? scene.markers,
      arcs: opts.arcs ?? scene.arcs,
      paths: opts.paths ?? [],
      regions: opts.regions ?? [],
    }),
  };
}

describe('describeView', () => {
  it('brief mode produces short text', () => {
    const text = describeView(sampleScene(), mockViewState(), 'brief');
    assert.ok(text.length < 300, `Brief text too long: ${text.length} chars`);
    assert.ok(text.includes('Earth'));
    assert.ok(text.includes('Berlin'));
  });

  it('detailed mode produces longer text', () => {
    const text = describeView(sampleScene(), mockViewState(), 'detailed');
    assert.ok(text.length > 100);
    assert.ok(text.includes('52.5'));
    assert.ok(text.includes('Berlin'));
    assert.ok(text.includes('Tokyo'));
  });

  it('defaults to brief', () => {
    const text = describeView(sampleScene(), mockViewState());
    assert.ok(text.length < 300);
  });

  it('handles empty scene', () => {
    const emptyScene = { ...sampleScene(), markers: [], arcs: [], paths: [], regions: [] };
    const text = describeView(emptyScene, mockViewState({ markers: [], arcs: [] }), 'brief');
    assert.ok(text.includes('Earth'));
    assert.ok(text.includes('0'));
  });

  it('includes zoom description', () => {
    const text = describeView(sampleScene(), mockViewState({ angle: { lat: 0, lon: 0, zoom: 3 } }), 'detailed');
    assert.ok(text.includes('close') || text.includes('zoom'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/view-describer.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement describeView**

Create `src/accessibility/viewDescriber.js`:

```js
/**
 * ViewDescriber — generates human-readable descriptions of the current globe view
 * for screen readers and accessibility purposes.
 *
 * Two levels:
 * - 'brief': single paragraph, ~50 words
 * - 'detailed': structured narrative, ~150-200 words
 */

function resolveName(name, locale = 'en') {
  if (typeof name === 'string') return name;
  if (name && typeof name === 'object') return name[locale] ?? name.en ?? Object.values(name)[0] ?? '';
  return '';
}

function zoomLabel(zoom) {
  if (zoom >= 2.5) return 'close';
  if (zoom >= 1.2) return 'moderate';
  return 'far';
}

function compassDirection(lat, lon) {
  const parts = [];
  if (lat > 15) parts.push('north');
  else if (lat < -15) parts.push('south');
  if (lon > 15) parts.push('east');
  else if (lon < -15) parts.push('west');
  return parts.length > 0 ? parts.join('-') : 'equatorial center';
}

function formatCoord(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(1)}°${latDir}, ${Math.abs(lon).toFixed(1)}°${lonDir}`;
}

function projectionLabel(projection) {
  if (projection === 'globe') return 'Globe';
  if (projection === 'azimuthalEquidistant') return 'Flat map (azimuthal equidistant)';
  if (projection === 'orthographic') return 'Flat map (orthographic)';
  if (projection === 'equirectangular') return 'Flat map (equirectangular)';
  return projection;
}

export function describeView(scene, viewStateQuery, level = 'brief') {
  const angle = viewStateQuery.getViewAngle() ?? { lat: 0, lon: 0, zoom: 1 };
  const visible = viewStateQuery.getVisibleEntities(scene);
  const locale = scene.locale ?? 'en';
  const bodyName = (scene.planet?.id ?? 'earth').charAt(0).toUpperCase() + (scene.planet?.id ?? 'earth').slice(1);
  const proj = projectionLabel(scene.projection ?? 'globe');

  if (level === 'detailed') {
    return describeDetailed(scene, visible, angle, bodyName, proj, locale);
  }
  return describeBrief(scene, visible, angle, bodyName, proj, locale);
}

function describeBrief(scene, visible, angle, bodyName, proj, locale) {
  const markerNames = visible.markers.map((m) => resolveName(m.name, locale)).filter(Boolean);
  const markerList = markerNames.length > 0 ? markerNames.join(', ') : 'none';
  const direction = compassDirection(angle.lat, angle.lon);
  const zoom = zoomLabel(angle.zoom);

  const parts = [
    `${proj} showing ${bodyName}.`,
    `${visible.markers.length} marker${visible.markers.length !== 1 ? 's' : ''} visible: ${markerList}.`,
  ];
  if (visible.arcs.length > 0) {
    parts.push(`${visible.arcs.length} arc${visible.arcs.length !== 1 ? 's' : ''}.`);
  }
  if (visible.paths.length > 0) {
    parts.push(`${visible.paths.length} path${visible.paths.length !== 1 ? 's' : ''}.`);
  }
  if (visible.regions.length > 0) {
    parts.push(`${visible.regions.length} region${visible.regions.length !== 1 ? 's' : ''}.`);
  }
  parts.push(`Viewing ${direction}, ${zoom} zoom.`);
  return parts.join(' ');
}

function describeDetailed(scene, visible, angle, bodyName, proj, locale) {
  const totalMarkers = scene.markers?.length ?? 0;
  const direction = compassDirection(angle.lat, angle.lon);
  const zoom = zoomLabel(angle.zoom);

  const lines = [];
  lines.push(`Interactive ${proj.toLowerCase()} showing ${bodyName}, viewed from the ${direction} at ${zoom} zoom (${angle.zoom.toFixed(1)}×).`);

  // Markers
  if (visible.markers.length > 0) {
    const countLabel = totalMarkers > visible.markers.length
      ? `${visible.markers.length} of ${totalMarkers}`
      : `${visible.markers.length}`;
    lines.push(`${countLabel} marker${visible.markers.length !== 1 ? 's' : ''} visible:`);
    for (const m of visible.markers) {
      const name = resolveName(m.name, locale);
      const coord = formatCoord(m.lat, m.lon);
      const cat = m.category && m.category !== 'default' ? `, ${m.category}` : '';
      lines.push(`  ${name} (${coord}${cat})`);
    }
  } else {
    lines.push('No markers visible.');
  }

  // Arcs
  if (visible.arcs.length > 0) {
    lines.push(`${visible.arcs.length} arc${visible.arcs.length !== 1 ? 's' : ''}:`);
    for (const a of visible.arcs) {
      const name = resolveName(a.name, locale);
      lines.push(`  ${name}`);
    }
  }

  // Paths
  if (visible.paths.length > 0) {
    lines.push(`${visible.paths.length} path${visible.paths.length !== 1 ? 's' : ''}.`);
  }

  // Regions
  if (visible.regions.length > 0) {
    lines.push(`${visible.regions.length} region${visible.regions.length !== 1 ? 's' : ''}:`);
    for (const r of visible.regions) {
      lines.push(`  ${resolveName(r.name, locale)}`);
    }
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/view-describer.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/accessibility/viewDescriber.js tests/view-describer.test.js && git commit -m "feat: add ViewDescriber — screen reader text generator" -- src/accessibility/viewDescriber.js tests/view-describer.test.js
```

---

## Chunk 4: Context Menu

### Task 4: Context Menu

**Files:**
- Create: `src/accessibility/contextMenu.js`
- Create: `tests/context-menu.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/context-menu.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildMenuItems } from '../src/accessibility/contextMenu.js';

describe('buildMenuItems', () => {
  it('returns base items when no entity at point', () => {
    const items = buildMenuItems({ entityAtPoint: null, latLon: { lat: 45, lon: 10 } });
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('Copy coordinates'));
    assert.ok(labels.includes('Copy LLMs.txt'));
    assert.ok(labels.includes('Drop marker here'));
    assert.ok(labels.includes('Fly to center'));
  });

  it('returns marker items when marker at point', () => {
    const marker = { id: 'm1', name: { en: 'Berlin' }, lat: 52.5, lon: 13.4 };
    const items = buildMenuItems({ entityAtPoint: { type: 'marker', entity: marker }, latLon: { lat: 52.5, lon: 13.4 } });
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('Inspect marker'));
    assert.ok(labels.includes('Copy marker info'));
    assert.ok(labels.includes('Fly to marker'));
    assert.ok(!labels.includes('Drop marker here'));
  });

  it('returns region items when region at point', () => {
    const region = { id: 'r1', name: { en: 'EU' } };
    const items = buildMenuItems({ entityAtPoint: { type: 'region', entity: region }, latLon: { lat: 50, lon: 10 } });
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('Inspect region'));
    assert.ok(labels.includes('Copy region info'));
  });

  it('includes export submenus always', () => {
    const items = buildMenuItems({ entityAtPoint: null, latLon: { lat: 0, lon: 0 } });
    const exportItems = items.filter((i) => i.label.startsWith('Export'));
    assert.ok(exportItems.length >= 2);
  });

  it('includes description submenu always', () => {
    const items = buildMenuItems({ entityAtPoint: null, latLon: { lat: 0, lon: 0 } });
    const descItems = items.filter((i) => i.label.startsWith('Copy description'));
    assert.ok(descItems.length >= 1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/context-menu.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ContextMenu**

Create `src/accessibility/contextMenu.js`:

```js
/**
 * ContextMenu — contextual right-click menu for the Globi viewer.
 *
 * Renders a positioned <div role="menu"> inside the shadow DOM.
 * Supports mouse (contextmenu event), keyboard (Shift+F10, Menu key),
 * and touch (500ms long-press) triggers.
 */

const LONG_PRESS_MS = 500;

/**
 * Build the list of menu items based on what's under the cursor.
 * Pure function — used by tests and by the DOM renderer.
 */
export function buildMenuItems({ entityAtPoint, latLon }) {
  const items = [];

  // Context-specific items
  if (entityAtPoint?.type === 'marker') {
    items.push({ label: 'Inspect marker', action: 'inspectMarker', data: entityAtPoint.entity });
    items.push({ label: 'Copy marker info', action: 'copyMarkerInfo', data: entityAtPoint.entity });
    items.push({ label: 'Fly to marker', action: 'flyToMarker', data: entityAtPoint.entity });
    items.push({ type: 'separator' });
  } else if (entityAtPoint?.type === 'region') {
    items.push({ label: 'Inspect region', action: 'inspectRegion', data: entityAtPoint.entity });
    items.push({ label: 'Copy region info', action: 'copyRegionInfo', data: entityAtPoint.entity });
    items.push({ type: 'separator' });
  } else {
    // Empty surface
    items.push({ label: 'Drop marker here', action: 'dropMarker', data: latLon });
    items.push({ label: 'Fly to center', action: 'flyToCenter', data: latLon });
    items.push({ type: 'separator' });
  }

  // Export submenus
  const exportFormats = [
    { label: 'GeoJSON', format: 'geojson' },
    { label: 'JSON', format: 'json' },
    { label: 'OBJ', format: 'obj' },
    { label: 'USDZ', format: 'usdz', disabled: true, hint: 'Coming soon' },
  ];
  items.push({
    label: 'Export visible',
    action: 'exportSubmenu',
    submenu: exportFormats.map((f) => ({
      label: f.label,
      action: 'export',
      data: { format: f.format, scope: 'visible' },
      disabled: f.disabled ?? false,
      hint: f.hint,
    })),
  });
  items.push({
    label: 'Export full scene',
    action: 'exportSubmenu',
    submenu: exportFormats.map((f) => ({
      label: f.label,
      action: 'export',
      data: { format: f.format, scope: 'full' },
      disabled: f.disabled ?? false,
      hint: f.hint,
    })),
  });
  items.push({ type: 'separator' });

  // Description
  items.push({
    label: 'Copy description',
    action: 'descriptionSubmenu',
    submenu: [
      { label: 'Brief', action: 'copyDescription', data: { level: 'brief' } },
      { label: 'Detailed', action: 'copyDescription', data: { level: 'detailed' } },
    ],
  });
  items.push({ label: 'Copy LLMs.txt', action: 'copyLlmsTxt' });
  items.push({ label: 'Copy coordinates', action: 'copyCoordinates', data: latLon });

  return items;
}

/**
 * ContextMenu manages the DOM rendering and lifecycle of the menu.
 */
export class ContextMenu {
  #shadowRoot;
  #stage;
  #viewStateQuery;
  #controller;
  #menuEl = null;
  #onAction;
  #longPressTimer = null;
  #longPressPos = null;

  constructor({ shadowRoot, stage, viewStateQuery, controller, onAction }) {
    this.#shadowRoot = shadowRoot;
    this.#stage = stage;
    this.#viewStateQuery = viewStateQuery;
    this.#controller = controller;
    this.#onAction = onAction;

    this.#stage.addEventListener('contextmenu', (e) => this.#onContextMenu(e));
    this.#stage.addEventListener('touchstart', (e) => this.#onTouchStart(e), { passive: true });
    this.#stage.addEventListener('touchmove', () => this.#cancelLongPress());
    this.#stage.addEventListener('touchend', () => this.#cancelLongPress());
    this.#stage.addEventListener('touchcancel', () => this.#cancelLongPress());
  }

  #onContextMenu(event) {
    event.preventDefault();
    const latLon = this.#controller?.screenToLatLon(event.clientX, event.clientY) ?? { lat: 0, lon: 0 };
    const entityAtPoint = this.#viewStateQuery.getEntityAtPoint(event.clientX, event.clientY);
    this.#show(event.clientX, event.clientY, { entityAtPoint, latLon });
  }

  #onTouchStart(event) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    this.#longPressPos = { x: touch.clientX, y: touch.clientY };
    this.#longPressTimer = setTimeout(() => {
      const latLon = this.#controller?.screenToLatLon(this.#longPressPos.x, this.#longPressPos.y) ?? { lat: 0, lon: 0 };
      const entityAtPoint = this.#viewStateQuery.getEntityAtPoint(this.#longPressPos.x, this.#longPressPos.y);
      this.#show(this.#longPressPos.x, this.#longPressPos.y, { entityAtPoint, latLon });
    }, LONG_PRESS_MS);
  }

  #cancelLongPress() {
    if (this.#longPressTimer) {
      clearTimeout(this.#longPressTimer);
      this.#longPressTimer = null;
    }
  }

  #show(x, y, context) {
    this.close();
    const items = buildMenuItems(context);
    this.#menuEl = this.#renderMenu(items, x, y);
    this.#shadowRoot.appendChild(this.#menuEl);

    // Focus first item
    const firstBtn = this.#menuEl.querySelector('button:not([disabled])');
    if (firstBtn) firstBtn.focus();

    // Close handlers
    const closeOnClick = (e) => {
      if (!this.#menuEl?.contains(e.target)) this.close();
    };
    const closeOnKey = (e) => {
      if (e.key === 'Escape') this.close();
    };
    const closeOnScroll = () => this.close();
    document.addEventListener('pointerdown', closeOnClick, { once: true, capture: true });
    document.addEventListener('keydown', closeOnKey);
    window.addEventListener('scroll', closeOnScroll, { once: true });
    this._cleanup = () => {
      document.removeEventListener('pointerdown', closeOnClick, { capture: true });
      document.removeEventListener('keydown', closeOnKey);
      window.removeEventListener('scroll', closeOnScroll);
    };
  }

  close() {
    if (this.#menuEl) {
      this.#menuEl.remove();
      this.#menuEl = null;
    }
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
    this.#cancelLongPress();
  }

  #renderMenu(items, x, y) {
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    menu.className = 'globi-context-menu';
    Object.assign(menu.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: '10000',
      background: 'rgba(10, 23, 50, 0.95)',
      border: '1px solid #355183',
      borderRadius: '8px',
      padding: '4px 0',
      minWidth: '180px',
      fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
      fontSize: '13px',
      color: '#f3f6ff',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    });

    for (const item of items) {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:#355183;margin:4px 0;';
        menu.appendChild(sep);
        continue;
      }
      const btn = document.createElement('button');
      btn.setAttribute('role', 'menuitem');
      btn.textContent = item.label;
      if (item.disabled) {
        btn.disabled = true;
        btn.title = item.hint ?? '';
      }
      Object.assign(btn.style, {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '6px 16px',
        background: 'transparent',
        color: item.disabled ? '#667' : '#f3f6ff',
        border: 'none',
        cursor: item.disabled ? 'default' : 'pointer',
        fontSize: '13px',
        fontFamily: 'inherit',
      });
      if (!item.disabled) {
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(53, 81, 131, 0.5)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
      }

      if (item.submenu) {
        btn.textContent = `${item.label} ▸`;
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', 'false');
        const sub = this.#renderSubmenu(item.submenu);
        btn.addEventListener('mouseenter', () => {
          sub.style.display = 'block';
          btn.setAttribute('aria-expanded', 'true');
        });
        btn.addEventListener('mouseleave', (e) => {
          if (!sub.contains(e.relatedTarget)) {
            sub.style.display = 'none';
            btn.setAttribute('aria-expanded', 'false');
          }
        });
        sub.addEventListener('mouseleave', (e) => {
          if (!btn.contains(e.relatedTarget)) {
            sub.style.display = 'none';
            btn.setAttribute('aria-expanded', 'false');
          }
        });
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.appendChild(btn);
        wrapper.appendChild(sub);
        menu.appendChild(wrapper);
      } else {
        btn.addEventListener('click', () => {
          this.#onAction(item.action, item.data);
          this.close();
        });
        menu.appendChild(btn);
      }
    }

    // Keyboard navigation within menu
    menu.addEventListener('keydown', (e) => {
      const btns = [...menu.querySelectorAll('button:not([disabled])')];
      const idx = btns.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && idx < btns.length - 1) {
        e.preventDefault();
        btns[idx + 1].focus();
      } else if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        btns[idx - 1].focus();
      }
    });

    return menu;
  }

  #renderSubmenu(items) {
    const sub = document.createElement('div');
    sub.setAttribute('role', 'menu');
    Object.assign(sub.style, {
      display: 'none',
      position: 'absolute',
      left: '100%',
      top: '0',
      background: 'rgba(10, 23, 50, 0.95)',
      border: '1px solid #355183',
      borderRadius: '8px',
      padding: '4px 0',
      minWidth: '140px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    });
    for (const item of items) {
      const btn = document.createElement('button');
      btn.setAttribute('role', 'menuitem');
      btn.textContent = item.disabled ? `${item.label} (${item.hint})` : item.label;
      if (item.disabled) btn.disabled = true;
      Object.assign(btn.style, {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '6px 16px',
        background: 'transparent',
        color: item.disabled ? '#667' : '#f3f6ff',
        border: 'none',
        cursor: item.disabled ? 'default' : 'pointer',
        fontSize: '13px',
        fontFamily: 'inherit',
      });
      if (!item.disabled) {
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(53, 81, 131, 0.5)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
        btn.addEventListener('click', () => {
          this.#onAction(item.action, item.data);
          this.close();
        });
      }
      sub.appendChild(btn);
    }
    return sub;
  }

  destroy() {
    this.close();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/context-menu.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/accessibility/contextMenu.js tests/context-menu.test.js && git commit -m "feat: add ContextMenu — contextual right-click menu" -- src/accessibility/contextMenu.js tests/context-menu.test.js
```

---

## Chunk 5: Agent Interface

### Task 5: Agent Interface

**Files:**
- Create: `src/accessibility/agentInterface.js`
- Create: `tests/agent-interface.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/agent-interface.test.js`:

```js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAgentAPI, AGENT_MANIFEST } from '../src/accessibility/agentInterface.js';

function mockViewer() {
  const scene = {
    version: 1, locale: 'en', theme: 'photo',
    planet: { id: 'earth' }, projection: 'globe',
    markers: [{ id: 'm1', name: { en: 'Berlin' }, lat: 52.5, lon: 13.4, alt: 0, visualType: 'dot', category: 'capital' }],
    arcs: [], paths: [], regions: [], filters: [], animations: [], dataSources: [], timeRange: null,
  };
  return {
    exportScene: () => ({ ...scene }),
    setScene: (s) => s,
    flyTo: (t, o) => undefined,
    setTheme: (t) => undefined,
    setPlanet: (id) => undefined,
    setInspectMode: (b) => undefined,
    getTheme: () => 'photo',
  };
}

function mockViewState() {
  return {
    getViewAngle: () => ({ lat: 45, lon: 23, zoom: 1.5 }),
    getVisibleEntities: () => ({ markers: [], arcs: [], paths: [], regions: [] }),
    getEntityAtPoint: () => null,
    getViewportBounds: () => ({ north: 70, south: 20, east: 60, west: -15 }),
  };
}

function mockDescriber() {
  return { describeView: (scene, vsq, level) => `Description (${level})` };
}

function mockLlmsTxt() {
  return { formatLlmsTxt: () => '# Globi View State\nbody: earth' };
}

describe('createAgentAPI', () => {
  it('creates an API object with expected methods', () => {
    const api = createAgentAPI({ viewer: mockViewer(), viewStateQuery: mockViewState(), describer: mockDescriber(), llmsTxt: mockLlmsTxt() });
    assert.equal(typeof api.state, 'function');
    assert.equal(typeof api.scene, 'function');
    assert.equal(typeof api.visible, 'function');
    assert.equal(typeof api.describe, 'function');
    assert.equal(typeof api.llmsTxt, 'function');
    assert.equal(typeof api.help, 'function');
    assert.equal(typeof api.flyTo, 'function');
    assert.equal(typeof api.addMarker, 'function');
    assert.equal(typeof api.removeMarker, 'function');
    assert.equal(typeof api.export, 'function');
  });

  it('state() returns current view', () => {
    const api = createAgentAPI({ viewer: mockViewer(), viewStateQuery: mockViewState(), describer: mockDescriber(), llmsTxt: mockLlmsTxt() });
    const state = api.state();
    assert.equal(state.lat, 45);
    assert.equal(state.lon, 23);
    assert.equal(state.body, 'earth');
  });

  it('help() returns manifest with commands', () => {
    const api = createAgentAPI({ viewer: mockViewer(), viewStateQuery: mockViewState(), describer: mockDescriber(), llmsTxt: mockLlmsTxt() });
    const manifest = api.help();
    assert.equal(manifest.version, '1.0');
    assert.ok(Array.isArray(manifest.commands));
    assert.ok(manifest.commands.length > 0);
    assert.ok(manifest.commands.find((c) => c.name === 'flyTo'));
  });

  it('addMarker clones scene and adds marker', () => {
    let setSceneCalled = false;
    const viewer = mockViewer();
    viewer.setScene = (s) => { setSceneCalled = true; return s; };
    const api = createAgentAPI({ viewer, viewStateQuery: mockViewState(), describer: mockDescriber(), llmsTxt: mockLlmsTxt() });
    api.addMarker({ name: 'Test', lat: 10, lon: 20 });
    assert.ok(setSceneCalled);
  });

  it('removeMarker clones scene and removes marker', () => {
    let resultScene = null;
    const viewer = mockViewer();
    viewer.setScene = (s) => { resultScene = s; return s; };
    const api = createAgentAPI({ viewer, viewStateQuery: mockViewState(), describer: mockDescriber(), llmsTxt: mockLlmsTxt() });
    api.removeMarker('m1');
    assert.ok(resultScene);
    assert.equal(resultScene.markers.length, 0);
  });
});

describe('AGENT_MANIFEST', () => {
  it('has version and commands', () => {
    assert.equal(AGENT_MANIFEST.version, '1.0');
    assert.ok(AGENT_MANIFEST.commands.length > 5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/agent-interface.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement AgentInterface**

Create `src/accessibility/agentInterface.js`:

```js
/**
 * AgentInterface — exposes a window.globi JS API and data-* DOM attributes
 * for AI agents to discover and control Globi viewers.
 */

import { exportSceneToJSON } from '../io/json.js';
import { exportSceneToGeoJSON } from '../io/geojson.js';
import { exportSceneToOBJ } from '../io/obj.js';

export const AGENT_MANIFEST = {
  version: '1.0',
  commands: [
    { name: 'state', params: [], description: 'Get current view state' },
    { name: 'scene', params: [], description: 'Get full scene data' },
    { name: 'visible', params: [], description: 'Get currently visible entities' },
    { name: 'describe', params: ['level?: "brief"|"detailed"'], description: 'Get accessibility text' },
    { name: 'llmsTxt', params: [], description: 'Get LLMs.txt output' },
    { name: 'entityAt', params: ['x: number', 'y: number'], description: 'Hit-test a screen point' },
    { name: 'help', params: [], description: 'Get capability manifest' },
    { name: 'flyTo', params: ['lat: number', 'lon: number', 'zoom?: number'], description: 'Animate camera to coordinates' },
    { name: 'rotate', params: ['deltaLat: number', 'deltaLon: number'], description: 'Incremental rotation' },
    { name: 'zoom', params: ['level: number'], description: 'Set zoom level' },
    { name: 'setProjection', params: ['name: string'], description: 'Switch projection' },
    { name: 'addMarker', params: ['opts: {name, lat, lon, ...}'], description: 'Add marker, returns id' },
    { name: 'removeMarker', params: ['id: string'], description: 'Remove marker' },
    { name: 'updateMarker', params: ['id: string', 'opts: object'], description: 'Update marker properties' },
    { name: 'addArc', params: ['opts: object'], description: 'Add arc' },
    { name: 'removeArc', params: ['id: string'], description: 'Remove arc' },
    { name: 'addPath', params: ['opts: object'], description: 'Add path' },
    { name: 'removePath', params: ['id: string'], description: 'Remove path' },
    { name: 'addRegion', params: ['opts: object'], description: 'Add region' },
    { name: 'removeRegion', params: ['id: string'], description: 'Remove region' },
    { name: 'loadScene', params: ['scene: object'], description: 'Load entire scene' },
    { name: 'setTheme', params: ['name: string'], description: 'Switch theme' },
    { name: 'setPlanet', params: ['id: string'], description: 'Switch celestial body' },
    { name: 'toggleLegend', params: [], description: 'Show/hide legend' },
    { name: 'toggleInspect', params: [], description: 'Toggle inspect mode' },
    { name: 'export', params: ['format: string', 'scope: string'], description: 'Export scene' },
    { name: 'on', params: ['event: string', 'callback: function'], description: 'Listen for events' },
    { name: 'off', params: ['event: string', 'callback: function'], description: 'Remove event listener' },
  ],
  events: ['sceneChange', 'markerClick', 'inspectSelect', 'searchResults', 'keyboardNavigate', 'themeChange', 'planetChange'],
};

function randomId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createAgentAPI({ viewer, viewStateQuery, describer, llmsTxt, controller }) {
  const listeners = new Map();

  const api = {
    // --- Read ---
    state() {
      const angle = viewStateQuery.getViewAngle() ?? { lat: 0, lon: 0, zoom: 1 };
      const scene = viewer.exportScene();
      return {
        lat: angle.lat,
        lon: angle.lon,
        zoom: angle.zoom,
        projection: scene.projection ?? 'globe',
        theme: scene.theme ?? 'photo',
        body: scene.planet?.id ?? 'earth',
      };
    },

    scene() {
      return viewer.exportScene();
    },

    visible() {
      return viewStateQuery.getVisibleEntities(viewer.exportScene());
    },

    describe(level = 'brief') {
      return describer.describeView(viewer.exportScene(), viewStateQuery, level);
    },

    llmsTxt() {
      return llmsTxt.formatLlmsTxt(viewer.exportScene(), viewStateQuery);
    },

    entityAt(x, y) {
      return viewStateQuery.getEntityAtPoint(x, y);
    },

    help() {
      const scene = viewer.exportScene();
      return {
        ...AGENT_MANIFEST,
        currentState: {
          body: scene.planet?.id ?? 'earth',
          projection: scene.projection ?? 'globe',
          markerCount: scene.markers?.length ?? 0,
          zoom: viewStateQuery.getViewAngle()?.zoom ?? 1,
        },
      };
    },

    // --- Navigate ---
    flyTo(lat, lon, zoom) {
      const opts = zoom != null ? { zoom } : {};
      viewer.flyTo({ lat, lon }, opts);
    },

    rotate(deltaLat, deltaLon) {
      if (controller) controller.panBy(deltaLon, deltaLat);
    },

    zoom(level) {
      if (controller) {
        const cam = controller.getCameraState?.() ?? {};
        const delta = level - (cam.zoom ?? 1);
        controller.zoomBy(delta);
      }
    },

    setProjection(name) {
      if (controller) controller.setProjection(name);
    },

    // --- Mutate (thin wrappers over setScene) ---
    addMarker(opts) {
      const scene = viewer.exportScene();
      const id = opts.id ?? randomId('marker');
      const marker = {
        id,
        name: typeof opts.name === 'string' ? { en: opts.name } : (opts.name ?? {}),
        description: {},
        lat: opts.lat ?? 0,
        lon: opts.lon ?? 0,
        alt: opts.alt ?? 0,
        visualType: opts.visualType ?? 'dot',
        category: opts.category ?? 'default',
        color: opts.color ?? '',
        calloutMode: opts.calloutMode ?? 'always',
        callout: opts.callout ?? '',
      };
      viewer.setScene({ ...scene, markers: [...scene.markers, marker] });
      return id;
    },

    removeMarker(id) {
      const scene = viewer.exportScene();
      viewer.setScene({ ...scene, markers: scene.markers.filter((m) => m.id !== id) });
    },

    updateMarker(id, opts) {
      const scene = viewer.exportScene();
      viewer.setScene({
        ...scene,
        markers: scene.markers.map((m) => m.id === id ? { ...m, ...opts } : m),
      });
    },

    addArc(opts) {
      const scene = viewer.exportScene();
      const id = opts.id ?? randomId('arc');
      viewer.setScene({ ...scene, arcs: [...scene.arcs, { id, ...opts }] });
      return id;
    },

    removeArc(id) {
      const scene = viewer.exportScene();
      viewer.setScene({ ...scene, arcs: scene.arcs.filter((a) => a.id !== id) });
    },

    updateArc(id, opts) {
      const scene = viewer.exportScene();
      viewer.setScene({
        ...scene,
        arcs: scene.arcs.map((a) => a.id === id ? { ...a, ...opts } : a),
      });
    },

    addPath(opts) {
      const scene = viewer.exportScene();
      const id = opts.id ?? randomId('path');
      viewer.setScene({ ...scene, paths: [...scene.paths, { id, ...opts }] });
      return id;
    },

    removePath(id) {
      const scene = viewer.exportScene();
      viewer.setScene({ ...scene, paths: scene.paths.filter((p) => p.id !== id) });
    },

    updatePath(id, opts) {
      const scene = viewer.exportScene();
      viewer.setScene({
        ...scene,
        paths: scene.paths.map((p) => p.id === id ? { ...p, ...opts } : p),
      });
    },

    addRegion(opts) {
      const scene = viewer.exportScene();
      const id = opts.id ?? randomId('region');
      viewer.setScene({ ...scene, regions: [...scene.regions, { id, ...opts }] });
      return id;
    },

    removeRegion(id) {
      const scene = viewer.exportScene();
      viewer.setScene({ ...scene, regions: scene.regions.filter((r) => r.id !== id) });
    },

    updateRegion(id, opts) {
      const scene = viewer.exportScene();
      viewer.setScene({
        ...scene,
        regions: scene.regions.map((r) => r.id === id ? { ...r, ...opts } : r),
      });
    },

    loadScene(sceneObj) {
      viewer.setScene(sceneObj);
    },

    // --- UI Control ---
    setTheme(name) {
      viewer.setTheme(name);
    },

    setPlanet(id) {
      viewer.setPlanet(id);
    },

    toggleLegend() {
      if (controller) controller.toggleLegend();
    },

    toggleInspect() {
      viewer.setInspectMode?.(!viewer._inspectMode);
    },

    export(format, scope = 'full') {
      const scene = scope === 'visible'
        ? buildVisibleScene(viewer.exportScene(), viewStateQuery)
        : viewer.exportScene();
      if (format === 'json') return exportSceneToJSON(scene);
      if (format === 'geojson') return JSON.stringify(exportSceneToGeoJSON(scene));
      if (format === 'obj') return exportSceneToOBJ(scene);
      if (format === 'llmstxt') return llmsTxt.formatLlmsTxt(scene, viewStateQuery);
      if (format === 'usdz') return null; // placeholder
      return null;
    },

    // --- Events ---
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
    },

    off(event, callback) {
      listeners.get(event)?.delete(callback);
    },
  };

  return api;
}

function buildVisibleScene(fullScene, viewStateQuery) {
  const visible = viewStateQuery.getVisibleEntities(fullScene);
  return {
    ...fullScene,
    markers: visible.markers,
    arcs: visible.arcs,
    paths: visible.paths,
    regions: visible.regions,
  };
}

/**
 * Apply data-* attributes to the host element.
 */
export function applyHostAttributes(hostEl, scene, viewStateQuery) {
  hostEl.setAttribute('data-globi-role', 'viewer');
  hostEl.setAttribute('data-globi-body', scene.planet?.id ?? 'earth');
  hostEl.setAttribute('data-globi-projection', scene.projection ?? 'globe');
  const angle = viewStateQuery.getViewAngle();
  if (angle) {
    hostEl.setAttribute('data-globi-zoom', String(angle.zoom));
  }
  hostEl.setAttribute('data-globi-actions', 'toggleLegend,toggleFullscreen,toggleInspect,setProjection,flyTo,export');
  hostEl.setAttribute('data-globi-marker-count', String(scene.markers?.length ?? 0));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/agent-interface.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/accessibility/agentInterface.js tests/agent-interface.test.js && git commit -m "feat: add AgentInterface — window.globi API and data-* attributes" -- src/accessibility/agentInterface.js tests/agent-interface.test.js
```

---

## Chunk 6: Integration into globi-viewer.js

### Task 6: Wire all modules into the viewer

**Files:**
- Modify: `src/components/globi-viewer.js`

- [ ] **Step 1: Add imports at top of globi-viewer.js**

After the existing imports, add:

```js
import { ViewStateQuery } from '../accessibility/viewStateQuery.js';
import { ContextMenu, buildMenuItems } from '../accessibility/contextMenu.js';
import { describeView } from '../accessibility/viewDescriber.js';
import { formatLlmsTxt } from '../io/llmsTxt.js';
import { createAgentAPI, applyHostAttributes } from '../accessibility/agentInterface.js';
import { exportSceneToJSON } from '../io/json.js';
import { exportSceneToGeoJSON } from '../io/geojson.js';
import { exportSceneToOBJ } from '../io/obj.js';
```

- [ ] **Step 2: Add private fields for new modules**

Add to the private field declarations (near line 602):

```js
  #viewStateQuery = new ViewStateQuery();
  #contextMenu = null;
  #agentAPI = null;
  #ariaLiveEl = null;
  #describeDebounce = 0;
```

- [ ] **Step 3: Wire modules in connectedCallback**

After the existing `this.#controller.on('sceneChange', ...)` block (around line 740), add:

```js
    // --- Accessibility & Agent Interface ---
    this.#viewStateQuery.setRenderer(this.#controller.getActiveRenderer?.() ?? null);

    // Context menu
    this.#contextMenu = new ContextMenu({
      shadowRoot: this.#root,
      stage: this.#stage,
      viewStateQuery: this.#viewStateQuery,
      controller: this.#controller,
      onAction: (action, data) => this.#handleContextMenuAction(action, data),
    });

    // Agent API
    this.#agentAPI = createAgentAPI({
      viewer: this,
      viewStateQuery: this.#viewStateQuery,
      describer: { describeView },
      llmsTxt: { formatLlmsTxt },
      controller: this.#controller,
    });
    this.globi = this.#agentAPI;
    if (!window.globi) {
      window.globi = this.#agentAPI;
    }
    if (!window.globiAll) window.globiAll = [];
    window.globiAll.push(this.#agentAPI);

    // aria-live region for view descriptions
    this.#ariaLiveEl = document.createElement('div');
    this.#ariaLiveEl.setAttribute('aria-live', 'polite');
    this.#ariaLiveEl.setAttribute('aria-atomic', 'true');
    this.#ariaLiveEl.setAttribute('aria-label', 'View description');
    this.#ariaLiveEl.className = 'sr-only';
    this.#ariaLiveEl.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);';
    this.#root.appendChild(this.#ariaLiveEl);

    // data-* attributes
    const currentScene = this.#controller.getScene();
    applyHostAttributes(this, currentScene, this.#viewStateQuery);
```

- [ ] **Step 4: Update sceneChange handler to refresh accessibility state**

Inside the existing `this.#controller.on('sceneChange', (scene) => { ... })` callback, add at the end:

```js
      // Update accessibility state
      this.#viewStateQuery.setRenderer(this.#controller.getActiveRenderer?.() ?? null);
      applyHostAttributes(this, scene, this.#viewStateQuery);
      clearTimeout(this.#describeDebounce);
      this.#describeDebounce = setTimeout(() => {
        if (this.#ariaLiveEl) {
          this.#ariaLiveEl.textContent = describeView(scene, this.#viewStateQuery, 'brief');
        }
      }, 500);
```

- [ ] **Step 5: Add context menu action handler method**

Add a new private method:

```js
  #handleContextMenuAction(action, data) {
    const scene = this.#controller.getScene();
    switch (action) {
      case 'copyCoordinates':
        if (data) navigator.clipboard?.writeText(`${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}`);
        break;
      case 'copyLlmsTxt':
        navigator.clipboard?.writeText(formatLlmsTxt(scene, this.#viewStateQuery));
        break;
      case 'copyDescription':
        navigator.clipboard?.writeText(describeView(scene, this.#viewStateQuery, data?.level ?? 'brief'));
        break;
      case 'dropMarker':
        if (data) {
          this.#agentAPI.addMarker({ name: 'New marker', lat: data.lat, lon: data.lon });
        }
        break;
      case 'flyToCenter':
        if (data) this.flyTo({ lat: data.lat, lon: data.lon });
        break;
      case 'flyToMarker':
        if (data) this.flyTo({ lat: data.lat, lon: data.lon });
        break;
      case 'inspectMarker':
        this.setInspectMode(true);
        dispatchCustomEvent(this, 'inspectSelect', { kind: 'marker', entity: data });
        break;
      case 'inspectRegion':
        this.setInspectMode(true);
        dispatchCustomEvent(this, 'inspectSelect', { kind: 'region', entity: data });
        break;
      case 'copyMarkerInfo': {
        const name = typeof data.name === 'string' ? data.name : (data.name?.en ?? '');
        navigator.clipboard?.writeText(`${name} (${data.lat}, ${data.lon})`);
        break;
      }
      case 'copyRegionInfo': {
        const name = typeof data.name === 'string' ? data.name : (data.name?.en ?? '');
        navigator.clipboard?.writeText(name);
        break;
      }
      case 'export': {
        const targetScene = data.scope === 'visible'
          ? this.#buildVisibleScene(scene)
          : scene;
        let output;
        if (data.format === 'json') output = exportSceneToJSON(targetScene);
        else if (data.format === 'geojson') output = JSON.stringify(exportSceneToGeoJSON(targetScene), null, 2);
        else if (data.format === 'obj') output = exportSceneToOBJ(targetScene);
        if (output) this.#downloadText(output, `globi-scene.${data.format}`, data.format === 'json' ? 'application/json' : 'text/plain');
        break;
      }
    }
  }

  #buildVisibleScene(scene) {
    const visible = this.#viewStateQuery.getVisibleEntities(scene);
    return { ...scene, markers: visible.markers, arcs: visible.arcs, paths: visible.paths, regions: visible.regions };
  }

  #downloadText(text, filename, mimeType = 'text/plain') {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
```

- [ ] **Step 6: Add cleanup in disconnectedCallback**

In the existing `disconnectedCallback` (or add one if needed), add:

```js
    // Cleanup accessibility modules
    if (this.#contextMenu) {
      this.#contextMenu.destroy();
      this.#contextMenu = null;
    }
    if (this.#ariaLiveEl) {
      this.#ariaLiveEl.remove();
      this.#ariaLiveEl = null;
    }
    clearTimeout(this.#describeDebounce);

    // Remove agent API
    if (window.globi === this.#agentAPI) {
      // Transfer to next viewer if available
      const others = (window.globiAll ?? []).filter((a) => a !== this.#agentAPI);
      window.globi = others.length > 0 ? others[0] : undefined;
      if (!window.globi) delete window.globi;
    }
    if (window.globiAll) {
      window.globiAll = window.globiAll.filter((a) => a !== this.#agentAPI);
      if (window.globiAll.length === 0) delete window.globiAll;
    }
    this.#agentAPI = null;
    this.globi = null;
```

- [ ] **Step 7: Add toggleLegend listener in globi-viewer**

In the `connectedCallback`, after the `toggleLegend` controller event is set up in Chunk 0, listen for it:

```js
    this.#controller.on('toggleLegend', () => {
      this.#legendVisible = !this.#legendVisible;
      this.#legend.classList.toggle('visible', this.#legendVisible);
    });
```

- [ ] **Step 8: Add data-* attributes to shadow DOM controls**

In the `TEMPLATE` string in `globi-viewer.js`, add `data-globi-action` attributes to existing control buttons:

- `.stage` div: add `data-globi-role="viewport"`
- `.fullscreen` button: add `data-globi-action="toggleFullscreen"`
- `.legend-toggle` button: add `data-globi-action="toggleLegend"`
- `.inspect-toggle` button: add `data-globi-action="toggleInspect"`
- `.projection-toggle` button: add `data-globi-action="setProjection"`

- [ ] **Step 9: Run all tests**

Run: `node --test tests/view-state-query.test.js tests/llms-txt.test.js tests/view-describer.test.js tests/context-menu.test.js tests/agent-interface.test.js`
Expected: All tests PASS

- [ ] **Step 10: Build and verify**

Run: `npm run build` (or the project's build command)
Expected: Build succeeds with no errors

- [ ] **Step 11: Test in browser**

Open the editor in a browser, right-click on the globe, verify:
- Context menu appears with expected items
- Export options work
- Copy description works
- `window.globi` is available in console
- `window.globi.help()` returns manifest
- `window.globi.state()` returns view state
- `window.globi.describe()` returns text
- `data-globi-*` attributes visible on `<globi-viewer>` host element

- [ ] **Step 12: Commit integration**

```bash
git restore --staged :/ && git add src/components/globi-viewer.js src/controller/globeController.js && git commit -m "feat: wire context menu, accessibility, and agent interface into globi-viewer" -- src/components/globi-viewer.js src/controller/globeController.js
```

---

## Chunk 7: Documentation & Release

### Task 7: Update docs, features, and release notes

**Files:**
- Modify: `FEATURES.md`
- Modify: `RELEASE_NOTES.md`
- Modify: `docs/QUICK_START_EMBED.md`

- [ ] **Step 1: Update FEATURES.md**

Add entries for the new features (context menu, accessibility text, LLMs.txt, agent interface).

- [ ] **Step 2: Update RELEASE_NOTES.md**

Add a new section with:
- Custom context menu with export, description copy, coordinate copy, and entity actions
- Screen reader descriptions (brief/detailed) with live `aria-live` updates
- LLMs.txt machine-readable view state output
- `window.globi` agent API with full read/navigate/mutate/UI control
- DOM `data-globi-*` attributes for agent discoverability

- [ ] **Step 3: Update QUICK_START_EMBED.md**

Add a section about the `window.globi` API for embedders who want programmatic control.

- [ ] **Step 4: Commit docs**

```bash
git restore --staged :/ && git add FEATURES.md RELEASE_NOTES.md docs/QUICK_START_EMBED.md && git commit -m "docs: add context menu, accessibility, and agent interface documentation" -- FEATURES.md RELEASE_NOTES.md docs/QUICK_START_EMBED.md
```
