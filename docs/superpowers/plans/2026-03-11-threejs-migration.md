# Three.js Globe Renderer Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Canvas 2D globe renderer with a Three.js WebGL renderer featuring day/night textures, atmospheric glow, and spatially anchored callouts with accessible HTML labels.

**Architecture:** Full Three.js migration — `ThreeGlobeRenderer` replaces `CanvasGlobeRenderer` with identical public API. WebGLRenderer for 3D scene, CSS2DRenderer for HTML callout labels. Internal rAF render loop. Globe rotates at origin, camera orbits.

**Tech Stack:** Three.js (WebGL + CSS2DRenderer), Node.js native test runner, ES modules (no bundler)

**Spec:** `docs/superpowers/specs/2026-03-11-threejs-migration-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `src/renderer/threeGlobeRenderer.js` | Main renderer: init, render loop, public API surface, disposal |
| `src/renderer/earthBuilder.js` | Earth sphere geometry + day/night shader + atmosphere mesh |
| `src/renderer/markerManager.js` | Create/update/remove marker sprites, text CSS2DObjects |
| `src/renderer/arcPathManager.js` | Create/update Line2 geometry for arcs and paths |
| `src/renderer/regionManager.js` | Create/update sphere-conforming polygon meshes |
| `src/renderer/calloutManager.js` | Callout labels, leader lines, collision avoidance, visibility |
| `src/renderer/graticuleBuilder.js` | LineSegments for lat/lon grid |
| `tests/three-renderer.test.js` | Tests for ThreeGlobeRenderer (mock WebGL) |
| `tests/earth-builder.test.js` | Tests for earth/atmosphere construction |
| `tests/marker-manager.test.js` | Tests for marker CRUD |
| `tests/callout-manager.test.js` | Tests for callout positioning and visibility |
| `tests/schema-callout.test.js` | Tests for new calloutMode/calloutLabel schema fields |
| `assets/earth_day_2k.jpg` | Default day texture (~1.8 MB) |
| `assets/earth_night_2k.jpg` | Default night texture (~0.8 MB) |

### Modified Files
| File | Changes |
|---|---|
| `src/scene/schema.js` | Add `calloutMode` + `calloutLabel` to normalizeMarker/validateScene |
| `src/controller/globeController.js` | Import ThreeGlobeRenderer; remove imperative renderScene calls |
| `src/components/globe-viewer.js` | Remove idle rotation rAF; add CSS2D container; WebGL error handling |
| `src/index.js` | Update exports |
| `package.json` | Add `three` dependency |
| `tests/renderer.test.js` | Update to test ThreeGlobeRenderer |
| `tests/controller.test.js` | Update MockRenderer to match new interface |

### Deleted Files
| File | Reason |
|---|---|
| `src/renderer/canvasGlobeRenderer.js` | Replaced |

---

## Chunk 1: Foundation — Schema, Dependencies, Earth Sphere

### Task 1: Add Three.js dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install three**

```bash
cd /Users/matthias/Development/globi && npm install three
```

- [ ] **Step 2: Verify installation**

```bash
node -e "import('three').then(m => console.log('three version:', m.REVISION))"
```
Expected: prints Three.js revision number

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add three.js"
```

---

### Task 2: Schema — add calloutMode and calloutLabel fields

**Files:**
- Modify: `src/scene/schema.js:47-62`
- Create: `tests/schema-callout.test.js`

- [ ] **Step 1: Write failing tests for new schema fields**

Create `tests/schema-callout.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScene, validateScene } from '../src/scene/schema.js';

test('normalizeMarker defaults calloutMode to always', () => {
  const scene = normalizeScene({
    markers: [{ id: 'm1', lat: 0, lon: 0 }],
  });
  assert.equal(scene.markers[0].calloutMode, 'always');
});

test('normalizeMarker preserves valid calloutMode values', () => {
  for (const mode of ['always', 'hover', 'click', 'none']) {
    const scene = normalizeScene({
      markers: [{ id: `m-${mode}`, lat: 0, lon: 0, calloutMode: mode }],
    });
    assert.equal(scene.markers[0].calloutMode, mode);
  }
});

test('normalizeMarker rejects invalid calloutMode and defaults to always', () => {
  const scene = normalizeScene({
    markers: [{ id: 'm1', lat: 0, lon: 0, calloutMode: 'invalid' }],
  });
  assert.equal(scene.markers[0].calloutMode, 'always');
});

test('normalizeMarker normalizes calloutLabel as localized text', () => {
  const scene = normalizeScene({
    markers: [{ id: 'm1', lat: 0, lon: 0, calloutLabel: 'Zurich' }],
  });
  assert.deepEqual(scene.markers[0].calloutLabel, { en: 'Zurich' });
});

test('normalizeMarker defaults calloutLabel to empty object', () => {
  const scene = normalizeScene({
    markers: [{ id: 'm1', lat: 0, lon: 0 }],
  });
  assert.deepEqual(scene.markers[0].calloutLabel, {});
});

test('validateScene accepts valid calloutMode values', () => {
  const result = validateScene({
    markers: [{ id: 'm1', name: { en: 'Test' }, description: { en: '' }, lat: 0, lon: 0, calloutMode: 'hover' }],
  });
  assert.equal(result.valid, true);
});

test('validateScene rejects invalid calloutMode', () => {
  const result = validateScene({
    markers: [{
      id: 'm1', name: { en: 'Test' }, description: { en: '' },
      lat: 0, lon: 0, calloutMode: 'blink',
    }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('calloutMode')));
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test tests/schema-callout.test.js
```
Expected: FAIL — `calloutMode` is undefined

- [ ] **Step 3: Implement schema changes**

In `src/scene/schema.js`, inside `normalizeMarker()`, after the `color` line (line 60), add:
```js
    calloutMode: ['always', 'hover', 'click', 'none'].includes(marker.calloutMode)
      ? marker.calloutMode
      : 'always',
    calloutLabel: normalizeLocalizedText(marker.calloutLabel ?? ''),
```

In `validateScene()`, inside the `scene.markers.forEach` block (after line 224), add:
```js
    if (!['always', 'hover', 'click', 'none'].includes(marker.calloutMode)) {
      errors.push(`${pointer}.calloutMode must be one of always|hover|click|none`);
    }
```

- [ ] **Step 4: Run all tests**

```bash
node --test tests/schema-callout.test.js tests/schema.test.js
```
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/scene/schema.js tests/schema-callout.test.js && git commit -m "feat: add calloutMode and calloutLabel to marker schema" -- src/scene/schema.js tests/schema-callout.test.js
```

---

### Task 3: EarthBuilder — sphere geometry + shaders + atmosphere

**Files:**
- Create: `src/renderer/earthBuilder.js`
- Create: `tests/earth-builder.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/earth-builder.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEarthMesh, createAtmosphereMesh } from '../src/renderer/earthBuilder.js';

test('createEarthMesh returns a Mesh with ShaderMaterial', async () => {
  const { Mesh, ShaderMaterial } = await import('three');
  const earth = createEarthMesh();
  assert.ok(earth instanceof Mesh);
  assert.ok(earth.material instanceof ShaderMaterial);
});

test('createEarthMesh material has required uniforms', async () => {
  const earth = createEarthMesh();
  const uniforms = earth.material.uniforms;
  assert.ok('dayTexture' in uniforms);
  assert.ok('nightTexture' in uniforms);
  assert.ok('sunDirection' in uniforms);
});

test('createAtmosphereMesh returns a transparent BackSide mesh', async () => {
  const { BackSide } = await import('three');
  const atmos = createAtmosphereMesh();
  assert.equal(atmos.material.transparent, true);
  assert.equal(atmos.material.side, BackSide);
  assert.equal(atmos.material.depthWrite, false);
});

test('createEarthMesh geometry has 64x64 segments', () => {
  const earth = createEarthMesh();
  const params = earth.geometry.parameters;
  assert.equal(params.widthSegments, 64);
  assert.equal(params.heightSegments, 64);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test tests/earth-builder.test.js
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement earthBuilder.js**

Create `src/renderer/earthBuilder.js`:
```js
import {
  BackSide,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';

const EARTH_VERTEX = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EARTH_FRAGMENT = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 n = normalize(vNormal);
    float NdotL = dot(n, sunDirection);
    float dayFactor = smoothstep(-0.15, 0.25, NdotL);

    vec4 day = texture2D(dayTexture, vUv);
    vec4 night = texture2D(nightTexture, vUv);
    vec3 color = mix(night.rgb * 1.4, day.rgb, dayFactor);

    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
    color += vec3(0.25, 0.45, 0.8) * fresnel * 0.35;
    color += vec3(0.02, 0.03, 0.06) * (1.0 - dayFactor);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const ATMOS_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOS_FRAGMENT = `
  uniform vec3 sunDirection;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(v, n), 0.0), 2.5);
    float sunFacing = max(0.0, dot(n, sunDirection));
    float intensity = fresnel * (0.5 + 0.5 * sunFacing);
    vec3 c = mix(vec3(0.15, 0.3, 0.7), vec3(0.4, 0.7, 1.0), sunFacing);
    gl_FragColor = vec4(c, intensity * 0.65);
  }
`;

export function createEarthMesh(options = {}) {
  const geometry = new SphereGeometry(1, 64, 64);
  const material = new ShaderMaterial({
    uniforms: {
      dayTexture: { value: options.dayTexture ?? null },
      nightTexture: { value: options.nightTexture ?? null },
      sunDirection: { value: options.sunDirection ?? new Vector3(-0.42, 0.32, 0.85).normalize() },
    },
    vertexShader: EARTH_VERTEX,
    fragmentShader: EARTH_FRAGMENT,
  });

  return new Mesh(geometry, material);
}

export function createAtmosphereMesh(options = {}) {
  const geometry = new SphereGeometry(1.06, 64, 64);
  const material = new ShaderMaterial({
    uniforms: {
      sunDirection: { value: options.sunDirection ?? new Vector3(-0.42, 0.32, 0.85).normalize() },
    },
    vertexShader: ATMOS_VERTEX,
    fragmentShader: ATMOS_FRAGMENT,
    transparent: true,
    side: BackSide,
    depthWrite: false,
  });

  return new Mesh(geometry, material);
}
```

- [ ] **Step 4: Run tests**

```bash
node --test tests/earth-builder.test.js
```
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/earthBuilder.js tests/earth-builder.test.js && git commit -m "feat: add earthBuilder with day/night shader and atmosphere" -- src/renderer/earthBuilder.js tests/earth-builder.test.js
```

---

### Task 4: Download and commit default texture assets

**Files:**
- Create: `assets/earth_day_2k.jpg`
- Create: `assets/earth_night_2k.jpg`

- [ ] **Step 1: Download textures**

```bash
mkdir -p /Users/matthias/Development/globi/assets
cp /Users/matthias/Development/globi/.superpowers/brainstorm/70082-1773236085/day_2k.jpg /Users/matthias/Development/globi/assets/earth_day_2k.jpg
cp /Users/matthias/Development/globi/.superpowers/brainstorm/70082-1773236085/night_2k.jpg /Users/matthias/Development/globi/assets/earth_night_2k.jpg
```

- [ ] **Step 2: Verify files exist**

```bash
ls -lh /Users/matthias/Development/globi/assets/
```
Expected: `earth_day_2k.jpg` (~1.8 MB), `earth_night_2k.jpg` (~0.8 MB)

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add assets/earth_day_2k.jpg assets/earth_night_2k.jpg && git commit -m "assets: add default 2K earth day and night textures" -- assets/earth_day_2k.jpg assets/earth_night_2k.jpg
```

---

## Chunk 2: GraticuleBuilder + MarkerManager + CalloutManager

### Task 5: GraticuleBuilder

**Files:**
- Create: `src/renderer/graticuleBuilder.js`

- [ ] **Step 1: Implement graticuleBuilder.js**

Create `src/renderer/graticuleBuilder.js`:
```js
import { BufferGeometry, Float32BufferAttribute, LineSegments, LineBasicMaterial } from 'three';
import { latLonToCartesian } from '../math/geo.js';

export function createGraticule(options = {}) {
  const color = options.color ?? 0xbed8ff;
  const opacity = options.opacity ?? 0.16;
  const vertices = [];

  // Latitude lines
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lon = -180; lon < 180; lon += 4) {
      const a = latLonToCartesian(lat, lon, 1, 0.001);
      const b = latLonToCartesian(lat, lon + 4, 1, 0.001);
      vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  // Longitude lines
  for (let lon = -150; lon <= 180; lon += 30) {
    for (let lat = -85; lat < 85; lat += 3) {
      const a = latLonToCartesian(lat, lon, 1, 0.001);
      const b = latLonToCartesian(lat + 3, lon, 1, 0.001);
      vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));

  const material = new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });

  return new LineSegments(geometry, material);
}
```

- [ ] **Step 2: Quick sanity test**

```bash
node -e "import('./src/renderer/graticuleBuilder.js').then(m => { const g = m.createGraticule(); console.log('vertices:', g.geometry.attributes.position.count); })"
```
Expected: prints a number > 0

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add src/renderer/graticuleBuilder.js && git commit -m "feat: add graticuleBuilder for lat/lon grid lines" -- src/renderer/graticuleBuilder.js
```

---

### Task 6: MarkerManager

**Files:**
- Create: `src/renderer/markerManager.js`
- Create: `tests/marker-manager.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/marker-manager.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { MarkerManager } from '../src/renderer/markerManager.js';
import { Group } from 'three';

test('MarkerManager creates sprites for dot markers', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, visualType: 'dot', color: '#ff0000' },
  ], 'en');
  assert.equal(group.children.length, 1);
});

test('MarkerManager removes old markers on update', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, visualType: 'dot' },
    { id: 'm2', lat: 10, lon: 10, alt: 0, visualType: 'dot' },
  ], 'en');
  assert.equal(group.children.length, 2);

  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, visualType: 'dot' },
  ], 'en');
  assert.equal(group.children.length, 1);
});

test('MarkerManager returns marker map for hit testing', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    { id: 'zrh', lat: 47.37, lon: 8.54, alt: 0, visualType: 'dot' },
  ], 'en');
  const map = manager.getMarkerMap();
  assert.ok(map.has('zrh'));
});

test('MarkerManager disposes all resources', () => {
  const manager = new MarkerManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, visualType: 'dot' },
  ], 'en');
  manager.dispose();
  assert.equal(group.children.length, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test tests/marker-manager.test.js
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement markerManager.js**

Create `src/renderer/markerManager.js`:
```js
import {
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Sprite,
  SpriteMaterial,
  TextureLoader,
} from 'three';
import { latLonToCartesian } from '../math/geo.js';

function createDotTexture(color = '#ff6a00') {
  const size = 64;
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(size, size)
    : (() => { const c = document.createElement('canvas'); c.width = size; c.height = size; return c; })();
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  return new CanvasTexture(canvas);
}

function createTriangleGeometry(size = 0.02) {
  const vertices = new Float32Array([
    0, size, 0,
    -size * 0.75, -size * 0.8, 0,
    size * 0.75, -size * 0.8, 0,
  ]);
  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geom.computeVertexNormals();
  return geom;
}

export class MarkerManager {
  #markerMap = new Map();
  #textureCache = new Map();
  #loader = new TextureLoader();
  #group = null;

  update(group, markers, locale = 'en') {
    this.#group = group;

    // Clear old
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
      if (child.material?.map) child.material.map.dispose();
    }
    this.#markerMap.clear();

    for (const marker of markers) {
      const pos = latLonToCartesian(marker.lat ?? 0, marker.lon ?? 0, 1, marker.alt ?? 0);
      const type = marker.visualType ?? 'dot';
      let obj;

      if (type === 'dot' || type === 'image') {
        const texture = type === 'image' && marker.assetUri
          ? this.#loadTexture(marker.assetUri)
          : createDotTexture(marker.color || '#ff6a00');
        const material = new SpriteMaterial({ map: texture, depthWrite: false });
        obj = new Sprite(material);
        const scale = 0.04;
        obj.scale.set(scale, scale, scale);
      } else if (type === 'model') {
        const geom = createTriangleGeometry();
        const mat = new MeshBasicMaterial({ color: marker.color || '#ff6a00' });
        obj = new Mesh(geom, mat);
      } else {
        // text type — still create a tiny sprite as anchor; label handled by CalloutManager
        const texture = createDotTexture(marker.color || '#f5f9ff');
        const material = new SpriteMaterial({ map: texture, depthWrite: false });
        obj = new Sprite(material);
        obj.scale.set(0.02, 0.02, 0.02);
      }

      obj.position.set(pos.x, pos.y, pos.z);
      obj.userData = { markerId: marker.id, marker };
      group.add(obj);
      this.#markerMap.set(marker.id, { object: obj, marker });
    }
  }

  #loadTexture(uri) {
    if (this.#textureCache.has(uri)) return this.#textureCache.get(uri);
    const tex = this.#loader.load(uri);
    this.#textureCache.set(uri, tex);
    return tex;
  }

  getMarkerMap() {
    return this.#markerMap;
  }

  dispose() {
    if (this.#group) {
      while (this.#group.children.length > 0) {
        const child = this.#group.children[0];
        this.#group.remove(child);
        child.geometry?.dispose();
        child.material?.dispose();
        if (child.material?.map) child.material.map.dispose();
      }
    }
    this.#markerMap.clear();
    for (const tex of this.#textureCache.values()) tex.dispose();
    this.#textureCache.clear();
  }
}
```

- [ ] **Step 4: Run tests**

```bash
node --test tests/marker-manager.test.js
```
Expected: ALL PASS (note: OffscreenCanvas may not exist in Node — the fallback branch handles this)

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/markerManager.js tests/marker-manager.test.js && git commit -m "feat: add MarkerManager for Three.js marker sprites" -- src/renderer/markerManager.js tests/marker-manager.test.js
```

---

### Task 7: CalloutManager

**Files:**
- Create: `src/renderer/calloutManager.js`
- Create: `tests/callout-manager.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/callout-manager.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { CalloutManager } from '../src/renderer/calloutManager.js';
import { Group, Vector3 } from 'three';

test('CalloutManager creates leader lines and labels for always-visible markers', () => {
  const manager = new CalloutManager();
  const group = new Group();
  const markers = [
    { id: 'm1', lat: 0, lon: 0, alt: 0, name: { en: 'Test' }, calloutMode: 'always', calloutLabel: {} },
  ];
  manager.update(group, markers, 'en');
  // Should have at least 1 child (leader line) — CSS2DObject not testable in Node
  assert.ok(group.children.length >= 1);
});

test('CalloutManager hides callouts for mode none', () => {
  const manager = new CalloutManager();
  const group = new Group();
  const markers = [
    { id: 'm1', lat: 0, lon: 0, alt: 0, name: { en: 'Test' }, calloutMode: 'none', calloutLabel: {} },
  ];
  manager.update(group, markers, 'en');
  assert.equal(group.children.length, 0);
});

test('CalloutManager resolves label from calloutLabel then falls back to name', () => {
  const manager = new CalloutManager();
  assert.equal(manager.resolveLabel({ calloutLabel: { en: 'Custom' }, name: { en: 'Name' } }, 'en'), 'Custom');
  assert.equal(manager.resolveLabel({ calloutLabel: {}, name: { en: 'Fallback' } }, 'en'), 'Fallback');
  assert.equal(manager.resolveLabel({ calloutLabel: {}, name: {} }, 'en'), '');
});

test('CalloutManager disposes cleanly', () => {
  const manager = new CalloutManager();
  const group = new Group();
  manager.update(group, [
    { id: 'm1', lat: 0, lon: 0, alt: 0, name: { en: 'Test' }, calloutMode: 'always', calloutLabel: {} },
  ], 'en');
  manager.dispose();
  assert.equal(group.children.length, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test tests/callout-manager.test.js
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement calloutManager.js**

Create `src/renderer/calloutManager.js`:
```js
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Vector3,
} from 'three';
import { latLonToCartesian } from '../math/geo.js';

const LEADER_LENGTH = 0.25;
const LEADER_COLOR = 0xf6b73c;
const LEADER_OPACITY = 0.7;

export class CalloutManager {
  #group = null;
  #calloutData = new Map();
  #css2dObjects = [];

  resolveLabel(marker, locale) {
    const label = marker.calloutLabel?.[locale] ?? marker.calloutLabel?.en ?? '';
    if (label) return label;
    return marker.name?.[locale] ?? marker.name?.en ?? '';
  }

  update(group, markers, locale = 'en') {
    this.#group = group;
    this.#clear();

    for (const marker of markers) {
      const mode = marker.calloutMode ?? 'always';
      if (mode === 'none') continue;

      const label = this.resolveLabel(marker, locale);
      if (!label) continue;

      const surfacePos = latLonToCartesian(marker.lat ?? 0, marker.lon ?? 0, 1, marker.alt ?? 0);
      const surfaceVec = new Vector3(surfacePos.x, surfacePos.y, surfacePos.z);
      const direction = surfaceVec.clone().normalize();
      const labelPos = surfaceVec.clone().add(direction.clone().multiplyScalar(LEADER_LENGTH));

      // Leader line (WebGL)
      const lineGeo = new BufferGeometry();
      lineGeo.setAttribute('position', new Float32BufferAttribute([
        surfaceVec.x, surfaceVec.y, surfaceVec.z,
        labelPos.x, labelPos.y, labelPos.z,
      ], 3));
      const lineMat = new LineBasicMaterial({
        color: LEADER_COLOR,
        transparent: true,
        opacity: LEADER_OPACITY,
        depthWrite: false,
      });
      const line = new Line(lineGeo, lineMat);
      line.userData = {
        markerId: marker.id,
        calloutMode: mode,
        isLeaderLine: true,
      };

      // For 'always' mode, show immediately. For hover/click, start hidden.
      if (mode !== 'always') {
        line.visible = false;
      }

      group.add(line);

      this.#calloutData.set(marker.id, {
        marker,
        label,
        line,
        labelPosition: labelPos,
        surfacePosition: surfaceVec,
        mode,
        visible: mode === 'always',
      });
    }
  }

  // Create CSS2D labels — called separately because CSS2DObject may not be available in Node tests
  createCSS2DLabels(CSS2DObject) {
    const labels = [];
    for (const [id, data] of this.#calloutData) {
      const div = document.createElement('div');
      div.className = 'globe-callout-label';
      div.textContent = data.label;
      div.setAttribute('role', 'status');
      div.setAttribute('aria-label', data.label);
      div.setAttribute('tabindex', '0');
      div.style.cssText = `
        color: #f6b73c;
        font-size: 12px;
        font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif;
        font-weight: 600;
        padding: 2px 8px;
        background: rgba(246, 183, 60, 0.12);
        border: 1px solid rgba(246, 183, 60, 0.4);
        border-radius: 4px;
        pointer-events: auto;
        cursor: default;
        user-select: text;
        white-space: nowrap;
      `;

      const css2dObj = new CSS2DObject(div);
      css2dObj.position.copy(data.labelPosition);
      css2dObj.userData = { markerId: id, calloutMode: data.mode };

      if (data.mode !== 'always') {
        css2dObj.visible = false;
      }

      labels.push({ id, object: css2dObj, div });
      this.#css2dObjects.push(css2dObj);
    }
    return labels;
  }

  updateVisibility(cameraPosition) {
    const camDir = cameraPosition.clone().normalize();
    for (const [id, data] of this.#calloutData) {
      const surfaceNormal = data.surfacePosition.clone().normalize();
      const facing = surfaceNormal.dot(camDir);
      const frontFacing = facing > 0;

      const shouldShow = data.mode === 'always' && frontFacing;
      data.line.visible = shouldShow;
      data.visible = shouldShow;

      // CSS2D object visibility handled by the matching CSS2DObject
      const css2d = this.#css2dObjects.find(o => o.userData?.markerId === id);
      if (css2d) css2d.visible = shouldShow;
    }
  }

  showCallout(markerId) {
    const data = this.#calloutData.get(markerId);
    if (!data) return;
    data.line.visible = true;
    data.visible = true;
    const css2d = this.#css2dObjects.find(o => o.userData?.markerId === markerId);
    if (css2d) css2d.visible = true;
  }

  hideCallout(markerId) {
    const data = this.#calloutData.get(markerId);
    if (!data) return;
    data.line.visible = false;
    data.visible = false;
    const css2d = this.#css2dObjects.find(o => o.userData?.markerId === markerId);
    if (css2d) css2d.visible = false;
  }

  getCalloutData() {
    return this.#calloutData;
  }

  #clear() {
    if (this.#group) {
      for (const [, data] of this.#calloutData) {
        this.#group.remove(data.line);
        data.line.geometry.dispose();
        data.line.material.dispose();
      }
    }
    for (const obj of this.#css2dObjects) {
      obj.removeFromParent();
      if (obj.element?.parentNode) obj.element.parentNode.removeChild(obj.element);
    }
    this.#calloutData.clear();
    this.#css2dObjects = [];
  }

  dispose() {
    this.#clear();
  }
}
```

- [ ] **Step 4: Run tests**

```bash
node --test tests/callout-manager.test.js
```
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/calloutManager.js tests/callout-manager.test.js && git commit -m "feat: add CalloutManager with leader lines and label positioning" -- src/renderer/calloutManager.js tests/callout-manager.test.js
```

---

## Chunk 3: ArcPathManager + RegionManager

### Task 8: ArcPathManager

**Files:**
- Create: `src/renderer/arcPathManager.js`

- [ ] **Step 1: Implement arcPathManager.js**

Create `src/renderer/arcPathManager.js`:
```js
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
} from 'three';
import { latLonToCartesian } from '../math/geo.js';
import { densifyPath, greatCircleArc } from '../math/geo.js';

function geoPointsToVertices(points) {
  const vertices = [];
  for (const p of points) {
    const c = latLonToCartesian(p.lat ?? 0, p.lon ?? 0, 1, p.alt ?? 0);
    vertices.push(c.x, c.y, c.z);
  }
  return new Float32Array(vertices);
}

export class ArcPathManager {
  #group = null;

  update(group, arcs = [], paths = []) {
    this.#group = group;
    this.#clear();

    for (const arc of arcs) {
      const arcPoints = greatCircleArc(arc.start, arc.end, {
        segments: 64,
        maxAltitude: arc.maxAltitude ?? 0,
      });
      const vertices = geoPointsToVertices(arcPoints);
      this.#addLine(group, vertices, arc);
    }

    for (const path of paths) {
      const dense = densifyPath(path.points ?? [], { maxStepDegrees: 8 });
      const vertices = geoPointsToVertices(dense);
      this.#addLine(group, vertices, path);
    }
  }

  #addLine(group, vertices, data) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));

    const hasDash = Array.isArray(data.dashPattern) && data.dashPattern.length > 0;
    const material = hasDash
      ? new LineDashedMaterial({
          color: data.color ?? '#00aaff',
          linewidth: 1,
          dashSize: data.dashPattern[0] ?? 3,
          gapSize: data.dashPattern[1] ?? 1,
          transparent: true,
          depthWrite: false,
        })
      : new LineBasicMaterial({
          color: data.color ?? '#00aaff',
          linewidth: 1,
          transparent: true,
          depthWrite: false,
        });

    const line = new Line(geometry, material);
    if (hasDash) line.computeLineDistances();
    line.userData = { entityId: data.id, kind: data.start ? 'arc' : 'path' };
    group.add(line);
  }

  #clear() {
    if (!this.#group) return;
    const toRemove = [...this.#group.children];
    for (const child of toRemove) {
      this.#group.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  dispose() {
    this.#clear();
  }
}
```

- [ ] **Step 2: Quick verification**

```bash
node -e "import('./src/renderer/arcPathManager.js').then(m => { console.log('ArcPathManager loaded OK'); })"
```
Expected: "ArcPathManager loaded OK"

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add src/renderer/arcPathManager.js && git commit -m "feat: add ArcPathManager for Three.js arc and path lines" -- src/renderer/arcPathManager.js
```

---

### Task 9: RegionManager

**Files:**
- Create: `src/renderer/regionManager.js`

- [ ] **Step 1: Implement regionManager.js**

Create `src/renderer/regionManager.js`:
```js
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { latLonToCartesian } from '../math/geo.js';

function triangulatePolygon(ring3d) {
  // Simple fan triangulation from first vertex — works for convex polygons
  // and is a reasonable approximation for most GeoJSON regions
  if (ring3d.length < 3) return [];
  const indices = [];
  for (let i = 1; i < ring3d.length - 1; i++) {
    indices.push(0, i, i + 1);
  }
  return indices;
}

export class RegionManager {
  #group = null;

  update(group, regions = []) {
    this.#group = group;
    this.#clear();

    for (const region of regions) {
      const geometry = region.geojson;
      if (!geometry) continue;

      const polygons = geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.type === 'MultiPolygon'
          ? geometry.coordinates
          : [];

      for (const polygon of polygons) {
        for (const ring of polygon) {
          if (!Array.isArray(ring) || ring.length < 3) continue;

          const alt = region.altitude ?? 0;
          const ring3d = ring.map(([lon, lat]) => {
            const c = latLonToCartesian(lat, lon, 1, alt);
            return [c.x, c.y, c.z];
          });

          const indices = triangulatePolygon(ring3d);
          if (indices.length === 0) continue;

          const vertices = new Float32Array(ring3d.flat());
          const geom = new BufferGeometry();
          geom.setAttribute('position', new Float32BufferAttribute(vertices, 3));
          geom.setIndex(indices);
          geom.computeVertexNormals();

          const mat = new MeshBasicMaterial({
            color: region.capColor ?? '#4caf50',
            transparent: true,
            opacity: 0.3,
            side: DoubleSide,
            depthWrite: false,
          });

          const mesh = new Mesh(geom, mat);
          mesh.userData = { entityId: region.id, kind: 'region' };
          group.add(mesh);
        }
      }
    }
  }

  #clear() {
    if (!this.#group) return;
    const toRemove = [...this.#group.children];
    for (const child of toRemove) {
      this.#group.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  dispose() {
    this.#clear();
  }
}
```

- [ ] **Step 2: Quick verification**

```bash
node -e "import('./src/renderer/regionManager.js').then(m => { console.log('RegionManager loaded OK'); })"
```
Expected: "RegionManager loaded OK"

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add src/renderer/regionManager.js && git commit -m "feat: add RegionManager for sphere-conforming polygon meshes" -- src/renderer/regionManager.js
```

---

## Chunk 4: ThreeGlobeRenderer — Core Integration

### Task 10: ThreeGlobeRenderer — main renderer class

**Files:**
- Create: `src/renderer/threeGlobeRenderer.js`
- Create: `tests/three-renderer.test.js`

- [ ] **Step 1: Write failing test for renderer interface**

Create `tests/three-renderer.test.js`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ThreeGlobeRenderer } from '../src/renderer/threeGlobeRenderer.js';

test('ThreeGlobeRenderer exports the expected public API', () => {
  const renderer = new ThreeGlobeRenderer();
  assert.equal(typeof renderer.init, 'function');
  assert.equal(typeof renderer.renderScene, 'function');
  assert.equal(typeof renderer.flyTo, 'function');
  assert.equal(typeof renderer.panBy, 'function');
  assert.equal(typeof renderer.zoomBy, 'function');
  assert.equal(typeof renderer.hitTest, 'function');
  assert.equal(typeof renderer.projectPointToClient, 'function');
  assert.equal(typeof renderer.getCameraState, 'function');
  assert.equal(typeof renderer.resize, 'function');
  assert.equal(typeof renderer.destroy, 'function');
});

test('getCameraState returns default center and zoom', () => {
  const renderer = new ThreeGlobeRenderer();
  const state = renderer.getCameraState();
  assert.equal(typeof state.centerLon, 'number');
  assert.equal(typeof state.centerLat, 'number');
  assert.equal(typeof state.zoom, 'number');
  assert.equal(state.zoom, 1);
});

test('panBy changes camera state', () => {
  const renderer = new ThreeGlobeRenderer();
  const before = renderer.getCameraState();
  renderer.panBy(10, 5);
  const after = renderer.getCameraState();
  assert.notEqual(before.centerLon, after.centerLon);
});

test('zoomBy clamps within range', () => {
  const renderer = new ThreeGlobeRenderer();
  renderer.zoomBy(100);
  assert.ok(renderer.getCameraState().zoom <= 4);
  renderer.zoomBy(-100);
  assert.ok(renderer.getCameraState().zoom >= 0.3);
});

test('flyTo sets camera to target coordinates', () => {
  const renderer = new ThreeGlobeRenderer();
  renderer.flyTo({ lat: 47.37, lon: 8.54 }, { zoom: 2 });
  const state = renderer.getCameraState();
  assert.ok(Math.abs(state.centerLat - 47.37) < 1);
  assert.ok(Math.abs(state.centerLon - 8.54) < 1);
  assert.equal(state.zoom, 2);
});

test('destroy is callable without init', () => {
  const renderer = new ThreeGlobeRenderer();
  assert.doesNotThrow(() => renderer.destroy());
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test tests/three-renderer.test.js
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement threeGlobeRenderer.js**

Create `src/renderer/threeGlobeRenderer.js`. This is the largest file — implements the full renderer interface. The key design: camera stays fixed, globe rotates. Camera state (centerLon/centerLat) is derived from the globe's quaternion.

```js
import {
  AmbientLight,
  DirectionalLight,
  Euler,
  Group,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
  SRGBColorSpace,
} from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

import { createEarthMesh, createAtmosphereMesh } from './earthBuilder.js';
import { createGraticule } from './graticuleBuilder.js';
import { MarkerManager } from './markerManager.js';
import { ArcPathManager } from './arcPathManager.js';
import { RegionManager } from './regionManager.js';
import { CalloutManager } from './calloutManager.js';
import { getSunLightVector } from '../math/solar.js';
import { clampLatitude, normalizeLongitude } from '../math/sphereProjection.js';

const DEG_TO_RAD = Math.PI / 180;

export class ThreeGlobeRenderer {
  #scene = null;
  #camera = null;
  #renderer = null;
  #css2dRenderer = null;
  #globe = null;
  #earth = null;
  #atmosphere = null;
  #graticule = null;
  #markerGroup = null;
  #arcPathGroup = null;
  #regionGroup = null;
  #calloutGroup = null;
  #markerManager = new MarkerManager();
  #arcPathManager = new ArcPathManager();
  #regionManager = new RegionManager();
  #calloutManager = new CalloutManager();
  #textureLoader = new TextureLoader();
  #textureCache = new Map();
  #animFrameId = 0;
  #dirty = true;
  #lastScene = null;
  #container = null;
  #width = 800;
  #height = 500;

  // Camera state stored as lon/lat/zoom, applied as globe rotation
  #centerLon = 0;
  #centerLat = 0;
  #zoom = 1;
  #rotationSpeed = 0;

  getCameraState() {
    return {
      centerLon: this.#centerLon,
      centerLat: this.#centerLat,
      zoom: this.#zoom,
    };
  }

  init(container, options = {}) {
    this.#container = container;
    this.#width = options.width ?? container.clientWidth ?? 800;
    this.#height = options.height ?? container.clientHeight ?? 500;

    // Three.js scene
    this.#scene = new Scene();
    this.#camera = new PerspectiveCamera(45, this.#width / this.#height, 0.1, 100);
    this.#updateCameraDistance();

    // Lighting
    this.#scene.add(new AmbientLight(0x222244, 0.4));
    const sun = new DirectionalLight(0xffffff, 1.6);
    sun.position.set(-5, 3, 8);
    this.#scene.add(sun);

    // Globe group (rotates together)
    this.#globe = new Group();
    this.#scene.add(this.#globe);

    // Earth
    this.#earth = createEarthMesh();
    this.#globe.add(this.#earth);

    // Atmosphere (outside globe group so it doesn't rotate)
    this.#atmosphere = createAtmosphereMesh();
    this.#scene.add(this.#atmosphere);

    // Graticule
    this.#graticule = createGraticule();
    this.#globe.add(this.#graticule);

    // Sub-groups
    this.#markerGroup = new Group();
    this.#globe.add(this.#markerGroup);
    this.#arcPathGroup = new Group();
    this.#globe.add(this.#arcPathGroup);
    this.#regionGroup = new Group();
    this.#globe.add(this.#regionGroup);
    this.#calloutGroup = new Group();
    this.#globe.add(this.#calloutGroup);

    // WebGL renderer
    try {
      this.#renderer = new WebGLRenderer({ antialias: true, alpha: false });
      this.#renderer.setSize(this.#width, this.#height);
      this.#renderer.setPixelRatio(Math.min(window?.devicePixelRatio ?? 1, 2));
      this.#renderer.setClearColor(0x020b18, 1);
      container.appendChild(this.#renderer.domElement);
    } catch (e) {
      throw new Error('WebGL is not available');
    }

    // CSS2D renderer
    this.#css2dRenderer = new CSS2DRenderer();
    this.#css2dRenderer.setSize(this.#width, this.#height);
    this.#css2dRenderer.domElement.style.position = 'absolute';
    this.#css2dRenderer.domElement.style.top = '0';
    this.#css2dRenderer.domElement.style.left = '0';
    this.#css2dRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.#css2dRenderer.domElement);

    // Initial scene
    if (options.initialScene) {
      this.renderScene(options.initialScene);
    }

    // Start render loop
    this.#startLoop();
  }

  renderScene(scene) {
    this.#lastScene = scene;
    this.#dirty = true;

    const planet = scene.planet ?? {};
    this.#rotationSpeed = planet.rotationSpeed ?? 0;

    // Load textures
    this.#updateTextures(planet);

    // Update sun direction
    const light = this.#resolveLightVector(planet);
    if (this.#earth) {
      this.#earth.material.uniforms.sunDirection.value.copy(light);
    }
    if (this.#atmosphere) {
      this.#atmosphere.material.uniforms.sunDirection.value.copy(light);
    }

    // Update data layers
    this.#markerManager.update(this.#markerGroup, scene.markers ?? [], scene.locale ?? 'en');
    this.#arcPathManager.update(this.#arcPathGroup, scene.arcs ?? [], scene.paths ?? []);
    this.#regionManager.update(this.#regionGroup, scene.regions ?? []);

    // Update callouts
    this.#calloutManager.update(this.#calloutGroup, scene.markers ?? [], scene.locale ?? 'en');
    if (this.#css2dRenderer && typeof CSS2DObject !== 'undefined') {
      const labels = this.#calloutManager.createCSS2DLabels(CSS2DObject);
      for (const { object } of labels) {
        this.#globe.add(object);
      }
    }
  }

  flyTo(target, options = {}) {
    this.#centerLon = normalizeLongitude(target?.lon ?? 0);
    this.#centerLat = clampLatitude(target?.lat ?? 0);
    if (typeof options.zoom === 'number') {
      this.#zoom = Math.max(0.3, Math.min(4, options.zoom));
      this.#updateCameraDistance();
    }
    this.#applyGlobeRotation();
    this.#dirty = true;
  }

  panBy(deltaLon, deltaLat) {
    this.#centerLon = normalizeLongitude(this.#centerLon - Number(deltaLon ?? 0));
    this.#centerLat = clampLatitude(this.#centerLat + Number(deltaLat ?? 0));
    this.#applyGlobeRotation();
    this.#dirty = true;
  }

  zoomBy(deltaScale) {
    this.#zoom = Math.max(0.3, Math.min(4, this.#zoom + Number(deltaScale ?? 0)));
    this.#updateCameraDistance();
    this.#dirty = true;
  }

  resize(width, height) {
    this.#width = Math.max(1, width);
    this.#height = Math.max(1, height);
    if (this.#camera) {
      this.#camera.aspect = this.#width / this.#height;
      this.#camera.updateProjectionMatrix();
    }
    this.#renderer?.setSize(this.#width, this.#height);
    this.#css2dRenderer?.setSize(this.#width, this.#height);
    this.#dirty = true;
  }

  hitTest(clientX, clientY) {
    if (!this.#renderer || !this.#camera) return null;

    const rect = this.#renderer.domElement.getBoundingClientRect();
    const mouse = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, this.#camera);

    // Test markers first
    const markerHits = raycaster.intersectObjects(this.#markerGroup.children, true);
    if (markerHits.length > 0) {
      const hit = markerHits[0];
      const userData = hit.object.userData;
      if (userData?.markerId) {
        const entry = this.#markerManager.getMarkerMap().get(userData.markerId);
        if (entry) {
          return {
            kind: 'marker',
            id: entry.marker.id,
            entity: structuredClone(entry.marker),
            anchor: {
              clientX,
              clientY,
              canvasX: (mouse.x + 1) / 2 * this.#width,
              canvasY: (1 - mouse.y) / 2 * this.#height,
            },
          };
        }
      }
    }

    // Test arcs/paths
    const lineHits = raycaster.intersectObjects(this.#arcPathGroup.children, true);
    if (lineHits.length > 0) {
      const hit = lineHits[0];
      const userData = hit.object.userData;
      return {
        kind: userData?.kind ?? 'path',
        id: userData?.entityId,
        entity: { id: userData?.entityId },
        anchor: { clientX, clientY },
      };
    }

    // Test regions
    const regionHits = raycaster.intersectObjects(this.#regionGroup.children, true);
    if (regionHits.length > 0) {
      const hit = regionHits[0];
      const userData = hit.object.userData;
      return {
        kind: 'region',
        id: userData?.entityId,
        entity: { id: userData?.entityId },
        anchor: { clientX, clientY },
      };
    }

    return null;
  }

  projectPointToClient(point) {
    if (!this.#camera || !this.#renderer) return null;

    // Convert geo to 3D, apply globe rotation
    const { latLonToCartesian } = require_geo();
    const cart = latLonToCartesian(point?.lat ?? 0, point?.lon ?? 0, 1, point?.alt ?? 0);
    const worldPos = new Vector3(cart.x, cart.y, cart.z);
    worldPos.applyQuaternion(this.#globe?.quaternion ?? new Quaternion());

    const projected = worldPos.clone().project(this.#camera);
    const rect = this.#renderer.domElement.getBoundingClientRect();

    const visible = projected.z < 1 && worldPos.dot(this.#camera.position.clone().normalize()) > 0;

    return {
      x: (projected.x + 1) / 2 * this.#width,
      y: (1 - projected.y) / 2 * this.#height,
      clientX: rect.left + (projected.x + 1) / 2 * rect.width,
      clientY: rect.top + (1 - projected.y) / 2 * rect.height,
      visible,
      canvasX: (projected.x + 1) / 2 * this.#width,
      canvasY: (1 - projected.y) / 2 * this.#height,
    };
  }

  destroy() {
    if (this.#animFrameId) {
      cancelAnimationFrame(this.#animFrameId);
      this.#animFrameId = 0;
    }

    this.#markerManager.dispose();
    this.#arcPathManager.dispose();
    this.#regionManager.dispose();
    this.#calloutManager.dispose();

    if (this.#earth) {
      this.#earth.geometry.dispose();
      this.#earth.material.dispose();
    }
    if (this.#atmosphere) {
      this.#atmosphere.geometry.dispose();
      this.#atmosphere.material.dispose();
    }
    if (this.#graticule) {
      this.#graticule.geometry.dispose();
      this.#graticule.material.dispose();
    }

    for (const tex of this.#textureCache.values()) tex.dispose();
    this.#textureCache.clear();

    if (this.#renderer?.domElement?.parentNode) {
      this.#renderer.domElement.parentNode.removeChild(this.#renderer.domElement);
    }
    this.#renderer?.dispose();

    if (this.#css2dRenderer?.domElement?.parentNode) {
      this.#css2dRenderer.domElement.parentNode.removeChild(this.#css2dRenderer.domElement);
    }

    this.#scene = null;
    this.#camera = null;
    this.#renderer = null;
    this.#css2dRenderer = null;
  }

  // --- Private ---

  #startLoop() {
    let lastTs = performance.now();
    const tick = (now) => {
      if (!this.#renderer) return;

      const dt = now - lastTs;
      lastTs = now;

      // Idle rotation
      if (this.#rotationSpeed && Math.abs(this.#rotationSpeed) > 0) {
        this.#centerLon = normalizeLongitude(this.#centerLon + this.#rotationSpeed * dt * 0.06);
        this.#applyGlobeRotation();
        this.#dirty = true;
      }

      // Update callout visibility based on camera
      if (this.#camera) {
        this.#calloutManager.updateVisibility(this.#camera.position);
      }

      if (this.#dirty) {
        this.#renderer.render(this.#scene, this.#camera);
        this.#css2dRenderer?.render(this.#scene, this.#camera);
        this.#dirty = false;
      }

      this.#animFrameId = requestAnimationFrame(tick);
    };
    this.#animFrameId = requestAnimationFrame(tick);
  }

  #applyGlobeRotation() {
    if (!this.#globe) return;
    // Rotate globe so that centerLon/centerLat faces the camera (which is on +Z)
    const lonRad = -this.#centerLon * DEG_TO_RAD;
    const latRad = this.#centerLat * DEG_TO_RAD;
    this.#globe.rotation.set(latRad, lonRad, 0, 'YXZ');
  }

  #updateCameraDistance() {
    if (!this.#camera) return;
    this.#camera.position.set(0, 0, 3 / Math.max(0.3, this.#zoom));
    this.#camera.lookAt(0, 0, 0);
  }

  #updateTextures(planet) {
    if (!this.#earth) return;

    const dayUri = planet.textureUri || 'assets/earth_day_2k.jpg';
    const nightUri = planet.nightTextureUri || 'assets/earth_night_2k.jpg';

    if (dayUri && !this.#textureCache.has(dayUri)) {
      const tex = this.#textureLoader.load(dayUri, () => { this.#dirty = true; });
      tex.colorSpace = SRGBColorSpace;
      this.#textureCache.set(dayUri, tex);
    }
    if (nightUri && !this.#textureCache.has(nightUri)) {
      const tex = this.#textureLoader.load(nightUri, () => { this.#dirty = true; });
      tex.colorSpace = SRGBColorSpace;
      this.#textureCache.set(nightUri, tex);
    }

    const dayTex = this.#textureCache.get(dayUri) ?? null;
    const nightTex = this.#textureCache.get(nightUri) ?? null;
    this.#earth.material.uniforms.dayTexture.value = dayTex;
    this.#earth.material.uniforms.nightTexture.value = nightTex;
  }

  #resolveLightVector(planet) {
    if (planet?.lightingMode === 'sun') {
      const sv = getSunLightVector(
        { centerLon: this.#centerLon, centerLat: this.#centerLat },
        planet.lightingTimestamp
      );
      return new Vector3(sv.x, sv.y, sv.z).normalize();
    }
    return new Vector3(-0.42, 0.32, 0.85).normalize();
  }
}

// Lazy import to avoid circular dependency issues in Node test env
function require_geo() {
  return import('../math/geo.js');
}
```

**Note:** The `projectPointToClient` uses a dynamic import. Replace the lazy import with a static approach during implementation — import `latLonToCartesian` at the top of the file alongside other imports.

- [ ] **Step 4: Run tests**

```bash
node --test tests/three-renderer.test.js
```
Expected: ALL PASS (tests only exercise non-WebGL methods like getCameraState, panBy, zoomBy, flyTo)

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/threeGlobeRenderer.js tests/three-renderer.test.js && git commit -m "feat: add ThreeGlobeRenderer with full render pipeline" -- src/renderer/threeGlobeRenderer.js tests/three-renderer.test.js
```

---

## Chunk 5: Wiring — Controller, Web Component, Exports, Cleanup

### Task 11: Update GlobeController to use ThreeGlobeRenderer

**Files:**
- Modify: `src/controller/globeController.js`

- [ ] **Step 1: Change import**

In `src/controller/globeController.js`, change line 3:
```js
// Old:
import { CanvasGlobeRenderer } from '../renderer/canvasGlobeRenderer.js';
// New:
import { ThreeGlobeRenderer } from '../renderer/threeGlobeRenderer.js';
```

- [ ] **Step 2: Change default renderer instantiation**

In the constructor (around line 62), change:
```js
// Old:
this.#renderer = options.renderer ?? new CanvasGlobeRenderer();
// New:
this.#renderer = options.renderer ?? new ThreeGlobeRenderer();
```

- [ ] **Step 3: Remove redundant renderScene calls**

The Three.js renderer has its own render loop, so `renderScene()` after `panBy`/`zoomBy`/`flyTo`/`resize` is no longer needed (they set a dirty flag instead). Remove the `this.#renderer.renderScene(this.#scene)` calls from `flyTo()`, `panBy()`, `zoomBy()`, and `resize()` methods. The `sceneChange` listener's `renderScene` call stays — it updates scene data.

- [ ] **Step 4: Run controller tests**

```bash
node --test tests/controller.test.js
```
Expected: PASS (uses MockRenderer, not the real one)

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/controller/globeController.js && git commit -m "refactor: wire GlobeController to ThreeGlobeRenderer" -- src/controller/globeController.js
```

---

### Task 12: Update globe-viewer.js — remove idle rotation, add CSS2D container

**Files:**
- Modify: `src/components/globe-viewer.js`

- [ ] **Step 1: Remove idle rotation rAF**

The renderer now handles idle rotation internally. In `globe-viewer.js`:
- Remove the `#startIdleRotation()` method entirely
- Remove the `#stopIdleRotation()` method entirely
- Remove `#idleFrame` and `#idleLastTs` properties
- Remove the `this.#startIdleRotation()` call in `connectedCallback()`
- Remove the `this.#stopIdleRotation()` call in `disconnectedCallback()`
- Remove `computeIdlePanDelta` import from `./idleRotation.js`

- [ ] **Step 2: Add CSS2D overlay style**

In the `<style>` section, add:
```css
.stage :global(.globe-callout-label) {
  pointer-events: auto;
}
```

- [ ] **Step 3: Run all tests**

```bash
node --test
```
Expected: ALL PASS (or investigate failures)

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add src/components/globe-viewer.js && git commit -m "refactor: remove idle rotation from viewer, renderer handles it" -- src/components/globe-viewer.js
```

---

### Task 13: Update exports and delete old renderer

**Files:**
- Modify: `src/index.js`
- Delete: `src/renderer/canvasGlobeRenderer.js`
- Modify: `tests/renderer.test.js`

- [ ] **Step 1: Delete old renderer**

```bash
rm src/renderer/canvasGlobeRenderer.js
```

- [ ] **Step 2: Update tests/renderer.test.js**

Replace import in `tests/renderer.test.js`:
```js
// Old:
import { CanvasGlobeRenderer } from '../src/renderer/canvasGlobeRenderer.js';
// New:
import { ThreeGlobeRenderer } from '../src/renderer/threeGlobeRenderer.js';
```

Update the tests to use `ThreeGlobeRenderer` instead of `CanvasGlobeRenderer`. Since the old tests relied on Canvas mocking, simplify them to test the non-WebGL public API (getCameraState, panBy, zoomBy, flyTo) similar to `tests/three-renderer.test.js`. Remove the BUG4 texture test (Canvas 2D specific) and the text marker test (Canvas 2D specific).

- [ ] **Step 3: Update src/index.js if needed**

The current `src/index.js` doesn't export `CanvasGlobeRenderer` directly, so no changes needed there. Verify:
```bash
grep -n "canvasGlobe" src/index.js
```
Expected: no matches

- [ ] **Step 4: Run all tests**

```bash
node --test
```
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/index.js tests/renderer.test.js && git commit -m "refactor: delete CanvasGlobeRenderer, update renderer tests" -- src/index.js tests/renderer.test.js src/renderer/canvasGlobeRenderer.js
```

---

### Task 14: Full integration test — verify in browser

**Files:** None (manual verification)

- [ ] **Step 1: Start the editor server**

```bash
cd /Users/matthias/Development/globi && npm run serve:editor
```

- [ ] **Step 2: Open browser and verify**

Open `http://localhost:4173/editor/` and verify:
- Globe renders with realistic earth texture (day/night)
- Atmospheric glow visible around the edge
- Globe rotates (idle rotation)
- Drag to pan, scroll to zoom
- Add markers via the editor — verify they appear as sprites
- Callout labels appear next to markers with leader lines
- Callout text is selectable with mouse
- Add arcs/paths — verify they render as lines on the globe
- Fullscreen toggle works
- Planet selector works (switch to Mars, Moon, etc.)

- [ ] **Step 3: Run full test suite one final time**

```bash
node --test
```
Expected: ALL PASS

- [ ] **Step 4: Final commit with any fixes**

If any fixes were needed during integration testing, commit them with descriptive messages.

---

## Summary

| Chunk | Tasks | Key Deliverable |
|---|---|---|
| 1 | 1–4 | Three.js dep, schema changes, EarthBuilder, textures |
| 2 | 5–7 | GraticuleBuilder, MarkerManager, CalloutManager |
| 3 | 8–9 | ArcPathManager, RegionManager |
| 4 | 10 | ThreeGlobeRenderer — core integration |
| 5 | 11–14 | Wiring, cleanup, delete old renderer, integration test |
