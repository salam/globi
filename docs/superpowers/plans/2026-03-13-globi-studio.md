# Globi Studio Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WYSIWYG editor ("Globi Studio") that lets users visually create and edit globe scenes with direct-manipulation tools, a properties panel, and a timeline animation editor.

**Architecture:** Studio is a standalone page (`studio/index.html`) that embeds `<globi-viewer>` and wraps it with editing UI. It reuses the existing SceneStore, AnimationEngine, and IO modules. A new EditorStore manages UI state (selection, active tool, panel visibility), and an UndoRedo module provides snapshot-based history. The viewer's context menu gets an "Open Studio" item that transfers scene data via sessionStorage.

**Tech Stack:** Vanilla JS/CSS (no frameworks), Three.js (via existing globi modules), esbuild for bundling, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-03-13-globi-studio-design.md`

---

## File Map

### New files (studio/)

| File | Responsibility |
|------|---------------|
| `studio/index.html` | HTML shell: layout grid, loads app.js |
| `studio/app.js` | Bootstrap: creates viewer, stores, components; wires events |
| `studio/styles.css` | All Studio CSS (dark theme, layout, panels) |
| `studio/state/editorStore.js` | UI state: active tool, selection, panel toggles, playback |
| `studio/state/undoRedo.js` | Snapshot-based undo/redo stack (max 50) |
| `studio/state/sessionTransfer.js` | Read/write scene to sessionStorage with gzip fallback |
| `studio/components/menuBar.js` | Menu bar with dropdown menus and Preview button |
| `studio/components/toolStrip.js` | Left vertical tool strip |
| `studio/components/propertiesPanel.js` | Right properties panel (scene settings + entity editing) |
| `studio/components/timeline.js` | Bottom timeline editor (tracks, keyframes, transport) |
| `studio/components/easingEditor.js` | Easing curve popup with presets and bezier editor |
| `studio/components/previewMode.js` | Preview mode (hide UI, play animation, restore on exit) |
| `studio/tools/selectTool.js` | Select tool: click-to-select, drag-to-move markers |
| `studio/tools/markerTool.js` | Marker placement: click globe to place |
| `studio/tools/arcTool.js` | Arc placement: two clicks (start, end) |
| `studio/tools/pathTool.js` | Path placement: multi-click, Enter/double-click to finish |
| `studio/tools/regionTool.js` | Region placement: polygon vertices, double-click to close |
| `studio/tools/drawTool.js` | Freehand draw: drag to draw, RDP simplification |
| `studio/tools/toolManager.js` | Manages active tool lifecycle (activate/deactivate/events) |

### New files (docs/)

| File | Responsibility |
|------|---------------|
| `docs/ai-companions/globi-custom-gpt-prompt.md` | CustomGPT system prompt for ChatGPT |
| `docs/ai-companions/globi-claude-cowork-prompt.md` | Claude system prompt |

### Modified files

| File | Change |
|------|--------|
| `src/accessibility/contextMenu.js` | Add "Open Studio" menu item to `buildMenuItems()` |
| `src/animation/engine.js` | Add easing support to `sample()` |
| `src/scene/schema.js` | Add `visibility`, `easing`, `cameraAnimation` to normalization |
| `tools/build.mjs` | Add `studio` entry point |

### Test files

| File | Tests |
|------|-------|
| `tests/studio/editorStore.test.js` | EditorStore state management |
| `tests/studio/undoRedo.test.js` | Undo/redo stack behavior |
| `tests/studio/sessionTransfer.test.js` | Session storage read/write/compression |
| `tests/studio/toolManager.test.js` | Tool activation/deactivation lifecycle |
| `tests/studio/selectTool.test.js` | Select tool hit-test and drag |
| `tests/studio/markerTool.test.js` | Marker placement on click |
| `tests/studio/arcTool.test.js` | Arc two-click placement |
| `tests/studio/pathTool.test.js` | Path multi-click and freehand |
| `tests/studio/regionTool.test.js` | Region polygon creation |
| `tests/studio/drawTool.test.js` | Freehand draw with RDP |
| `tests/studio/menuBar.test.js` | Menu rendering and actions |
| `tests/studio/propertiesPanel.test.js` | Properties panel rendering |
| `tests/studio/timeline.test.js` | Timeline track rendering |
| `tests/animation/easing.test.js` | Easing curve interpolation |
| `tests/scene/schema-visibility.test.js` | Visibility/cameraAnimation normalization |
| `tests/accessibility/contextMenu-studio.test.js` | "Open Studio" menu item |

---

## Chunk 1: Foundation (State, Session Transfer, Schema Extensions)

### Task 1: Editor Store

**Files:**
- Create: `studio/state/editorStore.js`
- Test: `tests/studio/editorStore.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/editorStore.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EditorStore } from '../../studio/state/editorStore.js';

describe('EditorStore', () => {
  it('starts with default state', () => {
    const store = new EditorStore();
    const s = store.getState();
    assert.equal(s.activeTool, 'select');
    assert.deepEqual(s.selectedIds, []);
    assert.equal(s.propertiesVisible, true);
    assert.equal(s.timelineVisible, true);
    assert.equal(s.hudVisible, true);
    assert.equal(s.playbackState, 'stopped');
    assert.equal(s.playheadMs, 0);
  });

  it('dispatches tool change', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'setTool', tool: 'marker' });
    assert.equal(store.getState().activeTool, 'marker');
  });

  it('dispatches selection', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'select', ids: ['m1', 'm2'] });
    assert.deepEqual(store.getState().selectedIds, ['m1', 'm2']);
  });

  it('dispatches deselect', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'select', ids: ['m1'] });
    store.dispatch({ type: 'deselect' });
    assert.deepEqual(store.getState().selectedIds, []);
  });

  it('toggles panel visibility', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'togglePanel', panel: 'properties' });
    assert.equal(store.getState().propertiesVisible, false);
    store.dispatch({ type: 'togglePanel', panel: 'properties' });
    assert.equal(store.getState().propertiesVisible, true);
  });

  it('emits change event', () => {
    const store = new EditorStore();
    let called = false;
    store.on('change', () => { called = true; });
    store.dispatch({ type: 'setTool', tool: 'arc' });
    assert.equal(called, true);
  });

  it('sets playback state', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'setPlayback', state: 'playing' });
    assert.equal(store.getState().playbackState, 'playing');
  });

  it('sets playhead position', () => {
    const store = new EditorStore();
    store.dispatch({ type: 'setPlayhead', ms: 3500 });
    assert.equal(store.getState().playheadMs, 3500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/studio/editorStore.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```javascript
// studio/state/editorStore.js
import { Emitter } from '../../src/utils/emitter.js';

const DEFAULTS = {
  activeTool: 'select',
  selectedIds: [],
  propertiesVisible: true,
  timelineVisible: true,
  hudVisible: true,
  playbackState: 'stopped',
  playheadMs: 0,
};

const PANEL_KEYS = {
  properties: 'propertiesVisible',
  timeline: 'timelineVisible',
  hud: 'hudVisible',
};

export class EditorStore extends Emitter {
  constructor() {
    super();
    this._state = { ...DEFAULTS, selectedIds: [] };
  }

  getState() {
    return { ...this._state, selectedIds: [...this._state.selectedIds] };
  }

  dispatch(action) {
    switch (action.type) {
      case 'setTool':
        this._state.activeTool = action.tool;
        break;
      case 'select':
        this._state.selectedIds = [...action.ids];
        break;
      case 'deselect':
        this._state.selectedIds = [];
        break;
      case 'togglePanel': {
        const key = PANEL_KEYS[action.panel];
        if (key) this._state[key] = !this._state[key];
        break;
      }
      case 'setPlayback':
        this._state.playbackState = action.state;
        break;
      case 'setPlayhead':
        this._state.playheadMs = action.ms;
        break;
      default:
        return;
    }
    this.emit('change', this.getState());
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/studio/editorStore.test.js`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add studio/state/editorStore.js tests/studio/editorStore.test.js && git commit -m "feat(studio): add EditorStore for UI state management"
```

---

### Task 2: Undo/Redo

**Files:**
- Create: `studio/state/undoRedo.js`
- Test: `tests/studio/undoRedo.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/undoRedo.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UndoRedo } from '../../studio/state/undoRedo.js';

describe('UndoRedo', () => {
  it('starts empty', () => {
    const ur = new UndoRedo();
    assert.equal(ur.canUndo, false);
    assert.equal(ur.canRedo, false);
  });

  it('pushes and undoes', () => {
    const ur = new UndoRedo();
    ur.push({ v: 1 });
    ur.push({ v: 2 });
    assert.equal(ur.canUndo, true);
    const prev = ur.undo();
    assert.deepEqual(prev, { v: 1 });
  });

  it('redoes after undo', () => {
    const ur = new UndoRedo();
    ur.push({ v: 1 });
    ur.push({ v: 2 });
    ur.undo();
    assert.equal(ur.canRedo, true);
    const next = ur.redo();
    assert.deepEqual(next, { v: 2 });
  });

  it('clears redo stack on new push', () => {
    const ur = new UndoRedo();
    ur.push({ v: 1 });
    ur.push({ v: 2 });
    ur.undo();
    ur.push({ v: 3 });
    assert.equal(ur.canRedo, false);
  });

  it('respects max depth', () => {
    const ur = new UndoRedo(3);
    ur.push({ v: 1 });
    ur.push({ v: 2 });
    ur.push({ v: 3 });
    ur.push({ v: 4 }); // pushes out v:1
    const a = ur.undo(); // v:3
    const b = ur.undo(); // v:2
    assert.deepEqual(a, { v: 3 });
    assert.deepEqual(b, { v: 2 });
    assert.equal(ur.canUndo, false); // v:1 was evicted
  });

  it('returns undefined when nothing to undo', () => {
    const ur = new UndoRedo();
    assert.equal(ur.undo(), undefined);
  });

  it('returns undefined when nothing to redo', () => {
    const ur = new UndoRedo();
    assert.equal(ur.redo(), undefined);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/studio/undoRedo.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```javascript
// studio/state/undoRedo.js
export class UndoRedo {
  constructor(maxDepth = 50) {
    this._undoStack = [];
    this._redoStack = [];
    this._maxDepth = maxDepth;
  }

  get canUndo() { return this._undoStack.length > 0; }
  get canRedo() { return this._redoStack.length > 0; }

  push(snapshot) {
    this._undoStack.push(JSON.parse(JSON.stringify(snapshot)));
    if (this._undoStack.length > this._maxDepth) {
      this._undoStack.shift();
    }
    this._redoStack.length = 0;
  }

  undo() {
    if (!this.canUndo) return undefined;
    const snapshot = this._undoStack.pop();
    this._redoStack.push(snapshot);
    // Return the new top (previous state) — but actually the caller
    // needs the state to restore, which is what we just popped.
    // The pattern: push(currentBeforeEdit). undo() returns what to restore.
    return JSON.parse(JSON.stringify(snapshot));
  }

  redo() {
    if (!this.canRedo) return undefined;
    const snapshot = this._redoStack.pop();
    this._undoStack.push(snapshot);
    return JSON.parse(JSON.stringify(snapshot));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/studio/undoRedo.test.js`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add studio/state/undoRedo.js tests/studio/undoRedo.test.js && git commit -m "feat(studio): add snapshot-based UndoRedo stack"
```

---

### Task 3: Session Transfer

**Files:**
- Create: `studio/state/sessionTransfer.js`
- Test: `tests/studio/sessionTransfer.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/sessionTransfer.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock sessionStorage for Node
const storage = new Map();
globalThis.sessionStorage = {
  getItem(k) { return storage.get(k) ?? null; },
  setItem(k, v) { storage.set(k, v); },
  removeItem(k) { storage.delete(k); },
};

const { writeScene, readScene, STORAGE_KEY } = await import('../../studio/state/sessionTransfer.js');

describe('sessionTransfer', () => {
  beforeEach(() => storage.clear());

  it('writes and reads a scene', () => {
    const scene = { version: 1, markers: [{ id: 'm1' }] };
    writeScene(scene);
    const result = readScene();
    assert.deepEqual(result, scene);
  });

  it('returns null when nothing stored', () => {
    assert.equal(readScene(), null);
  });

  it('clears after read', () => {
    writeScene({ version: 1 });
    readScene();
    assert.equal(readScene(), null);
  });

  it('uses the documented storage key', () => {
    assert.equal(STORAGE_KEY, 'globi-studio-scene');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/studio/sessionTransfer.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```javascript
// studio/state/sessionTransfer.js
export const STORAGE_KEY = 'globi-studio-scene';

export function writeScene(scene) {
  const json = JSON.stringify(scene);
  sessionStorage.setItem(STORAGE_KEY, json);
}

export function readScene() {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  return JSON.parse(raw);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/studio/sessionTransfer.test.js`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add studio/state/sessionTransfer.js tests/studio/sessionTransfer.test.js && git commit -m "feat(studio): add sessionStorage scene transfer"
```

---

### Task 4: Schema Extensions (Visibility, Easing, Camera Animation)

**Files:**
- Modify: `src/scene/schema.js`
- Modify: `src/animation/engine.js`
- Test: `tests/scene/schema-visibility.test.js`
- Test: `tests/animation/easing.test.js`

- [ ] **Step 1: Write schema normalization test**

```javascript
// tests/scene/schema-visibility.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScene } from '../../src/scene/schema.js';

describe('schema visibility + cameraAnimation', () => {
  it('preserves visibility array on markers', () => {
    const scene = normalizeScene({
      markers: [{ id: 'm1', lat: 0, lon: 0, visibility: [{ from: 0, to: 5000 }] }],
    });
    assert.deepEqual(scene.markers[0].visibility, [{ from: 0, to: 5000 }]);
  });

  it('defaults visibility to undefined (always visible)', () => {
    const scene = normalizeScene({
      markers: [{ id: 'm1', lat: 0, lon: 0 }],
    });
    assert.equal(scene.markers[0].visibility, undefined);
  });

  it('preserves cameraAnimation at scene level', () => {
    const scene = normalizeScene({
      cameraAnimation: [
        { t: 0, value: { lat: 0, lon: 0, alt: 1, tilt: 0, rotation: 0 } },
        { t: 5000, value: { lat: 45, lon: 90, alt: 2, tilt: 30, rotation: 0 } },
      ],
    });
    assert.equal(scene.cameraAnimation.length, 2);
    assert.equal(scene.cameraAnimation[0].t, 0);
  });

  it('defaults cameraAnimation to empty array', () => {
    const scene = normalizeScene({});
    assert.deepEqual(scene.cameraAnimation, []);
  });

  it('preserves easing field on animation keyframes', () => {
    const scene = normalizeScene({
      markers: [{ id: 'm1', lat: 0, lon: 0 }],
      animations: [{
        entityId: 'm1',
        keyframes: [
          { t: 0, value: { lat: 0, lon: 0 }, easing: 'ease-in' },
          { t: 1000, value: { lat: 10, lon: 10 } },
        ],
      }],
    });
    assert.equal(scene.animations[0].keyframes[0].easing, 'ease-in');
    assert.equal(scene.animations[0].keyframes[1].easing, undefined);
  });

  it('preserves visibility on arcs and paths', () => {
    const scene = normalizeScene({
      arcs: [{ id: 'a1', start: { lat: 0, lon: 0 }, end: { lat: 1, lon: 1 }, visibility: [{ from: 100, to: 200 }] }],
      paths: [{ id: 'p1', points: [{ lat: 0, lon: 0 }], visibility: [{ from: 300, to: 400 }] }],
    });
    assert.deepEqual(scene.arcs[0].visibility, [{ from: 100, to: 200 }]);
    assert.deepEqual(scene.paths[0].visibility, [{ from: 300, to: 400 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/scene/schema-visibility.test.js`
Expected: FAIL — visibility/cameraAnimation not preserved

- [ ] **Step 3: Modify `src/scene/schema.js`**

In `normalizeScene()`, add these changes:
- In the marker/arc/path normalization, preserve `visibility` if present (pass through as-is, it's an array of `{from, to}` objects).
- At the scene level, add `cameraAnimation: input.cameraAnimation || []`.
- In animation keyframe normalization, preserve the `easing` field if present.

The exact edits depend on the current structure — the implementer should read schema.js and add the fields at the appropriate points. Key rule: these are optional, backward-compatible additions.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/scene/schema-visibility.test.js`
Expected: All 7 tests PASS

- [ ] **Step 5: Run all existing tests**

Run: `node --test`
Expected: All existing tests still pass (no regressions)

- [ ] **Step 6: Write easing interpolation test**

```javascript
// tests/animation/easing.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AnimationEngine } from '../../src/animation/engine.js';

describe('AnimationEngine easing', () => {
  it('linear easing (default) interpolates linearly', () => {
    const engine = new AnimationEngine();
    engine.register('e1', [
      { t: 0, value: { x: 0 } },
      { t: 1000, value: { x: 100 } },
    ]);
    const v = engine.sample('e1', 500);
    assert.equal(v.x, 50);
  });

  it('ease-in produces slower start', () => {
    const engine = new AnimationEngine();
    engine.register('e1', [
      { t: 0, value: { x: 0 }, easing: 'ease-in' },
      { t: 1000, value: { x: 100 } },
    ]);
    const v = engine.sample('e1', 500);
    // ease-in at t=0.5 should be < 50 (slower start)
    assert.ok(v.x < 50, `expected < 50, got ${v.x}`);
  });

  it('ease-out produces faster start', () => {
    const engine = new AnimationEngine();
    engine.register('e1', [
      { t: 0, value: { x: 0 }, easing: 'ease-out' },
      { t: 1000, value: { x: 100 } },
    ]);
    const v = engine.sample('e1', 500);
    // ease-out at t=0.5 should be > 50 (faster start)
    assert.ok(v.x > 50, `expected > 50, got ${v.x}`);
  });

  it('ease-in-out produces S-curve', () => {
    const engine = new AnimationEngine();
    engine.register('e1', [
      { t: 0, value: { x: 0 }, easing: 'ease-in-out' },
      { t: 1000, value: { x: 100 } },
    ]);
    const v25 = engine.sample('e1', 250);
    const v75 = engine.sample('e1', 750);
    // Should be symmetric: value at 25% < 25, value at 75% > 75
    assert.ok(v25.x < 25, `expected < 25, got ${v25.x}`);
    assert.ok(v75.x > 75, `expected > 75, got ${v75.x}`);
  });

  it('keyframes without easing default to linear', () => {
    const engine = new AnimationEngine();
    engine.register('e1', [
      { t: 0, value: { x: 0 } },
      { t: 1000, value: { x: 100 } },
    ]);
    const v = engine.sample('e1', 250);
    assert.equal(v.x, 25);
  });
});
```

- [ ] **Step 7: Run easing test to verify it fails**

Run: `node --test tests/animation/easing.test.js`
Expected: FAIL — ease-in/out tests fail (currently only linear)

- [ ] **Step 8: Modify `src/animation/engine.js`**

Add an easing function lookup and apply it in `sample()`. The easing is read from the **start** keyframe of each pair. Add these easing functions:

```javascript
const EASING = {
  'linear': t => t,
  'ease-in': t => t * t,
  'ease-out': t => t * (2 - t),
  'ease-in-out': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'bounce': t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  'elastic': t => t === 0 || t === 1 ? t : -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI),
};
```

In `sample()`, when interpolating between keyframes `kf[i]` and `kf[i+1]`:
1. Compute linear progress `p = (timeMs - kf[i].t) / (kf[i+1].t - kf[i].t)`
2. Look up easing: `const ease = EASING[kf[i].easing] || EASING.linear`
3. Apply: `p = ease(p)`
4. Then interpolate values using eased `p`

Also support `cubic-bezier(x1,y1,x2,y2)` by parsing the string and evaluating a cubic bezier.

- [ ] **Step 9: Run easing test to verify it passes**

Run: `node --test tests/animation/easing.test.js`
Expected: All 5 tests PASS

- [ ] **Step 10: Run all tests**

Run: `node --test`
Expected: All tests pass

- [ ] **Step 11: Commit**

```bash
git restore --staged :/ && git add src/scene/schema.js src/animation/engine.js tests/scene/schema-visibility.test.js tests/animation/easing.test.js && git commit -m "feat: add visibility intervals, easing curves, and cameraAnimation to schema+engine"
```

---

### Task 5: Context Menu "Open Studio" Integration

**Files:**
- Modify: `src/accessibility/contextMenu.js`
- Test: `tests/accessibility/contextMenu-studio.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/accessibility/contextMenu-studio.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildMenuItems } from '../../src/accessibility/contextMenu.js';

describe('contextMenu Open Studio', () => {
  it('includes Open Studio item at the top level', () => {
    const items = buildMenuItems({ entityAtPoint: null, latLon: { lat: 0, lon: 0 } });
    const studioItem = items.find(i => i.action === 'openStudio');
    assert.ok(studioItem, 'Open Studio item should exist');
    assert.equal(studioItem.label, 'Open Studio');
  });

  it('includes Open Studio even when entity is present', () => {
    const items = buildMenuItems({
      entityAtPoint: { kind: 'marker', id: 'm1' },
      latLon: { lat: 10, lon: 20 },
    });
    const studioItem = items.find(i => i.action === 'openStudio');
    assert.ok(studioItem);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/accessibility/contextMenu-studio.test.js`
Expected: FAIL — no `openStudio` action found

- [ ] **Step 3: Add "Open Studio" to `buildMenuItems()`**

In `src/accessibility/contextMenu.js`, add to `buildMenuItems()` near the end of the items array (before the export section):

```javascript
items.push({ type: 'separator' });
items.push({ label: 'Open Studio', action: 'openStudio' });
```

Then in the `ContextMenu` class `onAction` handler, add handling for `'openStudio'`:
```javascript
case 'openStudio': {
  const scene = this.controller.getScene();
  const json = JSON.stringify(scene);
  sessionStorage.setItem('globi-studio-scene', json);
  window.open('studio/index.html', '_blank');
  break;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/accessibility/contextMenu-studio.test.js`
Expected: All 2 tests PASS

- [ ] **Step 5: Run all tests**

Run: `node --test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add src/accessibility/contextMenu.js tests/accessibility/contextMenu-studio.test.js && git commit -m "feat: add 'Open Studio' to viewer context menu"
```

---

## Chunk 2: Studio Shell (HTML, CSS, Layout, Menu Bar, Tool Strip)

### Task 6: Studio HTML Shell and CSS

**Files:**
- Create: `studio/index.html`
- Create: `studio/styles.css`

- [ ] **Step 1: Create `studio/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Globi Studio</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="studio" class="studio">
    <div id="menu-bar" class="menu-bar"></div>
    <div class="main">
      <div id="tool-strip" class="tool-strip"></div>
      <div id="viewport" class="viewport">
        <globi-viewer id="viewer"></globi-viewer>
      </div>
      <div id="properties" class="properties"></div>
    </div>
    <div id="timeline" class="timeline"></div>
  </div>
  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `studio/styles.css`**

Implement the full dark theme CSS from the mockup (`.superpowers/brainstorm/52290-1773438974/studio-full-design.html`). Key layout rules:
- `.studio` — full viewport flex column
- `.menu-bar` — 32px height, `#13132a` background
- `.main` — flex row, flex:1
- `.tool-strip` — 44px wide, vertical flex
- `.viewport` — flex:1, contains `globi-viewer` filling its parent
- `.properties` — 280px wide, scrollable, hideable via `.hidden` class
- `.timeline` — 160px height, hideable, resizable via top border drag
- Accent color: `#7a7aff`

The implementer should extract styles from the mockup HTML and adapt them. The `globi-viewer` inside `.viewport` should fill the container:
```css
.viewport globi-viewer { display: block; width: 100%; height: 100%; }
```

- [ ] **Step 3: Verify in browser**

Run: `python3 -m http.server 4173` from project root.
Open: `http://localhost:4173/studio/`
Expected: Empty dark layout with all four quadrants visible (menu bar, tool strip, viewport area, properties, timeline).

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add studio/index.html studio/styles.css && git commit -m "feat(studio): add HTML shell and dark theme CSS"
```

---

### Task 7: Menu Bar Component

**Files:**
- Create: `studio/components/menuBar.js`
- Test: `tests/studio/menuBar.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/menuBar.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let MenuBar;
beforeEach(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="menu-bar"></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.HTMLElement = dom.window.HTMLElement;
  ({ MenuBar } = await import('../../studio/components/menuBar.js'));
});

describe('MenuBar', () => {
  it('renders menu items', () => {
    const el = document.getElementById('menu-bar');
    const mb = new MenuBar(el, { onAction: () => {} });
    const items = el.querySelectorAll('.menu-item');
    assert.ok(items.length >= 5, 'should have File, Edit, View, Tools, Help');
  });

  it('renders preview button', () => {
    const el = document.getElementById('menu-bar');
    const mb = new MenuBar(el, { onAction: () => {} });
    const preview = el.querySelector('.preview-btn');
    assert.ok(preview, 'preview button should exist');
  });

  it('fires action on menu item click', () => {
    const el = document.getElementById('menu-bar');
    let fired = null;
    const mb = new MenuBar(el, { onAction: (action) => { fired = action; } });
    const preview = el.querySelector('.preview-btn');
    preview.click();
    assert.equal(fired, 'togglePreview');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/studio/menuBar.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

`studio/components/menuBar.js` should:
- Accept a container element and an `{ onAction }` callback
- Build the menu bar DOM: logo, File/Edit/View/Tools/Help menu items with dropdowns, and the Preview button
- Each dropdown item calls `onAction(actionName)` on click
- Action names: `newScene`, `newFromClipboard`, `newFromFile`, `saveAsFile`, `exportJSON`, `exportGeoJSON`, `exportOBJ`, `undo`, `redo`, `deleteSelected`, `duplicate`, `selectAll`, `toggleProperties`, `toggleTimeline`, `toggleHud`, `zoomToFit`, `resetCamera`, `openChatGPT`, `openClaude`, `openDocs`, `showShortcuts`, `showAbout`, `togglePreview`
- Dropdown visibility toggled by hover (CSS `:hover`)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/studio/menuBar.test.js`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add studio/components/menuBar.js tests/studio/menuBar.test.js && git commit -m "feat(studio): add MenuBar component with dropdown menus"
```

---

### Task 8: Tool Strip Component

**Files:**
- Create: `studio/components/toolStrip.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/toolStrip.test.js  (inline, add to tests/studio/)
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let ToolStrip;
beforeEach(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="ts"></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  ({ ToolStrip } = await import('../../studio/components/toolStrip.js'));
});

describe('ToolStrip', () => {
  it('renders all tool buttons', () => {
    const el = document.getElementById('ts');
    const ts = new ToolStrip(el, { onToolChange: () => {} });
    const btns = el.querySelectorAll('.tool-btn');
    // select, marker, arc, path, region, draw = 6
    assert.ok(btns.length >= 6);
  });

  it('highlights active tool', () => {
    const el = document.getElementById('ts');
    const ts = new ToolStrip(el, { onToolChange: () => {} });
    ts.setActive('marker');
    const active = el.querySelector('.tool-btn.active');
    assert.ok(active);
    assert.equal(active.dataset.tool, 'marker');
  });

  it('fires onToolChange on click', () => {
    const el = document.getElementById('ts');
    let changed = null;
    const ts = new ToolStrip(el, { onToolChange: (t) => { changed = t; } });
    const markerBtn = el.querySelector('[data-tool="marker"]');
    markerBtn.click();
    assert.equal(changed, 'marker');
  });
});
```

- [ ] **Step 2: Run test, verify fails**

Run: `node --test tests/studio/toolStrip.test.js`

- [ ] **Step 3: Write implementation**

`studio/components/toolStrip.js`:
- Renders tool buttons with `data-tool` attribute: `select`, `marker`, `arc`, `path`, `region`, `draw`
- Each button has icon + hover tooltip with keyboard shortcut
- `setActive(toolName)` — updates `.active` class
- Click fires `onToolChange(toolName)`

- [ ] **Step 4: Run test, verify passes**

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add studio/components/toolStrip.js tests/studio/toolStrip.test.js && git commit -m "feat(studio): add ToolStrip component"
```

---

### Task 9: Tool Manager

**Files:**
- Create: `studio/tools/toolManager.js`
- Test: `tests/studio/toolManager.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/toolManager.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ToolManager } from '../../studio/tools/toolManager.js';

describe('ToolManager', () => {
  it('activates a tool', () => {
    const log = [];
    const fakeTool = {
      activate() { log.push('activate'); },
      deactivate() { log.push('deactivate'); },
    };
    const tm = new ToolManager({ select: fakeTool });
    tm.setActive('select');
    assert.deepEqual(log, ['activate']);
  });

  it('deactivates previous tool when switching', () => {
    const log = [];
    const toolA = {
      activate() { log.push('a-activate'); },
      deactivate() { log.push('a-deactivate'); },
    };
    const toolB = {
      activate() { log.push('b-activate'); },
      deactivate() { log.push('b-deactivate'); },
    };
    const tm = new ToolManager({ a: toolA, b: toolB });
    tm.setActive('a');
    tm.setActive('b');
    assert.deepEqual(log, ['a-activate', 'a-deactivate', 'b-activate']);
  });

  it('returns active tool name', () => {
    const tool = { activate() {}, deactivate() {} };
    const tm = new ToolManager({ select: tool });
    tm.setActive('select');
    assert.equal(tm.activeName, 'select');
  });
});
```

- [ ] **Step 2: Run test, verify fails**

- [ ] **Step 3: Write implementation**

```javascript
// studio/tools/toolManager.js
export class ToolManager {
  constructor(tools) {
    this._tools = tools;
    this._active = null;
    this._activeName = null;
  }

  get activeName() { return this._activeName; }

  setActive(name) {
    if (this._active) this._active.deactivate();
    this._active = this._tools[name] || null;
    this._activeName = name;
    if (this._active) this._active.activate();
  }
}
```

- [ ] **Step 4: Run test, verify passes**

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add studio/tools/toolManager.js tests/studio/toolManager.test.js && git commit -m "feat(studio): add ToolManager for tool lifecycle"
```

---

## Chunk 3: Placement Tools (Select, Marker, Arc, Path, Region, Freehand Draw)

### Task 10: Select Tool

**Files:**
- Create: `studio/tools/selectTool.js`
- Test: `tests/studio/selectTool.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/selectTool.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SelectTool } from '../../studio/tools/selectTool.js';

describe('SelectTool', () => {
  it('calls onSelect with hit entity on click', () => {
    let selected = null;
    const fakeController = {
      hitTest: (x, y) => ({ kind: 'marker', id: 'm1' }),
      screenToLatLon: () => ({ lat: 0, lon: 0 }),
    };
    const tool = new SelectTool({
      controller: fakeController,
      onSelect: (entity) => { selected = entity; },
      onDeselect: () => {},
      onMove: () => {},
    });
    tool.handleClick({ clientX: 100, clientY: 100 });
    assert.deepEqual(selected, { kind: 'marker', id: 'm1' });
  });

  it('calls onDeselect when clicking empty space', () => {
    let deselected = false;
    const fakeController = {
      hitTest: () => null,
      screenToLatLon: () => ({ lat: 0, lon: 0 }),
    };
    const tool = new SelectTool({
      controller: fakeController,
      onSelect: () => {},
      onDeselect: () => { deselected = true; },
      onMove: () => {},
    });
    tool.handleClick({ clientX: 100, clientY: 100 });
    assert.equal(deselected, true);
  });
});
```

- [ ] **Step 2: Run test, verify fails**

- [ ] **Step 3: Write implementation**

```javascript
// studio/tools/selectTool.js
export class SelectTool {
  constructor({ controller, onSelect, onDeselect, onMove }) {
    this._controller = controller;
    this._onSelect = onSelect;
    this._onDeselect = onDeselect;
    this._onMove = onMove;
    this._dragging = false;
    this._dragEntityId = null;
    this._handleClick = this.handleClick.bind(this);
    this._handleMouseDown = this._onMouseDown.bind(this);
    this._handleMouseMove = this._onMouseMove.bind(this);
    this._handleMouseUp = this._onMouseUp.bind(this);
  }

  activate() {
    // Bind to viewport in app.js; tool exposes handlers
  }

  deactivate() {
    this._dragging = false;
    this._dragEntityId = null;
  }

  handleClick(event) {
    const hit = this._controller.hitTest(event.clientX, event.clientY);
    if (hit) {
      this._onSelect(hit);
    } else {
      this._onDeselect();
    }
  }

  _onMouseDown(event) {
    const hit = this._controller.hitTest(event.clientX, event.clientY);
    if (hit && hit.kind === 'marker') {
      this._dragging = true;
      this._dragEntityId = hit.id;
    }
  }

  _onMouseMove(event) {
    if (!this._dragging) return;
    const latLon = this._controller.screenToLatLon(event.clientX, event.clientY);
    if (latLon) {
      this._onMove(this._dragEntityId, latLon);
    }
  }

  _onMouseUp() {
    this._dragging = false;
    this._dragEntityId = null;
  }
}
```

- [ ] **Step 4: Run test, verify passes**

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add studio/tools/selectTool.js tests/studio/selectTool.test.js && git commit -m "feat(studio): add SelectTool with click-to-select and drag-to-move"
```

---

### Task 11: Marker Tool

**Files:**
- Create: `studio/tools/markerTool.js`
- Test: `tests/studio/markerTool.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/markerTool.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MarkerTool } from '../../studio/tools/markerTool.js';

describe('MarkerTool', () => {
  it('creates a marker at clicked position', () => {
    let created = null;
    const fakeController = {
      screenToLatLon: () => ({ lat: 47.3769, lon: 8.5417 }),
    };
    const tool = new MarkerTool({
      controller: fakeController,
      onPlace: (marker) => { created = marker; },
    });
    tool.handleClick({ clientX: 200, clientY: 200 });
    assert.ok(created);
    assert.equal(created.lat, 47.3769);
    assert.equal(created.lon, 8.5417);
    assert.ok(created.id, 'should have generated id');
  });

  it('does nothing when click misses the globe', () => {
    let created = null;
    const fakeController = {
      screenToLatLon: () => null,
    };
    const tool = new MarkerTool({
      controller: fakeController,
      onPlace: (marker) => { created = marker; },
    });
    tool.handleClick({ clientX: 0, clientY: 0 });
    assert.equal(created, null);
  });
});
```

- [ ] **Step 2: Run test, verify fails**

- [ ] **Step 3: Write implementation**

```javascript
// studio/tools/markerTool.js
let counter = 0;

export class MarkerTool {
  constructor({ controller, onPlace }) {
    this._controller = controller;
    this._onPlace = onPlace;
  }

  activate() {}
  deactivate() {}

  handleClick(event) {
    const latLon = this._controller.screenToLatLon(event.clientX, event.clientY);
    if (!latLon) return;
    counter++;
    this._onPlace({
      id: `marker-${Date.now()}-${counter}`,
      name: { en: `Marker ${counter}` },
      lat: latLon.lat,
      lon: latLon.lon,
      alt: 0,
      color: '#ff6b6b',
      visualType: 'dot',
      calloutMode: 'hover',
      calloutLabel: { en: `Marker ${counter}` },
    });
  }
}
```

- [ ] **Step 4: Run test, verify passes**

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add studio/tools/markerTool.js tests/studio/markerTool.test.js && git commit -m "feat(studio): add MarkerTool for click-to-place markers"
```

---

### Task 12: Arc Tool

**Files:**
- Create: `studio/tools/arcTool.js`
- Test: `tests/studio/arcTool.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/arcTool.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ArcTool } from '../../studio/tools/arcTool.js';

describe('ArcTool', () => {
  it('creates arc after two clicks', () => {
    let created = null;
    let clickNum = 0;
    const fakeController = {
      screenToLatLon: () => {
        clickNum++;
        return clickNum === 1
          ? { lat: 52.52, lon: 13.405 }  // Berlin
          : { lat: 35.676, lon: 139.65 }; // Tokyo
      },
    };
    const tool = new ArcTool({
      controller: fakeController,
      onPlace: (arc) => { created = arc; },
    });
    tool.handleClick({ clientX: 100, clientY: 100 }); // first click
    assert.equal(created, null); // not yet
    tool.handleClick({ clientX: 200, clientY: 200 }); // second click
    assert.ok(created);
    assert.equal(created.start.lat, 52.52);
    assert.equal(created.end.lat, 35.676);
  });

  it('resets state on deactivate', () => {
    const fakeController = {
      screenToLatLon: () => ({ lat: 0, lon: 0 }),
    };
    const tool = new ArcTool({
      controller: fakeController,
      onPlace: () => {},
    });
    tool.handleClick({ clientX: 100, clientY: 100 }); // first click
    tool.deactivate();
    // After reactivate, should need two fresh clicks
    tool.activate();
    let created = null;
    tool._onPlace = (arc) => { created = arc; };
    tool.handleClick({ clientX: 100, clientY: 100 }); // first click again
    assert.equal(created, null);
  });
});
```

- [ ] **Step 2–5: Implement, test, commit**

Implementation: Two-click state machine. First click stores `start`, second click creates arc and resets.

```bash
git restore --staged :/ && git add studio/tools/arcTool.js tests/studio/arcTool.test.js && git commit -m "feat(studio): add ArcTool for two-click arc placement"
```

---

### Task 13: Path Tool

**Files:**
- Create: `studio/tools/pathTool.js`
- Test: `tests/studio/pathTool.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/pathTool.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PathTool } from '../../studio/tools/pathTool.js';

describe('PathTool', () => {
  it('creates path after multiple clicks + finish', () => {
    let created = null;
    let clickCount = 0;
    const points = [
      { lat: 0, lon: 0 },
      { lat: 10, lon: 10 },
      { lat: 20, lon: 20 },
    ];
    const fakeController = {
      screenToLatLon: () => points[clickCount++],
    };
    const tool = new PathTool({
      controller: fakeController,
      onPlace: (path) => { created = path; },
    });
    tool.handleClick({ clientX: 0, clientY: 0 });
    tool.handleClick({ clientX: 0, clientY: 0 });
    tool.handleClick({ clientX: 0, clientY: 0 });
    tool.finish(); // Enter key or double-click
    assert.ok(created);
    assert.equal(created.points.length, 3);
  });

  it('ignores finish with fewer than 2 points', () => {
    let created = null;
    const fakeController = {
      screenToLatLon: () => ({ lat: 0, lon: 0 }),
    };
    const tool = new PathTool({
      controller: fakeController,
      onPlace: (path) => { created = path; },
    });
    tool.handleClick({ clientX: 0, clientY: 0 });
    tool.finish();
    assert.equal(created, null);
  });
});
```

- [ ] **Step 2–5: Implement, test, commit**

```bash
git restore --staged :/ && git add studio/tools/pathTool.js tests/studio/pathTool.test.js && git commit -m "feat(studio): add PathTool for multi-click path placement"
```

---

### Task 14: Region Tool

**Files:**
- Create: `studio/tools/regionTool.js`
- Test: `tests/studio/regionTool.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/regionTool.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RegionTool } from '../../studio/tools/regionTool.js';

describe('RegionTool', () => {
  it('creates GeoJSON polygon with lon/lat ordering', () => {
    let created = null;
    let clickCount = 0;
    const points = [
      { lat: 10, lon: 20 },
      { lat: 30, lon: 40 },
      { lat: 50, lon: 60 },
    ];
    const fakeController = {
      screenToLatLon: () => points[clickCount++],
    };
    const tool = new RegionTool({
      controller: fakeController,
      onPlace: (region) => { created = region; },
    });
    tool.handleClick({});
    tool.handleClick({});
    tool.handleClick({});
    tool.finish(); // double-click to close
    assert.ok(created);
    const coords = created.geojson.coordinates[0];
    // GeoJSON uses [lon, lat]
    assert.deepEqual(coords[0], [20, 10]);
    assert.deepEqual(coords[1], [40, 30]);
    assert.deepEqual(coords[2], [60, 50]);
    // Ring is closed (first point duplicated at end)
    assert.deepEqual(coords[3], [20, 10]);
  });

  it('requires at least 3 points', () => {
    let created = null;
    let clickCount = 0;
    const fakeController = {
      screenToLatLon: () => ({ lat: clickCount, lon: clickCount++ }),
    };
    const tool = new RegionTool({
      controller: fakeController,
      onPlace: (r) => { created = r; },
    });
    tool.handleClick({});
    tool.handleClick({});
    tool.finish();
    assert.equal(created, null);
  });
});
```

- [ ] **Step 2–5: Implement, test, commit**

```bash
git restore --staged :/ && git add studio/tools/regionTool.js tests/studio/regionTool.test.js && git commit -m "feat(studio): add RegionTool with GeoJSON polygon creation"
```

---

### Task 15: Freehand Draw Tool

**Files:**
- Create: `studio/tools/drawTool.js`
- Test: `tests/studio/drawTool.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/drawTool.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DrawTool, simplifyRDP } from '../../studio/tools/drawTool.js';

describe('simplifyRDP', () => {
  it('removes collinear points', () => {
    const points = [
      { lat: 0, lon: 0 },
      { lat: 1, lon: 1 },
      { lat: 2, lon: 2 },
      { lat: 3, lon: 3 },
    ];
    const result = simplifyRDP(points, 0.1);
    assert.equal(result.length, 2); // just start and end
    assert.deepEqual(result[0], { lat: 0, lon: 0 });
    assert.deepEqual(result[1], { lat: 3, lon: 3 });
  });

  it('preserves sharp turns', () => {
    const points = [
      { lat: 0, lon: 0 },
      { lat: 5, lon: 0 },
      { lat: 5, lon: 5 },
    ];
    const result = simplifyRDP(points, 0.1);
    assert.equal(result.length, 3); // all preserved
  });

  it('returns input for 2 or fewer points', () => {
    const points = [{ lat: 0, lon: 0 }];
    assert.deepEqual(simplifyRDP(points, 0.1), points);
  });
});

describe('DrawTool', () => {
  it('collects points during drag and creates path on finish', () => {
    let created = null;
    let moveCount = 0;
    const positions = [
      { lat: 0, lon: 0 },
      { lat: 1, lon: 0 },
      { lat: 2, lon: 0 },
      { lat: 3, lon: 5 }, // sharp turn
      { lat: 4, lon: 5 },
    ];
    const fakeController = {
      screenToLatLon: () => positions[moveCount++],
    };
    const tool = new DrawTool({
      controller: fakeController,
      onPlace: (path) => { created = path; },
    });
    tool.handleMouseDown({ clientX: 0, clientY: 0 });
    for (let i = 1; i < positions.length; i++) {
      tool.handleMouseMove({ clientX: i, clientY: i });
    }
    tool.handleMouseUp({});
    assert.ok(created);
    assert.ok(created.points.length >= 2, 'should have simplified points');
    assert.ok(created.points.length <= positions.length);
  });
});
```

- [ ] **Step 2–5: Implement, test, commit**

Implementation includes exported `simplifyRDP(points, epsilon)` function using Ramer-Douglas-Peucker.

```bash
git restore --staged :/ && git add studio/tools/drawTool.js tests/studio/drawTool.test.js && git commit -m "feat(studio): add DrawTool with freehand drawing and RDP simplification"
```

---

## Chunk 4: Properties Panel

### Task 16: Properties Panel Component

**Files:**
- Create: `studio/components/propertiesPanel.js`
- Test: `tests/studio/propertiesPanel.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/propertiesPanel.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let PropertiesPanel;
beforeEach(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="props"></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  ({ PropertiesPanel } = await import('../../studio/components/propertiesPanel.js'));
});

describe('PropertiesPanel', () => {
  it('shows scene settings when nothing selected', () => {
    const el = document.getElementById('props');
    const panel = new PropertiesPanel(el, {
      scene: { theme: 'photo', planet: { id: 'earth' }, projection: 'globe', locale: 'en' },
      selectedIds: [],
      locale: 'en',
      onChange: () => {},
    });
    panel.render();
    assert.ok(el.textContent.includes('Theme') || el.querySelector('[data-field="theme"]'));
  });

  it('shows marker fields when marker selected', () => {
    const el = document.getElementById('props');
    const panel = new PropertiesPanel(el, {
      scene: {
        markers: [{ id: 'm1', name: { en: 'Berlin' }, lat: 52.52, lon: 13.405, color: '#ff0000' }],
      },
      selectedIds: ['m1'],
      locale: 'en',
      onChange: () => {},
    });
    panel.render();
    const nameInput = el.querySelector('[data-field="name"]');
    assert.ok(nameInput);
  });

  it('fires onChange when field is edited', () => {
    const el = document.getElementById('props');
    let change = null;
    const panel = new PropertiesPanel(el, {
      scene: {
        markers: [{ id: 'm1', name: { en: 'Berlin' }, lat: 52.52, lon: 13.405, color: '#ff0000' }],
      },
      selectedIds: ['m1'],
      locale: 'en',
      onChange: (entityType, id, field, value) => { change = { entityType, id, field, value }; },
    });
    panel.render();
    const nameInput = el.querySelector('[data-field="name"]');
    nameInput.value = 'Munich';
    nameInput.dispatchEvent(new dom.window.Event('change'));
    assert.ok(change);
    assert.equal(change.field, 'name');
    assert.equal(change.value, 'Munich');
  });
});
```

Note: The `dom` variable reference in the last test needs adjustment — the implementer should ensure the JSDOM instance is accessible. The test pattern demonstrates the expected behavior.

- [ ] **Step 2–5: Implement, test, commit**

Implementation:
- `render()` checks `selectedIds` — if empty, show scene settings; otherwise find entity in scene and show its fields
- Primary fields rendered ungrouped; collapsible sections for Appearance, Metadata, Animation
- Text fields for localized text read/write only the current locale
- Shows locale badge next to text inputs
- `onChange(entityType, id, field, value)` callback for edits
- Collapsible sections use `.collapsed` CSS class toggle

```bash
git restore --staged :/ && git add studio/components/propertiesPanel.js tests/studio/propertiesPanel.test.js && git commit -m "feat(studio): add PropertiesPanel component"
```

---

## Chunk 5: Timeline

### Task 17: Timeline Component

**Files:**
- Create: `studio/components/timeline.js`
- Test: `tests/studio/timeline.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/studio/timeline.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let Timeline;
beforeEach(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="tl"></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  ({ Timeline } = await import('../../studio/components/timeline.js'));
});

describe('Timeline', () => {
  it('renders element rows', () => {
    const el = document.getElementById('tl');
    const tl = new Timeline(el, {
      scene: {
        markers: [{ id: 'm1', name: { en: 'Berlin' }, color: '#ff0000' }],
        arcs: [{ id: 'a1', name: { en: 'Arc' }, color: '#0000ff' }],
        paths: [],
        regions: [],
        animations: [],
        cameraAnimation: [],
      },
      locale: 'en',
      playheadMs: 0,
      onPlayheadChange: () => {},
      onVisibilityChange: () => {},
      onTransport: () => {},
    });
    tl.render();
    const rows = el.querySelectorAll('.tl-row');
    // m1, a1, camera = 3 rows (plus ruler spacer)
    assert.ok(rows.length >= 3);
  });

  it('renders transport controls', () => {
    const el = document.getElementById('tl');
    const tl = new Timeline(el, {
      scene: { markers: [], arcs: [], paths: [], regions: [], animations: [], cameraAnimation: [] },
      locale: 'en',
      playheadMs: 0,
      onPlayheadChange: () => {},
      onVisibilityChange: () => {},
      onTransport: () => {},
    });
    tl.render();
    const playBtn = el.querySelector('[data-action="play"]');
    assert.ok(playBtn);
  });

  it('fires transport action on button click', () => {
    const el = document.getElementById('tl');
    let action = null;
    const tl = new Timeline(el, {
      scene: { markers: [], arcs: [], paths: [], regions: [], animations: [], cameraAnimation: [] },
      locale: 'en',
      playheadMs: 0,
      onPlayheadChange: () => {},
      onVisibilityChange: () => {},
      onTransport: (a) => { action = a; },
    });
    tl.render();
    const playBtn = el.querySelector('[data-action="play"]');
    playBtn.click();
    assert.equal(action, 'play');
  });
});
```

- [ ] **Step 2–5: Implement, test, commit**

Implementation covers:
- Transport bar with play/pause/skip/loop/add-keyframe/easing buttons
- Track labels (left column) with eye toggle and color dot per entity
- Track area (right) with visibility bars and keyframe diamonds
- Playhead rendering and drag-to-scrub
- Ruler with time markings
- Camera track row
- Zoom level control

```bash
git restore --staged :/ && git add studio/components/timeline.js tests/studio/timeline.test.js && git commit -m "feat(studio): add Timeline component with tracks and transport"
```

---

### Task 18: Easing Editor Component

**Files:**
- Create: `studio/components/easingEditor.js`

- [ ] **Step 1–5: Implement and commit**

A popup component that:
- Shows preset buttons: linear, ease-in, ease-out, ease-in-out, bounce, elastic
- Shows a canvas-drawn bezier curve preview
- Custom bezier with draggable control points
- Calls `onSelect(easingName)` when a preset or custom curve is chosen

```bash
git restore --staged :/ && git add studio/components/easingEditor.js && git commit -m "feat(studio): add EasingEditor popup component"
```

---

## Chunk 6: Preview Mode and App Bootstrap

### Task 19: Preview Mode Component

**Files:**
- Create: `studio/components/previewMode.js`

- [ ] **Step 1–5: Implement and commit**

- `enter()` — hides menu-bar, tool-strip, properties, timeline; adds `.preview` class to viewport; starts animation from 0 or playhead
- `exit()` — restores all panels, stops animation
- Listens for Space and Escape keys to exit

```bash
git restore --staged :/ && git add studio/components/previewMode.js && git commit -m "feat(studio): add PreviewMode component"
```

---

### Task 20: App Bootstrap (Wiring Everything Together)

**Files:**
- Create: `studio/app.js`

- [ ] **Step 1: Implement `app.js`**

This is the main orchestrator. It:
1. Imports all components and state modules
2. Reads scene from sessionStorage (via `readScene()`) or creates empty scene
3. Creates `<globi-viewer>` and calls `setScene()`
4. Creates `EditorStore` and `UndoRedo`
5. Creates `MenuBar`, `ToolStrip`, `PropertiesPanel`, `Timeline`, `PreviewMode`
6. Creates all tools (`SelectTool`, `MarkerTool`, etc.) and `ToolManager`
7. Wires events:
   - ToolStrip click → EditorStore dispatch → ToolManager setActive
   - Viewport click → active tool handleClick
   - Tool onPlace → SceneStore upsertMarker/Arc/Path/Region → push undo snapshot
   - Tool onSelect → EditorStore dispatch select → PropertiesPanel render
   - PropertiesPanel onChange → SceneStore upsert → push undo
   - MenuBar actions → corresponding handlers (file ops, undo/redo, panel toggles, preview)
   - Timeline transport → playback control (requestAnimationFrame loop)
   - EditorStore change → update UI (tool strip active state, panel visibility)
8. Keyboard shortcuts (global keydown listener, matches shortcut table from spec)

- [ ] **Step 2: Verify in browser**

Run: `python3 -m http.server 4173`
Open: `http://localhost:4173/studio/`
Expected: Full Studio UI loads with:
- Menu bar with working dropdowns
- Tool strip with tool switching
- Globe in viewport (empty scene or loaded from sessionStorage)
- Properties panel showing scene settings
- Timeline at bottom

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add studio/app.js && git commit -m "feat(studio): add app.js bootstrapper wiring all components"
```

---

### Task 21: Build Configuration

**Files:**
- Modify: `tools/build.mjs`

- [ ] **Step 1: Add studio entry point to esbuild config**

Add a new entry for Studio:
```javascript
{ name: 'studio', entry: 'studio/app.js', outfile: 'dist/studio.js' }
```

- [ ] **Step 2: Run build**

Run: `node tools/build.mjs`
Expected: `dist/studio.js` and `dist/studio.min.js` are produced

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add tools/build.mjs && git commit -m "build: add studio entry point to esbuild config"
```

---

## Chunk 9: AI Companion Prompts

### Task 30: CustomGPT Prompt

**Files:**
- Create: `docs/ai-companions/globi-custom-gpt-prompt.md`

- [ ] **Step 1: Write the CustomGPT system prompt**

The prompt should include:
- What Globi is (interactive 3D globe web component)
- The full scene schema (version 1) with all fields for markers, arcs, paths, regions, animations, filters, dataSources, viewerUi, cameraAnimation, visibility
- Supported values for all enums (themes, projections, visualTypes, calloutModes, planets, easing functions)
- Instructions to guide users through scene creation conversationally
- Examples of valid scene JSON (minimal and complex)
- Instructions to output JSON that can be pasted into Studio via File > New from Clipboard
- Best practices (color contrast, callout modes, category grouping)
- Link to globi.world for reference

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add docs/ai-companions/globi-custom-gpt-prompt.md && git commit -m "docs: add CustomGPT system prompt for Globi scene generation"
```

---

### Task 31: Claude Cowork Prompt

**Files:**
- Create: `docs/ai-companions/globi-claude-cowork-prompt.md`

- [ ] **Step 1: Write the Claude system prompt**

Same content as the CustomGPT prompt, adapted for Claude's conversation style. Include:
- System prompt formatted for Claude Projects or API usage
- Same schema reference and examples
- Instructions for both generating new scenes and modifying existing ones

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add docs/ai-companions/globi-claude-cowork-prompt.md && git commit -m "docs: add Claude Cowork system prompt for Globi scene generation"
```

---

## Chunk 8: Missing Viewport Features (Selection, Cursors, Motion Paths)

### Task 22: Session Transfer Gzip Compression

**Files:**
- Modify: `studio/state/sessionTransfer.js`
- Modify: `tests/studio/sessionTransfer.test.js`

- [ ] **Step 1: Add compression test**

```javascript
// Add to tests/studio/sessionTransfer.test.js
it('compresses scenes larger than 4 MB', async () => {
  // Create a scene with a large string to exceed 4 MB
  const bigScene = { version: 1, markers: [], _pad: 'x'.repeat(5 * 1024 * 1024) };
  writeScene(bigScene);
  const raw = sessionStorage.getItem(STORAGE_KEY);
  assert.ok(raw.startsWith('gzip:'), 'large scene should be gzip-compressed');
  const result = await readScene();
  assert.equal(result.version, 1);
});
```

Note: This test requires `CompressionStream`/`DecompressionStream` which are browser APIs. For Node tests, use a mock or skip with `{ skip: typeof CompressionStream === 'undefined' }`.

- [ ] **Step 2: Add compression to `writeScene()`**

```javascript
export function writeScene(scene) {
  const json = JSON.stringify(scene);
  if (json.length > 4 * 1024 * 1024 && typeof CompressionStream !== 'undefined') {
    const encoder = new TextEncoder();
    const stream = new Blob([encoder.encode(json)])
      .stream()
      .pipeThrough(new CompressionStream('gzip'));
    new Response(stream).arrayBuffer().then(buf => {
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      sessionStorage.setItem(STORAGE_KEY, 'gzip:' + b64);
    });
  } else {
    sessionStorage.setItem(STORAGE_KEY, json);
  }
}
```

Update `readScene()` to detect the `gzip:` prefix and decompress.

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add studio/state/sessionTransfer.js tests/studio/sessionTransfer.test.js && git commit -m "feat(studio): add gzip compression for large session transfers"
```

---

### Task 23: Cubic-Bezier Easing Support

**Files:**
- Modify: `src/animation/engine.js`
- Modify: `tests/animation/easing.test.js`

- [ ] **Step 1: Add cubic-bezier test**

```javascript
// Add to tests/animation/easing.test.js
it('supports cubic-bezier(x1,y1,x2,y2)', () => {
  const engine = new AnimationEngine();
  engine.register('e1', [
    { t: 0, value: { x: 0 }, easing: 'cubic-bezier(0.42,0,0.58,1)' },
    { t: 1000, value: { x: 100 } },
  ]);
  const v = engine.sample('e1', 500);
  // cubic-bezier(0.42,0,0.58,1) is CSS "ease-in-out" — should be near 50 at midpoint
  assert.ok(v.x > 40 && v.x < 60, `expected 40-60, got ${v.x}`);
});
```

- [ ] **Step 2: Implement cubic-bezier parser in engine.js**

Add to the easing lookup:
```javascript
function parseCubicBezier(str) {
  const m = str.match(/cubic-bezier\(([^)]+)\)/);
  if (!m) return null;
  const [x1, y1, x2, y2] = m[1].split(',').map(Number);
  return (t) => {
    // Newton-Raphson cubic bezier solver
    let guess = t;
    for (let i = 0; i < 8; i++) {
      const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
      const curveX = ((ax * guess + bx) * guess + cx) * guess;
      const dx = (3 * ax * guess + 2 * bx) * guess + cx;
      if (Math.abs(dx) < 1e-6) break;
      guess -= (curveX - t) / dx;
    }
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return ((ay * guess + by) * guess + cy) * guess;
  };
}
```

In the easing lookup, check for `cubic-bezier(` prefix and parse dynamically.

- [ ] **Step 3: Run tests, commit**

```bash
git restore --staged :/ && git add src/animation/engine.js tests/animation/easing.test.js && git commit -m "feat: add cubic-bezier easing support to AnimationEngine"
```

---

### Task 24: Selection Highlights and Cursor Feedback

**Files:**
- Modify: `studio/app.js` (or create `studio/viewport/selectionOverlay.js`)

- [ ] **Step 1: Add selection glow CSS**

In `studio/styles.css`, add viewport cursor rules:
```css
.viewport.tool-select { cursor: default; }
.viewport.tool-marker,
.viewport.tool-arc,
.viewport.tool-path,
.viewport.tool-region { cursor: crosshair; }
.viewport.tool-draw { cursor: url('data:image/svg+xml,...'), crosshair; }
```

- [ ] **Step 2: Wire cursor changes in app.js**

When EditorStore emits tool change, update viewport element's class:
```javascript
editorStore.on('change', (state) => {
  viewport.className = `viewport tool-${state.activeTool}`;
});
```

- [ ] **Step 3: Add selection highlight to renderer**

When an entity is selected, use the existing marker/arc/path/region manager to apply a visual highlight. This can be done by:
- For markers: adding a larger semi-transparent ring behind the selected marker
- For arcs/paths: increasing stroke width or adding a glow via a second line
- For regions: adjusting opacity or adding an outline

The implementer should use `GlobeController` APIs to read the selected entity and apply the highlight effect on each render frame.

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add studio/styles.css studio/app.js && git commit -m "feat(studio): add cursor feedback and selection highlights"
```

---

### Task 25: Motion Paths Visualization

**Files:**
- Create: `studio/viewport/motionPath.js`

- [ ] **Step 1: Implement motion path rendering**

When a marker with movement keyframes is selected:
1. Read its keyframes from `scene.animations` (filter by `entityId`)
2. Generate a series of lat/lon points by sampling the animation at regular intervals
3. Render a dotted path on the globe using the existing `arcPathManager` or a dedicated thin line
4. Show small diamond handles at each keyframe position
5. Handles are draggable — dragging updates the keyframe's lat/lon value

- [ ] **Step 2: Wire into app.js**

On selection change, if the selected entity has animations, call `motionPath.show(keyframes)`. On deselect, call `motionPath.hide()`.

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add studio/viewport/motionPath.js studio/app.js && git commit -m "feat(studio): add motion path visualization for animated markers"
```

---

### Task 26: Region Vertex Editing

**Files:**
- Modify: `studio/tools/selectTool.js`

- [ ] **Step 1: Add point-editing mode test**

```javascript
// Add to tests/studio/selectTool.test.js
it('enters point-editing mode on double-click of region', () => {
  let mode = null;
  const fakeController = {
    hitTest: () => ({ kind: 'region', id: 'r1' }),
    screenToLatLon: () => ({ lat: 0, lon: 0 }),
  };
  const tool = new SelectTool({
    controller: fakeController,
    onSelect: () => {},
    onDeselect: () => {},
    onMove: () => {},
    onPointEditMode: (entityId) => { mode = entityId; },
  });
  tool.handleDoubleClick({ clientX: 100, clientY: 100 });
  assert.equal(mode, 'r1');
});
```

- [ ] **Step 2: Implement double-click → point editing**

In `SelectTool`, add `handleDoubleClick`. If the hit entity is a region, call `onPointEditMode(entity.id)`. The app.js handler shows draggable vertex handles on the globe at each polygon coordinate. Dragging a handle updates the region's GeoJSON coordinates.

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add studio/tools/selectTool.js tests/studio/selectTool.test.js && git commit -m "feat(studio): add region vertex editing via double-click"
```

---

### Task 27: Draw Tool Point-to-Point Mode Toggle

**Files:**
- Modify: `studio/tools/drawTool.js`
- Modify: `tests/studio/drawTool.test.js`

- [ ] **Step 1: Add toggle test**

```javascript
// Add to tests/studio/drawTool.test.js
describe('DrawTool point-to-point mode', () => {
  it('toggles between freehand and point-to-point', () => {
    const fakeController = { screenToLatLon: () => ({ lat: 0, lon: 0 }) };
    const tool = new DrawTool({ controller: fakeController, onPlace: () => {} });
    assert.equal(tool.mode, 'freehand');
    tool.toggleMode();
    assert.equal(tool.mode, 'point-to-point');
    tool.toggleMode();
    assert.equal(tool.mode, 'freehand');
  });

  it('in point-to-point mode, clicks add waypoints like PathTool', () => {
    let created = null;
    let count = 0;
    const pts = [{ lat: 0, lon: 0 }, { lat: 10, lon: 10 }, { lat: 20, lon: 20 }];
    const fakeController = { screenToLatLon: () => pts[count++] };
    const tool = new DrawTool({ controller: fakeController, onPlace: (p) => { created = p; } });
    tool.toggleMode(); // switch to point-to-point
    tool.handleClick({});
    tool.handleClick({});
    tool.handleClick({});
    tool.finish();
    assert.ok(created);
    assert.equal(created.points.length, 3);
  });
});
```

- [ ] **Step 2: Add `toggleMode()` and `mode` property to DrawTool**

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add studio/tools/drawTool.js tests/studio/drawTool.test.js && git commit -m "feat(studio): add point-to-point mode toggle to DrawTool"
```

---

### Task 28: Easing Editor and Preview Mode Tests

**Files:**
- Create: `tests/studio/easingEditor.test.js`
- Create: `tests/studio/previewMode.test.js`

- [ ] **Step 1: Write EasingEditor test**

```javascript
// tests/studio/easingEditor.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let EasingEditor;
beforeEach(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="ee"></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  ({ EasingEditor } = await import('../../studio/components/easingEditor.js'));
});

describe('EasingEditor', () => {
  it('renders preset buttons', () => {
    const el = document.getElementById('ee');
    const ee = new EasingEditor(el, { onSelect: () => {} });
    ee.show();
    const presets = el.querySelectorAll('[data-easing]');
    assert.ok(presets.length >= 6, 'should have linear, ease-in, ease-out, ease-in-out, bounce, elastic');
  });

  it('fires onSelect when preset clicked', () => {
    const el = document.getElementById('ee');
    let selected = null;
    const ee = new EasingEditor(el, { onSelect: (e) => { selected = e; } });
    ee.show();
    el.querySelector('[data-easing="ease-in"]').click();
    assert.equal(selected, 'ease-in');
  });
});
```

- [ ] **Step 2: Write PreviewMode test**

```javascript
// tests/studio/previewMode.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let PreviewMode;
beforeEach(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="studio" class="studio"><div id="menu-bar" class="menu-bar"></div><div class="main"><div id="tool-strip" class="tool-strip"></div><div id="viewport" class="viewport"></div><div id="properties" class="properties"></div></div><div id="timeline" class="timeline"></div></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  ({ PreviewMode } = await import('../../studio/components/previewMode.js'));
});

describe('PreviewMode', () => {
  it('hides editor panels on enter', () => {
    const pm = new PreviewMode({
      studioEl: document.getElementById('studio'),
      onEnter: () => {},
      onExit: () => {},
    });
    pm.enter();
    assert.ok(document.getElementById('studio').classList.contains('preview'));
  });

  it('restores panels on exit', () => {
    const pm = new PreviewMode({
      studioEl: document.getElementById('studio'),
      onEnter: () => {},
      onExit: () => {},
    });
    pm.enter();
    pm.exit();
    assert.ok(!document.getElementById('studio').classList.contains('preview'));
  });
});
```

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add tests/studio/easingEditor.test.js tests/studio/previewMode.test.js && git commit -m "test(studio): add tests for EasingEditor and PreviewMode"
```

---

### Task 29: Timeline Interaction Tests (Visibility Bars, Keyframe Drag, Playhead)

**Files:**
- Modify: `tests/studio/timeline.test.js`

- [ ] **Step 1: Add interaction tests**

```javascript
// Add to tests/studio/timeline.test.js
it('renders visibility bars for elements with visibility intervals', () => {
  const el = document.getElementById('tl');
  const tl = new Timeline(el, {
    scene: {
      markers: [{ id: 'm1', name: { en: 'A' }, color: '#f00', visibility: [{ from: 0, to: 5000 }] }],
      arcs: [], paths: [], regions: [],
      animations: [],
      cameraAnimation: [],
    },
    locale: 'en',
    playheadMs: 0,
    onPlayheadChange: () => {},
    onVisibilityChange: () => {},
    onTransport: () => {},
  });
  tl.render();
  const bars = el.querySelectorAll('.tl-bar');
  assert.ok(bars.length >= 1);
});

it('renders keyframe diamonds for animated entities', () => {
  const el = document.getElementById('tl');
  const tl = new Timeline(el, {
    scene: {
      markers: [{ id: 'm1', name: { en: 'A' }, color: '#f00' }],
      arcs: [], paths: [], regions: [],
      animations: [{ entityId: 'm1', keyframes: [
        { t: 0, value: { lat: 0, lon: 0 } },
        { t: 5000, value: { lat: 10, lon: 10 } },
      ]}],
      cameraAnimation: [],
    },
    locale: 'en',
    playheadMs: 0,
    onPlayheadChange: () => {},
    onVisibilityChange: () => {},
    onTransport: () => {},
  });
  tl.render();
  const diamonds = el.querySelectorAll('.tl-keyframe');
  assert.ok(diamonds.length >= 2);
});

it('fires onPlayheadChange when playhead is dragged', () => {
  const el = document.getElementById('tl');
  let newMs = null;
  const tl = new Timeline(el, {
    scene: { markers: [], arcs: [], paths: [], regions: [], animations: [], cameraAnimation: [] },
    locale: 'en',
    playheadMs: 0,
    onPlayheadChange: (ms) => { newMs = ms; },
    onVisibilityChange: () => {},
    onTransport: () => {},
  });
  tl.render();
  // Simulate playhead scrub
  tl.setPlayhead(3500);
  assert.equal(newMs, 3500);
});
```

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add tests/studio/timeline.test.js && git commit -m "test(studio): add timeline interaction tests"
```

---

## Chunk 10: Integration Testing and Polish

### Task 32: End-to-End Integration Test

- [ ] **Step 1: Run all unit tests**

Run: `node --test`
Expected: All tests pass

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: All bundles produced successfully, including `dist/studio.js`

- [ ] **Step 4: Manual browser test**

Open `http://localhost:4173/studio/` and verify:
- [ ] Menu bar renders with all menus and preview button
- [ ] Tool strip shows all tools, clicking switches active tool
- [ ] Globe renders in viewport
- [ ] Clicking globe in Marker mode places a marker
- [ ] Selecting marker shows its properties in the panel
- [ ] Editing a property updates the globe live
- [ ] Undo/Redo works (Ctrl+Z / Ctrl+Shift+Z)
- [ ] Timeline shows element rows
- [ ] Preview mode hides editor UI, Space exits
- [ ] File > Save downloads JSON
- [ ] File > New from Clipboard loads pasted JSON
- [ ] Keyboard shortcuts work (V, M, A, L, R, D, P, T, H, F)

- [ ] **Step 5: Test context menu integration**

Open `http://localhost:4173/examples/all-capitals.html`
Right-click → "Open Studio"
Expected: Studio opens in new tab with all capitals loaded

- [ ] **Step 6: Commit any fixes**

---

### Task 33: Update FEATURES.md and RELEASE_NOTES.md

- [ ] **Step 1: Update FEATURES.md**

Add Studio checklist items under a new "## Studio (WYSIWYG Editor)" section.

- [ ] **Step 2: Update RELEASE_NOTES.md**

Add new version section documenting Studio features.

- [ ] **Step 3: Update docs if needed**

Check if `docs/QUICK_START_CONTENT_CREATORS.md` should mention Studio as the new recommended way to create scenes.

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add FEATURES.md RELEASE_NOTES.md docs/QUICK_START_CONTENT_CREATORS.md && git commit -m "docs: update features, release notes, and quick start for Studio"
```
