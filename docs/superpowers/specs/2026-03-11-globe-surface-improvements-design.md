# Globe Surface Improvements — Design Spec

**Date:** 2026-03-11
**Status:** Draft
**Approach:** A — WebGL Line Geometry for borders, Canvas-textured curved mesh strips for labels

## Problem

1. The globe renders with null textures when no `textureUri` is set, producing visual artifacts instead of an earth image.
2. No country border outlines exist — the surface is just a texture with a lat/lon graticule.
3. No geographic labels (oceans, continents) for orientation.

## Goals

- Earth texture loads by default on init — no example scene required.
- Country outlines render as white polygonal lines over the texture.
- Ocean and continent names render as curved text on the sphere surface.
- All new features are toggleable and backwards-compatible.

---

## 1. Default Texture Fix

### What changes

In `threeGlobeRenderer.js`, after `createEarthMesh()`, immediately load `assets/earth_day_2k.jpg` as the default day texture using the existing `#loadTexture` mechanism.

### Behavior

- On init: load bundled `assets/earth_day_2k.jpg` → apply to `dayTexture` uniform.
- If a scene later provides `planet.textureUri`, it overrides the default.
- Night texture remains optional (no default).
- The path is resolved relative to the component's base URL.

### Files modified

- `src/renderer/threeGlobeRenderer.js` — load default texture in `init()`

---

## 2. Country Border Outlines

### Data source

Natural Earth 110m admin-0 country boundaries GeoJSON (~120KB). Bundled as `assets/ne_110m_countries.geojson`.

### New module: `src/renderer/borderManager.js`

Follows the existing manager pattern (like `graticuleBuilder.js`, `regionManager.js`).

**API:**
```js
class BorderManager {
  update(group, geojsonFeatureCollection, { show })
  dispose()
}
```

**Algorithm:**
1. For each GeoJSON Feature (country polygon/multipolygon):
   - Extract outer ring(s) of each polygon
   - Convert `[lon, lat]` pairs to 3D cartesian via `latLonToCartesian(lat, lon, 1, 0.002)`
   - Build line segment pairs: `[p0, p1, p1, p2, ..., pN-1, p0]`
2. Collect all segments into a single `BufferGeometry`
3. Render as `THREE.LineSegments` with:
   - Color: `#ffffff`
   - Opacity: `0.35`
   - `transparent: true`
   - `depthWrite: false`

**Data loading:**
- `threeGlobeRenderer.js` fetches `assets/ne_110m_countries.geojson` once at init (lazy, non-blocking)
- Caches the parsed GeoJSON
- Passes to `borderManager.update()` when data arrives and on each `renderScene()`

### Schema changes

- `planet.showBorders` (boolean, default `true`) added to `src/scene/schema.js`

### Editor changes

- New checkbox in `editor/index.html`: "Show country borders"
- Wired in `editor/app.js` to set `scene.planet.showBorders`

### Visual style

- White (`#ffffff`), opacity 0.35
- 1px line width (GPU default for `LineBasicMaterial`)
- Altitude offset: 0.002 (above graticule at 0.001, below markers)
- Outlines only — no fill

---

## 3. Ocean & Continent Surface Labels

### Rendering technique

Canvas-textured curved mesh strips on the sphere surface.

For each label:
1. Render the text string onto an offscreen `<canvas>` using Canvas2D API
2. Create a curved quad strip (narrow rectangular mesh following sphere curvature) at the label's geographic position
3. Apply the canvas as a `THREE.CanvasTexture` with `transparent: true`
4. The strip is a child of the globe group (rotates with the earth)

### Curved strip geometry

A series of small quads along a great-circle arc centered on the label's lat/lon:
- Each quad is tangent to the sphere surface at altitude offset 0.003
- Arc length is proportional to text width
- A `heading` parameter (degrees) controls the text's orientation on the surface
- Characters curve naturally because the mesh follows the sphere

### Label data

**Continents:**

| Label | Lat | Lon | Heading | Style |
|-------|-----|-----|---------|-------|
| AFRICA | 0 | 22 | 0° | continent |
| ASIA | 45 | 90 | 0° | continent |
| EUROPE | 52 | 15 | 0° | continent |
| NORTH AMERICA | 45 | -100 | 0° | continent |
| SOUTH AMERICA | -15 | -58 | -20° | continent |
| OCEANIA | -25 | 135 | 0° | continent |
| ANTARCTICA | -82 | 0 | 0° | continent |

**Oceans:**

| Label | Lat | Lon | Heading | Style |
|-------|-----|-----|---------|-------|
| Pacific Ocean | 0 | -160 | -10° | ocean |
| Atlantic Ocean | 15 | -35 | -60° | ocean |
| Indian Ocean | -20 | 75 | -30° | ocean |
| Arctic Ocean | 80 | 0 | 0° | ocean |
| Southern Ocean | -65 | 0 | 0° | ocean |

### New module: `src/renderer/geoLabelManager.js`

**API:**
```js
class GeoLabelManager {
  update(group, { showLabels })
  dispose()
}
```

**Internal methods:**
- `#createCurvedTextMesh(text, lat, lon, heading, style)` — generates canvas texture + curved strip geometry
- `#renderTextToCanvas(text, style)` — draws styled text on offscreen canvas, returns canvas + dimensions

### Visual style

- **Continents:** uppercase, semi-bold, white at opacity ~0.3, letter-spacing via canvas
- **Oceans:** italic, blue-tinted (`rgba(150, 190, 255, 0.3)`), slightly smaller
- Both: `depthWrite: false`, `depthTest: true`
- Backface hidden naturally by sphere occlusion (text faces outward)
- Font: system sans-serif via Canvas2D (no external font dependency)

### Schema changes

- `planet.showLabels` (boolean, default `true`) added to `src/scene/schema.js`

### Editor changes

- New checkbox in `editor/index.html`: "Show geographic labels"
- Wired in `editor/app.js` to set `scene.planet.showLabels`

---

## 4. Integration & Testing

### Files modified

| File | Change |
|------|--------|
| `src/renderer/threeGlobeRenderer.js` | Load default texture at init; integrate border + label managers |
| `src/scene/schema.js` | Add `planet.showBorders`, `planet.showLabels` |
| `editor/index.html` | Add toggle checkboxes |
| `editor/app.js` | Wire toggles to scene |

### New files

| File | Purpose |
|------|---------|
| `src/renderer/borderManager.js` | Country outline rendering from GeoJSON |
| `src/renderer/geoLabelManager.js` | Ocean/continent curved surface text |
| `assets/ne_110m_countries.geojson` | Bundled Natural Earth country boundaries |
| `tests/border-manager.test.js` | Border geometry creation tests |
| `tests/geo-label-manager.test.js` | Label mesh creation/toggle tests |

### Test strategy

- **border-manager.test.js:** Verify line segment geometry creation from GeoJSON input (correct vertex count, line segment structure). Verify toggle removes geometry.
- **geo-label-manager.test.js:** Verify curved mesh strip creation for all 12 labels. Verify correct positions. Verify toggle removes meshes. Verify canvas text rendering produces expected dimensions.
- **Existing tests:** Must remain passing. Schema changes are backwards-compatible (new fields default to `true`).
- **On-device:** Open editor → see earth texture + borders + labels immediately without loading an example.

### Performance

- 110m country data: ~180 countries × ~50 avg vertices = ~9000 line segments — trivial for WebGL
- 12 canvas textures + curved mesh strips — negligible
- GeoJSON lazy-loaded: globe renders instantly, borders appear when data arrives
