# Scene Graph Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scene graph tree panel to Globi Studio that lists all markers, arcs, paths, and regions with selection, visibility toggle, context menu, inline rename, and drag-to-reorder.

**Architecture:** A new `SceneGraph` component (`studio/components/sceneGraph.js`) follows the same pattern as `PropertiesPanel` — constructor receives a container + callbacks, `render(scene, selectedIds)` updates the DOM. The component can dock left (between tool strip and viewport) or right (top of properties panel). Hidden by default, auto-shows on globe selection.

**Tech Stack:** Vanilla JS (DOM API), CSS, node:test for testing.

**Spec:** `docs/superpowers/specs/2026-03-15-scene-graph-panel-design.md`

---

## Chunk 1: EditorStore + DOM Containers

### Task 1: Add new state fields to EditorStore

**Files:**
- Modify: `studio/state/editorStore.js`
- Test: `tests/studio/editorStore.test.js`

- [ ] **Step 1: Write failing tests for new state fields and actions**

```javascript
// Append to tests/studio/editorStore.test.js

it('has scene graph defaults', () => {
  const store = new EditorStore();
  const s = store.getState();
  assert.equal(s.sceneGraphDock, 'left');
  assert.equal(s.sceneGraphPinned, false);
  assert.equal(s.showHiddenObjects, false);
});

it('dispatches setSceneGraphDock', () => {
  const store = new EditorStore();
  store.dispatch({ type: 'setSceneGraphDock', dock: 'right' });
  assert.equal(store.getState().sceneGraphDock, 'right');
});

it('dispatches toggleSceneGraphPinned', () => {
  const store = new EditorStore();
  store.dispatch({ type: 'toggleSceneGraphPinned' });
  assert.equal(store.getState().sceneGraphPinned, true);
  store.dispatch({ type: 'toggleSceneGraphPinned' });
  assert.equal(store.getState().sceneGraphPinned, false);
});

it('dispatches toggleShowHiddenObjects', () => {
  const store = new EditorStore();
  store.dispatch({ type: 'toggleShowHiddenObjects' });
  assert.equal(store.getState().showHiddenObjects, true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/studio/editorStore.test.js`
Expected: 4 new tests FAIL (missing state fields and unrecognized actions)

- [ ] **Step 3: Implement new state fields and actions in EditorStore**

In `studio/state/editorStore.js`, add to DEFAULTS:
```javascript
sceneGraphDock: 'left',
sceneGraphPinned: false,
showHiddenObjects: false,
```

Add new cases in `dispatch()` switch (before `default`):
```javascript
case 'setSceneGraphDock':
  this._state.sceneGraphDock = action.dock;
  break;
case 'toggleSceneGraphPinned':
  this._state.sceneGraphPinned = !this._state.sceneGraphPinned;
  break;
case 'toggleShowHiddenObjects':
  this._state.showHiddenObjects = !this._state.showHiddenObjects;
  break;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/studio/editorStore.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/studio/editorStore.test.js studio/state/editorStore.js
git commit -m "feat(studio): add scene graph state fields to EditorStore"
```

### Task 2: Add DOM containers to index.html

**Files:**
- Modify: `studio/index.html`

- [ ] **Step 1: Add scene-graph-dock div between tool-strip and viewport**

In `studio/index.html`, inside `.main`, add `<div id="scene-graph-dock" class="scene-graph-dock"></div>` between `#tool-strip` and `#viewport`:

```html
<div class="main">
  <div id="tool-strip" class="tool-strip"></div>
  <div id="scene-graph-dock" class="scene-graph-dock"></div>
  <div id="viewport" class="viewport">
    <globi-viewer id="viewer"></globi-viewer>
  </div>
  <div id="properties" class="properties"></div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add studio/index.html
git commit -m "feat(studio): add scene graph dock container to HTML"
```

### Task 3: Add scene graph CSS

**Files:**
- Modify: `studio/styles.css`

- [ ] **Step 1: Add scene graph panel styles**

Add after the `/* Tool Strip */` section in `studio/styles.css`:

```css
/* Scene Graph */
.scene-graph-dock {
  width: 200px;
  margin-left: -200px;
  background: #111128;
  border-right: 1px solid #2a2a4a;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  transition: margin-left 0.2s ease;
}
.scene-graph-dock.open {
  margin-left: 0;
}
.scene-graph-dock.hidden { display: none; }

.sg-header {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #7a7aff;
  background: #0e0e22;
  border-bottom: 1px solid #2a2a4a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.sg-header-actions {
  display: flex;
  gap: 4px;
}
.sg-header-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
}
.sg-header-btn:hover { color: #7a7aff; background: #1a1a3a; }

.sg-tree {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.sg-group-header {
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #0e0e22;
  border-bottom: 1px solid #1a1a35;
  user-select: none;
}
.sg-group-header:hover { background: #151535; }
.sg-group-chevron { font-size: 8px; color: #555; transition: transform 0.15s; width: 10px; }
.sg-group-chevron.collapsed { transform: rotate(-90deg); }
.sg-group-icon { font-size: 13px; }
.sg-group-count { color: #555; margin-left: auto; font-size: 9px; }
.sg-group-eye {
  font-size: 11px;
  color: #444;
  cursor: pointer;
  margin-left: 4px;
}
.sg-group-eye:hover { color: #7a7aff; }

.sg-item {
  padding: 4px 10px 4px 26px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  border-left: 2px solid transparent;
  user-select: none;
}
.sg-item:hover { background: #151535; }
.sg-item.selected {
  background: rgba(122, 122, 255, 0.1);
  border-left-color: #7a7aff;
}
.sg-item.hidden-entity { opacity: 0.4; }
.sg-item-icon { font-size: 11px; flex-shrink: 0; }
.sg-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #bbb;
}
.sg-item.selected .sg-item-name { color: #ddd; }
.sg-item-eye {
  font-size: 10px;
  color: #444;
  cursor: pointer;
  opacity: 0;
  flex-shrink: 0;
}
.sg-item:hover .sg-item-eye,
.sg-item .sg-item-eye.force-show { opacity: 1; }
.sg-item-eye:hover { color: #7a7aff; }
.sg-item-eye.off { color: #ff4444; opacity: 1; }

.sg-item-rename {
  flex: 1;
  background: #1a1a35;
  border: 1px solid #7a7aff;
  border-radius: 3px;
  padding: 1px 4px;
  color: #ccc;
  font-size: 11px;
  font-family: inherit;
  outline: none;
}

.sg-drop-indicator {
  height: 2px;
  background: #7a7aff;
  margin: 0 10px 0 26px;
  border-radius: 1px;
  pointer-events: none;
}

/* Context Menu */
.sg-context-menu {
  position: fixed;
  background: #1a1a35;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  padding: 4px 0;
  min-width: 160px;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
.sg-context-item {
  padding: 6px 14px;
  cursor: pointer;
  font-size: 12px;
  color: #ccc;
}
.sg-context-item:hover { background: #252550; }
.sg-context-divider { border-top: 1px solid #2a2a4a; margin: 4px 0; }

/* Scene graph in properties panel (position B) */
.sg-in-properties {
  border-bottom: none;
  overflow-y: auto;
  flex-shrink: 0;
  min-height: 80px;
}
.sg-resize-handle {
  height: 4px;
  background: #2a2a4a;
  cursor: ns-resize;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sg-resize-handle::after {
  content: '';
  width: 20px;
  height: 2px;
  background: #444;
  border-radius: 1px;
}
.sg-resize-handle:hover { background: #7a7aff; }

/* Preview mode hides scene graph */
.studio.preview .scene-graph-dock { display: none; }
```

- [ ] **Step 2: Commit**

```bash
git add studio/styles.css
git commit -m "feat(studio): add scene graph CSS styles"
```

## Chunk 2: SceneGraph Component (Core)

### Task 4: Create SceneGraph component — tree rendering

**Files:**
- Create: `studio/components/sceneGraph.js`
- Test: `tests/studio/sceneGraph.test.js`

- [ ] **Step 1: Write failing tests for SceneGraph tree rendering**

Create `tests/studio/sceneGraph.test.js`:

```javascript
// tests/studio/sceneGraph.test.js
import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Set up JSDOM once before import (ES module cache means only first import matters)
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="sg"></div></body></html>');
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.window = dom.window;

// Import once after DOM is set up
const { SceneGraph } = await import('../../studio/components/sceneGraph.js');

const SAMPLE_SCENE = {
  locale: 'en',
  markers: [
    { id: 'm1', name: { en: 'Berlin' }, lat: 52.52, lon: 13.4, color: '#ff6b6b' },
    { id: 'm2', name: { en: 'Tokyo' }, lat: 35.68, lon: 139.69, color: '#ff6b6b' },
  ],
  arcs: [
    { id: 'a1', name: { en: 'Berlin to Tokyo' }, start: { lat: 52.52, lon: 13.4 }, end: { lat: 35.68, lon: 139.69 }, color: '#ffd000' },
  ],
  paths: [],
  regions: [
    { id: 'r1', name: { en: 'Europe' }, geojson: { type: 'Polygon', coordinates: [] }, capColor: '#4caf50' },
  ],
};

describe('SceneGraph', () => {
  beforeEach(() => {
    // Reset the container for each test
    const sg = document.getElementById('sg');
    while (sg.firstChild) sg.removeChild(sg.firstChild);
  });

  it('renders group headers for all four entity types', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, []);
    const headers = container.querySelectorAll('.sg-group-header');
    assert.equal(headers.length, 4);
  });

  it('renders entity items under correct groups', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, []);
    const items = container.querySelectorAll('.sg-item');
    // 2 markers + 1 arc + 0 paths + 1 region = 4
    assert.equal(items.length, 4);
  });

  it('shows entity count in group header', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, []);
    const headers = container.querySelectorAll('.sg-group-header');
    const markerHeader = headers[0];
    assert.ok(markerHeader.textContent.includes('2'));
  });

  it('marks selected items', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, ['m1']);
    const selected = container.querySelectorAll('.sg-item.selected');
    assert.equal(selected.length, 1);
  });

  it('displays localized entity names', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, []);
    const items = container.querySelectorAll('.sg-item-name');
    assert.equal(items[0].textContent, 'Berlin');
  });

  it('collapses group when header clicked', () => {
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(SAMPLE_SCENE, []);
    const header = container.querySelector('.sg-group-header');
    header.click();
    // Items under markers should be hidden
    const markerItems = container.querySelectorAll('[data-group="markers"] .sg-item');
    // After collapse, items are removed or hidden
    const chevron = header.querySelector('.sg-group-chevron');
    assert.ok(chevron.classList.contains('collapsed'));
  });

  it('dims entities with visible === false', () => {
    const sceneWithHidden = {
      ...SAMPLE_SCENE,
      markers: [
        { id: 'm1', name: { en: 'Berlin' }, visible: false, color: '#ff6b6b' },
      ],
    };
    const container = document.getElementById('sg');
    const sg = new SceneGraph(container, {});
    sg.render(sceneWithHidden, []);
    const item = container.querySelector('.sg-item');
    assert.ok(item.classList.contains('hidden-entity'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/studio/sceneGraph.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SceneGraph component core**

Create `studio/components/sceneGraph.js` with the following structure:

```javascript
// studio/components/sceneGraph.js

const ENTITY_GROUPS = [
  { key: 'markers', label: 'Markers', icon: '\u25C9', entityType: 'marker' },
  { key: 'arcs', label: 'Arcs', icon: '\u2312', entityType: 'arc' },
  { key: 'paths', label: 'Paths', icon: '\u223F', entityType: 'path' },
  { key: 'regions', label: 'Regions', icon: '\u2B21', entityType: 'region' },
];

function getEntityColor(entity, group) {
  if (group.key === 'regions') return entity.capColor || '#4caf50';
  return entity.color || '#ccc';
}

function getEntityName(entity, locale) {
  if (!entity.name) return entity.id;
  if (typeof entity.name === 'string') return entity.name;
  return entity.name[locale] || entity.name.en || entity.id;
}

export class SceneGraph {
  constructor(container, callbacks = {}) {
    this._container = container;
    this._cb = callbacks;
    this._scene = null;
    this._selectedIds = new Set();
    this._collapsed = new Set();
    this._autoHideTimer = null;
    this._isVisible = false;
    this._pinned = false;
    this._hovered = false;
    this._dock = 'left';
    this._root = document.createElement('div');
    this._root.className = 'sg-root';
    this._container.appendChild(this._root);
  }

  render(scene, selectedIds) {
    this._scene = scene;
    this._selectedIds = new Set(selectedIds);
    this._rebuild();
  }

  _rebuild() {
    const scene = this._scene;
    if (!scene) return;
    const locale = scene.locale || 'en';

    while (this._root.firstChild) this._root.removeChild(this._root.firstChild);

    // Header
    const header = document.createElement('div');
    header.className = 'sg-header';

    const title = document.createElement('span');
    title.textContent = 'Scene';
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'sg-header-actions';

    const pinBtn = document.createElement('button');
    pinBtn.className = 'sg-header-btn';
    pinBtn.textContent = '\uD83D\uDCCC'; // 📌
    pinBtn.title = 'Pin panel';
    pinBtn.addEventListener('click', () => this._cb.onTogglePin?.());
    actions.appendChild(pinBtn);

    const dockBtn = document.createElement('button');
    dockBtn.className = 'sg-header-btn';
    dockBtn.textContent = this._dock === 'left' ? '\u21E5' : '\u21E4'; // ⇥ or ⇤
    dockBtn.title = this._dock === 'left' ? 'Dock right' : 'Dock left';
    dockBtn.addEventListener('click', () => this._cb.onToggleDock?.());
    actions.appendChild(dockBtn);

    header.appendChild(actions);
    this._root.appendChild(header);

    // Tree
    const tree = document.createElement('div');
    tree.className = 'sg-tree';

    for (const group of ENTITY_GROUPS) {
      const entities = scene[group.key] || [];
      const isCollapsed = this._collapsed.has(group.key);

      // Group container
      const groupEl = document.createElement('div');
      groupEl.dataset.group = group.key;

      // Group header
      const gh = document.createElement('div');
      gh.className = 'sg-group-header';

      const chevron = document.createElement('span');
      chevron.className = 'sg-group-chevron' + (isCollapsed ? ' collapsed' : '');
      chevron.textContent = '\u25BE'; // ▾
      gh.appendChild(chevron);

      const icon = document.createElement('span');
      icon.className = 'sg-group-icon';
      icon.textContent = group.icon;
      gh.appendChild(icon);

      const label = document.createElement('span');
      label.textContent = group.label;
      gh.appendChild(label);

      const count = document.createElement('span');
      count.className = 'sg-group-count';
      count.textContent = `(${entities.length})`;
      gh.appendChild(count);

      // Group visibility eye
      const groupEye = document.createElement('span');
      groupEye.className = 'sg-group-eye';
      const allHidden = entities.length > 0 && entities.every(e => e.visible === false);
      groupEye.textContent = allHidden ? '\uD83D\uDEAB' : '\uD83D\uDC41'; // 🚫 or 👁
      groupEye.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const makeVisible = allHidden;
        for (const entity of entities) {
          this._cb.onVisibilityChange?.(group.key, entity.id, makeVisible);
        }
      });
      gh.appendChild(groupEye);

      gh.addEventListener('click', () => {
        if (isCollapsed) this._collapsed.delete(group.key);
        else this._collapsed.add(group.key);
        this._rebuild();
      });

      // Context menu on group header
      gh.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        this._showGroupContextMenu(ev, group, entities);
      });

      groupEl.appendChild(gh);

      // Entity items (if not collapsed)
      if (!isCollapsed) {
        for (let i = 0; i < entities.length; i++) {
          const entity = entities[i];
          const item = this._createEntityItem(entity, group, locale, i);
          groupEl.appendChild(item);
        }
      }

      tree.appendChild(groupEl);
    }

    this._root.appendChild(tree);
  }

  _createEntityItem(entity, group, locale, index) {
    const item = document.createElement('div');
    item.className = 'sg-item';
    item.dataset.id = entity.id;
    item.dataset.entityType = group.entityType;
    item.dataset.index = index;

    if (this._selectedIds.has(entity.id)) item.classList.add('selected');
    if (entity.visible === false) item.classList.add('hidden-entity');

    // Draggable
    item.draggable = true;
    item.addEventListener('dragstart', (ev) => this._onDragStart(ev, group.key, index));
    item.addEventListener('dragover', (ev) => this._onDragOver(ev));
    item.addEventListener('dragleave', (ev) => this._onDragLeave(ev));
    item.addEventListener('drop', (ev) => this._onDrop(ev, group.key));
    item.addEventListener('dragend', () => this._clearDropIndicators());

    // Icon
    const iconEl = document.createElement('span');
    iconEl.className = 'sg-item-icon';
    iconEl.textContent = group.icon;
    iconEl.style.color = getEntityColor(entity, group);
    item.appendChild(iconEl);

    // Name
    const nameEl = document.createElement('span');
    nameEl.className = 'sg-item-name';
    nameEl.textContent = getEntityName(entity, locale);
    item.appendChild(nameEl);

    // Eye toggle
    const eye = document.createElement('span');
    eye.className = 'sg-item-eye';
    if (entity.visible === false) {
      eye.classList.add('off', 'force-show');
      eye.textContent = '\uD83D\uDEAB'; // 🚫
    } else {
      eye.textContent = '\uD83D\uDC41'; // 👁
    }
    eye.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const newVisible = entity.visible === false;
      this._cb.onVisibilityChange?.(group.key, entity.id, newVisible);
    });
    item.appendChild(eye);

    // Click to select
    item.addEventListener('click', (ev) => {
      if (ev.target === eye) return;
      this._handleItemClick(ev, entity.id, group.key);
    });

    // Double-click to rename
    item.addEventListener('dblclick', (ev) => {
      if (ev.target === eye) return;
      this._startRename(nameEl, entity, group, locale);
    });

    // Context menu
    item.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      this._showItemContextMenu(ev, entity, group);
    });

    return item;
  }

  _handleItemClick(ev, id, groupKey) {
    if (ev.ctrlKey || ev.metaKey) {
      // Toggle in multi-selection
      const ids = new Set(this._selectedIds);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      this._cb.onSelect?.([...ids]);
    } else if (ev.shiftKey && this._selectedIds.size > 0) {
      // Range select within group
      const entities = this._scene[groupKey] || [];
      const entityIds = entities.map(e => e.id);
      const lastSelected = [...this._selectedIds].pop();
      const lastIdx = entityIds.indexOf(lastSelected);
      const curIdx = entityIds.indexOf(id);
      if (lastIdx >= 0 && curIdx >= 0) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        const rangeIds = entityIds.slice(start, end + 1);
        this._cb.onSelect?.([...new Set([...this._selectedIds, ...rangeIds])]);
      } else {
        this._cb.onSelect?.([id]);
      }
    } else {
      this._cb.onSelect?.([id]);
    }
  }

  _startRename(nameEl, entity, group, locale) {
    const input = document.createElement('input');
    input.className = 'sg-item-rename';
    input.value = getEntityName(entity, locale);
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const finish = (save) => {
      if (save && input.value.trim()) {
        this._cb.onRename?.(group.entityType, entity.id, input.value.trim());
      }
      input.replaceWith(nameEl);
    };

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
      if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  // --- Drag & Drop ---
  _onDragStart(ev, groupKey, index) {
    ev.dataTransfer.setData('text/plain', JSON.stringify({ groupKey, index }));
    ev.dataTransfer.effectAllowed = 'move';
  }

  _onDragOver(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    const item = ev.target.closest('.sg-item');
    if (item) item.style.borderTop = '2px solid #7a7aff';
  }

  _onDragLeave(ev) {
    const item = ev.target.closest('.sg-item');
    if (item) item.style.borderTop = '';
  }

  _onDrop(ev, targetGroupKey) {
    ev.preventDefault();
    this._clearDropIndicators();
    try {
      const data = JSON.parse(ev.dataTransfer.getData('text/plain'));
      if (data.groupKey !== targetGroupKey) return; // Can't drag between groups
      const targetItem = ev.target.closest('.sg-item');
      if (!targetItem) return;
      const toIndex = parseInt(targetItem.dataset.index, 10);
      if (data.index !== toIndex) {
        this._cb.onReorder?.(data.groupKey, data.index, toIndex);
      }
    } catch (e) { /* ignore */ }
  }

  _clearDropIndicators() {
    const items = this._root.querySelectorAll('.sg-item');
    for (const item of items) item.style.borderTop = '';
  }

  // --- Context Menus ---
  _showItemContextMenu(ev, entity, group) {
    this._closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'sg-context-menu';
    menu.style.left = ev.clientX + 'px';
    menu.style.top = ev.clientY + 'px';

    const items = [
      { label: 'Rename', action: () => {
        const nameEl = this._root.querySelector(`[data-id="${entity.id}"] .sg-item-name`);
        if (nameEl) this._startRename(nameEl, entity, group, this._scene?.locale || 'en');
      }},
      { label: 'Duplicate', action: () => this._cb.onDuplicate?.([entity.id]) },
      { label: 'Delete', action: () => this._cb.onDelete?.([entity.id]) },
      { divider: true },
      { label: entity.visible === false ? 'Show' : 'Hide',
        action: () => this._cb.onVisibilityChange?.(group.key, entity.id, entity.visible === false) },
    ];

    // If multi-selection, adjust labels
    if (this._selectedIds.size > 1 && this._selectedIds.has(entity.id)) {
      items[1].label = `Duplicate ${this._selectedIds.size} items`;
      items[1].action = () => this._cb.onDuplicate?.([...this._selectedIds]);
      items[2].label = `Delete ${this._selectedIds.size} items`;
      items[2].action = () => this._cb.onDelete?.([...this._selectedIds]);
    }

    for (const item of items) {
      if (item.divider) {
        const d = document.createElement('div');
        d.className = 'sg-context-divider';
        menu.appendChild(d);
      } else {
        const el = document.createElement('div');
        el.className = 'sg-context-item';
        el.textContent = item.label;
        el.addEventListener('click', () => {
          item.action();
          this._closeContextMenu();
        });
        menu.appendChild(el);
      }
    }

    document.body.appendChild(menu);
    this._contextMenu = menu;

    const closeOnClick = (e) => {
      if (!menu.contains(e.target)) {
        this._closeContextMenu();
        document.removeEventListener('click', closeOnClick);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOnClick), 0);
  }

  _showGroupContextMenu(ev, group, entities) {
    this._closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'sg-context-menu';
    menu.style.left = ev.clientX + 'px';
    menu.style.top = ev.clientY + 'px';

    const items = [
      { label: 'Select All', action: () => {
        const ids = entities.map(e => e.id);
        this._cb.onSelect?.(ids);
      }},
      { label: 'Show All', action: () => {
        for (const e of entities) this._cb.onVisibilityChange?.(group.key, e.id, true);
      }},
      { label: 'Hide All', action: () => {
        for (const e of entities) this._cb.onVisibilityChange?.(group.key, e.id, false);
      }},
    ];

    for (const item of items) {
      const el = document.createElement('div');
      el.className = 'sg-context-item';
      el.textContent = item.label;
      el.addEventListener('click', () => {
        item.action();
        this._closeContextMenu();
      });
      menu.appendChild(el);
    }

    document.body.appendChild(menu);
    this._contextMenu = menu;

    const closeOnClick = (e) => {
      if (!menu.contains(e.target)) {
        this._closeContextMenu();
        document.removeEventListener('click', closeOnClick);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOnClick), 0);
  }

  _closeContextMenu() {
    if (this._contextMenu) {
      this._contextMenu.remove();
      this._contextMenu = null;
    }
  }

  // --- Auto-show / hide ---
  show() {
    this._isVisible = true;
    this._container.classList.add('open');
    clearTimeout(this._autoHideTimer);
  }

  hide() {
    this._isVisible = false;
    this._container.classList.remove('open');
  }

  autoShow(durationMs = 2000) {
    this.show();
    clearTimeout(this._autoHideTimer);
    this._autoHideTimer = setTimeout(() => {
      if (!this._pinned && !this._hovered) this.hide();
    }, durationMs);
  }

  setDock(position) {
    this._dock = position;
    this._rebuild();
  }

  /** Move the scene graph root element into a different container. */
  moveTo(newContainer) {
    newContainer.appendChild(this._root);
  }

  /** Get the root element (for DOM moves between dock positions). */
  getRoot() {
    return this._root;
  }

  setHovered(hovered) {
    this._hovered = hovered;
  }

  setPinned(pinned) {
    this._pinned = pinned;
    if (pinned) this.show();
  }

  /**
   * Create a resize handle for Position B (properties panel).
   * Returns a DOM element to insert between the scene graph and properties content.
   * The handle adjusts the scene graph's max-height by dragging.
   */
  createResizeHandle() {
    const handle = document.createElement('div');
    handle.className = 'sg-resize-handle';
    let startY = 0;
    let startHeight = 0;
    const onMove = (e) => {
      const delta = e.clientY - startY;
      const newHeight = Math.max(80, startHeight + delta);
      this._root.style.height = newHeight + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = this._root.getBoundingClientRect().height;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    return handle;
  }

  destroy() {
    this._closeContextMenu();
    clearTimeout(this._autoHideTimer);
    this._root.remove();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/studio/sceneGraph.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add studio/components/sceneGraph.js tests/studio/sceneGraph.test.js && git commit -m "feat(studio): add SceneGraph component with tree rendering" -- studio/components/sceneGraph.js tests/studio/sceneGraph.test.js
```

## Chunk 3: Integration (app.js, menuBar, renderer)

### Task 5: Wire SceneGraph into app.js

**Files:**
- Modify: `studio/app.js`

- [ ] **Step 1: Import SceneGraph and instantiate it in boot()**

At the top of `studio/app.js`, add import:
```javascript
import { SceneGraph } from './components/sceneGraph.js';
```

After PropertiesPanel instantiation (~line 97), add:
```javascript
const sceneGraph = new SceneGraph(document.getElementById('scene-graph-dock'), {
  onSelect: (ids) => {
    editorStore.dispatch({ type: 'select', ids });
    editorStore.dispatch({ type: 'setTool', tool: 'select' });
    updateUI();
    // Show arc handle if single arc selected
    if (ids.length === 1) {
      const arc = (scene.arcs || []).find(a => a.id === ids[0]);
      if (arc) showArcHandle(arc.id);
      else { viewer.clearPreview(); selectTool.clearArcHandle(); }
    } else { viewer.clearPreview(); selectTool.clearArcHandle(); }
  },
  onVisibilityChange: (groupKey, id, visible) => {
    const entity = scene[groupKey].find(e => e.id === id);
    if (!entity) return;
    if (visible) delete entity.visible;
    else entity.visible = false;
    pushScene({ ...scene });
  },
  onReorder: (groupKey, fromIndex, toIndex) => {
    const arr = [...scene[groupKey]];
    const [item] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, item);
    scene = { ...scene, [groupKey]: arr };
    pushScene(scene);
  },
  onRename: (entityType, id, newName) => {
    const collections = { marker: 'markers', arc: 'arcs', path: 'paths', region: 'regions' };
    const col = collections[entityType];
    if (!col) return;
    const entity = scene[col].find(e => e.id === id);
    if (!entity) return;
    entity.name = { ...(entity.name || {}), [scene.locale || 'en']: newName };
    pushScene({ ...scene });
  },
  onDelete: (ids) => {
    editorStore.dispatch({ type: 'select', ids });
    handleMenuAction('deleteSelected');
  },
  onDuplicate: (ids) => {
    editorStore.dispatch({ type: 'select', ids });
    handleMenuAction('duplicate');
  },
  onTogglePin: () => {
    editorStore.dispatch({ type: 'toggleSceneGraphPinned' });
  },
  onToggleDock: () => {
    const state = editorStore.getState();
    const newDock = state.sceneGraphDock === 'left' ? 'right' : 'left';
    editorStore.dispatch({ type: 'setSceneGraphDock', dock: newDock });
  },
});
sceneGraph.render(scene, []);
```

- [ ] **Step 2: Update the `updateUI` function to include scene graph**

```javascript
function updateUI() {
  const state = editorStore.getState();
  propsPanel.update({ scene, selectedIds: state.selectedIds });
  timeline.update({ scene, playheadMs: state.playheadMs });
  sceneGraph.render(scene, state.selectedIds);
}
```

- [ ] **Step 3: Wire editorStore change handler for dock/pin/show-hidden**

In the `editorStore.on('change', ...)` handler, add scene graph logic:

```javascript
// Scene graph dock position
const sgDock = document.getElementById('scene-graph-dock');
if (state.sceneGraphDock === 'right') {
  const propsEl = document.getElementById('properties');
  if (!propsEl.querySelector('.sg-root')) {
    const root = sceneGraph.getRoot();
    root.classList.add('sg-in-properties');
    root.style.height = '200px'; // default height for position B
    propsEl.insertBefore(sgResizeHandle, propsEl.firstChild);
    propsEl.insertBefore(root, propsEl.firstChild);
    sgDock.classList.add('hidden');
    sceneGraph.setDock('right');
  }
} else {
  if (!sgDock.querySelector('.sg-root')) {
    const root = sceneGraph.getRoot();
    root.classList.remove('sg-in-properties');
    root.style.height = '';
    sgResizeHandle.remove();
    sgDock.appendChild(root);
    sgDock.classList.remove('hidden');
    sceneGraph.setDock('left');
  }
}

// Scene graph pinned
sceneGraph.setPinned(state.sceneGraphPinned);

// Show hidden objects — pass to viewer
if (viewer.setStudioOptions) {
  viewer.setStudioOptions({ showHiddenObjects: state.showHiddenObjects });
}
```

Also create the resize handle after SceneGraph instantiation:
```javascript
const sgResizeHandle = sceneGraph.createResizeHandle();
```

- [ ] **Step 4: Add auto-show on selection**

In the `selectTool.onSelect` callback, add after the existing code:
```javascript
const sgState = editorStore.getState();
if (!sgState.sceneGraphPinned) sceneGraph.autoShow();
```

Also in the `markerClick` event listener, add the same auto-show call.

- [ ] **Step 5: Add mouse hover listeners for auto-hide prevention**

After SceneGraph instantiation:
```javascript
const sgDock = document.getElementById('scene-graph-dock');
sgDock.addEventListener('mouseenter', () => { sceneGraph.setHovered(true); });
sgDock.addEventListener('mouseleave', () => {
  sceneGraph.setHovered(false);
  const sgState = editorStore.getState();
  if (!sgState.sceneGraphPinned) {
    setTimeout(() => { if (!sceneGraph._pinned) sceneGraph.hide(); }, 500);
  }
});
```

- [ ] **Step 6: Commit**

```bash
git add studio/app.js
git commit -m "feat(studio): wire SceneGraph component into app.js"
```

### Task 6: Extend duplicate to support all entity types

**Files:**
- Modify: `studio/app.js`

- [ ] **Step 1: Update the duplicate case in handleMenuAction**

Replace the current `case 'duplicate'` block with:

```javascript
case 'duplicate': {
  const state = editorStore.getState();
  const newIds = [];
  for (const id of state.selectedIds) {
    const marker = scene.markers.find(m => m.id === id);
    if (marker) {
      const dup = { ...marker, id: `${marker.id}-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, lat: marker.lat + 1 };
      scene.markers.push(dup);
      newIds.push(dup.id);
      continue;
    }
    const arc = scene.arcs.find(a => a.id === id);
    if (arc) {
      const dup = { ...arc, id: `${arc.id}-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        start: { ...arc.start, lat: arc.start.lat + 1 },
        end: { ...arc.end, lat: arc.end.lat + 1 } };
      scene.arcs.push(dup);
      newIds.push(dup.id);
      continue;
    }
    const path = scene.paths.find(p => p.id === id);
    if (path) {
      const dup = { ...path, id: `${path.id}-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        points: (path.points || []).map(p => ({ ...p, lat: p.lat + 1 })) };
      scene.paths.push(dup);
      newIds.push(dup.id);
      continue;
    }
    const region = scene.regions.find(r => r.id === id);
    if (region) {
      const dup = { ...region, id: `${region.id}-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
      if (dup.geojson?.coordinates?.[0]) {
        dup.geojson = { ...dup.geojson,
          coordinates: [dup.geojson.coordinates[0].map(c => [c[0], c[1] + 1])] };
      }
      scene.regions.push(dup);
      newIds.push(dup.id);
    }
  }
  if (newIds.length > 0) {
    pushScene({ ...scene });
    editorStore.dispatch({ type: 'select', ids: newIds });
  }
  break;
}
```

- [ ] **Step 2: Commit**

```bash
git add studio/app.js
git commit -m "feat(studio): extend duplicate to support arcs, paths, and regions"
```

### Task 7: Add View menu items

**Files:**
- Modify: `studio/components/menuBar.js`

- [ ] **Step 1: Add scene graph and show hidden items to View menu**

In `menuBar.js`, in the View menu items array, add after the `toggleHud` item:

```javascript
{ divider: true },
{ label: 'Show Scene Graph', action: 'toggleSceneGraph', shortcut: 'G' },
{ label: 'Show Hidden Objects', action: 'toggleShowHidden' },
```

- [ ] **Step 2: Handle new actions in app.js**

In `handleMenuAction`, add cases:

```javascript
case 'toggleSceneGraph':
  editorStore.dispatch({ type: 'toggleSceneGraphPinned' });
  break;
case 'toggleShowHidden':
  editorStore.dispatch({ type: 'toggleShowHiddenObjects' });
  break;
```

- [ ] **Step 3: Add G keyboard shortcut in app.js**

In the keyboard shortcuts switch, add:
```javascript
case 'g': editorStore.dispatch({ type: 'toggleSceneGraphPinned' }); break;
```

- [ ] **Step 4: Update shortcuts modal**

In the `showShortcuts` case, add to the shortcuts array:
```javascript
['G', 'Toggle scene graph'],
```

- [ ] **Step 5: Commit**

```bash
git add studio/components/menuBar.js studio/app.js
git commit -m "feat(studio): add scene graph View menu items and G shortcut"
```

### Task 8: Add visibility support to renderer

**Files:**
- Modify: `src/renderer/threeGlobeRenderer.js`

- [ ] **Step 1: Add `#studioOptions` private field**

In `threeGlobeRenderer.js`, at line ~100 (after the existing private field declarations), add:
```javascript
#studioOptions = {};
```

- [ ] **Step 2: Filter out invisible entities in `renderScene()` method**

In the `renderScene(scene)` method (line 448), at lines 478-493 where entities are passed to sub-managers, filter by visibility. Replace:

```javascript
// Line 479: was scene.markers ?? []
const markers = (scene.markers ?? []).filter(m => m.visible !== false || this.#studioOptions.showHiddenObjects);
this.#markerManager.update(this.#markerGroup, markers, locale);
```

```javascript
// Line 484: was scene.arcs ?? [], scene.paths ?? []
const arcs = (scene.arcs ?? []).filter(a => a.visible !== false || this.#studioOptions.showHiddenObjects);
const paths = (scene.paths ?? []).filter(p => p.visible !== false || this.#studioOptions.showHiddenObjects);
this.#arcPathManager.update(this.#arcGroup, arcs, paths);
```

```javascript
// Line 487: was scene.regions ?? []
const regions = (scene.regions ?? []).filter(r => r.visible !== false || this.#studioOptions.showHiddenObjects);
this.#regionManager.update(this.#regionGroup, regions);
```

```javascript
// Line 493: callout manager also uses markers
this.#calloutManager.update(this.#calloutGroup, markers, locale, { ... });
```

Note: Opacity 0.25 for `showHiddenObjects` entities is deferred to a follow-up — it requires changes to each sub-manager's material handling. For now, hidden entities are simply shown/hidden.

- [ ] **Step 3: Add `setStudioOptions` public method**

Add this method to the `ThreeGlobeRenderer` class:
```javascript
setStudioOptions(opts) {
  this.#studioOptions = opts;
  if (this.#lastScene) this.renderScene(this.#lastScene);
}
```

Note: The method uses `this.#lastScene` (which is already set at line 450) and `renderScene()` (the actual method name, not `setScene`).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/threeGlobeRenderer.js
git commit -m "feat(renderer): skip invisible entities and support showHiddenObjects"
```

## Chunk 4: Testing & Polish

### Task 9: Run full test suite and fix issues

**Files:**
- All test files

- [ ] **Step 1: Run full test suite**

Run: `node --test`
Expected: All tests PASS. Fix any failures.

- [ ] **Step 2: Run linter**

Run: `node tools/lint.mjs`
Expected: Clean. Fix any issues.

- [ ] **Step 3: Build**

Run: `node tools/build.mjs`
Expected: Succeeds.

- [ ] **Step 4: Commit any fixes**

### Task 10: Update FEATURES.md and RELEASE_NOTES.md

**Files:**
- Modify: `FEATURES.md`
- Modify: `RELEASE_NOTES.md`

- [ ] **Step 1: Add scene graph feature to FEATURES.md**

- [ ] **Step 2: Add release note entry**

- [ ] **Step 3: Commit**

```bash
git add FEATURES.md RELEASE_NOTES.md
git commit -m "docs: add scene graph panel feature notes"
```
