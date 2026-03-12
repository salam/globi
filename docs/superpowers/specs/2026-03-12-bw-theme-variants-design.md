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
  atmosphereColor: number[],  // RGB triplet [0,1]
  rimColor: number[],         // Fresnel rim tint RGB [0,1]
  useTextures: boolean,       // false = skip texture loading for wireframe
  desaturate: number,         // 0.0 = full color, 1.0 = full grayscale
  shaded: boolean,            // Depth gradient on sphere surface
  labelStyles: {              // Geo-label text colors per type
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
- useTextures: `true`, desaturate: `0.0`, shaded: `true`
- labelStyles: current colors (white, blue, warm)
- leaderColor: `#f6b73c`, calloutTextColor: current

**wireframe-shaded:**
- background: `0xffffff`, backgroundFlat: `#ffffff`
- borderColor: `0x222222`, borderOpacity: `1.0`
- graticuleColor: `0x999999`, graticuleOpacity: `0.5`, graticuleVisible: `true`
- atmosphereEnabled: `false`
- rimColor: `[0, 0, 0]`
- useTextures: `false`, desaturate: `0.0`, shaded: `true`
- labelStyles: all dark gray/black text
- leaderColor: `#333333`, calloutTextColor: `#222222`

**wireframe-flat:**
- Same as wireframe-shaded except: shaded: `false`

**grayscale-shaded:**
- background: `0xffffff`, backgroundFlat: `#ffffff`
- borderColor: `0x333333`, borderOpacity: `0.8`
- graticuleColor: `0x999999`, graticuleOpacity: `0.3`, graticuleVisible: depends on scene config
- atmosphereEnabled: `false`
- rimColor: `[0.2, 0.2, 0.2]`
- useTextures: `true`, desaturate: `1.0`, shaded: `true`
- labelStyles: dark text
- leaderColor: `#333333`, calloutTextColor: `#222222`

**grayscale-flat:**
- Same as grayscale-shaded except: shaded: `false`

## File Changes

### 1. `src/renderer/themePalette.js` (new)
- Export `getThemePalette(theme)` function
- Export `VALID_THEMES` array for validation

### 2. `src/scene/schema.js`
- Import `VALID_THEMES` from themePalette
- Update `normalizeScene`: map `'dark'`/`'light'` → `'photo'`, validate against `VALID_THEMES`
- Update `validateScene`: theme validation uses `VALID_THEMES`

### 3. `src/renderer/earthBuilder.js`
- Add new GLSL fragment shaders:
  - `EARTH_FRAG_WIREFRAME` — outputs white (or shaded white via Fresnel/NdotV gradient)
  - Modify existing day/night shaders to accept `uniform float desaturate` — mix RGB with luminance
- `createEarthMesh` and `createBodyMesh` accept `{ theme }` option to select shader
- `createAtmosphereMesh` is skipped when `palette.atmosphereEnabled === false`

### 4. `src/renderer/threeGlobeRenderer.js`
- Import `getThemePalette`
- On scene update, resolve palette from `scene.theme`
- Pass palette to: `setClearColor`, earth mesh creation, graticule, border manager, label manager, callout manager, atmosphere toggle
- When `palette.useTextures === false`, skip texture loading and use wireframe shader
- When `palette.desaturate > 0`, pass desaturate uniform to earth shader

### 5. `src/renderer/flatMapRenderer.js`
- Import `getThemePalette`
- Use `palette.backgroundFlat` for canvas clear
- Use `palette.borderColor`/`palette.borderOpacity` for border drawing
- When `palette.desaturate > 0`, apply CSS grayscale filter to texture or draw desaturated

### 6. `src/renderer/borderManager.js`
- Accept `{ color, opacity }` options in `update()` instead of using constants
- Default to current values for backward compat

### 7. `src/renderer/graticuleBuilder.js`
- Accept `{ color, opacity }` options in `createGraticule()` (already does via options — just needs to be wired)

### 8. `src/renderer/geoLabelManager.js`
- Accept label style overrides from palette
- In B&W themes, use dark text instead of the current semi-transparent colored text

### 9. `src/renderer/calloutManager.js`
- Accept `leaderColor` from palette for the default leader line color
- Callout label CSS adapts text color from palette

### 10. `editor/app.js`
- Update theme selector UI to show all 5 options

## Earth Rendering by Theme

### Wireframe (shaded)
- Sphere geometry with no texture
- Fragment shader: `vec3 color = vec3(1.0); float shade = dot(viewDir, normal); color *= 0.6 + 0.4 * shade;`
- Subtle darkening at edges gives 3D depth cue

### Wireframe (flat)
- Same geometry, fragment shader: `gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);`
- Pure white, no depth cue

### Grayscale (shaded/flat)
- Existing texture-based shader with added desaturation:
  ```glsl
  float lum = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 gray = vec3(lum);
  vec3 final = mix(baseColor.rgb, gray, desaturate);
  ```
- Shaded variant keeps existing lighting. Flat variant sets ambient to 1.0 and disables directional light.

## Markers, Arcs, Regions

User-specified content colors are preserved across all themes. These are data, not chrome. The theme only controls the earth surface and its visual infrastructure (borders, grid, atmosphere, labels, callouts).

## Testing

- Unit test `themePalette.js`: each theme returns valid palette, unknown themes fall back to photo
- Unit test schema normalization: `'dark'` → `'photo'`, `'light'` → `'photo'`, all 5 new values pass
- Unit test schema validation: invalid theme names produce errors
- Integration test: verify wireframe mode skips texture loading
- Integration test: verify grayscale shader desaturation
- Visual test in editor: switch between all 5 themes
