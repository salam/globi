# Three.js Globe Renderer Migration + Spatially Anchored Callouts

## Summary

Replace the Canvas 2D globe renderer with a full Three.js (WebGL) renderer. Add a spatially anchored callout system where labels radiate outward from the globe center with leader lines. Callout text is rendered as real HTML (CSS2DRenderer) for selectability and screen-reader access.

No backward compatibility with the Canvas 2D renderer — it gets deleted.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Rendering engine | Three.js (WebGL) | GPU-accelerated, ~60 FPS, day/night shaders, atmosphere |
| Callout rendering | CSS2DRenderer (HTML overlay) | Selectable text, screen-reader accessible, CSS-styleable |
| Callout visibility | New `calloutMode` field: `"always"` / `"hover"` / `"click"` / `"none"`, default `"always"` | Content creator control. Named `calloutMode` to avoid collision with existing `callout` field (HTML content). |
| Migration scope | Full — all rendering moves to Three.js | Single pipeline, no multi-layer sync |
| Canvas 2D renderer | Deleted | No backward compat needed |
| Leader lines | WebGL `Line` objects | Avoids the complexity of syncing SVG overlay coordinates with CSS2DRenderer; stays in the single WebGL pipeline |

## Architecture

### Render Layers

1. **WebGL canvas** (Three.js WebGLRenderer) — earth sphere, marker sprites, arcs, paths, regions, graticule, leader lines
2. **CSS2D overlay** (Three.js CSS2DRenderer) — callout labels (HTML divs)

Both layers are stacked inside the `<globe-viewer>` shadow DOM `.stage` element.

### Render Loop

`ThreeGlobeRenderer` owns an internal `requestAnimationFrame` loop:

- `init()` starts the loop
- Each frame: render WebGL scene + CSS2D overlay
- `renderScene(scene)` is called by the controller when scene data changes — it marks the scene dirty and updates Three.js objects (meshes, sprites, labels) on the next frame
- The existing idle rotation rAF loop in `globe-viewer.js` calls `panBy()` which sets a dirty flag; the renderer's own loop picks it up
- `destroy()` stops the loop

This replaces the current imperative "render on every change" model with a continuous loop, which Three.js requires for smooth animation and CSS2D positioning updates.

### Component Map

```
GlobeViewerElement (Web Component, unchanged public API)
  └── GlobeController (orchestration)
        └── ThreeGlobeRenderer (NEW — replaces CanvasGlobeRenderer)
              ├── WebGLRenderer — earth, markers, arcs, paths, regions, leader lines
              ├── CSS2DRenderer — callout labels
              ├── EarthBuilder — sphere + shaders + textures
              ├── MarkerManager — sprites, CSS2D labels for text type
              ├── ArcPathManager — Line2 geometry for arcs and paths
              ├── RegionManager — polygon meshes on sphere surface
              ├── CalloutManager — positioning, collision avoidance, visibility
              └── GraticuleBuilder — LineSegments for lat/lon grid
```

### Public API (unchanged)

The `ThreeGlobeRenderer` implements the same interface as `CanvasGlobeRenderer`:

- `init(container, options)` — creates WebGL + CSS2D renderers, scene, camera. Always creates its own canvas (no `options.canvas` support — the WebGL context is internal).
- `renderScene(scene)` — updates scene objects from data, marks dirty for next frame
- `flyTo(target, options)` — sets camera orbit position
- `panBy(deltaLon, deltaLat)` — rotates globe
- `zoomBy(deltaScale)` — adjusts camera distance
- `hitTest(clientX, clientY)` — Raycaster-based picking
- `projectPointToClient(point)` — geo coord → screen coord
- `getCameraState()` — returns `{ centerLon, centerLat, zoom }` (same semantics as before; internally derived from globe rotation + camera distance)
- `resize(width, height)` — updates renderer + camera aspect
- `destroy()` — stops render loop, disposes all Three.js resources (see Disposal section)

## Earth Sphere

### Geometry
- `SphereGeometry(1, 64, 64)` — unit sphere, 64 segments

### Shader Material
Custom `ShaderMaterial` with uniforms:
- `dayTexture` — equirectangular day map (default: bundled 2K NASA)
- `nightTexture` — city lights map (default: bundled 2K NASA)
- `sunDirection` — vec3, computed from existing `resolveLightVector()`

Fragment shader:
- `smoothstep(-0.15, 0.25, NdotL)` for day/night transition
- Night lights multiplied by 1.4 for brightness
- Fresnel rim lighting: `pow(1.0 - dot(viewDir, normal), 3.0)` tinted blue
- Ambient fill on dark side

### Atmosphere
- Outer `SphereGeometry(1.06, 64, 64)` with `BackSide` rendering
- Fresnel-based transparency, sun-facing side brighter
- `transparent: true, depthWrite: false`

### Textures
- Default day: `assets/earth_day_2k.jpg` (bundled)
- Default night: `assets/earth_night_2k.jpg` (bundled)
- Custom textures via `planet.textureUri` and `planet.nightTextureUri`
- Loaded via `THREE.TextureLoader`, cached per URI
- `colorSpace = THREE.SRGBColorSpace`
- **Fallback on load failure**: render the sphere with a solid `baseColor` gradient (similar to current no-texture behavior). Emit a `textureError` event on the web component.

### Shaders as inline strings
Shader source is defined as template literal strings inside `earthBuilder.js` and the atmosphere builder — no separate `.vert`/`.frag` files. This avoids build-tool dependencies for raw imports and keeps the module self-contained.

### Other Celestial Bodies
Existing `getCelestialPreset()` provides `baseColor`, `textureUri`, `radius`. For non-Earth bodies:
- Day texture only (no night layer)
- Atmosphere color derived from `baseColor`
- Atmosphere can be disabled via `planet.atmosphere: false`

## Callout System

### Data Model

Marker gains two new fields — `calloutMode` and `calloutLabel`:

```js
{
  id: 'zrh',
  lat: 47.37, lon: 8.54,
  visualType: 'dot',
  callout: '<p>Rich HTML content</p>',  // existing field — HTML content for inspect panel
  calloutMode: 'always',                 // NEW: 'always' | 'hover' | 'click' | 'none'
  calloutLabel: {                        // NEW: localized text for the spatial label
    en: 'Zurich Airport',
    de: 'Flughafen Zürich',
  },
}
```

- `callout` (existing) — HTML content shown in the inspect panel on click. Unchanged.
- `calloutMode` (new) — controls the spatial callout label visibility. Default: `'always'`.
- `calloutLabel` (new) — localized text for the spatial label. Default: uses `marker.name`. Resolved via `scene.locale`, falling back to `en`.

### Schema Changes (`src/scene/schema.js`)

`normalizeMarker()` adds:
```js
calloutMode: ['always', 'hover', 'click', 'none'].includes(marker.calloutMode)
  ? marker.calloutMode
  : 'always',
calloutLabel: normalizeLocalizedText(marker.calloutLabel ?? ''),
```

`validateScene()` adds validation for `calloutMode` enum and `calloutLabel` localized text.

### Rendering

Each visible callout consists of:

1. **Anchor dot** — the marker sprite itself (already rendered by MarkerManager)
2. **Leader line** — `THREE.Line` in WebGL, drawn from the marker's 3D position outward along the radial direction (center of globe → marker surface point → extended outward). Line length: `0.25` in world units (≈25% of globe radius).
3. **Label** — `CSS2DObject` containing an HTML `<div>` with the callout text, positioned at the outer endpoint of the leader line (3D world position)

The leader line and label share the same 3D anchor computation:
```
labelPosition = markerPosition + normalize(markerPosition) * 0.25
```

### Collision Avoidance

When multiple callout labels overlap in screen space:
1. Project all label positions to screen coordinates
2. Sort by angular position around the globe center (clockwise from 12 o'clock)
3. For each pair with overlapping bounding boxes, increase the extension distance of the later label by `0.1` world units
4. Maximum 3 extension levels (0.25, 0.35, 0.45). Beyond that, labels are offset perpendicular to the radial direction by ±label height to stack.

### Visibility Logic

- **Backface culling**: compute `dot(normalize(markerPosition), cameraDirection)`. If < 0, the marker is on the far side — hide callout label and leader line (set `CSS2DObject.visible = false`).
- **Callout mode**: `"always"` → show when front-facing. `"hover"` → show on `pointerenter` on the CSS2D label or marker sprite. `"click"` → show on click, dismiss on second click or clicking elsewhere. `"none"` → never show callout label (marker dot still visible).

### Accessibility

- Each callout label has `role="status"` and `aria-label` with the marker name
- Labels are real DOM nodes — keyboard-focusable, screen-reader-announced
- `tabindex="0"` on each callout for keyboard navigation

## Markers

| Type | Three.js Object | Details |
|---|---|---|
| `dot` | `Sprite` with circle texture | Color from `marker.color`, size scaled by camera distance |
| `image` | `Sprite` with loaded texture | From `marker.assetUri` |
| `model` | `Mesh` (triangle geometry) | Color from `marker.color` |
| `text` | `CSS2DObject` (HTML label) | Font, color, outline via CSS |

All markers are added to a `Group` for batch operations.

## Arcs & Paths

- **Arc**: great-circle points with altitude curve → `Line2` geometry (fat lines via `LineGeometry` + `LineMaterial` from Three.js examples/lines)
- **Path**: densified point array → `Line2` geometry
- Both support `color`, `strokeWidth`, `dashPattern` (via `LineMaterial.dashed`)
- Points converted from `(lat, lon, alt)` to 3D cartesian: `x = (1+alt) * cos(lat) * cos(lon)`, etc.

## Regions

GeoJSON polygons are tessellated onto the sphere surface:

1. Convert polygon vertices from `(lon, lat)` to 3D cartesian on the unit sphere
2. Triangulate the polygon using earcut or a similar library
3. For extruded regions (`altitude > 0`): create a shell by duplicating vertices at `radius = 1 + altitude` and connecting with side faces
4. Apply `capColor` to top faces, `sideColor` to side faces

This approach correctly follows the sphere curvature, unlike flat `ExtrudeGeometry`. For very large polygons (continent-sized), additional tessellation subdivides long edges to maintain sphere conformity.

## Graticule

- `LineSegments` with thin semi-transparent lines
- Same lat/lon intervals as current: every 30° latitude, every 30° longitude
- Color: `rgba(190, 216, 255, 0.16)` matching current style

## Camera & Interaction

### Camera Setup
- `PerspectiveCamera(45, aspect, 0.1, 100)`
- Camera is fixed at `(0, 0, 3)` (adjusted by zoom: distance = `3 / zoom`)
- Camera always looks at origin `(0, 0, 0)`
- Globe mesh is at origin

### Globe Rotation Model
The globe mesh rotates to simulate panning. This means:
- `panBy(deltaLon, deltaLat)` → rotate globe mesh around world Y-axis (longitude) and a computed X-axis (latitude)
- `getCameraState()` derives `centerLon`/`centerLat` from the globe's rotation quaternion
- `flyTo(target)` → set globe rotation so target lat/lon faces the camera
- Zoom range: 0.3–4 (same as current), mapped to camera distance: `3 / zoom`

Markers, arcs, paths, regions are children of the globe mesh → they rotate with it. CSS2D labels track their 3D anchors automatically.

### Hit Testing
- `THREE.Raycaster` from camera through click point
- Test against: markers (sprites), arcs (lines with tolerance), paths (lines with tolerance), regions (meshes)
- Returns same `{ kind, id, entity, anchor }` structure as current
- `anchor.clientX/clientY` derived from `CSS2DRenderer` projected coordinates

### WebGL Unavailability
If `WebGLRenderer` creation fails, `init()` throws an error with message `"WebGL is not available"`. The `GlobeViewerElement` catches this and renders a static fallback message in the `.stage` div.

## Disposal

`destroy()` must dispose all GPU resources to prevent memory leaks:

1. Stop the rAF render loop
2. Dispose all geometries (`geometry.dispose()`)
3. Dispose all materials (`material.dispose()`)
4. Dispose all textures (`texture.dispose()`)
5. Remove all CSS2DObjects from the DOM
6. Call `renderer.dispose()` for both WebGL and CSS2D renderers
7. Remove the canvas and CSS2D overlay from the container

## Files

### New Files

| File | Purpose |
|---|---|
| `src/renderer/threeGlobeRenderer.js` | Main renderer class, render loop, public API |
| `src/renderer/earthBuilder.js` | Sphere geometry, shader material (inline GLSL), atmosphere mesh |
| `src/renderer/markerManager.js` | Creates/updates/removes marker sprites and CSS2D text labels |
| `src/renderer/arcPathManager.js` | Creates/updates Line2 geometry for arcs and paths |
| `src/renderer/regionManager.js` | Creates/updates sphere-conforming polygon meshes |
| `src/renderer/calloutManager.js` | Callout label positioning, leader lines, collision avoidance |
| `src/renderer/graticuleBuilder.js` | LineSegments for lat/lon grid |
| `assets/earth_day_2k.jpg` | Default day texture (~1.8 MB) |
| `assets/earth_night_2k.jpg` | Default night texture (~0.8 MB) |

### Modified Files

| File | Changes |
|---|---|
| `src/controller/globeController.js` | Import `ThreeGlobeRenderer` instead of `CanvasGlobeRenderer`; remove direct `renderScene()` calls (renderer has own loop) |
| `src/components/globe-viewer.js` | Add CSS2D overlay container to shadow DOM; catch WebGL init errors; remove idle rotation rAF (renderer loop handles it) |
| `src/scene/schema.js` | Add `calloutMode` and `calloutLabel` to `normalizeMarker()` and `validateScene()` |
| `src/index.js` | Update exports |
| `package.json` | Add `three` dependency |

### Deleted Files

| File | Reason |
|---|---|
| `src/renderer/canvasGlobeRenderer.js` | Replaced by `threeGlobeRenderer.js` |

### Unchanged Files

| File | Reason kept |
|---|---|
| `src/math/sphereProjection.js` | Geo-to-cartesian conversion, inverse projection for hit testing |
| `src/math/solar.js` | Sun position drives shader `sunDirection` uniform |
| `src/math/geo.js` | Great-circle arcs, densify paths |
| `src/scene/*` (except schema.js) | Scene data model unchanged |
| `src/security/sanitize.js` | XSS protection for callout HTML content |

### Removed from Use

| File | Status |
|---|---|
| `src/math/hit.js` | No longer called — hit testing uses `THREE.Raycaster`. Kept in repo but unused; can be deleted in follow-up cleanup. |

## Testing

- Existing unit tests for `sphereProjection`, `solar`, `geo` remain unchanged
- New tests for `ThreeGlobeRenderer`: init/destroy lifecycle, renderScene with various scene configs, WebGL unavailability fallback
- New tests for `CalloutManager`: visibility modes (`always`/`hover`/`click`/`none`), collision avoidance, backface culling
- New tests for `MarkerManager`, `ArcPathManager`, `RegionManager`: create/update/remove cycles
- New tests for schema changes: `calloutMode` normalization and validation
- Integration test: render a scene with markers + callouts, verify DOM contains accessible callout labels with correct text
- Disposal test: init then destroy, verify no DOM nodes or GPU resources leak
