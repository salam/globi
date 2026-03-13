# Theme Cycle Toggle Button — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a theme cycle toggle button (hidden by default) to the globi-viewer controls, activated in all examples.

**Architecture:** Add `showThemeToggle` to the `viewerUi` schema, add a button to the Shadow DOM template, generate inline SVG thumbnails per theme/planet, cycle on click via `VALID_THEMES`. Examples inject `showThemeToggle: true` through `loadExampleScene`.

**Tech Stack:** Vanilla JS web component, inline SVG, node:test

**Spec:** `docs/superpowers/specs/2026-03-13-theme-cycle-toggle-design.md`

**Security note:** SVG thumbnails are static self-generated markup (no user input). The existing codebase uses the same `innerHTML` pattern for control button icons (globi-viewer.js line 961, 973-979). All SVG content comes from hardcoded strings in `#buildThemeThumbnailSvg` and is never derived from user data.

---

## Chunk 1: Schema + Unit Tests

### Task 1: Add `showThemeToggle` to viewerUi schema

**Files:**
- Modify: `src/scene/viewerUi.js:4-14` (DEFAULT_VIEWER_UI)
- Modify: `src/scene/viewerUi.js:36-49` (normalizeViewerUiConfig)
- Modify: `src/scene/viewerUi.js:52-68` (resolveViewerUiConfig)
- Modify: `src/scene/viewerUi.js:86-96` (validateViewerUiConfig booleanFields)
- Test: `tests/theme-toggle.test.js` (create)

- [ ] **Step 1: Write failing tests for the schema changes**

Create `tests/theme-toggle.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultViewerUiConfig,
  normalizeViewerUiConfig,
  resolveViewerUiConfig,
  validateViewerUiConfig,
} from '../src/scene/viewerUi.js';
import { VALID_THEMES } from '../src/renderer/themePalette.js';
import { resolvePlanetConfig, listCelestialPresets } from '../src/scene/celestial.js';

// --- Schema tests ---

test('showThemeToggle defaults to false', () => {
  const config = getDefaultViewerUiConfig();
  assert.equal(config.showThemeToggle, false);
});

test('normalizeViewerUiConfig preserves showThemeToggle: true', () => {
  const config = normalizeViewerUiConfig({ showThemeToggle: true });
  assert.equal(config.showThemeToggle, true);
});

test('normalizeViewerUiConfig defaults showThemeToggle to false', () => {
  const config = normalizeViewerUiConfig({});
  assert.equal(config.showThemeToggle, false);
});

test('resolveViewerUiConfig resolves showThemeToggle', () => {
  const config = resolveViewerUiConfig({ showThemeToggle: true });
  assert.equal(config.showThemeToggle, true);
});

test('validateViewerUiConfig accepts boolean showThemeToggle', () => {
  const errors = [];
  validateViewerUiConfig({ showThemeToggle: true }, 'viewerUi', errors);
  const themeErrors = errors.filter(e => e.includes('showThemeToggle'));
  assert.equal(themeErrors.length, 0);
});

test('validateViewerUiConfig rejects non-boolean showThemeToggle', () => {
  const errors = [];
  validateViewerUiConfig({ showThemeToggle: 'yes' }, 'viewerUi', errors);
  const themeErrors = errors.filter(e => e.includes('showThemeToggle'));
  assert.equal(themeErrors.length, 1);
});

// --- Theme cycle tests ---

test('VALID_THEMES has 5 entries', () => {
  assert.equal(VALID_THEMES.length, 5);
});

test('theme cycle wraps around correctly', () => {
  for (let i = 0; i < VALID_THEMES.length; i++) {
    const current = VALID_THEMES[i];
    const next = VALID_THEMES[(i + 1) % VALID_THEMES.length];
    assert.ok(next, `next theme after ${current} should exist`);
  }
  // Last wraps to first
  const last = VALID_THEMES[VALID_THEMES.length - 1];
  const wrapped = VALID_THEMES[(VALID_THEMES.length) % VALID_THEMES.length];
  assert.equal(wrapped, VALID_THEMES[0],
    `after ${last} should wrap to ${VALID_THEMES[0]}`);
});

// --- Planet baseColor tests (needed for thumbnail) ---

test('every celestial preset has a baseColor', () => {
  const presets = listCelestialPresets();
  for (const preset of presets) {
    const resolved = resolvePlanetConfig({ id: preset.id });
    assert.ok(resolved.baseColor,
      `${preset.id} must have a baseColor for theme thumbnail`);
  }
});
```

- [ ] **Step 2: Run tests — expect failures on `showThemeToggle` tests**

Run: `node --test tests/theme-toggle.test.js`
Expected: schema tests fail (showThemeToggle is undefined), cycle + baseColor tests pass.

- [ ] **Step 3: Add `showThemeToggle` to `DEFAULT_VIEWER_UI`**

In `src/scene/viewerUi.js`, add to the `DEFAULT_VIEWER_UI` object (after `showProjectionToggle`):

```js
  showProjectionToggle: true,
  showThemeToggle: false,
```

- [ ] **Step 4: Add to `normalizeViewerUiConfig`**

In `src/scene/viewerUi.js`, add after the `showProjectionToggle` line (~line 48):

```js
    showThemeToggle: value.showThemeToggle ?? DEFAULT_VIEWER_UI.showThemeToggle,
```

- [ ] **Step 5: Add to `resolveViewerUiConfig`**

In `src/scene/viewerUi.js`, add after the `showProjectionToggle` line (~line 66):

```js
    showThemeToggle: pickBooleanOrDefault(normalized.showThemeToggle, DEFAULT_VIEWER_UI.showThemeToggle),
```

- [ ] **Step 6: Add to `validateViewerUiConfig` booleanFields**

In `src/scene/viewerUi.js`, add `'showThemeToggle'` to the `booleanFields` array (~line 95):

```js
    'showProjectionToggle',
    'showThemeToggle',
```

- [ ] **Step 7: Run tests — all should pass**

Run: `node --test tests/theme-toggle.test.js`
Expected: all 10 tests PASS.

- [ ] **Step 8: Commit**

```bash
git restore --staged :/ && git add "src/scene/viewerUi.js" "tests/theme-toggle.test.js" && git commit -m "feat: add showThemeToggle to viewerUi schema with tests" -- "src/scene/viewerUi.js" "tests/theme-toggle.test.js"
```

---

## Chunk 2: Theme Toggle Button in globi-viewer

### Task 2: Add the button to the Shadow DOM template and wire it up

**Files:**
- Modify: `src/components/globi-viewer.js:102-109` (CSS — add .theme-toggle styles)
- Modify: `src/components/globi-viewer.js:582-583` (template — add button before projection-toggle)
- Modify: `src/components/globi-viewer.js:9` (import VALID_THEMES)
- Modify: `src/components/globi-viewer.js:635` (add `#themeToggleButton` field)
- Modify: `src/components/globi-viewer.js:683` (querySelector in constructor)
- Modify: `src/components/globi-viewer.js:708-714` (add click handler after projection click handler)
- Modify: `src/components/globi-viewer.js:982` (add #buildThemeThumbnailSvg + #updateThemeToggle methods)
- Modify: `src/components/globi-viewer.js:995` (#applyViewerUi — add visibility + thumbnail update)

- [ ] **Step 1: Add CSS for `.theme-toggle` button**

In the `<style>` section of the TEMPLATE string (after the `.controls button.icon-only` block, ~line 109), add:

```css
    .theme-toggle {
      width: 34px;
      height: 34px;
      padding: 3px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .theme-toggle svg {
      width: 26px;
      height: 26px;
      display: block;
      border-radius: 4px;
    }
```

- [ ] **Step 2: Add button to template HTML**

In the `.controls` div (~line 582), add before the projection-toggle button:

```html
    <button class="theme-toggle control-button icon-only" type="button" hidden data-globi-action="cycleTheme"></button>
```

So lines 582-584 become:
```html
    <button class="inspect-toggle control-button" type="button" data-globi-action="toggleInspect"></button>
    <button class="theme-toggle control-button icon-only" type="button" hidden data-globi-action="cycleTheme"></button>
    <button class="projection-toggle control-button icon-only" type="button" data-globi-action="setProjection"></button>
```

- [ ] **Step 3: Add `#themeToggleButton` private field**

After `#projectionButton;` (~line 635), add:

```js
  #themeToggleButton;
```

- [ ] **Step 4: Add querySelector in constructor**

After the `#projectionButton` querySelector (~line 683), add:

```js
    this.#themeToggleButton = this.#root.querySelector('.theme-toggle');
```

- [ ] **Step 5: Add click handler**

After the projection button click handler (~line 714), add:

```js
    this.#themeToggleButton.addEventListener('click', () => {
      const currentTheme = this.getTheme() ?? 'photo';
      const idx = VALID_THEMES.indexOf(currentTheme);
      const nextTheme = VALID_THEMES[(idx + 1) % VALID_THEMES.length];
      this.setTheme(nextTheme);
    });
```

- [ ] **Step 6: Add `VALID_THEMES` import**

Update the import from `'../renderer/themePalette.js'` (~line 9) to include `VALID_THEMES`:

```js
import { getThemePalette, VALID_THEMES } from '../renderer/themePalette.js';
```

- [ ] **Step 7: Ensure `resolvePlanetConfig` import exists**

Check if `resolvePlanetConfig` is already imported from `'../scene/celestial.js'`. If not, add it to the existing import from that module.

- [ ] **Step 8: Add `#buildThemeThumbnailSvg` helper method**

Add this private method to the `GlobiViewerElement` class (after `#updateProjectionButton`, ~line 982).

The method returns a hardcoded SVG string for each theme. All content is static — no user input flows into the SVG. This matches the existing `CONTROL_ICONS` pattern (lines 21-61) where static SVG strings are injected via DOM range methods.

```js
  #buildThemeThumbnailSvg(theme, baseColor = '#1e90ff') {
    switch (theme) {
      case 'photo':
        return `<svg viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <rect width="26" height="26" rx="3" fill="#0a0e1a"/>
          <circle cx="13" cy="13" r="8" fill="${baseColor}"/>
          <circle cx="16" cy="15" r="6" fill="#06091a" opacity="0.45"/>
        </svg>`;
      case 'wireframe-shaded':
        return `<svg viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <rect width="26" height="26" rx="3" fill="#ffffff"/>
          <circle cx="13" cy="13" r="8" fill="none" stroke="#222" stroke-width="1.5"/>
          <ellipse cx="13" cy="13" rx="4" ry="8" fill="none" stroke="#222" stroke-width="1"/>
          <line x1="5" y1="13" x2="21" y2="13" stroke="#222" stroke-width="0.8"/>
        </svg>`;
      case 'wireframe-flat':
        return `<svg viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <rect width="26" height="26" rx="3" fill="#ffffff"/>
          <circle cx="13" cy="13" r="8" fill="none" stroke="#333" stroke-width="1"/>
        </svg>`;
      case 'grayscale-shaded':
        return `<svg viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <rect width="26" height="26" rx="3" fill="#ffffff"/>
          <defs><linearGradient id="gs" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#aaa"/><stop offset="100%" stop-color="#555"/>
          </linearGradient></defs>
          <circle cx="13" cy="13" r="8" fill="url(#gs)"/>
        </svg>`;
      case 'grayscale-flat':
        return `<svg viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <rect width="26" height="26" rx="3" fill="#ffffff"/>
          <circle cx="13" cy="13" r="8" fill="#999"/>
        </svg>`;
      default:
        return `<svg viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
          <rect width="26" height="26" rx="3" fill="#0a0e1a"/>
          <circle cx="13" cy="13" r="8" fill="${baseColor}"/>
        </svg>`;
    }
  }
```

**Note on `baseColor`:** This value comes from `resolvePlanetConfig()` which reads from the hardcoded `PRESETS` array in `celestial.js`. It is never derived from user input — it's always a hex color string like `'#1e90ff'` from the preset definitions.

- [ ] **Step 9: Add `#updateThemeToggle` helper method**

Add after `#buildThemeThumbnailSvg`. Uses `createRange().createContextualFragment()` for DOM insertion — same safe pattern as `#updateProjectionButton` (line 976-979):

```js
  #updateThemeToggle() {
    if (!this.#themeToggleButton) return;
    const scene = this.#currentScene;
    const theme = scene?.theme ?? 'photo';
    const planet = resolvePlanetConfig(scene?.planet ?? {});

    if (this.#viewerUi.controlStyle === VIEWER_CONTROL_STYLE_ICON ||
        this.#themeToggleButton.classList.contains('icon-only')) {
      const svg = this.#buildThemeThumbnailSvg(theme, planet.baseColor);
      const range = document.createRange();
      range.selectNodeContents(this.#themeToggleButton);
      range.deleteContents();
      this.#themeToggleButton.appendChild(range.createContextualFragment(svg));
    } else {
      const label = theme.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      this.#themeToggleButton.textContent = label;
    }

    const nextIdx = (VALID_THEMES.indexOf(theme) + 1) % VALID_THEMES.length;
    const nextName = VALID_THEMES[nextIdx];
    this.#themeToggleButton.title = `Theme: ${theme} (click for ${nextName})`;
    this.#themeToggleButton.setAttribute('aria-label',
      `Current theme: ${theme}. Click to switch to ${nextName}`);
  }
```

- [ ] **Step 10: Wire into `#applyViewerUi`**

In `#applyViewerUi` (~line 995), after the `#projectionButton.hidden` line, add:

```js
    this.#themeToggleButton.hidden = !this.#viewerUi.showThemeToggle;
    this.#updateThemeToggle();
```

- [ ] **Step 11: Test manually in the editor**

Run: `npx vite`
Open the editor, load an example, verify the button doesn't appear (hidden by default in editor — no `showThemeToggle` in editor scenes).

- [ ] **Step 12: Commit**

```bash
git restore --staged :/ && git add "src/components/globi-viewer.js" && git commit -m "feat: add theme cycle toggle button to globi-viewer controls" -- "src/components/globi-viewer.js"
```

---

## Chunk 3: Enable in Examples

### Task 3: Inject `showThemeToggle: true` in `loadExampleScene`

**Files:**
- Modify: `src/examples/loaders.js:1591-1642` (loadExampleScene wrapper)
- Modify: `examples/battle-of-midway.html:1255-1265` (inline viewerUi)

- [ ] **Step 1: Wrap return in `loadExampleScene`**

In `src/examples/loaders.js`, refactor `loadExampleScene` to collect the scene into a variable and merge `showThemeToggle: true` before returning. Replace the function (~line 1591-1642) with:

```js
export async function loadExampleScene(id, options = {}) {
  let scene;
  if (id === EXAMPLE_IDS.NONE) {
    const locale = options.locale ?? 'en';
    scene = createEmptyScene(locale);
  } else if (id === EXAMPLE_IDS.ALL_CAPITALS) {
    scene = await loadAllCapitalsExample(options);
  } else if (id === EXAMPLE_IDS.CONTINENTS_AND_SEAS) {
    scene = await loadContinentsAndSeasExample(options);
  } else if (id === EXAMPLE_IDS.ISS_REALTIME) {
    scene = await loadIssRealtimeExample(options);
  } else if (id === EXAMPLE_IDS.UKRAINE_CONFLICT) {
    scene = await loadUkraineConflictOpenSourceExample(options);
  } else if (id === EXAMPLE_IDS.CARRIERS_TRACKING) {
    scene = await loadCarriersOpenSourceExample(options);
  } else if (id === EXAMPLE_IDS.VESSEL_TRACKING) {
    scene = await loadVesselTrackingExample(options);
  } else if (id === EXAMPLE_IDS.CIVIL_SHIPPING) {
    scene = await loadCivilShippingExample(options);
  } else if (id === EXAMPLE_IDS.MOON_LANDING_SITES) {
    scene = await loadMoonLandingSitesExample(options);
  } else if (id === EXAMPLE_IDS.MARS_LANDING_SITES) {
    scene = await loadMarsLandingSitesExample(options);
  } else if (id === EXAMPLE_IDS.EUROPA_WATER) {
    scene = await loadEuropaWaterExample(options);
  } else if (id === EXAMPLE_IDS.TITAN_LAKES) {
    scene = await loadTitanLakesExample(options);
  } else if (id === EXAMPLE_IDS.WIREFRAME_EARTH) {
    scene = await loadWireframeEarthExample(options);
  } else if (id === EXAMPLE_IDS.GRAYSCALE_EARTH) {
    scene = await loadGrayscaleEarthExample(options);
  } else if (id === EXAMPLE_IDS.HANNIBAL_ROUTE) {
    scene = await loadHannibalRouteExample(options);
  } else if (id === EXAMPLE_IDS.INDIANA_JONES) {
    scene = await loadIndianaJonesItinerary(options);
  } else {
    throw new Error(`Unknown example id: ${id}`);
  }
  return { ...scene, viewerUi: { ...scene.viewerUi, showThemeToggle: true } };
}
```

- [ ] **Step 2: Add `showThemeToggle: true` to battle-of-midway**

In `examples/battle-of-midway.html`, add to the `viewerUi` object (~line 1264, after `showProjectionToggle: false`):

```js
        showProjectionToggle: false,
        showThemeToggle: true,
```

- [ ] **Step 3: Test in browser**

Run `npx vite` and open an example (e.g., `examples/all-capitals.html`).
Verify: the theme toggle button appears in the controls bar with the photo thumbnail.
Click it: it should cycle through all 5 themes, thumbnail updating each time.

- [ ] **Step 4: Test a non-Earth example**

Open a planetary example (Mars, Titan, etc).
Verify: the photo thumbnail uses the planet's baseColor, not Earth blue.

- [ ] **Step 5: Run full test suite**

Run: `node --test`
Expected: all new tests pass, no regressions.

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add "src/examples/loaders.js" "examples/battle-of-midway.html" && git commit -m "feat: enable theme toggle in all examples" -- "src/examples/loaders.js" "examples/battle-of-midway.html"
```

---

## Chunk 4: FEATURES.md + RELEASE_NOTES.md

### Task 4: Update docs

**Files:**
- Modify: `FEATURES.md`
- Modify: `RELEASE_NOTES.md`

- [ ] **Step 1: Add to FEATURES.md**

Add a checked item under the appropriate section:
```
- [x] Theme cycle toggle button — cycles through photo, wireframe-shaded, wireframe-flat, grayscale-shaded, grayscale-flat themes with planet-specific thumbnails
```

- [ ] **Step 2: Add to RELEASE_NOTES.md**

Add under the current release section:
```
* Theme cycle toggle: click the thumbnail button to switch between all 5 visual themes. Button is enabled in all examples.
```

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add "FEATURES.md" "RELEASE_NOTES.md" && git commit -m "docs: add theme toggle to features and release notes" -- "FEATURES.md" "RELEASE_NOTES.md"
```
