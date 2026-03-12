# Black & White Theme Variants

## Summary

Add four new theme variants alongside the existing photorealistic theme. The new themes render the earth in black-and-white styles — either as line-art wireframes or as desaturated grayscale textures — with shaded or flat sub-variants.

## Theme Values

The `scene.theme` field changes from `'dark' | 'light'` to a 5-value enum:

| Value | Description |
|-------|-------------|
| `photo` | Current photorealistic rendering. Dark space background, satellite textures, blue atmosphere. Default. |
| `wireframe-shaded` | White background, no textures. White sphere with subtle edge-darkening depth gradient. Black country borders and lat/lon grid. No atmosphere. |
| `wireframe-flat` | White background, no textures. Completely flat white sphere. Black country borders and lat/lon grid. No atmosphere. |
| `grayscale-shaded` | White background, desaturated satellite texture with depth shading. Black country borders. No atmosphere. |
| `grayscale-flat` | White background, desaturated satellite texture, no shading. Black country borders. No atmosphere. |

Backward compatibility: `'dark'` and `'light'` are normalized to `'photo'` during scene normalization.

## Architecture

### New module: `src/renderer/themePalette.js`

Central module that maps each theme name to a complete set of visual constants. Every renderer reads from this palette instead of using hardcoded colors.

```
getThemePalette(theme) → {
  background: number,         // WebGL clear color (hex)
  backgroundFlat: string,     // Canvas 2D background (CSS)
  borderColor: number,        // Country border line color
  borderOpacity: number,
  graticuleColor: number,     // Lat/lon grid color
  graticuleOpacity: number,
  graticuleVisible: boolean,  // Show grid (always on for wireframe)
  atmosphereEnabled: boolean, // Blue atmosphere glow
  atmosphereColor: number[],  // RGB triplet [0,1] — present for all themes, ignored when atmosphereEnabled=false
  rimColor: number[],         // Fresnel rim tint RGB [0,1]
  useTextures: boolean,       // false = skip texture loading for wireframe
  desaturate: number,         // 0.0 = full color, 1.0 = full grayscale
  shaded: boolean,            // Depth gradient on sphere surface
  flatLighting: boolean,      // true = ambient-only (no directional), false = normal lighting
  labelStyles: {              // Geo-label text colors per type (exact CSS fillStyle values)
    continent: string,
    ocean: string,
    region: string,
    feature: string,
  },
  leaderColor: string,        // Callout leader line default color
  calloutTextColor: string,   // Callout label text color
}
```

### Palette values by theme

**photo:**
- background: `0x020b18`, backgroundFlat: `#0a0e1a`
- borderColor: `0xffffff`, borderOpacity: `0.35`
- graticuleColor: `0xbed8ff`, graticuleOpacity: `0.16`, graticuleVisible: depends on scene config
- atmosphereEnabled: `true`, atmosphereColor: `[0.3, 0.6, 1.0]`
- rimColor: `[0.3, 0.5, 1.0]`
- useTextures: `true`, desaturate: `0.0`, shaded: `true`, flatLighting: `false`
- labelStyles: `{ continent: 'rgba(255, 255, 255, 0.3)', ocean: 'rgba(150, 190, 255, 0.3)', region: 'rgba(255, 255, 255, 0.3)', feature: 'rgba(255, 220, 150, 0.35)' }`
- leaderColor: `#f6b73c`, calloutTextColor: `rgba(255, 255, 255, 0.9)`

**wireframe-shaded:**
- background: `0xffffff`, backgroundFlat: `#ffffff`
- borderColor: `0x222222`, borderOpacity: `1.0`
- graticuleColor: `0x999999`, graticuleOpacity: `0.5`, graticuleVisible: `true`
- atmosphereEnabled: `false`, atmosphereColor: `[0, 0, 0]` (unused but present)
- rimColor: `[0, 0, 0]`
- useTextures: `false`, desaturate: `0.0`, shaded: `true`, flatLighting: `false`
- labelStyles: `{ continent: 'rgba(34, 34, 34, 0.5)', ocean: 'rgba(68, 68, 68, 0.4)', region: 'rgba(34, 34, 34, 0.5)', feature: 'rgba(51, 51, 51, 0.45)' }`
- leaderColor: `#333333`, calloutTextColor: `rgba(34, 34, 34, 0.9)`

**wireframe-flat:**
- Same as wireframe-shaded except: shaded: `false`

**grayscale-shaded:**
- background: `0xffffff`, backgroundFlat: `#ffffff`
- borderColor: `0x333333`, borderOpacity: `0.8`
- graticuleColor: `0x999999`, graticuleOpacity: `0.3`, graticuleVisible: depends on scene config
- atmosphereEnabled: `false`, atmosphereColor: `[0, 0, 0]` (unused but present)
- rimColor: `[0.2, 0.2, 0.2]`
- useTextures: `true`, desaturate: `1.0`, shaded: `true`, flatLighting: `false`
- labelStyles: `{ continent: 'rgba(34, 34, 34, 0.5)', ocean: 'rgba(68, 68, 68, 0.4)', region: 'rgba(34, 34, 34, 0.5)', feature: 'rgba(51, 51, 51, 0.45)' }`
- leaderColor: `#333333`, calloutTextColor: `rgba(34, 34, 34, 0.9)`

**grayscale-flat:**
- Same as grayscale-shaded except: shaded: `false`, flatLighting: `true`

## Runtime Theme Switching

Theme changes trigger a **full scene rebuild** — the same path as changing planets. This is the simplest correct approach given that:
- `BorderManager` has a `#built` flag that prevents re-rendering
- `GeoLabelManager` caches rendered label textures
- Earth mesh shaders are baked at creation time

When `scene.theme` changes:
1. `threeGlobeRenderer` detects the change (compare previous vs current theme)
2. Calls `dispose()` on border manager, geo label manager, callout manager
3. Rebuilds earth mesh with appropriate shader
4. Rebuilds atmosphere mesh (or skips if `atmosphereEnabled === false`)
5. Rebuilds graticule with new palette colors
6. Re-renders borders and labels with new palette

This is the same teardown/rebuild cycle already used when switching planets.

## File Changes

### 1. `src/renderer/themePalette.js` (new)
- Export `getThemePalette(theme)` function
- Export `VALID_THEMES` array: `['photo', 'wireframe-shaded', 'wireframe-flat', 'grayscale-shaded', 'grayscale-flat']`
- Unknown themes fall back to `'photo'`

### 2. `src/scene/schema.js`
- Import `VALID_THEMES` from themePalette
- Update `createEmptyScene()`: change default theme from `'dark'` to `'photo'`
- Update `normalizeScene()`: map legacy `'dark'`/`'light'` → `'photo'`, pass through any value in `VALID_THEMES`, default unknown to `'photo'`
- Update `validateScene()`: validate pre-normalization value — accept `VALID_THEMES` plus legacy `'dark'`/`'light'` (since normalization handles those). Error message lists valid values.

### 3. `src/renderer/earthBuilder.js`
- Add `EARTH_FRAG_WIREFRAME_SHADED` shader:
  ```glsl
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);
    float shade = dot(viewDir, normal);
    vec3 color = vec3(0.6 + 0.4 * shade);
    gl_FragColor = vec4(color, 1.0);
  }
  ```
- Add `EARTH_FRAG_WIREFRAME_FLAT` shader: outputs `vec4(1.0)` (pure white)
- Modify `EARTH_FRAG_DAY_NIGHT` and `EARTH_FRAG_DAY_ONLY`:
  - Add `uniform float desaturate;` (default 0.0)
  - Add `uniform float flatLighting;` (default 0.0)
  - Convert existing hardcoded rim `vec3(0.3, 0.5, 1.0)` to `uniform vec3 rimColor;`
  - After computing baseColor: `float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114)); base.rgb = mix(base.rgb, vec3(lum), desaturate);`
  - For flat lighting: `float lightMix = mix(dayNightBlend, 1.0, flatLighting);` — when flatLighting=1.0, treat everything as fully day-lit
- `createEarthMesh()` accepts new options: `{ desaturate, rimColor, flatLighting, wireframeMode }`
  - `wireframeMode === 'shaded'` → use `EARTH_FRAG_WIREFRAME_SHADED`
  - `wireframeMode === 'flat'` → use `EARTH_FRAG_WIREFRAME_FLAT`
  - Otherwise use existing texture shaders with new uniforms

### 4. `src/renderer/threeGlobeRenderer.js`
- Import `getThemePalette`
- Store `#currentTheme` to detect changes
- On scene update: resolve palette, compare with previous theme
- If theme changed: trigger full rebuild (dispose + recreate earth, atmosphere, borders, labels, graticule)
- Pass palette values to: `setClearColor(palette.background)`, earth mesh creation, graticule builder, border manager, label manager, callout manager
- When `palette.atmosphereEnabled === false`: skip atmosphere mesh creation
- When `palette.useTextures === false`: skip texture loading, use wireframe shader

### 5. `src/renderer/flatMapRenderer.js`
- Import `getThemePalette`
- Use `palette.backgroundFlat` for canvas clear
- Use `palette.borderColor`/`palette.borderOpacity` for border drawing
- For grayscale desaturation: use `ctx.filter = 'grayscale(1)'` scoped to the texture draw call only (`ctx.save()` → set filter → draw texture → `ctx.restore()`). This preserves colored markers/arcs drawn afterward. The `filter` property is supported in all modern browsers (Chrome 52+, Firefox 49+, Safari 17.5+).

### 6. `src/renderer/borderManager.js`
- Accept `{ color, opacity }` options in `update()`: `update(group, geojson, { show, color, opacity })`
- Default `color` to `BORDER_COLOR`, `opacity` to `BORDER_OPACITY` for backward compat
- No need for in-place material update — theme switches trigger `dispose()` + rebuild (see Runtime Theme Switching)

### 7. `src/renderer/graticuleBuilder.js`
- Already accepts `{ color, opacity }` via options — just needs to be wired from threeGlobeRenderer with palette values

### 8. `src/renderer/geoLabelManager.js`
- Accept `{ labelStyles }` option in its update/build method
- When provided, override the `STYLES` object's `fillStyle` values per label type
- The mechanism: pass palette's `labelStyles` map into the manager; it merges with defaults before rendering

### 9. `src/renderer/calloutManager.js`
- Accept `{ leaderColor, textColor }` options
- Use `leaderColor` as fallback when marker has no explicit color
- Apply `textColor` to callout label CSS

### 10. `editor/app.js`
- Update theme selector UI to show all 5 options with labels:
  - Photo Realistic, Wireframe (Shaded), Wireframe (Flat), Grayscale (Shaded), Grayscale (Flat)

## Earth Rendering by Theme

### Wireframe (shaded)
- Sphere geometry with no texture
- Fragment shader uses NdotV (view-space): `float shade = dot(viewDir, normal); color = vec3(0.6 + 0.4 * shade);`
- Edges appear darker, center appears bright white — 3D depth cue

### Wireframe (flat)
- Same geometry, fragment shader: `gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);`
- Pure white, zero depth cue

### Grayscale (shaded)
- Existing texture-based day/night shader with `desaturate = 1.0`
- Normal lighting (sun direction, fresnel rim) preserved but rim color changed to dark gray
- Desaturation applied after lighting: `float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114)); base.rgb = mix(base.rgb, vec3(lum), desaturate);`

### Grayscale (flat)
- Same as shaded but with `flatLighting = 1.0`
- Day/night blending forced to full-day: entire globe evenly lit
- Combined with `desaturate = 1.0`: produces uniform grayscale map with no directional shadows

## Markers, Arcs, Regions

User-specified content colors are preserved across all themes. These are data, not chrome. The theme only controls the earth surface and its visual infrastructure (borders, grid, atmosphere, labels, callouts).

## Testing

- Unit test `themePalette.js`: each theme returns valid palette with all expected keys, unknown themes fall back to photo
- Unit test schema normalization: `'dark'` → `'photo'`, `'light'` → `'photo'`, all 5 new values pass through unchanged
- Unit test schema validation: invalid theme names produce errors, legacy `'dark'`/`'light'` still accepted
- Unit test `createEmptyScene()`: default theme is `'photo'`
- Unit test earthBuilder: wireframe shaders compile and produce expected output
- Unit test earthBuilder: desaturate/flatLighting uniforms are accepted
- Integration test: verify wireframe mode skips texture loading
- Integration test: verify grayscale shader desaturation
- Integration test: theme switch triggers full rebuild (border/label managers disposed and recreated)
- Visual test in editor: switch between all 5 themes
