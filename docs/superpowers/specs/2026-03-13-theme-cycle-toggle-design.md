# Theme Cycle Toggle Button — Design Spec

**Date:** 2026-03-13

## Summary

Add a theme cycle toggle button to the globi-viewer control bar. The button is hidden by default and shows a stylized square thumbnail previewing the current theme. Clicking cycles through the five themes in order. All example scenes activate this button.

## Behavior

- **Location:** `.controls` area (top-right), placed before the projection toggle
- **Hidden by default:** controlled by `viewerUi.showThemeToggle` (default `false`)
- **Cycle order:** `photo → wireframe-shaded → wireframe-flat → grayscale-shaded → grayscale-flat → photo` (wraps)
- **Click action:** advances to next theme, calls `setTheme()` on the controller, dispatches `themeChange` event

## Button Appearance

The button displays a **24×24px square thumbnail** that represents the **current** theme. The thumbnail is an inline SVG.

### Thumbnail Designs

| Theme | Background | Circle |
|---|---|---|
| `photo` | Dark (`#0a0e1a`) | Filled circle, top half = planet `baseColor`, bottom-right crescent = darker shade |
| `wireframe-shaded` | White (`#ffffff`) | Black stroked circle with a horizontal + vertical arc (wireframe look), stroke ~1.5px |
| `wireframe-flat` | White (`#ffffff`) | Black stroked circle only, stroke ~1px (simpler than shaded) |
| `grayscale-shaded` | White (`#ffffff`) | Gray filled circle (`#888`) with a subtle lighter-to-darker gradient left-to-right |
| `grayscale-flat` | White (`#ffffff`) | Flat gray filled circle (`#999`), no gradient |

### Planet-Specific Photo Thumbnail

The photo thumbnail's circle color adapts to the current celestial body's `baseColor` from the celestial presets. For example:
- Earth: `#1e90ff` (blue with gold highlight)
- Mars: `#c86f53` (rusty red)
- Jupiter: `#c59a6d` (tan/orange)
- Moon: `#b8b8b8` (gray)

The `baseColor` is available via `resolvePlanetConfig(scene.planet).baseColor`.

### Text Mode Fallback

When `controlStyle: 'text'`, the button shows the current theme name as text (e.g., "Photo", "Wireframe") instead of the SVG thumbnail.

## Schema Changes

### `viewerUi` (in `src/scene/viewerUi.js`)

Add `showThemeToggle: boolean` (default `false`) to:
- `DEFAULT_VIEWER_UI`
- `normalizeViewerUiConfig()`
- `resolveViewerUiConfig()`
- `mergeViewerUiConfig()` (inherited from resolve)
- `validateViewerUiConfig()` (add to `booleanFields` array)

## Component Changes

### `globi-viewer.js`

1. **Add `#themeToggleButton`** field — references the button DOM element
2. **Add button to static HTML template** inside `<div class="controls">`, placed before `.projection-toggle`. Acquire via `this.shadowRoot.querySelector('.theme-toggle')` in `connectedCallback`, matching the existing pattern for all other control buttons.
3. **SVG generation helper** — `#buildThemeThumbnailSvg(theme, baseColor)` returns the inline SVG string for the current theme + planet color
4. **Click handler** — cycles `VALID_THEMES` array: find current index, advance by 1 mod length, call `this.setTheme(nextTheme)`
5. **Update in `#applyViewerUi()`** — refresh thumbnail SVG when theme or planet changes. This is the correct hook because `setTheme()` triggers `sceneChange` → `#applyViewerUi`, so external theme changes (attribute, editor dropdown, API) all update the thumbnail automatically.
6. **Visibility** — `this.#themeToggleButton.hidden = !this.#viewerUi.showThemeToggle` (in `#applyViewerUi`)

### CSS (inside Shadow DOM stylesheet)

- `.theme-toggle` button: `width: 28px; height: 28px; padding: 2px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; background: transparent;`
- `.theme-toggle svg`: `width: 24px; height: 24px; display: block;`

## Example Changes

### `src/examples/loaders.js`

Wrap the final return of `loadExampleScene()` to merge `showThemeToggle: true` into the scene's `viewerUi`:

```js
const scene = await dispatchToLoader(id, options);
return { ...scene, viewerUi: { ...scene.viewerUi, showThemeToggle: true } };
```

This is a single edit point that covers all 15 example loaders.

### `examples/battle-of-midway.html`

Add `showThemeToggle: true` to the inline `viewerUi` object (this example doesn't use `loadExampleScene`).

## Theme Ordering

Use the existing `VALID_THEMES` array from `themePalette.js` directly for cycle order. No separate `THEME_CYCLE_ORDER` constant — it would duplicate `VALID_THEMES` and create two sources of truth. The array already has the correct order: `['photo', 'wireframe-shaded', 'wireframe-flat', 'grayscale-shaded', 'grayscale-flat']`.

## Test Coverage

### Unit Tests (`tests/theme-toggle.test.js`)

1. `showThemeToggle` defaults to `false` in `getDefaultViewerUiConfig()`
2. `normalizeViewerUiConfig({ showThemeToggle: true })` preserves the value
3. `validateViewerUiConfig` accepts boolean `showThemeToggle`
4. Theme cycle logic: for each theme in `VALID_THEMES`, next theme is `VALID_THEMES[(i+1) % length]` (wraps at end)
5. `resolvePlanetConfig` returns a `baseColor` for every preset (thumbnail needs it)

## Out of Scope

- Keyboard shortcuts for theme cycling
- Theme persistence across page reloads
- Animated transitions between themes
- Editor integration — the editor already listens for `themeChange` events and syncs its own dropdown automatically, so no editor code changes are needed
