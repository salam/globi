# Studio v2 Enhancements — Design Spec

**Date:** 2026-03-14
**Status:** Approved
**Scope:** Inline Studio injection, smart properties panel, menu actions, dirty state, CSS reconciliation

---

## 1. Inline Studio Injection

### Problem
Currently, "Open Studio" in the context menu opens a separate browser tab. This breaks editing flow — the user leaves their page, loses context, and must manually transfer scene data back.

### Design
A-Frame Inspector style: inject Studio as a full-page overlay on the current page.

**`StudioOverlay` class** (`studio/studioOverlay.js`):
- Creates a `position: fixed; inset: 0; z-index: 999999` container on `document.body`
- Reparents the existing `<globi-viewer>` element into the overlay's viewport slot
- On close, reparents the viewer back to its original DOM position
- Stores original parent + next sibling references for accurate restoration

**Lazy loading:**
- Studio bundle is NOT included in `dist/globi.js`
- `globi-viewer.js` uses dynamic `import()` when "Open Studio" is selected
- The import path is resolved relative to the `<globi-viewer>` element's `studio-base` attribute, defaulting to `/studio/`
- No sessionStorage transfer needed — the live viewer element is shared directly

**Browser compatibility constraint:** Canvas/WebGL context reparenting works reliably in Chromium-based browsers. Firefox and Safari may tear down the GL context on reparent. If this proves problematic, a fallback approach using `position: fixed` on the viewer in-place (without reparenting) can be implemented. Initial implementation targets Chromium; other browsers are best-effort.

**Viewer hand-off:**
- Studio reads scene state from the viewer's existing controller (`viewer._controller`)
- On close, the viewer retains whatever edits were made — no serialization round-trip
- The standalone `studio/index.html` continues to work independently (loads its own `<globi-viewer>`)

**Entry points:**
1. **Inline** (from any page with `<globi-viewer>`): context menu → "Open Studio" → overlay injected
2. **Standalone** (`studio/index.html`): direct navigation, works as before

### Key decisions
- Overlay attaches to `document.body`, not inside shadow DOM — Studio UI needs full-page layout
- Viewer is reparented (moved), not cloned — preserves WebGL context and state
- Close button in Studio menu bar returns viewer to original position
- `studio-base` attribute on `<globi-viewer>` allows custom deploy paths (default: `/studio/`)

---

## 2. Smart Properties Panel

### Problem
Scene Settings currently uses free-form text inputs for Theme, Projection, Locale, etc. Users must know valid values. Additionally, CSS class names in `styles.css` don't match what `propertiesPanel.js` generates, so inputs are unstyled.

### Design

**Scene-level controls (when nothing selected):**

| Setting | Control type | Values | Target path |
|---------|-------------|--------|-------------|
| Theme | `<select>` dropdown | `photo`, `wireframe-shaded`, `wireframe-flat`, `grayscale-shaded`, `grayscale-flat` | `scene.theme` |
| Projection | `<select>` dropdown | `globe`, `azimuthalEquidistant`, `orthographic`, `equirectangular` | `scene.projection` |
| Body | `<select>` dropdown | `mercury`, `venus`, `earth`, `mars`, `jupiter`, `saturn`, `uranus`, `neptune`, `moon`, `io`, `europa`, `ganymede`, `titan` | `scene.planet.id` (triggers full preset swap) |
| Locale | `<select>` dropdown | `en`, `de`, `fr`, `es`, `zh`, `ja`, `ar`, `pt`, `ru`, `hi`, `ko` | `scene.locale` |
| Surface tint | `<input type="color">` | hex color | `scene.surfaceTint` |
| Overlay tint | `<input type="color">` | hex color | `scene.overlayTint` |
| Lighting mode | `<select>` dropdown | `fixed`, `sun` | `scene.planet.lightingMode` |
| Show borders | `<input type="checkbox">` | boolean | `scene.planet.showBorders` |
| Show labels | `<input type="checkbox">` | boolean | `scene.planet.showLabels` |

**`handlePropertyChange` extension:** The existing handler only dispatches to `scene.markers`, `scene.arcs`, `scene.paths`, `scene.regions`. For scene-level properties, add an `entityType === 'scene'` branch that routes:
- `theme`, `projection`, `locale`, `surfaceTint`, `overlayTint` → `scene.<field>`
- `planet.id`, `planet.lightingMode`, `planet.showBorders`, `planet.showLabels` → `scene.planet.<field>`
- `viewerUi.*` fields → `scene.viewerUi.<field>`

When `planet.id` changes, call `getCelestialPreset(newId)` and merge the preset into `scene.planet` (preserving `lightingMode` and `lightingTimestamp`).

**Viewer UI toggles** (collapsible section):

All 10 boolean flags from `viewerUi.js` rendered as labeled checkboxes:
- `showBodySelector`, `showFullscreenButton`, `showLegendButton`, `showInspectButton`, `showCompass`, `showScale`, `showMarkerFilter`, `showAttribution`, `showProjectionToggle`, `showThemeToggle`
- Plus `controlStyle` as a dropdown (`text` | `icon`)

**Entity-level controls** (when marker/arc/path/region selected):
- Name: text input (unchanged)
- Lat/Lon: number inputs (unchanged)
- Color: `<input type="color">` (upgrade from text)
- Visual type / Callout mode: `<select>` dropdowns with known values

**New helper methods in `PropertiesPanel`:**
- `_makeSelect(label, field, options, value, ...)` — creates a `<select>` row
- `_makeCheckbox(label, field, checked, ...)` — creates a checkbox row
- `_makeColorPicker(label, field, value, ...)` — creates a color input row

---

## 3. Menu Actions & Dirty State

### Problem
Several menu actions are stubbed (`exportJSON`, `exportGeoJSON`, `exportOBJ`, `zoomToFit`, `resetCamera`, `showShortcuts`, `showAbout`). The user also wants a "Close Studio" option and unsaved-changes warning.

### Menu actions to implement

**Export:**
- `exportJSON` — download `globi-scene.json` (same as existing `saveAsFile`)
- `exportGeoJSON` — convert markers/paths to GeoJSON FeatureCollection, download
- `exportOBJ` — placeholder alert ("OBJ export coming soon")

**Camera:**
- `zoomToFit` — call `controller.zoomToFit()` if available
- `resetCamera` — call `controller.resetCamera()` if available

**Help:**
- `showShortcuts` — modal overlay listing all keyboard shortcuts
- `showAbout` — modal overlay with version, links

**Studio lifecycle:**
- `closeStudio` — menu item to exit Studio (inline: close overlay; standalone: `window.close()`)

### Dirty state tracking

- `isDirty` boolean on the app module, set `true` in `pushScene()`, set `false` on save/export
- `window.addEventListener('beforeunload', ...)` — if `isDirty`, set `e.returnValue` to trigger browser's native "unsaved changes" dialog
- For inline mode: `StudioOverlay.close()` checks `isDirty` and shows a confirm dialog before closing

### Modal pattern
- Reusable `_showModal(title, contentEl)` method (or standalone function)
- Dark overlay + centered card, matches Studio dark theme
- Close on Escape, click-outside, or close button

---

## 4. CSS Reconciliation & File Structure

### Problem
`styles.css` defines classes like `field-label`, `field-input`, `props-section-header` but `propertiesPanel.js` generates elements with `props-label`, `props-input`, `props-section-title`. Result: inputs are completely unstyled.

### Fix
Update `propertiesPanel.js` to use the class names already defined in `styles.css`:
- `props-label` → `field-label`
- `props-input` → `field-input`
- `props-row` → `field-row`
- `props-section-title` → `props-section-header`

The CSS already has `props-header` and `props-section` which match — those stay. New control types (select, checkbox, color) will use `field-select`, `field-color` (already in CSS) and a new `field-checkbox` class.

### New files
| File | Purpose |
|------|---------|
| `studio/studioOverlay.js` | `StudioOverlay` class — overlay injection, viewer reparenting |
| `studio/components/modal.js` | Reusable modal dialog (shortcuts, about) |

### Modified files
| File | Changes |
|------|---------|
| `src/components/globi-viewer.js` | Replace `window.open` with dynamic `import()` + `StudioOverlay` |
| `studio/app.js` | Implement stubbed menu actions, add dirty state, add `closeStudio`, extend `handlePropertyChange` for scene-level fields |
| `studio/components/propertiesPanel.js` | Smart controls (selects, checkboxes, color pickers), align CSS class names to `styles.css` |
| `studio/components/menuBar.js` | Add "Close Studio" menu item |
| `studio/styles.css` | Add `field-checkbox` style, modal styles |

---

## Non-goals
- Multi-viewer support (only one viewer can be edited at a time)
- Collaborative editing
- Scene versioning / history persistence beyond undo stack
- Plugin system for custom tools
