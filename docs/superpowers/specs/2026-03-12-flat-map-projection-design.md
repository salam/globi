# Flat Map Projection Mode

**Date:** 2026-03-12
**Status:** Approved

## Summary

Add a flat map projection mode as an alternative to the 3D globe. The flat map renders the same scene data (markers, arcs, paths, regions, borders, labels) onto a 2D canvas using configurable map projections. The default projection is Azimuthal Equidistant, centered on the current pan position, creating a situational/tactical map feel. Users can switch between globe and flat map instantly via a UI toggle or programmatically.

## Requirements

- **Projection types:** Azimuthal Equidistant (default), Orthographic, Equirectangular — extensible for future additions
- **Mode switching:** Both a UI toggle button and a programmatic scene config property (`scene.projection`)
- **Instant switch:** No transition animation between globe and flat map
- **Zoom behavior:** Zoom out to see the full projection, zoom in for a situational window. Same `[0.3, 4]` range.
- **All celestial bodies:** Works with all 13 planets/moons, not Earth-only
- **Altitude handling:** Flatten onto surface with visual hints — arcs use opacity/thickness to suggest altitude, elevated markers get shadow offset
- **Parity:** Same markers, arcs, paths, regions, borders, geo labels, graticule, callouts, filtering, search, legend, time filter, themes

## Architecture: Separate 2D Canvas Renderer

A new `FlatMapRenderer` renders to a 2D `<canvas>`, completely separate from the Three.js globe renderer. Both renderers share the same `SceneStore` and `GlobeController` interface.

**Rationale:** Map projections are fundamentally 2D operations. A dedicated 2D renderer avoids fighting the 3D pipeline, keeps projection math clean, and is trivially extensible with new projection types.

## 1. Projection System

Location: `src/math/projections/`

### Interface

Every projection implements three functions:

```javascript
project(lat, lon, centerLat, centerLon) → { x, y }
// Returns normalized coordinates. Range depends on projection.

inverse(x, y, centerLat, centerLon) → { lat, lon } | null
// Returns geographic coords for a point, or null if outside valid area.

isVisible(lat, lon, centerLat, centerLon) → boolean
// Whether the point is within the projection's visible area.
```

### Implementations

- **`azimuthalEquidistant.js`** — Default. Projects onto a disc where radial distance equals great-circle distance from center. Full globe visible (disc radius = pi). Distortion grows toward edges but center area is highly intuitive.
- **`orthographic.js`** — Hemisphere-only disc. Points behind the center are clipped (`isVisible` returns false). Looks like the globe seen from space.
- **`equirectangular.js`** — Rectangular. `x = lon - centerLon` (wrapped), `y = lat`. Simple, full-globe visible, but heavy polar distortion.

Each is a plain object (no classes). A registry in `index.js` maps projection name strings to implementations.

## 2. FlatMapRenderer

Location: `src/renderer/flatMapRenderer.js`

### Canvas Setup

- Creates its own `<canvas>` element, sized to container
- 2D context (`getContext('2d')`)
- DPI-aware (devicePixelRatio scaling)
- Separate CSS overlay div for interactive callout labels

### Render Pipeline (per frame)

1. Clear canvas
2. Draw re-projected planet texture
3. Draw graticule (projected lat/lon grid)
4. Draw borders (projected GeoJSON line segments)
5. Draw regions (projected GeoJSON polygons, filled)
6. Draw paths (densified waypoints, projected, connected as polylines)
7. Draw arcs (great-circle interpolated, projected, altitude opacity hints)
8. Draw markers (projected position, visual type rendering)
9. Draw geo labels (projected, zoom-scaled text)
10. Position CSS overlay callout labels

### Sub-Renderers

Each rendering concern is a separate module:

| Module | Responsibility |
|--------|---------------|
| `flatMapTextureProjector.js` | Texture re-projection with offscreen canvas caching |
| `flatMapMarkerRenderer.js` | 2D marker drawing + altitude shadow hints |
| `flatMapArcPathRenderer.js` | 2D arc/path polylines + altitude opacity hints |
| `flatMapRegionRenderer.js` | 2D polygon fill |
| `flatMapBorderRenderer.js` | 2D border line segments |
| `flatMapGeoLabelRenderer.js` | 2D text labels, zoom-scaled |
| `flatMapGraticuleRenderer.js` | 2D lat/lon grid lines |
| `flatMapCalloutRenderer.js` | CSS overlay label positioning |

### Texture Re-Projection

- For each canvas pixel: `inverse(x, y)` to get `(lat, lon)`, then sample the equirectangular source texture at the corresponding `(u, v)`
- Uses an offscreen canvas for re-projection work, blits to main canvas
- Cached until center or zoom changes
- During drag: re-project at reduced resolution for smoothness, full resolution on drag-end

## 3. Controller & Mode Switching

### Schema Addition

```javascript
scene.projection: 'globe' | 'azimuthalEquidistant' | 'orthographic' | 'equirectangular'
// Default: 'globe'
```

Any non-`'globe'` value activates the flat map renderer with the named projection.

### Controller Behavior

- `GlobeController` holds both `threeGlobeRenderer` and `flatMapRenderer`
- Both stay instantiated (no teardown/rebuild on switch)
- Switching: toggle CSS visibility of canvases, trigger render on the newly active one
- `panBy()`, `zoomBy()`, `flyTo()` work identically for both — they update `centerLat`/`centerLon` and zoom
- Switching preserves center and zoom — user sees the same area in both views

## 4. User Interaction

### Panning

- Mouse drag → screen `(dx, dy)` → `inverse()` to compute geographic delta → `panBy(deltaLon, deltaLat)`
- Re-centering invalidates texture cache
- Smooth drag: re-project at reduced resolution during drag, full resolution on release

### Zooming

- Mouse wheel / pinch adjusts zoom (`[0.3, 4]` range)
- Zoom controls degrees of globe visible (~hemisphere at 1.0, city-scale at 4.0, most of globe at 0.3)
- Zoom into cursor: adjust center toward cursor's lat/lon while zooming in (web-map-style UX)

### Click / Hover

- Canvas pixel → `inverse(x, y)` → `(lat, lon)` → hit-test against markers, regions, paths
- Same `inspectSelect`, `markerClick` events as globe
- Callout hover/click behavior identical

### Keyboard

- Arrow keys → `panBy()`, +/- → `zoomBy()` — no changes, works via controller

### Idle Rotation

- Disabled in flat map mode

## 5. Visual Rendering Details

### Markers

| Type | Flat map rendering |
|------|-------------------|
| `dot` | Filled circle, same color/size |
| `image` | Image sprite at projected position, zoom-scaled |
| `model` | Falls back to `dot` (3D models don't translate to 2D) |
| `text` | Anchor point for callout |

- **Altitude hint:** Shadow ellipse at surface position, marker offset upward on screen. Shadow opacity proportional to altitude.
- **Pulse animation:** Expanding circle with fading opacity (canvas equivalent of sprite ring)

### Arcs

- Interpolate via `greatCircleArc()`, project each point, draw as polyline
- **Altitude hint:** Line opacity varies — thickest/most opaque at midpoint (peak altitude), thinner at endpoints
- Dashed patterns via canvas `setLineDash()`

### Paths

- Densify via `densifyPath()`, project waypoints, draw as polyline
- Same stroke width, color, dash support

### Regions

- Project GeoJSON polygon vertices, fill with canvas path
- Same fill color + opacity

### Borders

- Project GeoJSON segments, thin lines (white, 35% opacity)

### Geo Labels

- Project center position, draw with `fillText()`
- Font size scales with zoom, same style per type (continent, ocean, feature)

### Graticule

- Project lat/lon grid as polylines, same spacing and style

## 6. UI Integration

### Toggle Button

- New button in viewer controls bar (alongside fullscreen, legend toggle)
- Globe icon when in flat mode (click for 3D), map icon when in globe mode (click for flat)
- Tooltip: "Switch to map view" / "Switch to globe view"

### Viewer UI Config

```javascript
viewerUi.showProjectionToggle: true  // default, controls button visibility
```

### What stays the same in flat map mode

- Body selector, marker filter, search, legend, time filter
- Compass (click recenters on 0, 0)
- Scale bar (recalculated for projection — distance per pixel at center)
- Fullscreen (works on active canvas)
- Theme (light/dark background, text, grid colors)

### What changes

- Inspect mode uses 2D `inverse()` instead of raycasting
- No atmosphere or ring rendering (surface features only)

## 7. File Structure

### New Files

```
src/math/projections/
  index.js                        # Registry: name -> projection
  azimuthalEquidistant.js         # Default flat projection
  orthographic.js                 # Hemisphere disc
  equirectangular.js              # Rectangular plate carree

src/renderer/
  flatMapRenderer.js              # 2D canvas renderer (core)
  flatMapTextureProjector.js      # Texture re-projection + caching
  flatMapMarkerRenderer.js        # 2D markers + altitude shadows
  flatMapArcPathRenderer.js       # 2D arcs/paths + altitude hints
  flatMapRegionRenderer.js        # 2D polygon fill
  flatMapBorderRenderer.js        # 2D border lines
  flatMapGeoLabelRenderer.js      # 2D text labels
  flatMapGraticuleRenderer.js     # 2D grid lines
  flatMapCalloutRenderer.js       # 2D callout positioning

tests/
  projections.test.js             # Projection math tests
  flat-map-renderer.test.js       # Renderer integration tests
```

### Modified Files

```
src/controller/globeController.js   # Dual renderer instantiation, projection switching
src/components/globe-viewer.js      # Toggle button, dual canvas management
src/scene/schema.js                 # projection field + validation
src/scene/viewerUi.js               # showProjectionToggle config
```

## Non-Goals (Explicit)

- Transition animations between globe and flat map (deferred)
- 3D model rendering on flat map (falls back to dot)
- Atmosphere / ring rendering on flat map
- Idle rotation on flat map
