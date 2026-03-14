# Accessibility Marker Descriptions — Design Spec

**Date**: 2026-03-14
**Bug IDs**: BUG34, BUG34b

## Problem

Accessibility outputs (brief/detailed descriptions and dynamic llms.txt) report zero visible markers because:

1. **Property name mismatch** (BUG34): The 3D renderer's `projectPointToClient` returns `{ clientX, clientY, visible }` but `ViewStateQuery.inViewport()` reads `screenPt.x` / `screenPt.y`. Since `x` is always `undefined`, no marker passes the viewport check.
2. **No back-face check**: Points on the far side of the globe still project to valid screen coordinates — they'd incorrectly pass viewport checks even if property names matched.
3. **Missing description content** (BUG34b): Marker `description` and `calloutLabel` fields are never included in accessibility outputs, so even when markers are listed, they only show names without context.

## Approach: Fix at the Renderer Level

### Part 1 — Normalize `projectPointToClient` return shape

**File**: `src/renderer/threeGlobeRenderer.js`

Change `#worldToClient` to return `{ x, y, visible }` instead of `{ clientX, clientY, visible }`.

Add back-face occlusion: when `v.z >= 1` (behind the camera's far plane, meaning behind the globe), return `null`.

Update all internal callers of `#worldToClient` that currently read `.clientX`/`.clientY` to read `.x`/`.y`:
- Callout click handlers (2 locations)
- `hitTest` anchor positions
- `calloutHitTest` anchor position

The flat map renderer already returns `{ x, y }` — no changes needed there.

### Part 2 — Enhance description content

**File**: `src/accessibility/viewDescriber.js`

Add `resolveDescription(marker, locale)` helper returning first non-empty from:
1. `marker.description[locale]` → `marker.description.en`
2. `marker.calloutLabel[locale]` → `marker.calloutLabel.en`
3. `marker.name[locale]` → `marker.name.en`

**Brief descriptions**: Append resolved description in parentheses after marker name, if it differs from the name.
Example: `"Olympus Mons (Largest volcano in the solar system)"`

**Detailed descriptions**: Add resolved description as indented line under each marker.
Example:
```
Olympus Mons (21.9°N, 226.2°E, landmarks)
  Largest volcano in the solar system
```

**File**: `src/io/llmsTxt.js`

Add `desc` field to pipe-delimited marker line, after category. Uses same fallback chain (skipping name since it's already the first field).

## Test Plan

- Unit test: `projectPointToClient` returns `{ x, y }` with correct values for front-facing points
- Unit test: `projectPointToClient` returns `null` for back-face (occluded) points
- Unit test: `getVisibleEntities` correctly identifies front-facing markers as visible
- Unit test: `getVisibleEntities` excludes back-face markers
- Unit test: Brief description includes marker description in parentheses
- Unit test: Detailed description includes marker description as indented line
- Unit test: llms.txt output includes description field for markers
- Unit test: Description fallback chain works: description → calloutLabel → name
