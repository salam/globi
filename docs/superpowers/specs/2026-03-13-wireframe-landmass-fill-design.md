# Wireframe Landmass Fill — Design Spec

**Date:** 2026-03-13
**Status:** Approved

## Problem

Wireframe themes (`wireframe-shaded`, `wireframe-flat`) render a plain white/gray sphere with graticule lines and country borders but no filled landmasses. This makes it hard to distinguish land from ocean at a glance.

## Solution

Add a palette-driven `landmassColor` property. When non-null, the renderer fills country polygons from the already-loaded `ne_110m_countries.geojson` with that color. No schema changes; purely visual, driven by theme palette.

## Changes

### 1. `src/renderer/themePalette.js`

Add `landmassColor` to every palette entry:

- `photo`: `null`
- `wireframe-shaded`: `'rgba(200, 200, 200, 0.35)'`
- `wireframe-flat`: `'rgba(210, 210, 210, 0.4)'`
- `grayscale-shaded`: `null`
- `grayscale-flat`: `null`

In `applyTint()`, tint `landmassColor` via `tintCssRgba` when `overlayTint` is set.

### 2. `src/renderer/landmassManager.js` (new file)

A new manager class following the same pattern as `RegionManager`:

- `update(group, geojson, { color })` — clears previous meshes, iterates GeoJSON features, triangulates each polygon ring with earcut, creates `MeshBasicMaterial` meshes with the given color/opacity.
- `dispose()` — cleans up geometry and materials.
- Parses `rgba()` color string to extract color and opacity (reuse the same `parseColor` pattern from `RegionManager`).
- Renders on `DoubleSide`, `transparent: true`, `depthWrite: false`.

### 3. `src/renderer/threeGlobeRenderer.js`

- Import `LandmassManager`.
- Add `#landmassGroup` (Group) and `#landmassManager` (LandmassManager) fields.
- In `init()`: create and add `#landmassGroup` to `globeGroup` (before borders, after the body mesh).
- After border GeoJSON loads: if `palette.landmassColor` is non-null, call `#landmassManager.update(#landmassGroup, data, { color: palette.landmassColor })`.
- In `setScene()` / theme-change path: update landmass fill when palette changes (show/hide based on `landmassColor` being null or not).
- In `dispose()`: dispose the landmass manager.

### 4. Tests

- `tests/theme-palette.test.js` — verify `landmassColor` values for each theme.
- `tests/landmass-manager.test.js` — unit test the manager: update with GeoJSON creates meshes, update with null color clears, dispose cleans up.

## Non-goals

- No schema-level `showLandmasses` option (could be added later).
- No landmass fill for non-Earth bodies.
- No separate landmass GeoJSON — reuses the existing country borders file.
