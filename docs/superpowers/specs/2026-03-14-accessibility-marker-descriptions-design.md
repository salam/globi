# Accessibility Marker Descriptions — Design Spec

**Date**: 2026-03-14
**Bug IDs**: BUG34, BUG34b

## Problem

Accessibility outputs (brief/detailed descriptions and dynamic llms.txt) report zero visible markers because:

1. **Property name mismatch** (BUG34): The 3D renderer's `projectPointToClient` delegates to `#worldToClient` which returns `{ clientX, clientY, visible }`, but `ViewStateQuery.inViewport()` reads `screenPt.x` / `screenPt.y`. Since `x` is always `undefined`, no marker passes the viewport check.
2. **No back-face check**: Points on the far side of the globe still project to valid screen coordinates — they'd incorrectly pass viewport checks even if property names matched.
3. **Missing description content** (BUG34b): Marker `description` and `calloutLabel` fields are never included in accessibility outputs, so even when markers are listed, they only show names without context.

## Approach

### Part 1 — Fix property mismatch in `ViewStateQuery.project()` and add occlusion

**Do NOT change `projectPointToClient` or `#worldToClient`** in the 3D renderer. These methods return `{ clientX, clientY, visible }` and are consumed by:
- Callout click handlers (6 call sites of `#worldToClient` in `threeGlobeRenderer.js`)
- `hitTest` and `calloutHitTest` anchor positions
- `editor/app.js` (`resolveInspectAnchor` reads `anchor.clientX`/`anchor.clientY`)
- `src/renderer/attributionManager.js` (`isPointVisible` reads `.clientX`, `.clientY`, `.visible`)
- The public `projectPointToClient()` API on `<globi-viewer>`

Changing these would be a breaking change with wide blast radius.

**Fix in `ViewStateQuery.project()` instead** (`src/accessibility/viewStateQuery.js`):

1. Call `this.#renderer.projectPointToClient(...)` as before.
2. If result is null, return null.
3. **Normalize property names**: If result has `clientX`/`clientY` (3D renderer), map to `{ x: result.clientX, y: result.clientY }`. If result already has `x`/`y` (flat map renderer), pass through.
4. `inViewport()` already reads `.x`/`.y` — no changes needed there.

**Add back-face occlusion in `ViewStateQuery.project()`**:

After getting the screen point, check the `visible` property if present. The 3D renderer's `#worldToClient` already computes `visible = v.z < 1` (point in front of far plane). While this doesn't perfectly detect globe occlusion, it catches the most egregious cases. For a more precise check:

- Add a `isPointOccluded(lat, lon)` method to the 3D renderer that performs a **dot-product test**: compute the cartesian position of the point (with globe rotation applied), then check `dot(worldPos, cameraPosition) <= 0` — if true, the point is on the back hemisphere and occluded by the globe. Return null from `ViewStateQuery.project()` for occluded points.
- The flat map renderer has no occlusion (all points are always visible in flat projections), so it needs no equivalent method.

`ViewStateQuery.project()` checks: if `this.#renderer.isPointOccluded` exists and returns true → return null.

### Part 2 — Enhance description content

**File**: `src/accessibility/viewDescriber.js`

Add `resolveDescription(marker, locale)` helper returning first non-empty from:
1. `marker.description[locale]` → `marker.description.en`
2. `marker.calloutLabel[locale]` → `marker.calloutLabel.en`
3. `marker.name[locale]` → `marker.name.en`

The `description` field already exists in the marker schema (`schema.js` line 61) and is normalized/validated. Existing markers without a `description` will naturally fall through to `calloutLabel` or `name`.

**Brief descriptions**: Append resolved description in parentheses after marker name, if it differs from the name.
Example: `"Olympus Mons (Largest volcano in the solar system)"`

**Detailed descriptions**: Add resolved description as indented line under each marker entry, only if it differs from the name.
Example:
```
Olympus Mons (21.9°N, 226.2°E, landmarks)
  Largest volcano in the solar system
```

**File**: `src/io/llmsTxt.js`

Add `desc` field to pipe-delimited marker line, after category. Uses same fallback chain (`description` → `calloutLabel`), skipping `name` since it's already the first field. Each file has its own inline fallback logic (consistent with existing `resolveName` pattern).

## Test Plan

- Unit test: `ViewStateQuery.project()` returns `{ x, y }` for 3D renderer results with `{ clientX, clientY }`
- Unit test: `ViewStateQuery.project()` passes through `{ x, y }` for flat map renderer results
- Unit test: `isPointOccluded` returns true for back-face points (dot product <= 0)
- Unit test: `isPointOccluded` returns false for front-face points (dot product > 0)
- Unit test: `getVisibleEntities` correctly identifies front-facing markers as visible
- Unit test: `getVisibleEntities` excludes back-face markers
- Unit test: Brief description includes marker description in parentheses
- Unit test: Detailed description includes marker description as indented line
- Unit test: llms.txt output includes description field for markers
- Unit test: Description fallback chain works: description → calloutLabel → name
