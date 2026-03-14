# Studio v2 Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Globi Studio with smart property controls, complete menu actions, dirty-state tracking, and inline injection from any embedded `<globi-viewer>`.

**Architecture:** Three independent layers — (1) CSS fix + smart properties panel, (2) menu actions + modal + dirty state, (3) inline Studio overlay. Each layer builds on the previous one and can be tested independently.

**Tech Stack:** Vanilla JS, ES modules, node:test + jsdom, esbuild

**Spec:** `docs/superpowers/specs/2026-03-14-studio-v2-enhancements-design.md`

---

## Chunk 1: CSS Reconciliation & Smart Properties Panel

### Task 1: Fix CSS class names in PropertiesPanel

**Files:**
- Modify: `studio/components/propertiesPanel.js`
- Modify: `tests/studio/propertiesPanel.test.js`

The CSS in `studio/styles.css` defines `field-label`, `field-input`, `field` (the row), and `props-section-header`. But `propertiesPanel.js` generates `props-label`, `props-input`, `props-row`, `props-section-title`. This task aligns the JS to the CSS.

- [ ] **Step 1: Update test to assert correct CSS class names**

In `tests/studio/propertiesPanel.test.js`, add a test:

```js
it('uses CSS class names matching styles.css', () => {
  const el = document.getElementById('props');
  const panel = new PropertiesPanel(el, {
    scene: { theme: 'photo', planet: { id: 'earth' }, projection: 'globe', locale: 'en' },
    selectedIds: [],
    locale: 'en',
    onChange: () => {},
  });
  panel.render();
  assert.ok(el.querySelector('.field-label'), 'should use field-label class');
  assert.ok(el.querySelector('.field-input'), 'should use field-input class');
  assert.ok(el.querySelector('.field'), 'should use field class for rows');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/studio/propertiesPanel.test.js`
Expected: FAIL — elements have `props-label`, `props-input`, `props-row` instead

- [ ] **Step 3: Update class names in propertiesPanel.js**

In `studio/components/propertiesPanel.js`, change `_makeField`. Find:

```js
row.className = 'props-row';
```

Replace with `'field'`. Find:

```js
lbl.className = 'props-label';
```

Replace with `'field-label'`. Find:

```js
input.className = 'props-input';
```

Replace with `'field-input'`.

Also change `_makeSection`. Find:

```js
heading.className = 'props-section-title';
```

Replace with `'props-section-header'`.

**Note:** `_makeSection` creates a visual separator heading, not a container. Rows are appended flat to `this._container`. This is intentional — the heading acts as a section divider in the flat list.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/studio/propertiesPanel.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add "studio/components/propertiesPanel.js" "tests/studio/propertiesPanel.test.js" && git commit -m "fix: align PropertiesPanel CSS class names to styles.css" -- studio/components/propertiesPanel.js tests/studio/propertiesPanel.test.js
```

---

### Task 2: Add helper methods to PropertiesPanel

**Files:**
- Modify: `studio/components/propertiesPanel.js`
- Modify: `tests/studio/propertiesPanel.test.js`

- [ ] **Step 1: Add `_makeSelect`, `_makeCheckbox`, `_makeColorPicker` to PropertiesPanel**

Add these three methods to the `PropertiesPanel` class:

```js
_makeSelect(label, field, options, value, entityType, entityId, onChange) {
  const row = document.createElement('div');
  row.className = 'field';

  const lbl = document.createElement('label');
  lbl.className = 'field-label';
  lbl.textContent = label;
  row.appendChild(lbl);

  const select = document.createElement('select');
  select.className = 'field-select';
  select.dataset.field = field;

  for (const opt of options) {
    const option = document.createElement('option');
    const optValue = typeof opt === 'object' ? opt.value : opt;
    const optLabel = typeof opt === 'object' ? opt.label : opt;
    option.value = optValue;
    option.textContent = optLabel;
    if (optValue === value) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener('change', () => {
    onChange(entityType, entityId, field, select.value);
  });

  row.appendChild(select);
  return row;
}

_makeCheckbox(label, field, checked, entityType, entityId, onChange) {
  const row = document.createElement('div');
  row.className = 'field';

  const lbl = document.createElement('label');
  lbl.className = 'field-label';
  lbl.textContent = label;
  row.appendChild(lbl);

  const input = document.createElement('input');
  input.className = 'field-checkbox';
  input.type = 'checkbox';
  input.dataset.field = field;
  input.checked = !!checked;

  input.addEventListener('change', () => {
    onChange(entityType, entityId, field, input.checked);
  });

  row.appendChild(input);
  return row;
}

_makeColorPicker(label, field, value, entityType, entityId, onChange) {
  const row = document.createElement('div');
  row.className = 'field';

  const lbl = document.createElement('label');
  lbl.className = 'field-label';
  lbl.textContent = label;
  row.appendChild(lbl);

  const input = document.createElement('input');
  input.className = 'field-color';
  input.type = 'color';
  input.dataset.field = field;
  input.value = value || '#000000';

  input.addEventListener('input', () => {
    onChange(entityType, entityId, field, input.value);
  });

  row.appendChild(input);
  return row;
}
```

- [ ] **Step 2: Run existing tests to confirm nothing is broken**

Run: `node --test tests/studio/propertiesPanel.test.js`
Expected: PASS (helpers added but not yet wired)

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add "studio/components/propertiesPanel.js" && git commit -m "feat: add _makeSelect, _makeCheckbox, _makeColorPicker helpers to PropertiesPanel" -- studio/components/propertiesPanel.js
```

---

### Task 3: Rewrite `_renderSceneSettings` with smart controls

**Files:**
- Modify: `studio/components/propertiesPanel.js`
- Modify: `tests/studio/propertiesPanel.test.js`

This replaces the three free-text fields (Theme, Projection, Locale) with proper controls and adds all scene-level settings from the spec.

- [ ] **Step 1: Write tests for scene-level smart controls**

Add to `tests/studio/propertiesPanel.test.js`:

```js
it('renders theme as a select with valid values', () => {
  const el = document.getElementById('props');
  const panel = new PropertiesPanel(el, {
    scene: { theme: 'photo', planet: { id: 'earth' }, projection: 'globe', locale: 'en' },
    selectedIds: [],
    locale: 'en',
    onChange: () => {},
  });
  panel.render();
  const themeSelect = el.querySelector('select[data-field="theme"]');
  assert.ok(themeSelect, 'theme should be a select');
  assert.equal(themeSelect.value, 'photo');
  assert.equal(themeSelect.options.length, 5);
});

it('renders projection as a select with valid values', () => {
  const el = document.getElementById('props');
  const panel = new PropertiesPanel(el, {
    scene: { theme: 'photo', planet: { id: 'earth' }, projection: 'globe', locale: 'en' },
    selectedIds: [],
    locale: 'en',
    onChange: () => {},
  });
  panel.render();
  const projSelect = el.querySelector('select[data-field="projection"]');
  assert.ok(projSelect, 'projection should be a select');
  assert.equal(projSelect.value, 'globe');
  const values = [...projSelect.options].map(o => o.value);
  assert.deepEqual(values, ['globe', 'azimuthalEquidistant', 'orthographic', 'equirectangular']);
});

it('renders body as a select with celestial preset IDs', () => {
  const el = document.getElementById('props');
  const panel = new PropertiesPanel(el, {
    scene: { theme: 'photo', planet: { id: 'mars' }, projection: 'globe', locale: 'en' },
    selectedIds: [],
    locale: 'en',
    onChange: () => {},
  });
  panel.render();
  const bodySelect = el.querySelector('select[data-field="planet.id"]');
  assert.ok(bodySelect, 'body should be a select');
  assert.equal(bodySelect.value, 'mars');
});

it('renders lightingMode as a select with fixed and sun', () => {
  const el = document.getElementById('props');
  const panel = new PropertiesPanel(el, {
    scene: { theme: 'photo', planet: { id: 'earth', lightingMode: 'fixed', showBorders: true, showLabels: true }, projection: 'globe', locale: 'en' },
    selectedIds: [],
    locale: 'en',
    onChange: () => {},
  });
  panel.render();
  const lightSelect = el.querySelector('select[data-field="planet.lightingMode"]');
  assert.ok(lightSelect, 'lightingMode should be a select');
  const values = [...lightSelect.options].map(o => o.value);
  assert.deepEqual(values, ['fixed', 'sun']);
});

it('renders showBorders as a checkbox', () => {
  const el = document.getElementById('props');
  const panel = new PropertiesPanel(el, {
    scene: { theme: 'photo', planet: { id: 'earth', lightingMode: 'fixed', showBorders: true, showLabels: false }, projection: 'globe', locale: 'en' },
    selectedIds: [],
    locale: 'en',
    onChange: () => {},
  });
  panel.render();
  const checkbox = el.querySelector('input[type="checkbox"][data-field="planet.showBorders"]');
  assert.ok(checkbox, 'showBorders should be a checkbox');
  assert.equal(checkbox.checked, true);
});

it('renders surfaceTint as a color picker', () => {
  const el = document.getElementById('props');
  const panel = new PropertiesPanel(el, {
    scene: { theme: 'photo', planet: { id: 'earth' }, projection: 'globe', locale: 'en', surfaceTint: '#ff0000' },
    selectedIds: [],
    locale: 'en',
    onChange: () => {},
  });
  panel.render();
  const colorInput = el.querySelector('input[type="color"][data-field="surfaceTint"]');
  assert.ok(colorInput, 'surfaceTint should be a color picker');
  assert.equal(colorInput.value, '#ff0000');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/studio/propertiesPanel.test.js`
Expected: FAIL — scene settings still uses text inputs

- [ ] **Step 3: Rewrite `_renderSceneSettings`**

Replace the existing `_renderSceneSettings` method in `studio/components/propertiesPanel.js`:

```js
_renderSceneSettings(scene, locale, onChange) {
  const header = document.createElement('div');
  header.className = 'props-header';
  header.textContent = 'Scene Settings';
  this._container.appendChild(header);

  // --- Appearance (visual separator, rows appended flat) ---
  this._container.appendChild(this._makeSection('Appearance'));
  this._container.appendChild(this._makeSelect(
    'Theme', 'theme',
    ['photo', 'wireframe-shaded', 'wireframe-flat', 'grayscale-shaded', 'grayscale-flat'],
    scene.theme ?? 'photo', 'scene', '__scene__', onChange
  ));
  this._container.appendChild(this._makeSelect(
    'Projection', 'projection',
    ['globe', 'azimuthalEquidistant', 'orthographic', 'equirectangular'],
    scene.projection ?? 'globe', 'scene', '__scene__', onChange
  ));
  this._container.appendChild(this._makeSelect(
    'Locale', 'locale',
    ['en', 'de', 'fr', 'es', 'zh', 'ja', 'ar', 'pt', 'ru', 'hi', 'ko'],
    scene.locale ?? locale ?? 'en', 'scene', '__scene__', onChange
  ));
  this._container.appendChild(this._makeColorPicker(
    'Surface Tint', 'surfaceTint',
    scene.surfaceTint || '#000000', 'scene', '__scene__', onChange
  ));
  this._container.appendChild(this._makeColorPicker(
    'Overlay Tint', 'overlayTint',
    scene.overlayTint || '#000000', 'scene', '__scene__', onChange
  ));

  // --- Planet ---
  this._container.appendChild(this._makeSection('Planet'));
  this._container.appendChild(this._makeSelect(
    'Body', 'planet.id',
    ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon', 'io', 'europa', 'ganymede', 'titan'],
    scene.planet?.id ?? 'earth', 'scene', '__scene__', onChange
  ));
  this._container.appendChild(this._makeSelect(
    'Lighting', 'planet.lightingMode',
    ['fixed', 'sun'],
    scene.planet?.lightingMode ?? 'fixed', 'scene', '__scene__', onChange
  ));
  this._container.appendChild(this._makeCheckbox(
    'Borders', 'planet.showBorders',
    scene.planet?.showBorders ?? true, 'scene', '__scene__', onChange
  ));
  this._container.appendChild(this._makeCheckbox(
    'Labels', 'planet.showLabels',
    scene.planet?.showLabels ?? true, 'scene', '__scene__', onChange
  ));

  // --- Viewer UI ---
  this._container.appendChild(this._makeSection('Viewer UI'));
  const ui = scene.viewerUi || {};
  this._container.appendChild(this._makeSelect(
    'Control Style', 'viewerUi.controlStyle',
    ['text', 'icon'],
    ui.controlStyle ?? 'text', 'scene', '__scene__', onChange
  ));
  const uiBooleans = [
    ['Body Selector', 'viewerUi.showBodySelector', ui.showBodySelector],
    ['Fullscreen', 'viewerUi.showFullscreenButton', ui.showFullscreenButton],
    ['Legend', 'viewerUi.showLegendButton', ui.showLegendButton],
    ['Inspect', 'viewerUi.showInspectButton', ui.showInspectButton],
    ['Compass', 'viewerUi.showCompass', ui.showCompass],
    ['Scale', 'viewerUi.showScale', ui.showScale],
    ['Marker Filter', 'viewerUi.showMarkerFilter', ui.showMarkerFilter],
    ['Attribution', 'viewerUi.showAttribution', ui.showAttribution],
    ['Projection Toggle', 'viewerUi.showProjectionToggle', ui.showProjectionToggle],
    ['Theme Toggle', 'viewerUi.showThemeToggle', ui.showThemeToggle],
  ];
  for (const [label, field, value] of uiBooleans) {
    this._container.appendChild(this._makeCheckbox(
      label, field, value ?? true, 'scene', '__scene__', onChange
    ));
  }
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/studio/propertiesPanel.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add "studio/components/propertiesPanel.js" "tests/studio/propertiesPanel.test.js" && git commit -m "feat: smart scene settings with dropdowns, checkboxes, color pickers" -- studio/components/propertiesPanel.js tests/studio/propertiesPanel.test.js
```

---

### Task 4: Extend `handlePropertyChange` for scene-level fields

**Files:**
- Modify: `studio/app.js`

The existing `handlePropertyChange` function in `studio/app.js` only handles entity types (`marker`, `arc`, `path`, `region`). Scene-level changes from the smart properties panel use `entityType === 'scene'` and must route to:
- `scene.<field>` for `theme`, `projection`, `locale`, `surfaceTint`, `overlayTint`
- `scene.planet.<field>` for fields prefixed with `planet.`
- `scene.viewerUi.<field>` for fields prefixed with `viewerUi.`

- [ ] **Step 1: Verify `getCelestialPreset` is exported from `src/scene/celestial.js`**

Run: `grep 'export.*getCelestialPreset' src/scene/celestial.js`
Expected: Should find the export. The function is exported from `src/scene/celestial.js` as `getCelestialPreset`.

- [ ] **Step 2: Add static import at top of `studio/app.js`**

After the existing imports, add:

```js
import { getCelestialPreset } from '../src/scene/celestial.js';
```

- [ ] **Step 3: Replace `handlePropertyChange`**

Find the existing `handlePropertyChange` function (starts with `function handlePropertyChange(entityType, id, field, value) {`). Replace it with:

```js
function handlePropertyChange(entityType, id, field, value) {
  if (entityType === 'scene') {
    if (field.startsWith('planet.')) {
      const planetField = field.slice('planet.'.length);
      if (planetField === 'id') {
        const preset = getCelestialPreset(value);
        scene = {
          ...scene,
          planet: {
            ...preset,
            lightingMode: scene.planet?.lightingMode ?? 'fixed',
            lightingTimestamp: scene.planet?.lightingTimestamp ?? '',
          },
        };
      } else {
        scene = { ...scene, planet: { ...scene.planet, [planetField]: value } };
      }
    } else if (field.startsWith('viewerUi.')) {
      const uiField = field.slice('viewerUi.'.length);
      scene = { ...scene, viewerUi: { ...(scene.viewerUi || {}), [uiField]: value } };
    } else {
      scene = { ...scene, [field]: value };
    }
    pushScene(scene);
    return;
  }

  const collections = { marker: 'markers', arc: 'arcs', path: 'paths', region: 'regions' };
  const col = collections[entityType];
  if (!col) return;
  const entity = scene[col].find(e => e.id === id);
  if (!entity) return;

  if (field === 'name') {
    entity.name = { ...(entity.name || {}), [scene.locale || 'en']: value };
  } else if (field === 'lat' || field === 'lon') {
    entity[field] = parseFloat(value) || 0;
  } else {
    entity[field] = value;
  }
  pushScene({ ...scene });
}
```

- [ ] **Step 4: Run all tests**

Run: `node --test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add "studio/app.js" && git commit -m "feat: extend handlePropertyChange for scene/planet/viewerUi fields" -- studio/app.js
```

---

### Task 5: Upgrade entity color to color picker and add visualType/calloutMode selects

**Files:**
- Modify: `studio/components/propertiesPanel.js`
- Modify: `tests/studio/propertiesPanel.test.js`

- [ ] **Step 1: Write tests**

Add to `tests/studio/propertiesPanel.test.js`:

```js
it('renders entity color as a color picker', () => {
  const el = document.getElementById('props');
  const panel = new PropertiesPanel(el, {
    scene: {
      markers: [{ id: 'm1', name: { en: 'Test' }, lat: 0, lon: 0, color: '#ff0000', visualType: 'dot', calloutMode: 'hover' }],
      arcs: [], paths: [], regions: [],
    },
    selectedIds: ['m1'],
    locale: 'en',
    onChange: () => {},
  });
  panel.render();
  const colorInput = el.querySelector('input[type="color"][data-field="color"]');
  assert.ok(colorInput, 'color should be a color picker');
});

it('renders visualType as a select dropdown', () => {
  const el = document.getElementById('props');
  const panel = new PropertiesPanel(el, {
    scene: {
      markers: [{ id: 'm1', name: { en: 'Test' }, lat: 0, lon: 0, color: '#ff0000', visualType: 'dot', calloutMode: 'hover' }],
      arcs: [], paths: [], regions: [],
    },
    selectedIds: ['m1'],
    locale: 'en',
    onChange: () => {},
  });
  panel.render();
  const vtSelect = el.querySelector('select[data-field="visualType"]');
  assert.ok(vtSelect, 'visualType should be a select');
  assert.equal(vtSelect.value, 'dot');
});

it('renders calloutMode as a select dropdown', () => {
  const el = document.getElementById('props');
  const panel = new PropertiesPanel(el, {
    scene: {
      markers: [{ id: 'm1', name: { en: 'Test' }, lat: 0, lon: 0, color: '#ff0000', visualType: 'dot', calloutMode: 'hover' }],
      arcs: [], paths: [], regions: [],
    },
    selectedIds: ['m1'],
    locale: 'en',
    onChange: () => {},
  });
  panel.render();
  const cmSelect = el.querySelector('select[data-field="calloutMode"]');
  assert.ok(cmSelect, 'calloutMode should be a select');
  assert.equal(cmSelect.value, 'hover');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/studio/propertiesPanel.test.js`
Expected: FAIL — color is text input, visualType/calloutMode are text inputs

- [ ] **Step 3: Update `_renderEntityProps`**

In `_renderEntityProps`, find:

```js
if (item.color !== undefined) {
  this._container.appendChild(this._makeField('Color', 'color', item.color, entityType, item.id, onChange, 'color'));
}
```

Replace with:

```js
if (item.color !== undefined) {
  this._container.appendChild(this._makeColorPicker('Color', 'color', item.color, entityType, item.id, onChange));
}
```

Find:

```js
if (item.visualType !== undefined) {
  this._container.appendChild(this._makeField('Visual Type', 'visualType', item.visualType, entityType, item.id, onChange));
}
if (item.calloutMode !== undefined) {
  this._container.appendChild(this._makeField('Callout Mode', 'calloutMode', item.calloutMode, entityType, item.id, onChange));
}
```

Replace with:

```js
if (item.visualType !== undefined) {
  this._container.appendChild(this._makeSelect(
    'Visual Type', 'visualType',
    ['dot', 'pin', 'pulse', 'ring', 'label', 'sprite'],
    item.visualType, entityType, item.id, onChange
  ));
}
if (item.calloutMode !== undefined) {
  this._container.appendChild(this._makeSelect(
    'Callout Mode', 'calloutMode',
    ['none', 'hover', 'always', 'click'],
    item.calloutMode, entityType, item.id, onChange
  ));
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/studio/propertiesPanel.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add "studio/components/propertiesPanel.js" "tests/studio/propertiesPanel.test.js" && git commit -m "feat: upgrade entity color/visualType/calloutMode to smart controls" -- studio/components/propertiesPanel.js tests/studio/propertiesPanel.test.js
```

---

### Task 6: Add `field-checkbox` CSS style

**Files:**
- Modify: `studio/styles.css`

- [ ] **Step 1: Add checkbox style**

After the `.field-select` block (around line 197 in `studio/styles.css`), add:

```css
.field-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #7a7aff;
  cursor: pointer;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add "studio/styles.css" && git commit -m "style: add field-checkbox CSS for properties panel checkboxes" -- studio/styles.css
```

---

## Chunk 2: Menu Actions, Modal & Dirty State

### Task 7: Add dirty state tracking (must come before export actions)

**Files:**
- Modify: `studio/app.js`

**Important:** This task MUST be done before Tasks 9-11 since those tasks reference `isDirty`.

- [ ] **Step 1: Add `isDirty` flag**

Near the top of `studio/app.js`, after the `scene` variable declaration (around line 29), add:

```js
let isDirty = false;
```

- [ ] **Step 2: Set dirty flag in `pushScene`**

In the `pushScene` function, add `isDirty = true;` as the second line:

```js
function pushScene(newScene) {
  scene = newScene;
  isDirty = true;
  undoRedo.push(scene);
  if (viewer.setScene) viewer.setScene(scene);
  updateUI();
}
```

- [ ] **Step 3: Add beforeunload handler**

After the `isDirty` declaration, add (guarded for test environments):

```js
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
```

- [ ] **Step 4: Run all tests**

Run: `node --test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add "studio/app.js" && git commit -m "feat: add dirty state tracking with unsaved changes warning" -- studio/app.js
```

---

### Task 8: Create reusable modal component

**Files:**
- Create: `studio/components/modal.js`
- Create: `tests/studio/modal.test.js`

- [ ] **Step 1: Write tests**

Create `tests/studio/modal.test.js`:

```js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let showModal, dom;
beforeEach(async () => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Event = dom.window.Event;
  globalThis.KeyboardEvent = dom.window.KeyboardEvent;
  ({ showModal } = await import('../../studio/components/modal.js'));
});

describe('showModal', () => {
  it('creates overlay on document.body', () => {
    const content = document.createElement('p');
    content.textContent = 'Hello';
    const close = showModal('Test Title', content);
    const overlay = document.querySelector('.modal-overlay');
    assert.ok(overlay, 'overlay should exist');
    assert.ok(overlay.textContent.includes('Test Title'));
    assert.ok(overlay.textContent.includes('Hello'));
    close();
  });

  it('removes overlay on close', () => {
    const content = document.createElement('p');
    const close = showModal('Title', content);
    assert.ok(document.querySelector('.modal-overlay'));
    close();
    assert.ok(!document.querySelector('.modal-overlay'), 'overlay should be removed');
  });

  it('closes on Escape key', () => {
    const content = document.createElement('p');
    showModal('Title', content);
    assert.ok(document.querySelector('.modal-overlay'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    assert.ok(!document.querySelector('.modal-overlay'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/studio/modal.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement modal.js**

Create `studio/components/modal.js`:

```js
/**
 * showModal -- displays a dark-themed modal dialog.
 * Returns a close() function.
 */
export function showModal(title, contentEl) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const card = document.createElement('div');
  card.className = 'modal-card';

  const header = document.createElement('div');
  header.className = 'modal-header';

  const titleEl = document.createElement('span');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', close);
  header.appendChild(closeBtn);

  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'modal-body';
  body.appendChild(contentEl);
  card.appendChild(body);

  overlay.appendChild(card);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKeydown);

  function close() {
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  }

  document.body.appendChild(overlay);
  return close;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/studio/modal.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add "studio/components/modal.js" "tests/studio/modal.test.js" && git commit -m "feat: add reusable modal component for Studio" -- studio/components/modal.js tests/studio/modal.test.js
```

---

### Task 9: Add modal and overlay CSS styles

**Files:**
- Modify: `studio/styles.css`

- [ ] **Step 1: Add modal styles at end of `studio/styles.css`**

```css
/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.modal-card {
  background: #1a1a35;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  min-width: 360px;
  max-width: 520px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #2a2a4a;
}
.modal-title {
  font-size: 14px;
  font-weight: 600;
  color: #7a7aff;
}
.modal-close {
  background: none;
  border: none;
  color: #777;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}
.modal-close:hover { color: #ccc; }
.modal-body {
  padding: 18px;
  font-size: 13px;
  color: #ccc;
  line-height: 1.6;
}
.modal-body table { width: 100%; border-collapse: collapse; }
.modal-body td { padding: 4px 12px 4px 0; }
.modal-body td:last-child { color: #555; text-align: right; }
```

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add "studio/styles.css" && git commit -m "style: add modal overlay/card CSS" -- studio/styles.css
```

---

### Task 10: Implement export menu actions

**Files:**
- Modify: `studio/app.js`

The export functions already exist in `src/io/`. The `exportOBJ` action is a placeholder per spec.

- [ ] **Step 1: Add imports at top of `studio/app.js`**

```js
import { exportSceneToGeoJSON } from '../src/io/geojson.js';
```

Note: `exportJSON` reuses the existing `saveAsFile` logic directly (no separate import needed). `exportOBJ` is a placeholder alert.

- [ ] **Step 2: Add `downloadText` helper function**

Below the imports in `studio/app.js`:

```js
function downloadText(text, filename, mimeType = 'text/plain') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Wire export actions in `handleMenuAction`**

Replace the stubbed `exportJSON`, `exportGeoJSON`, `exportOBJ` cases (find `case 'exportJSON': case 'exportGeoJSON': case 'exportOBJ':` and the `console.log` line):

```js
case 'exportJSON': {
  const json = JSON.stringify(scene, null, 2);
  downloadText(json, 'globi-scene.json', 'application/json');
  isDirty = false;
  break;
}
case 'exportGeoJSON': {
  const geojson = exportSceneToGeoJSON(scene);
  downloadText(JSON.stringify(geojson, null, 2), 'globi-scene.geojson', 'application/json');
  break;
}
case 'exportOBJ': {
  alert('OBJ export coming soon.');
  break;
}
```

Also update the existing `saveAsFile` case — add `isDirty = false;` after `URL.revokeObjectURL(url);`.

- [ ] **Step 4: Run all tests**

Run: `node --test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add "studio/app.js" && git commit -m "feat: implement export JSON/GeoJSON menu actions, OBJ placeholder" -- studio/app.js
```

---

### Task 11: Implement shortcuts modal and about dialog

**Files:**
- Modify: `studio/app.js`

- [ ] **Step 1: Add import for showModal**

At top of `studio/app.js`:

```js
import { showModal } from './components/modal.js';
```

- [ ] **Step 2: Implement `showShortcuts` case**

Replace the `showShortcuts` stub in `handleMenuAction`:

```js
case 'showShortcuts': {
  const content = document.createElement('div');
  const shortcuts = [
    ['V', 'Select tool'], ['M', 'Marker tool'], ['A', 'Arc tool'],
    ['L', 'Path (line) tool'], ['D', 'Draw tool'], ['Shift+R', 'Region tool'],
    ['P', 'Toggle properties'], ['T', 'Toggle timeline'], ['H', 'Toggle HUD'],
    ['F', 'Zoom to fit'], ['R', 'Reset camera'],
    ['Space', 'Preview mode'], ['Escape', 'Cancel / deselect'],
    ['Enter', 'Finish path/region'], ['Delete', 'Delete selected'],
    ['Ctrl+Z', 'Undo'], ['Ctrl+Shift+Z', 'Redo'],
    ['Ctrl+D', 'Duplicate'], ['Ctrl+A', 'Select all'],
    ['Ctrl+S', 'Save as file'], ['Ctrl+N', 'New scene'],
    ['Ctrl+O', 'Open file'], ['?', 'Show shortcuts'],
  ];
  const table = document.createElement('table');
  for (const [key, desc] of shortcuts) {
    const tr = document.createElement('tr');
    const tdKey = document.createElement('td');
    tdKey.textContent = key;
    tdKey.style.fontFamily = 'monospace';
    tdKey.style.color = '#7a7aff';
    const tdDesc = document.createElement('td');
    tdDesc.textContent = desc;
    tr.appendChild(tdKey);
    tr.appendChild(tdDesc);
    table.appendChild(tr);
  }
  content.appendChild(table);
  showModal('Keyboard Shortcuts', content);
  break;
}
```

- [ ] **Step 3: Implement `showAbout` case**

Replace the `showAbout` stub using safe DOM methods:

```js
case 'showAbout': {
  const content = document.createElement('div');

  const title = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = 'Globi Studio';
  title.appendChild(strong);
  content.appendChild(title);

  const desc = document.createElement('p');
  desc.textContent = 'A visual editor for Globi scenes.';
  content.appendChild(desc);

  const tagline = document.createElement('p');
  tagline.style.marginTop = '12px';
  tagline.style.color = '#777';
  tagline.textContent = 'Built with vanilla JS, Three.js, and love.';
  content.appendChild(tagline);

  const linkP = document.createElement('p');
  linkP.style.marginTop = '8px';
  const link = document.createElement('a');
  link.href = 'https://globi.world/docs';
  link.target = '_blank';
  link.rel = 'noopener';
  link.style.color = '#7a7aff';
  link.textContent = 'Documentation';
  linkP.appendChild(link);
  content.appendChild(linkP);

  showModal('About Globi Studio', content);
  break;
}
```

- [ ] **Step 4: Run all tests**

Run: `node --test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add "studio/app.js" && git commit -m "feat: implement shortcuts and about modals" -- studio/app.js
```

---

### Task 12: Implement camera actions and closeStudio

**Files:**
- Modify: `studio/app.js`

The controller does not currently expose `zoomToFit` or `resetCamera` methods. These call them if available, otherwise no-op. The `closeStudio` action delegates dirty-state checking to `StudioOverlay.close()` in inline mode to avoid a double-confirm dialog.

- [ ] **Step 1: Implement camera action stubs**

Replace the `zoomToFit` and `resetCamera` stubs:

```js
case 'zoomToFit': {
  const ctrl = getController();
  if (ctrl?.zoomToFit) ctrl.zoomToFit();
  break;
}
case 'resetCamera': {
  const ctrl = getController();
  if (ctrl?.resetCamera) ctrl.resetCamera();
  break;
}
```

- [ ] **Step 2: Implement `closeStudio`**

Note: No `confirm()` here — `StudioOverlay.close()` handles its own dirty-state confirm to avoid double-prompting.

```js
case 'closeStudio': {
  if (window.__studioOverlay) {
    window.__studioOverlay.close();
  } else if (isDirty) {
    if (confirm('You have unsaved changes. Close anyway?')) window.close();
  } else {
    window.close();
  }
  break;
}
```

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add "studio/app.js" && git commit -m "feat: implement camera stubs and closeStudio action" -- studio/app.js
```

---

### Task 13: Add "Close Studio" to menu bar

**Files:**
- Modify: `studio/components/menuBar.js`
- Modify: `tests/studio/menuBar.test.js`

- [ ] **Step 1: Write test**

Add to `tests/studio/menuBar.test.js`:

```js
it('has Close Studio menu item with correct action', () => {
  const el = document.getElementById('menu-bar');
  let fired = null;
  const mb = new MenuBar(el, { onAction: (action) => { fired = action; } });
  const items = el.querySelectorAll('.dropdown-item');
  const closeItem = [...items].find(i => i.textContent.includes('Close Studio'));
  assert.ok(closeItem, 'Close Studio should be in menu');
  closeItem.click();
  assert.equal(fired, 'closeStudio');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/studio/menuBar.test.js`
Expected: FAIL — no Close Studio item

- [ ] **Step 3: Add Close Studio to menu structure**

In `studio/components/menuBar.js`, in the `MENU_STRUCTURE` File menu `items` array, after the `{ label: 'Export OBJ', action: 'exportOBJ' }` entry, add:

```js
{ divider: true },
{ label: 'Close Studio', action: 'closeStudio' },
```

- [ ] **Step 4: Run test**

Run: `node --test tests/studio/menuBar.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add "studio/components/menuBar.js" "tests/studio/menuBar.test.js" && git commit -m "feat: add Close Studio menu item" -- studio/components/menuBar.js tests/studio/menuBar.test.js
```

---

## Chunk 3: Inline Studio Injection

**Prerequisite:** Chunks 1 and 2 must be complete before this chunk.

### Task 14: Create StudioOverlay class

**Files:**
- Create: `studio/studioOverlay.js`
- Create: `tests/studio/studioOverlay.test.js`

- [ ] **Step 1: Write tests**

Create `tests/studio/studioOverlay.test.js`:

```js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let StudioOverlay, dom;
beforeEach(async () => {
  dom = new JSDOM('<!DOCTYPE html><html><body><div id="host"><div id="viewer"></div></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.confirm = () => true;
  ({ StudioOverlay } = await import('../../studio/studioOverlay.js'));
});

describe('StudioOverlay', () => {
  it('creates overlay on document.body', () => {
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    overlay.open();
    const overlayEl = document.querySelector('.studio-overlay');
    assert.ok(overlayEl, 'overlay element should exist');
    overlay.close();
  });

  it('reparents viewer into overlay viewport', () => {
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    overlay.open();
    const viewport = document.querySelector('.studio-overlay .viewport');
    assert.ok(viewport, 'viewport slot should exist');
    assert.equal(viewer.parentElement, viewport, 'viewer should be inside viewport');
    overlay.close();
  });

  it('restores viewer to original position on close', () => {
    const viewer = document.getElementById('viewer');
    const host = document.getElementById('host');
    const overlay = new StudioOverlay(viewer);
    overlay.open();
    overlay.close();
    assert.equal(viewer.parentElement, host, 'viewer should be back in host');
    assert.ok(!document.querySelector('.studio-overlay'), 'overlay should be removed');
  });

  it('blocks close when isDirty and user cancels', () => {
    globalThis.confirm = () => false;
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    overlay.open();
    overlay.isDirty = true;
    overlay.close();
    assert.ok(document.querySelector('.studio-overlay'), 'overlay should still exist');
    // Cleanup
    globalThis.confirm = () => true;
    overlay.close();
  });

  it('uses .studio class (not #studio id) on inner container', () => {
    const viewer = document.getElementById('viewer');
    const overlay = new StudioOverlay(viewer);
    overlay.open();
    const studioDiv = document.querySelector('.studio-overlay .studio');
    assert.ok(studioDiv, 'should use .studio class to match styles.css');
    overlay.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/studio/studioOverlay.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement StudioOverlay**

Create `studio/studioOverlay.js`:

```js
/**
 * StudioOverlay -- injects Globi Studio as a full-page overlay.
 * Reparents an existing <globi-viewer> into the overlay viewport,
 * then dynamically imports and boots the Studio app.
 */
export class StudioOverlay {
  constructor(viewerEl) {
    this._viewer = viewerEl;
    this._originalParent = null;
    this._originalNextSibling = null;
    this._overlayEl = null;
    this._isDirty = false;
  }

  get isDirty() { return this._isDirty; }
  set isDirty(v) { this._isDirty = !!v; }

  open() {
    if (this._overlayEl) return;

    // Remember original DOM position
    this._originalParent = this._viewer.parentElement;
    this._originalNextSibling = this._viewer.nextSibling;

    // Build overlay DOM using safe DOM methods
    this._overlayEl = document.createElement('div');
    this._overlayEl.className = 'studio-overlay';

    // .studio class matches styles.css (.studio selector, line 5)
    const studio = document.createElement('div');
    studio.className = 'studio';

    const menuBar = document.createElement('div');
    menuBar.id = 'studio-menu-bar';
    menuBar.className = 'menu-bar';
    studio.appendChild(menuBar);

    const main = document.createElement('div');
    main.className = 'main';

    const toolStrip = document.createElement('div');
    toolStrip.id = 'studio-tool-strip';
    toolStrip.className = 'tool-strip';
    main.appendChild(toolStrip);

    const viewport = document.createElement('div');
    viewport.id = 'studio-viewport';
    viewport.className = 'viewport';
    main.appendChild(viewport);

    const properties = document.createElement('div');
    properties.id = 'studio-properties';
    properties.className = 'properties';
    main.appendChild(properties);

    studio.appendChild(main);

    const timeline = document.createElement('div');
    timeline.id = 'studio-timeline';
    timeline.className = 'timeline';
    studio.appendChild(timeline);

    this._overlayEl.appendChild(studio);

    // Reparent viewer into viewport
    viewport.appendChild(this._viewer);

    document.body.appendChild(this._overlayEl);

    // Global ref for closeStudio action in app.js
    window.__studioOverlay = this;
  }

  close() {
    if (!this._overlayEl) return;

    if (this._isDirty && typeof confirm === 'function' && !confirm('You have unsaved changes. Close Studio?')) {
      return;
    }

    // Restore viewer to original DOM position
    if (this._originalParent) {
      if (this._originalNextSibling) {
        this._originalParent.insertBefore(this._viewer, this._originalNextSibling);
      } else {
        this._originalParent.appendChild(this._viewer);
      }
    }

    this._overlayEl.remove();
    this._overlayEl = null;
    window.__studioOverlay = null;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/studio/studioOverlay.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add "studio/studioOverlay.js" "tests/studio/studioOverlay.test.js" && git commit -m "feat: add StudioOverlay class for inline injection" -- studio/studioOverlay.js tests/studio/studioOverlay.test.js
```

---

### Task 15: Add StudioOverlay CSS

**Files:**
- Modify: `studio/styles.css`

- [ ] **Step 1: Add overlay styles at end of `studio/styles.css`**

```css
/* Studio Overlay (inline injection) */
.studio-overlay {
  position: fixed;
  inset: 0;
  z-index: 999999;
  background: #0d0d1a;
}
.studio-overlay .studio {
  height: 100%;
}
```

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add "studio/styles.css" && git commit -m "style: add studio-overlay CSS for inline injection" -- studio/styles.css
```

---

### Task 16: Wire "Open Studio" to StudioOverlay in globi-viewer.js

**Files:**
- Modify: `src/components/globi-viewer.js`

- [ ] **Step 1: Replace the current `openStudio` handler**

In `src/components/globi-viewer.js`, find the `case 'openStudio'` block (around line 1812, look for `case 'openStudio': {`). Replace the entire case block:

```js
case 'openStudio': {
  const studioBase = this.getAttribute('studio-base') || '/studio/';
  try {
    const { StudioOverlay } = await import(studioBase + 'studioOverlay.js');
    const overlay = new StudioOverlay(this);
    overlay.open();
  } catch (err) {
    console.warn('Failed to load Studio overlay, falling back to new tab:', err.message);
    const json = JSON.stringify(scene);
    try {
      sessionStorage.setItem('globi-studio-scene', json);
    } catch (_) { /* quota exceeded */ }
    window.open(studioBase + 'index.html', '_blank');
  }
  break;
}
```

- [ ] **Step 2: Run all tests**

Run: `node --test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add "src/components/globi-viewer.js" && git commit -m "feat: wire Open Studio to StudioOverlay with fallback" -- src/components/globi-viewer.js
```

---

### Task 17: Run full test suite and verify build

**Prerequisite:** Chunks 1 and 2 must be complete.

- [ ] **Step 1: Run all tests**

Run: `node --test`
Expected: All tests PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Manual verification in browser**

Open `http://localhost:4173/studio/index.html`:
1. Verify dropdowns for Theme, Projection, Body, Locale work
2. Verify color pickers for Surface Tint, Overlay Tint, entity Color work
3. Verify checkboxes for Borders, Labels, Viewer UI toggles work
4. File > Export JSON downloads a file
5. File > Export GeoJSON downloads a file
6. File > Export OBJ shows "coming soon" alert
7. Help > Keyboard Shortcuts shows modal
8. Help > About shows modal
9. Make an edit, try closing tab -- browser warns about unsaved changes
10. File > Close Studio works

Open an example page and right-click the globe:
1. "Open Studio" should inject overlay (or fallback to new tab)
2. Closing the overlay should restore the viewer

- [ ] **Step 5: Commit any fixes discovered during manual testing**

---

### Task 18: Update documentation

**Files:**
- Modify: `RELEASE_NOTES.md`
- Modify: `FEATURES.md`

- [ ] **Step 1: Add release notes**

Add a new section to `RELEASE_NOTES.md`:

```markdown
## Version 1.5 (Fri, Mar 14 16:00)

* Smart Scene Settings: Theme, Projection, Body, and Locale use dropdowns; lighting and borders use checkboxes; tints use color pickers
* Entity properties: color uses color picker, visualType and calloutMode use dropdowns
* All Viewer UI toggles editable from Scene Settings panel
* Export JSON and GeoJSON from File menu
* Keyboard Shortcuts modal (press ?)
* About dialog
* Close Studio menu option
* Unsaved changes warning when closing with edits
* Inline Studio injection: right-click "Open Studio" on any embedded globe opens Studio as an overlay
* CSS styling fix: properties panel inputs now match Studio dark theme
```

- [ ] **Step 2: Update FEATURES.md**

Check off completed Studio items in `FEATURES.md`.

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add "RELEASE_NOTES.md" "FEATURES.md" && git commit -m "docs: add v1.5 release notes for Studio v2 enhancements" -- RELEASE_NOTES.md FEATURES.md
```
