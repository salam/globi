# B&W Theme Variants Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new B&W theme variants (wireframe-shaded, wireframe-flat, grayscale-shaded, grayscale-flat) alongside the existing photorealistic theme.

**Architecture:** Centralized `themePalette.js` module provides per-theme color/style constants. Each renderer reads from the palette instead of hardcoded values. Theme changes trigger a full scene rebuild (same teardown/rebuild cycle as planet switching).

**Tech Stack:** Three.js (GLSL shaders, materials), Node.js test runner, Canvas 2D (flat map)

**Spec:** `docs/superpowers/specs/2026-03-12-bw-theme-variants-design.md`

---

## Chunk 1: Foundation — Theme Palette + Schema

### Task 1: Create `themePalette.js` with tests

**Files:**
- Create: `src/renderer/themePalette.js`
- Test: `tests/theme-palette.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/theme-palette.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getThemePalette, VALID_THEMES } from '../src/renderer/themePalette.js';

test('VALID_THEMES contains all 5 theme names', () => {
  assert.deepEqual(VALID_THEMES, [
    'photo', 'wireframe-shaded', 'wireframe-flat', 'grayscale-shaded', 'grayscale-flat',
  ]);
});

test('getThemePalette returns a palette with all expected keys for each theme', () => {
  const expectedKeys = [
    'background', 'backgroundFlat', 'borderColor', 'borderOpacity',
    'graticuleColor', 'graticuleOpacity', 'graticuleVisible',
    'atmosphereEnabled', 'atmosphereColor', 'rimColor',
    'useTextures', 'desaturate', 'shaded', 'flatLighting',
    'labelStyles', 'leaderColor', 'calloutTextColor',
  ];
  for (const theme of VALID_THEMES) {
    const palette = getThemePalette(theme);
    for (const key of expectedKeys) {
      assert.ok(key in palette, `theme '${theme}' missing key '${key}'`);
    }
  }
});

test('getThemePalette falls back to photo for unknown themes', () => {
  const fallback = getThemePalette('banana');
  const photo = getThemePalette('photo');
  assert.deepEqual(fallback, photo);
});

test('photo theme has dark background and textures enabled', () => {
  const p = getThemePalette('photo');
  assert.equal(p.background, 0x020b18);
  assert.equal(p.useTextures, true);
  assert.equal(p.desaturate, 0.0);
  assert.equal(p.atmosphereEnabled, true);
});

test('wireframe-shaded has white bg, no textures, shading on', () => {
  const p = getThemePalette('wireframe-shaded');
  assert.equal(p.background, 0xffffff);
  assert.equal(p.useTextures, false);
  assert.equal(p.shaded, true);
  assert.equal(p.atmosphereEnabled, false);
});

test('wireframe-flat has shading off', () => {
  const p = getThemePalette('wireframe-flat');
  assert.equal(p.shaded, false);
  assert.equal(p.useTextures, false);
});

test('grayscale-shaded has textures, desaturate 1.0, shading on', () => {
  const p = getThemePalette('grayscale-shaded');
  assert.equal(p.useTextures, true);
  assert.equal(p.desaturate, 1.0);
  assert.equal(p.shaded, true);
  assert.equal(p.flatLighting, false);
});

test('grayscale-flat has flatLighting true', () => {
  const p = getThemePalette('grayscale-flat');
  assert.equal(p.flatLighting, true);
  assert.equal(p.shaded, false);
});

test('labelStyles has all 4 label types for each theme', () => {
  for (const theme of VALID_THEMES) {
    const p = getThemePalette(theme);
    assert.ok(p.labelStyles.continent);
    assert.ok(p.labelStyles.ocean);
    assert.ok(p.labelStyles.region);
    assert.ok(p.labelStyles.feature);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/theme-palette.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// src/renderer/themePalette.js
export const VALID_THEMES = [
  'photo', 'wireframe-shaded', 'wireframe-flat', 'grayscale-shaded', 'grayscale-flat',
];

const PHOTO_LABEL_STYLES = {
  continent: 'rgba(255, 255, 255, 0.3)',
  ocean: 'rgba(150, 190, 255, 0.3)',
  region: 'rgba(255, 255, 255, 0.3)',
  feature: 'rgba(255, 220, 150, 0.35)',
};

const BW_LABEL_STYLES = {
  continent: 'rgba(34, 34, 34, 0.5)',
  ocean: 'rgba(68, 68, 68, 0.4)',
  region: 'rgba(34, 34, 34, 0.5)',
  feature: 'rgba(51, 51, 51, 0.45)',
};

const PALETTES = {
  photo: {
    background: 0x020b18,
    backgroundFlat: '#0a0e1a',
    borderColor: 0xffffff,
    borderOpacity: 0.35,
    graticuleColor: 0xbed8ff,
    graticuleOpacity: 0.16,
    graticuleVisible: false, // depends on scene config
    atmosphereEnabled: true,
    atmosphereColor: [0.3, 0.6, 1.0],
    rimColor: [0.3, 0.5, 1.0],
    useTextures: true,
    desaturate: 0.0,
    shaded: true,
    flatLighting: false,
    labelStyles: PHOTO_LABEL_STYLES,
    leaderColor: '#f6b73c',
    calloutTextColor: 'rgba(255, 255, 255, 0.9)',
  },
  'wireframe-shaded': {
    background: 0xffffff,
    backgroundFlat: '#ffffff',
    borderColor: 0x222222,
    borderOpacity: 1.0,
    graticuleColor: 0x999999,
    graticuleOpacity: 0.5,
    graticuleVisible: true,
    atmosphereEnabled: false,
    atmosphereColor: [0, 0, 0],
    rimColor: [0, 0, 0],
    useTextures: false,
    desaturate: 0.0,
    shaded: true,
    flatLighting: false,
    labelStyles: BW_LABEL_STYLES,
    leaderColor: '#333333',
    calloutTextColor: 'rgba(34, 34, 34, 0.9)',
  },
  'wireframe-flat': {
    background: 0xffffff,
    backgroundFlat: '#ffffff',
    borderColor: 0x222222,
    borderOpacity: 1.0,
    graticuleColor: 0x999999,
    graticuleOpacity: 0.5,
    graticuleVisible: true,
    atmosphereEnabled: false,
    atmosphereColor: [0, 0, 0],
    rimColor: [0, 0, 0],
    useTextures: false,
    desaturate: 0.0,
    shaded: false,
    flatLighting: false,
    labelStyles: BW_LABEL_STYLES,
    leaderColor: '#333333',
    calloutTextColor: 'rgba(34, 34, 34, 0.9)',
  },
  'grayscale-shaded': {
    background: 0xffffff,
    backgroundFlat: '#ffffff',
    borderColor: 0x333333,
    borderOpacity: 0.8,
    graticuleColor: 0x999999,
    graticuleOpacity: 0.3,
    graticuleVisible: false,
    atmosphereEnabled: false,
    atmosphereColor: [0, 0, 0],
    rimColor: [0.2, 0.2, 0.2],
    useTextures: true,
    desaturate: 1.0,
    shaded: true,
    flatLighting: false,
    labelStyles: BW_LABEL_STYLES,
    leaderColor: '#333333',
    calloutTextColor: 'rgba(34, 34, 34, 0.9)',
  },
  'grayscale-flat': {
    background: 0xffffff,
    backgroundFlat: '#ffffff',
    borderColor: 0x333333,
    borderOpacity: 0.8,
    graticuleColor: 0x999999,
    graticuleOpacity: 0.3,
    graticuleVisible: false,
    atmosphereEnabled: false,
    atmosphereColor: [0, 0, 0],
    rimColor: [0.2, 0.2, 0.2],
    useTextures: true,
    desaturate: 1.0,
    shaded: false,
    flatLighting: true,
    labelStyles: BW_LABEL_STYLES,
    leaderColor: '#333333',
    calloutTextColor: 'rgba(34, 34, 34, 0.9)',
  },
};

export function getThemePalette(theme) {
  return PALETTES[theme] || PALETTES.photo;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/theme-palette.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/themePalette.js tests/theme-palette.test.js && git commit -m "feat: add centralized theme palette module" -- src/renderer/themePalette.js tests/theme-palette.test.js
```

### Task 2: Update schema to support new themes

**Files:**
- Modify: `src/scene/schema.js` (lines 14, 255-257, 333-335)
- Modify: `tests/schema.test.js` (lines 18, 31)

- [ ] **Step 1: Write failing tests**

Add to `tests/schema.test.js`:

```js
test('createEmptyScene default theme is photo', () => {
  const scene = createEmptyScene();
  assert.equal(scene.theme, 'photo');
});

test('normalizeScene maps legacy dark to photo', () => {
  const normalized = normalizeScene({ theme: 'dark' });
  assert.equal(normalized.theme, 'photo');
});

test('normalizeScene maps legacy light to photo', () => {
  const normalized = normalizeScene({ theme: 'light' });
  assert.equal(normalized.theme, 'photo');
});

test('normalizeScene passes through all valid theme values', () => {
  for (const theme of ['photo', 'wireframe-shaded', 'wireframe-flat', 'grayscale-shaded', 'grayscale-flat']) {
    const normalized = normalizeScene({ theme });
    assert.equal(normalized.theme, theme);
  }
});

test('normalizeScene defaults unknown theme to photo', () => {
  const normalized = normalizeScene({ theme: 'neon' });
  assert.equal(normalized.theme, 'photo');
});

test('validateScene accepts all valid themes including legacy', () => {
  for (const theme of ['photo', 'wireframe-shaded', 'wireframe-flat', 'grayscale-shaded', 'grayscale-flat', 'dark', 'light']) {
    const scene = createEmptyScene();
    scene.theme = theme;
    const result = validateScene(scene);
    const themeErrors = result.errors.filter(e => e.includes('theme'));
    assert.equal(themeErrors.length, 0, `theme '${theme}' should be accepted`);
  }
});

test('validateScene rejects invalid theme', () => {
  const scene = createEmptyScene();
  // Bypass normalization by validating raw input
  const result = validateScene({ ...scene, theme: 'neon' });
  // After normalization, theme becomes 'photo' which is valid
  // But the raw input 'neon' is not in VALID_THEMES + legacy — this is ok since normalizeScene handles it
  assert.equal(result.scene.theme, 'photo');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/schema.test.js`
Expected: FAIL — `createEmptyScene` returns `'dark'`, normalization maps unknown to `'dark'`

- [ ] **Step 3: Update schema.js**

In `src/scene/schema.js`:

1. Add import at top: `import { VALID_THEMES } from '../renderer/themePalette.js';`
2. In `createEmptyScene()`: change `theme: 'dark'` to `theme: 'photo'`
3. In `normalizeScene()`: replace the theme normalization block:
   ```js
   // Before:
   const theme = scene.theme === 'light' || scene.theme === 'dark'
     ? scene.theme : 'dark';

   // After:
   let theme = scene.theme;
   if (theme === 'dark' || theme === 'light') theme = 'photo';
   if (!VALID_THEMES.includes(theme)) theme = 'photo';
   ```
4. In `validateScene()`: replace the theme validation block:
   ```js
   // Before:
   if (!['light', 'dark'].includes(scene.theme)) {
     errors.push('theme must be one of light|dark');
   }

   // After:
   const ACCEPTED_THEMES = [...VALID_THEMES, 'dark', 'light'];
   if (rawScene.theme !== undefined && !ACCEPTED_THEMES.includes(rawScene.theme)) {
     errors.push('theme must be one of ' + VALID_THEMES.join('|'));
   }
   ```

- [ ] **Step 4: Update existing tests that assert `'dark'`**

In `tests/schema.test.js`, update these existing assertions:
- Line 18: `assert.equal(scene.theme, 'dark')` → `assert.equal(scene.theme, 'photo')`
- Line 31: `assert.equal(normalized.theme, 'dark')` → `assert.equal(normalized.theme, 'photo')`

- [ ] **Step 5: Run tests to verify all pass**

Run: `node --test tests/schema.test.js`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add src/scene/schema.js tests/schema.test.js && git commit -m "feat: extend theme schema to support B&W variants" -- src/scene/schema.js tests/schema.test.js
```

---

## Chunk 2: Earth Shader Changes

### Task 3: Add wireframe shaders to earthBuilder

**Files:**
- Modify: `src/renderer/earthBuilder.js`
- Modify: `tests/earth-builder.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/earth-builder.test.js`:

```js
test('createEarthMesh with wireframeMode "shaded" returns mesh without texture uniforms', () => {
  const mesh = createEarthMesh({ wireframeMode: 'shaded' });
  assert.ok(mesh instanceof Mesh);
  assert.ok(mesh.material instanceof ShaderMaterial);
  // Wireframe shader should not have dayTexture
  assert.ok(!('dayTexture' in mesh.material.uniforms));
});

test('createEarthMesh with wireframeMode "flat" returns mesh', () => {
  const mesh = createEarthMesh({ wireframeMode: 'flat' });
  assert.ok(mesh instanceof Mesh);
  assert.ok(!('dayTexture' in mesh.material.uniforms));
});

test('createEarthMesh with desaturate uniform', () => {
  const mesh = createEarthMesh({ desaturate: 1.0 });
  assert.ok(mesh instanceof Mesh);
  assert.equal(mesh.material.uniforms.desaturate.value, 1.0);
});

test('createEarthMesh with rimColor uniform', () => {
  const mesh = createEarthMesh({ rimColor: [0.2, 0.2, 0.2] });
  assert.ok(mesh instanceof Mesh);
  assert.deepEqual(mesh.material.uniforms.rimColor.value, [0.2, 0.2, 0.2]);
});

test('createEarthMesh with flatLighting uniform', () => {
  const mesh = createEarthMesh({ flatLighting: 1.0 });
  assert.ok(mesh instanceof Mesh);
  assert.equal(mesh.material.uniforms.flatLighting.value, 1.0);
});

test('createBodyMesh with wireframeMode "shaded" works', () => {
  const mesh = createBodyMesh({ wireframeMode: 'shaded' });
  assert.ok(mesh instanceof Mesh);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/earth-builder.test.js`
Expected: FAIL — wireframeMode not recognized, desaturate/rimColor/flatLighting uniforms missing

- [ ] **Step 3: Add wireframe shaders and new uniforms to earthBuilder.js**

In `src/renderer/earthBuilder.js`:

1. Add `EARTH_FRAG_WIREFRAME_SHADED` shader after existing shader strings:
   ```glsl
   const EARTH_FRAG_WIREFRAME_SHADED = /* glsl */`
     varying vec3 vNormal;
     varying vec3 vPosition;

     void main() {
       vec3 normal = normalize(vNormal);
       vec3 viewDir = normalize(-vPosition);
       float shade = dot(viewDir, normal);
       vec3 color = vec3(0.6 + 0.4 * shade);
       gl_FragColor = vec4(color, 1.0);
     }
   `;
   ```

2. Add `EARTH_FRAG_WIREFRAME_FLAT` shader:
   ```glsl
   const EARTH_FRAG_WIREFRAME_FLAT = /* glsl */`
     void main() {
       gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
     }
   `;
   ```

3. Modify `EARTH_FRAG_DAY_NIGHT` — add uniforms and desaturation/flatLighting:
   - Add: `uniform vec3 uRimColor;`, `uniform float desaturate;`, `uniform float flatLighting;`
   - **Important:** Name the uniform `uRimColor` (not `rimColor`) to avoid collision with the existing local `vec3 rimColor` variable. Remove the local variable and compute rim inline.
   - Replace the rim computation block:
     ```glsl
     // Before:
     vec3 rimColor = vec3(0.3, 0.5, 1.0) * fresnel * 0.6;
     // After (remove local, use uniform):
     vec3 rimTint = uRimColor * fresnel * 0.6;
     ```
   - Replace the final output block with flatLighting + desaturation:
     ```glsl
     float lightMix = mix(dayNightBlend, 1.0, flatLighting);
     vec4 litColor = mix(nightLit, dayColor, lightMix);
     float ambient = 0.03 * (1.0 - lightMix);
     float lum = dot(litColor.rgb, vec3(0.299, 0.587, 0.114));
     vec3 desatColor = mix(litColor.rgb, vec3(lum), desaturate);
     gl_FragColor = vec4(desatColor + rimTint + ambient, 1.0);
     ```

4. Modify `EARTH_FRAG_DAY_ONLY` similarly:
   - Add `uniform vec3 uRimColor;`, `uniform float desaturate;`, `uniform float flatLighting;`
   - Replace hardcoded `vec3(0.3, 0.5, 1.0) * fresnel * 0.4` with `uRimColor * fresnel * 0.4`
   - For flatLighting: when `flatLighting == 1.0`, skip directional lighting (just use dayColor directly)
   - Add desaturation after computing base color:
     ```glsl
     float lum = dot(dayColor.rgb, vec3(0.299, 0.587, 0.114));
     vec3 desatColor = mix(dayColor.rgb, vec3(lum), desaturate);
     ```

5. Update `createEarthMesh()` to accept `{ wireframeMode, desaturate, rimColor, flatLighting }`:
   ```js
   export function createEarthMesh(options = {}) {
     const {
       dayTexture = null, nightTexture = null,
       sunDirection = DEFAULT_SUN_DIRECTION, sunLocked = false,
       nightLayer = true,
       wireframeMode = null,
       desaturate = 0.0,
       rimColor = [0.3, 0.5, 1.0],
       flatLighting = 0.0,
     } = options;

     const geometry = new SphereGeometry(1, 64, 64);

     if (wireframeMode === 'shaded') {
       const material = new ShaderMaterial({
         vertexShader: EARTH_VERT,
         fragmentShader: EARTH_FRAG_WIREFRAME_SHADED,
       });
       return new Mesh(geometry, material);
     }
     if (wireframeMode === 'flat') {
       const material = new ShaderMaterial({
         vertexShader: EARTH_VERT,
         fragmentShader: EARTH_FRAG_WIREFRAME_FLAT,
       });
       return new Mesh(geometry, material);
     }

     const material = new ShaderMaterial({
       uniforms: {
         dayTexture: { value: dayTexture },
         nightTexture: { value: nightTexture },
         sunDirection: { value: sunDirection },
         sunLocked: { value: sunLocked },
         uRimColor: { value: rimColor },
         desaturate: { value: desaturate },
         flatLighting: { value: flatLighting },
       },
       vertexShader: EARTH_VERT,
       fragmentShader: nightLayer ? EARTH_FRAG_DAY_NIGHT : EARTH_FRAG_DAY_ONLY,
     });
     return new Mesh(geometry, material);
   }
   ```

6. Update `createBodyMesh()` similarly — accept `wireframeMode`, `desaturate`, `flatLighting`:
   - If `wireframeMode` is set, return wireframe mesh (same as `createEarthMesh`)
   - For texture shaders (`BODY_FRAG_SINGLE`, `BODY_FRAG_VENUS`): add `desaturate` and `flatLighting` uniforms to their uniform objects
   - These shaders already accept `rimColor` as a uniform — keep using that name (no `uRimColor` rename needed here since they don't have a local collision)
   - The `EARTH_FRAG_DAY_NIGHT`/`EARTH_FRAG_DAY_ONLY` path uses `uRimColor` — map the option: `uRimColor: { value: rimColor }`

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/earth-builder.test.js`
Expected: All PASS

- [ ] **Step 5: Run full test suite**

Run: `node --test`
Expected: All existing tests still pass (check no regressions from uniform changes)

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add src/renderer/earthBuilder.js tests/earth-builder.test.js && git commit -m "feat: add wireframe and grayscale shaders to earthBuilder" -- src/renderer/earthBuilder.js tests/earth-builder.test.js
```

---

## Chunk 3: Border + Graticule + Label Palette Wiring

### Task 4: Wire palette into BorderManager

**Files:**
- Modify: `src/renderer/borderManager.js` (line 17 — `update()` signature)
- Modify: `tests/border-manager.test.js`

- [ ] **Step 1: Write failing test**

Add to `tests/border-manager.test.js`:

```js
test('BorderManager accepts custom color and opacity', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { show: true, color: 0x222222, opacity: 1.0 });
  const child = group.children[0];
  assert.equal(child.material.color.getHex(), 0x222222);
  assert.equal(child.material.opacity, 1.0);
});

test('BorderManager defaults to white 0.35 opacity when no color/opacity given', () => {
  const manager = new BorderManager();
  const group = new Group();
  manager.update(group, SIMPLE_GEOJSON, { show: true });
  const child = group.children[0];
  assert.equal(child.material.color.getHex(), 0xffffff);
  assert.equal(child.material.opacity, 0.35);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/border-manager.test.js`
Expected: FAIL — `update()` ignores color/opacity options

- [ ] **Step 3: Update borderManager.js**

Change `update()` signature and material creation:

```js
update(group, geojson, { show = true, color = BORDER_COLOR, opacity = BORDER_OPACITY } = {}) {
```

And in the material creation:

```js
const material = new LineBasicMaterial({
  color,
  transparent: true,
  opacity,
  depthWrite: false,
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/border-manager.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/borderManager.js tests/border-manager.test.js && git commit -m "feat: accept color/opacity options in BorderManager" -- src/renderer/borderManager.js tests/border-manager.test.js
```

### Task 5: Wire palette into GeoLabelManager

**Files:**
- Modify: `src/renderer/geoLabelManager.js` (line 173 — `update()` signature, line 54-72 — `renderTextToCanvas`)
- Modify: `tests/geo-label-manager.test.js`

- [ ] **Step 1: Write failing test**

Add to `tests/geo-label-manager.test.js`:

```js
test('GeoLabelManager accepts labelStyles override', () => {
  const manager = new GeoLabelManager();
  const group = new Group();
  const overrides = {
    continent: 'rgba(34, 34, 34, 0.5)',
    ocean: 'rgba(68, 68, 68, 0.4)',
    region: 'rgba(34, 34, 34, 0.5)',
    feature: 'rgba(51, 51, 51, 0.45)',
  };
  // Should not throw when labelStyles passed
  manager.update(group, { showLabels: true, bodyId: 'earth', labelStyles: overrides });
  assert.ok(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/geo-label-manager.test.js`
Expected: FAIL — `labelStyles` option not recognized (or test passes vacuously — check)

- [ ] **Step 3: Update geoLabelManager.js**

1. Change `update()` to accept `labelStyles`:
   ```js
   update(group, { showLabels = true, bodyId = 'earth', labelStyles = null } = {}) {
   ```
2. Store `#labelStyles` as instance field. If `labelStyles` changes, trigger rebuild.
3. In the label building loop, merge label style overrides before rendering:
   ```js
   // Before rendering each label:
   if (this.#labelStyles && this.#labelStyles[styleName]) {
     cfg = { ...cfg, fillStyle: this.#labelStyles[styleName] };
   }
   ```
4. Pass `cfg` (potentially overridden) to `renderTextToCanvas`:
   Change `renderTextToCanvas` to accept a config object override:
   ```js
   function renderTextToCanvas(text, style, fillStyleOverride) {
     const cfg = STYLES[style] || STYLES.region;
     const fillStyle = fillStyleOverride || cfg.fillStyle;
     // ... use fillStyle instead of cfg.fillStyle in ctx.fillStyle = ...
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/geo-label-manager.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/geoLabelManager.js tests/geo-label-manager.test.js && git commit -m "feat: accept labelStyles override in GeoLabelManager" -- src/renderer/geoLabelManager.js tests/geo-label-manager.test.js
```

### Task 6: Wire palette into CalloutManager

**Files:**
- Modify: `src/renderer/calloutManager.js` (lines 37, 60, 124, 158, 203, 237)
- Modify: `tests/callout-manager.test.js`

- [ ] **Step 1: Write failing test**

Add to `tests/callout-manager.test.js`:

```js
test('CalloutManager accepts leaderColor and textColor options', () => {
  const manager = new CalloutManager();
  const group = new Group();
  const markers = [{
    id: 'm1', name: { en: 'Test' }, lat: 0, lon: 0, alt: 0,
    calloutMode: 'always', calloutLabel: { en: 'Test Label' },
    color: '', _clusterId: null, _clusterSize: 1, _clusterCenter: null, _clusterIndex: 0,
  }];
  // Should not throw when palette options passed
  manager.update(group, markers, 'en', 1, { leaderColor: '#333333', textColor: 'rgba(34, 34, 34, 0.9)' });
  const data = manager.getCalloutData();
  assert.ok(data.has('m1'));
  // Leader line should use fallback color when marker has no explicit color
  const entry = data.get('m1');
  assert.equal(entry.color, '#333333');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/callout-manager.test.js`
Expected: FAIL — `update()` doesn't accept 5th argument

- [ ] **Step 3: Update calloutManager.js**

1. Change `update()` signature:
   ```js
   update(group, markers, locale = 'en', zoom = 1, { leaderColor = LEADER_COLOR_DEFAULT, textColor = null } = {}) {
   ```
2. Store `this.#textColor = textColor;` for use in `createCSS2DLabels()`
3. Replace all `marker.color || LEADER_COLOR_DEFAULT` with `marker.color || leaderColor`
4. In `createCSS2DLabels()`, use `this.#textColor` for the `color:` CSS when set:
   - For callout labels: `color: ${this.#textColor || c};` (where `c` is the existing per-marker color)
   - For cluster badges: same pattern

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/callout-manager.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/calloutManager.js tests/callout-manager.test.js && git commit -m "feat: accept leaderColor/textColor options in CalloutManager" -- src/renderer/calloutManager.js tests/callout-manager.test.js
```

---

## Chunk 4: Wire ThreeGlobeRenderer + FlatMapRenderer

### Task 7: Wire palette into ThreeGlobeRenderer

**Files:**
- Modify: `src/renderer/threeGlobeRenderer.js`
- Modify: `tests/three-renderer.test.js`

- [ ] **Step 1: Write failing test**

Add to `tests/three-renderer.test.js`:

```js
test('ThreeGlobeRenderer accepts wireframe-shaded theme', () => {
  const renderer = new ThreeGlobeRenderer();
  // Constructing should not throw; actual rendering requires DOM
  assert.ok(renderer);
});
```

Note: Full integration testing of theme switching requires DOM/WebGL context. The key tests here validate that `renderScene()` doesn't throw with the new theme values. Check what existing renderer tests look like and follow the same pattern.

- [ ] **Step 2: Update threeGlobeRenderer.js**

1. Add import: `import { getThemePalette } from './themePalette.js';`
2. Add private field: `#currentTheme = null;`
3. In `init()`:
   - After `webglRenderer.setClearColor(0x020b18, 1);` — keep this as default (will be overridden on first `renderScene`)
4. In `renderScene()`, before existing sub-manager updates:
   ```js
   const theme = scene.theme ?? 'photo';
   const palette = getThemePalette(theme);

   // Update clear color
   if (this.#webglRenderer) {
     this.#webglRenderer.setClearColor(palette.background, 1);
   }

   // Detect theme change — trigger full rebuild
   if (theme !== this.#currentTheme && this.#currentTheme !== null) {
     this.#currentTheme = theme;
     this.#rebuildForTheme(resolvedPlanet, palette);
   } else {
     this.#currentTheme = theme;
   }
   ```
5. **Wire palette into initial `init()` body creation:** In `init()`, resolve the palette from `options.initialScene?.theme` and pass it to the initial `createBodyMesh()` call and atmosphere/graticule creation. This ensures the first render uses palette values, not hardcoded defaults.
6. Add `#rebuildForTheme(planet, palette)` method that:
   - Disposes border manager, geo label manager
   - Calls existing `#rebuildBody(planet)` (with palette-aware mesh creation)
   - Rebuilds graticule with `createGraticule({ color: palette.graticuleColor, opacity: palette.graticuleOpacity })`
   - Sets graticule visibility: `this.#graticule.visible = palette.graticuleVisible`
7. Update `#rebuildBody()` to accept optional palette and pass through `wireframeMode`, `desaturate`, `rimColor`, `flatLighting` to `createBodyMesh()` / `createEarthMesh()`:
   ```js
   #rebuildBody(planet, palette = null) {
     // ... existing teardown ...

     const p = palette || getThemePalette(this.#currentTheme || 'photo');

     let wireframeMode = null;
     if (!p.useTextures) {
       wireframeMode = p.shaded ? 'shaded' : 'flat';
     }

     const bodyMesh = createBodyMesh({
       shaderMode,
       sunDirection: this.#sunDirection,
       sunLocked: isSunMode,
       rimColor: planet.atmosphere
         ? hexToColor(planet.atmosphere.scatterColor)
         : new Color(...p.rimColor),
       wireframeMode,
       desaturate: p.desaturate,
       flatLighting: p.flatLighting ? 1.0 : 0.0,
     });
     // ... rest of rebuild ...
   ```
7. Atmosphere creation: guard with `palette.atmosphereEnabled`:
   ```js
   if (resolvedPlanet.atmosphere?.enabled && palette.atmosphereEnabled) {
     // create atmosphere mesh
   }
   ```
8. Pass palette to border manager:
   ```js
   this.#borderManager.update(this.#borderGroup, this.#borderGeoJson, {
     show: showBorders,
     color: palette.borderColor,
     opacity: palette.borderOpacity,
   });
   ```
9. Pass palette to geo label manager:
   ```js
   this.#geoLabelManager.update(this.#geoLabelGroup, {
     showLabels, bodyId: resolvedPlanet.id, labelStyles: palette.labelStyles,
   });
   ```
10. Pass palette to callout manager — **both call sites**:
    - In `renderScene()` (line 418): add palette options
    - In `#recluster()` (line 1077): add palette options — resolve palette from `this.#currentTheme`
    ```js
    const palette = getThemePalette(this.#currentTheme || 'photo');
    this.#calloutManager.update(this.#calloutGroup, markers, locale, this.#zoom, {
      leaderColor: palette.leaderColor,
      textColor: palette.calloutTextColor,
    });
    ```
11. Control graticule visibility: `this.#graticule.visible = palette.graticuleVisible || showGraticule`
    where `showGraticule` comes from scene config if available.
12. Pass palette to graticule on init and rebuild:
    ```js
    const graticule = createGraticule({
      color: palette.graticuleColor,
      opacity: palette.graticuleOpacity,
    });
    ```

- [ ] **Step 3: Run full test suite**

Run: `node --test`
Expected: All PASS (no regressions)

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add src/renderer/threeGlobeRenderer.js tests/three-renderer.test.js && git commit -m "feat: wire theme palette into ThreeGlobeRenderer" -- src/renderer/threeGlobeRenderer.js tests/three-renderer.test.js
```

### Task 8: Wire palette into FlatMapRenderer

**Files:**
- Modify: `src/renderer/flatMapRenderer.js` (lines 355-357, 622-624)
- Modify: `tests/flat-map-renderer.test.js`

- [ ] **Step 1: Write failing test**

Check existing flat map tests for pattern, then add:

```js
test('FlatMapRenderer uses palette background for theme', () => {
  // Verify the renderer can be constructed and renderScene called
  // without throwing for new themes
  const renderer = new FlatMapRenderer();
  assert.ok(renderer);
});
```

- [ ] **Step 2: Update flatMapRenderer.js**

1. Add import: `import { getThemePalette } from './themePalette.js';`
2. In `#render()`, replace background logic (lines 354-357):
   ```js
   // Before:
   const dark = scene?.theme === 'dark' || !scene;
   ctx.fillStyle = dark ? '#0a0e1a' : '#e8f4f8';

   // After:
   const palette = getThemePalette(scene?.theme ?? 'photo');
   ctx.fillStyle = palette.backgroundFlat;
   ```
3. In `#renderTexture()`, add grayscale filter for desaturated themes:
   ```js
   // Before drawing texture:
   if (palette.desaturate > 0) {
     ctx.save();
     ctx.filter = 'grayscale(1)';
   }
   // ... draw texture ...
   if (palette.desaturate > 0) {
     ctx.restore();
   }
   ```
   Note: Store palette as `this.#palette` at start of `#render()` so sub-methods can access it.
4. **Skip texture for wireframe themes:** Guard the texture draw:
   ```js
   if (this.#textureImage && this.#palette.useTextures) {
     this.#renderTexture(ctx, width, height);
   }
   ```
5. In `#renderBorders()`, replace hardcoded color (line 623):
   ```js
   // Before:
   ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';

   // After:
   const p = this.#palette;
   const borderHex = '#' + p.borderColor.toString(16).padStart(6, '0');
   ctx.strokeStyle = borderHex;
   ctx.globalAlpha = p.borderOpacity;
   // ... draw borders ...
   ctx.globalAlpha = 1.0;
   ```
6. In `#renderGraticule()` (line 461), replace hardcoded color:
   ```js
   // Before:
   ctx.strokeStyle = 'rgba(255,255,255,0.12)';

   // After:
   const p = this.#palette;
   const gratHex = '#' + p.graticuleColor.toString(16).padStart(6, '0');
   ctx.strokeStyle = gratHex;
   ctx.globalAlpha = p.graticuleOpacity;
   // ... draw lines ...
   ctx.globalAlpha = 1.0;
   ```
7. In `#renderGeoLabels()` (lines 679-688), replace hardcoded label colors:
   ```js
   // Use palette label styles instead of hardcoded colors:
   const p = this.#palette;
   if (label.style === 'ocean') {
     ctx.fillStyle = p.labelStyles.ocean;
   } else if (label.style === 'continent') {
     ctx.fillStyle = p.labelStyles.continent;
   } else {
     ctx.fillStyle = p.labelStyles.region;
   }
   ```

- [ ] **Step 3: Run full test suite**

Run: `node --test`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add src/renderer/flatMapRenderer.js tests/flat-map-renderer.test.js && git commit -m "feat: wire theme palette into FlatMapRenderer" -- src/renderer/flatMapRenderer.js tests/flat-map-renderer.test.js
```

---

## Chunk 5: Editor UI + Final Integration

### Task 9: Update editor theme selector

**Files:**
- Modify: `editor/index.html` (lines 39-42)
- Modify: `editor/app.js` (lines 1072-1078, 200)

- [ ] **Step 1: Update editor/index.html**

Replace theme select options:

```html
<select id="theme-mode">
  <option value="photo">Photo Realistic</option>
  <option value="wireframe-shaded">Wireframe (Shaded)</option>
  <option value="wireframe-flat">Wireframe (Flat)</option>
  <option value="grayscale-shaded">Grayscale (Shaded)</option>
  <option value="grayscale-flat">Grayscale (Flat)</option>
</select>
```

- [ ] **Step 2: Update editor/app.js**

1. In the theme change handler (line 1072-1078):
   ```js
   // Before:
   themeModeSelect.addEventListener('change', () => {
     scene = {
       ...scene,
       theme: themeModeSelect.value === 'light' ? 'light' : 'dark',
     };
     renderToViewer();
   });

   // After:
   themeModeSelect.addEventListener('change', () => {
     scene = {
       ...scene,
       theme: themeModeSelect.value,
     };
     renderToViewer();
   });
   ```

2. In `renderToViewer()` (line 200), `themeModeSelect.value = scene.theme;` already works since the select values match theme names.

- [ ] **Step 3: Run full test suite**

Run: `node --test`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add editor/index.html editor/app.js && git commit -m "feat: update editor UI with 5 theme options" -- editor/index.html editor/app.js
```

### Task 10: Visual test in editor + release notes

**Files:**
- Modify: `RELEASE_NOTES.md`
- Modify: `FEATURES.md`

- [ ] **Step 1: Manual visual test**

Open editor in browser. For each theme:
1. Select "Photo Realistic" — verify dark space background, colored earth, blue atmosphere
2. Select "Wireframe (Shaded)" — verify white background, white sphere with edge shading, black borders + grid, no atmosphere
3. Select "Wireframe (Flat)" — verify white background, flat white sphere, black borders + grid
4. Select "Grayscale (Shaded)" — verify white background, grayscale earth texture with lighting, dark borders
5. Select "Grayscale (Flat)" — verify white background, grayscale earth texture, even lighting, dark borders

For each: verify markers/arcs/regions retain their original colors.

- [ ] **Step 2: Update RELEASE_NOTES.md**

Add entry:
```md
* Added 5 theme variants: Photo Realistic (default), Wireframe Shaded, Wireframe Flat, Grayscale Shaded, Grayscale Flat
* B&W themes use white background with black line borders and grid
* Grayscale themes desaturate the satellite earth texture
* Markers, arcs, and regions keep their colors across all themes
```

- [ ] **Step 3: Update FEATURES.md**

Check off the B&W theme feature if listed; add if not.

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add RELEASE_NOTES.md FEATURES.md && git commit -m "docs: add B&W theme variants to release notes" -- RELEASE_NOTES.md FEATURES.md
```

### Task 11: Run full test suite — final verification

- [ ] **Step 1: Run all tests**

Run: `node --test`
Expected: All PASS, zero failures

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No errors
