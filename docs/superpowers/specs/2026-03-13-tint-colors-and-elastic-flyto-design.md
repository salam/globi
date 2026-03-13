# Tint Colors & Elastic flyTo — Design Spec

**Date**: 2026-03-13
**Type**: Framework feature + example integration

## Summary

Two framework-level features:

1. **Scene-level tint colors** — two optional hex colors (`surfaceTint`, `overlayTint`) that re-hue all theme palette colors automatically. Lets content authors customize the visual tone without defining a full custom theme.
2. **Elastic flyTo with zoom arc** — opt-in `zoomArc: true` option on `flyTo()` that animates zoom alongside lat/lon, dipping proportionally to travel distance for a natural "pull back, rotate, push in" feel.

Both features are demonstrated in the Battle of Midway scrollytelling example.

## Feature A: surfaceTint / overlayTint

### Schema

Two new optional properties on the scene object:

```json
{
  "theme": "wireframe-shaded",
  "surfaceTint": "#d4c5a0",
  "overlayTint": "#5c4a2e"
}
```

- Both accept 7-character hex color strings (`/^#[0-9a-fA-F]{6}$/`).
- `null` or omitted means no tint — theme defaults apply unchanged.
- Added to `createEmptyScene()` as `null`.
- Validated in `validateScene()`.

### Blending Algorithm (HSL hue/saturation replacement)

1. Parse the tint hex into HSL (hue, saturation, lightness).
2. For each palette color being tinted, convert to HSL.
3. Replace hue and saturation with the tint's H/S; keep original lightness.
4. Convert back to the palette's native format (hex number, CSS string, or RGB array).

### surfaceTint applies to

- `background` (hex number for WebGL `setClearColor`)
- `backgroundFlat` (CSS string for 2D canvas)
- `atmosphereColor` (RGB array `[r, g, b]`)
- `rimColor` (RGB array `[r, g, b]`)

### overlayTint applies to

- `borderColor` (hex number)
- `graticuleColor` (hex number)
- `leaderColor` (CSS hex string)
- `calloutTextColor` (CSS rgba string)
- `labelStyles` — all entries: continent, ocean, region, feature (CSS rgba strings)

### What is NOT tinted

Per-entity colors on markers, paths, arcs, and regions. Those are content-author colors and stay as-is.

### Navigation HUD Refactor

The nav HUD (`src/components/navigationHud.js`) currently has hardcoded white colors in inline CSS. To make it tint-aware:

1. Replace hardcoded color values with CSS custom properties: `--hud-fg`, `--hud-bg`.
2. `globi-viewer` sets these properties on the HUD container element whenever the palette changes — derived from `overlayTint` if present, otherwise from the theme's defaults.

### Files Touched

| File | Change |
|------|--------|
| `src/scene/schema.js` | Add `surfaceTint`, `overlayTint` to `createEmptyScene()` + validation |
| `src/renderer/themePalette.js` | Add `applyTint(palette, surfaceTint, overlayTint)` helper, extend `getThemePalette()` signature |
| `src/renderer/threeGlobeRenderer.js` | Pass tint params when calling `getThemePalette()` |
| `src/renderer/flatMapRenderer.js` | Pass tint params when calling `getThemePalette()` |
| `src/components/navigationHud.js` | CSS custom properties for colors |
| `src/components/globi-viewer.js` | Set HUD color properties from palette |

## Feature B: Elastic flyTo with Zoom Arc

### API

```js
viewer.flyTo({
  lat: 28.2, lon: -178.5, zoom: 4,
  durationMs: 2000,
  zoomArc: true    // new, optional, default false
});
```

When `zoomArc: false` (default), behavior is unchanged — zoom is set instantly, only lat/lon animate.

### Zoom Arc Formula

At each frame with progress `t` (0→1, after easing):

```
angularDistance = haversine(startLat, startLon, endLat, endLon) in degrees
dipFraction = clamp(angularDistance / 60, 0.05, 0.35)
dip = dipFraction * startZoom
zoomOffset = -dip * sin(π * t)
currentZoom = lerp(startZoom, targetZoom, eased_t) + zoomOffset
```

- Short hops (few degrees): ~5% zoom dip, barely noticeable.
- Medium pans (~30°): ~17% dip, smooth pull-back feel.
- Long pans (60°+): ~35% dip, dramatic pull-back-and-push-in.

### Files Touched

| File | Change |
|------|--------|
| `src/components/cameraTween.js` | Add `interpolateZoomArc(startZoom, endZoom, angularDist, t)` |
| `src/components/globi-viewer.js` | `#animateFocusTo()` reads `zoomArc` option, animates zoom per frame |

## Battle of Midway Integration

1. Scene gains `surfaceTint: '#d4c5a0'` (warm beige) and `overlayTint: '#5c4a2e'` (dark brown).
2. All `flyTo()` calls in step transitions pass `zoomArc: true`.

**File touched:** `examples/battle-of-midway.html`

## Testing

- Unit test for HSL tint blending: input palette + tint → output palette with correct hues.
- Unit test for `interpolateZoomArc`: verify dip at t=0, t=0.5, t=1 for various angular distances.
- Unit test for schema validation: `surfaceTint` and `overlayTint` accepted/rejected correctly.
- Manual verification: Battle of Midway example renders with warm tones and smooth zoom arcs.
