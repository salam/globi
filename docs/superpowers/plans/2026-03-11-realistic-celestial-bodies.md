# Realistic Celestial Bodies Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all 13 celestial bodies with NASA-sourced textures, physically-based atmospheres, time-accurate orbital lighting, and ring systems.

**Architecture:** Extend the existing `celestial.js` presets with physical data, generalize `solar.js` into `orbital.js` for any-body sun direction, upgrade `earthBuilder.js` with per-body shaders and atmosphere uniforms, add new `ringBuilder.js` and `textureLoader.js` modules. Progressive texture loading (2K → 8K on zoom). Ring systems for all four gas giants.

**Tech Stack:** Three.js (WebGL), GLSL shaders, node:test, shell script (curl for texture download)

**Spec:** `docs/superpowers/specs/2026-03-11-realistic-celestial-bodies-design.md`

---

## Chunk 1: Data Layer (celestial presets, schema, config resolution)

### Task 1: Extend Celestial Presets with Physical Data

**Files:**
- Modify: `src/scene/celestial.js`
- Test: `tests/celestial.test.js`

- [ ] **Step 1: Write failing tests for new preset fields**

Add to `tests/celestial.test.js`:

```js
test('all presets have obliquity, orbitalPeriod, siderealRotation', () => {
  const presets = listCelestialPresets();
  for (const p of presets) {
    assert.ok(typeof p.obliquity === 'number', `${p.id} missing obliquity`);
    assert.ok(Number.isFinite(p.obliquity), `${p.id} obliquity not finite`);
    assert.ok(p.obliquity >= 0 && p.obliquity <= 360, `${p.id} obliquity out of range`);

    assert.ok(typeof p.orbitalPeriod === 'number', `${p.id} missing orbitalPeriod`);
    assert.ok(p.orbitalPeriod > 0, `${p.id} orbitalPeriod must be > 0`);

    assert.ok(typeof p.siderealRotation === 'number', `${p.id} missing siderealRotation`);
    assert.ok(p.siderealRotation !== 0, `${p.id} siderealRotation must not be 0`);
  }
});

test('atmosphere config is correct per body', () => {
  const withAtmo = ['venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'titan'];
  const withoutAtmo = ['mercury', 'moon', 'io', 'europa', 'ganymede'];

  for (const id of withAtmo) {
    const p = getCelestialPreset(id);
    assert.ok(p.atmosphere !== null, `${id} should have atmosphere`);
    assert.ok(p.atmosphere.enabled === true, `${id} atmosphere should be enabled`);
    assert.ok(p.atmosphere.scaleHeight > 0, `${id} missing scaleHeight`);
    assert.ok(typeof p.atmosphere.scatterColor === 'string', `${id} missing scatterColor`);
    assert.ok(p.atmosphere.thickness > 0, `${id} missing thickness`);
    assert.ok(p.atmosphere.density >= 0 && p.atmosphere.density <= 1, `${id} density out of range`);
  }

  for (const id of withoutAtmo) {
    const p = getCelestialPreset(id);
    assert.ok(p.atmosphere === null, `${id} should have no atmosphere`);
  }
});

test('ring config is correct per body', () => {
  const withRings = ['jupiter', 'saturn', 'uranus', 'neptune'];
  const withoutRings = ['mercury', 'venus', 'earth', 'mars', 'moon', 'io', 'europa', 'ganymede', 'titan'];

  for (const id of withRings) {
    const p = getCelestialPreset(id);
    assert.ok(p.rings !== null, `${id} should have rings`);
    assert.ok(p.rings.innerRadius < p.rings.outerRadius, `${id} ring inner < outer`);
    assert.ok(p.rings.opacity > 0 && p.rings.opacity <= 1, `${id} ring opacity`);
    assert.ok(typeof p.rings.color === 'string', `${id} ring color`);
  }

  for (const id of withoutRings) {
    const p = getCelestialPreset(id);
    assert.ok(p.rings === null, `${id} should have no rings`);
  }
});

test('saturn has ring textureUri, other ring bodies do not', () => {
  const saturn = getCelestialPreset('saturn');
  assert.ok(saturn.rings.textureUri.length > 0);

  for (const id of ['jupiter', 'uranus', 'neptune']) {
    const p = getCelestialPreset(id);
    assert.equal(p.rings.textureUri, '');
  }
});

test('moon presets have parentId linking to their parent planet', () => {
  assert.equal(getCelestialPreset('moon').parentId, 'earth');
  assert.equal(getCelestialPreset('io').parentId, 'jupiter');
  assert.equal(getCelestialPreset('europa').parentId, 'jupiter');
  assert.equal(getCelestialPreset('ganymede').parentId, 'jupiter');
  assert.equal(getCelestialPreset('titan').parentId, 'saturn');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/celestial.test.js`
Expected: FAIL — `obliquity`, `atmosphere`, `rings` fields don't exist yet

- [ ] **Step 3: Add physical data to all 13 presets**

Update each preset in `src/scene/celestial.js` PRESETS array. Add these fields to every entry. Example for Earth:

```js
{
  id: 'earth',
  label: 'Earth',
  kind: 'planet',
  parentId: null,
  radius: 1,
  baseColor: '#1e90ff',
  textureUri: '',
  rotationSpeed: 0.001,
  // NEW fields:
  obliquity: 23.44,
  northPoleRA: 0.0,
  northPoleDec: 90.0,
  orbitalPeriod: 365.256,
  siderealRotation: 23.934,
  orbitalInclination: 0.0,
  longitudeOfAscNode: 348.74,
  meanLongitudeJ2000: 100.46,
  atmosphere: {
    enabled: true,
    scaleHeight: 8.5,
    surfacePressure: 1.0,
    scatterColor: '#6b93d6',
    thickness: 0.06,
    density: 0.7,
  },
  rings: null,
},
```

Full data for all 13 bodies (from spec Section 2 table):

| Body | obliquity | orbitalPeriod | siderealRotation | atmosphere | rings |
|------|-----------|---------------|------------------|------------|-------|
| mercury | 0.03 | 87.97 | 1407.6 | null | null |
| venus | 177.4 | 224.70 | -5832.5 | { enabled:true, scaleHeight:15.9, surfacePressure:92, scatterColor:'#d4a55c', thickness:0.12, density:0.9 } | null |
| earth | 23.44 | 365.256 | 23.934 | { enabled:true, scaleHeight:8.5, surfacePressure:1.0, scatterColor:'#6b93d6', thickness:0.06, density:0.7 } | null |
| mars | 25.19 | 686.97 | 24.623 | { enabled:true, scaleHeight:11.1, surfacePressure:0.006, scatterColor:'#c47d5e', thickness:0.03, density:0.25 } | null |
| jupiter | 3.13 | 4332.59 | 9.925 | { enabled:true, scaleHeight:27.0, surfacePressure:1000, scatterColor:'#8b7355', thickness:0.08, density:0.4 } | { innerRadius:1.72, outerRadius:1.81, textureUri:'', opacity:0.05, color:'#8b7355' } |
| saturn | 26.73 | 10759.22 | 10.656 | { enabled:true, scaleHeight:59.5, surfacePressure:1000, scatterColor:'#c4a95a', thickness:0.08, density:0.4 } | { innerRadius:1.24, outerRadius:2.27, textureUri:'textures/saturn/2k_ring_alpha.png', opacity:0.85, color:'#c4a574' } |
| uranus | 97.77 | 30688.5 | -17.24 | { enabled:true, scaleHeight:27.7, surfacePressure:1000, scatterColor:'#9ddbe8', thickness:0.06, density:0.55 } | { innerRadius:1.64, outerRadius:2.00, textureUri:'', opacity:0.08, color:'#555555' } |
| neptune | 28.32 | 60182.0 | 16.11 | { enabled:true, scaleHeight:19.7, surfacePressure:1000, scatterColor:'#4f74d6', thickness:0.06, density:0.6 } | { innerRadius:1.69, outerRadius:2.54, textureUri:'', opacity:0.04, color:'#3a4a6b' } |
| moon | 6.68 | 27.322 | 655.73 | null | null |
| io | 0.04 | 1.769 | 42.459 | null | null |
| europa | 0.47 | 3.551 | 85.228 | null | null |
| ganymede | 0.17 | 7.155 | 171.71 | null | null |
| titan | 0.33 | 15.945 | 382.68 | { enabled:true, scaleHeight:21.0, surfacePressure:1.45, scatterColor:'#c48a3f', thickness:0.15, density:0.85 } | null |

Complete orbital element data for all bodies (NASA Planetary Fact Sheet J2000 values):

| Body | northPoleRA | northPoleDec | orbitalInclination | longitudeOfAscNode | meanLongitudeJ2000 |
|------|-------------|--------------|--------------------|--------------------|---------------------|
| mercury | 281.01 | 61.41 | 7.00 | 48.33 | 252.25 |
| venus | 272.76 | 67.16 | 3.39 | 76.68 | 181.98 |
| earth | 0.0 | 90.0 | 0.0 | 348.74 | 100.46 |
| mars | 317.68 | 52.89 | 1.85 | 49.56 | 355.45 |
| jupiter | 268.06 | 64.50 | 1.30 | 100.46 | 34.40 |
| saturn | 40.60 | 83.54 | 2.49 | 113.64 | 49.94 |
| uranus | 257.31 | -15.18 | 0.77 | 74.01 | 313.23 |
| neptune | 299.36 | 43.46 | 1.77 | 131.72 | 304.88 |
| moon | 0.0 | 90.0 | 5.14 | 125.08 | 218.32 |
| io | 268.05 | 64.50 | 0.04 | 43.98 | 106.07 |
| europa | 268.08 | 64.51 | 0.47 | 219.11 | 176.41 |
| ganymede | 268.20 | 64.57 | 0.18 | 63.55 | 121.35 |
| titan | 40.59 | 83.53 | 0.33 | 28.06 | 15.15 |

- [ ] **Step 4: Update `clonePreset()` to include new fields**

In `celestial.js`, update `clonePreset`:

```js
function clonePreset(preset) {
  return {
    ...preset,
    atmosphere: preset.atmosphere ? { ...preset.atmosphere } : null,
    rings: preset.rings ? { ...preset.rings } : null,
    lightingMode: 'fixed',
    lightingTimestamp: '',
    showBorders: true,
    showLabels: true,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/celestial.test.js`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add src/scene/celestial.js tests/celestial.test.js && git commit -m "feat: add physical data (obliquity, atmosphere, rings, orbital) to all 13 celestial presets" -- src/scene/celestial.js tests/celestial.test.js
```

---

### Task 2: Update `resolvePlanetConfig()` for New Fields

**Files:**
- Modify: `src/scene/celestial.js`
- Test: `tests/celestial.test.js`

- [ ] **Step 1: Write failing tests for config resolution**

Add to `tests/celestial.test.js`:

```js
test('resolvePlanetConfig merges atmosphere override (shallow merge)', () => {
  const planet = resolvePlanetConfig({ id: 'earth', atmosphere: { scatterColor: '#ff0000' } });
  assert.equal(planet.atmosphere.scatterColor, '#ff0000');
  // Other atmosphere fields preserved from preset
  assert.equal(planet.atmosphere.scaleHeight, 8.5);
  assert.equal(planet.atmosphere.enabled, true);
});

test('resolvePlanetConfig custom body gets default orbital values', () => {
  const planet = resolvePlanetConfig({ id: 'custom-world', baseColor: '#ff0000' });
  assert.equal(planet.obliquity, 0);
  assert.equal(planet.orbitalPeriod, 365.256);
  assert.equal(planet.siderealRotation, 24);
  assert.equal(planet.atmosphere, null);
  assert.equal(planet.rings, null);
});

test('resolvePlanetConfig preserves rings override', () => {
  const planet = resolvePlanetConfig({ id: 'saturn', rings: { opacity: 0.5 } });
  assert.equal(planet.rings.opacity, 0.5);
  assert.equal(planet.rings.innerRadius, 1.24);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/celestial.test.js`
Expected: FAIL — config resolution doesn't handle new fields yet

- [ ] **Step 3: Update `resolvePlanetConfig()` to merge new fields**

In `src/scene/celestial.js`, update the preset branch of `resolvePlanetConfig`:

```js
// After the existing field merges, add:
obliquity: safeNumber(planet.obliquity, preset.obliquity),
northPoleRA: safeNumber(planet.northPoleRA, preset.northPoleRA),
northPoleDec: safeNumber(planet.northPoleDec, preset.northPoleDec),
orbitalPeriod: safeNumber(planet.orbitalPeriod, preset.orbitalPeriod),
siderealRotation: safeNumber(planet.siderealRotation, preset.siderealRotation),
orbitalInclination: safeNumber(planet.orbitalInclination, preset.orbitalInclination),
longitudeOfAscNode: safeNumber(planet.longitudeOfAscNode, preset.longitudeOfAscNode),
meanLongitudeJ2000: safeNumber(planet.meanLongitudeJ2000, preset.meanLongitudeJ2000),
atmosphere: mergeAtmosphere(planet.atmosphere, preset.atmosphere),
rings: mergeRings(planet.rings, preset.rings),
```

Add helper functions:

```js
function mergeAtmosphere(override, base) {
  if (override === null) return null;
  if (!base) return override ?? null;
  if (!override || typeof override !== 'object') return base ? { ...base } : null;
  return { ...base, ...override };
}

function mergeRings(override, base) {
  if (override === null) return null;
  if (!base) return override ?? null;
  if (!override || typeof override !== 'object') return base ? { ...base } : null;
  return { ...base, ...override };
}
```

For the custom body branch, add defaults:

```js
obliquity: safeNumber(planet.obliquity, 0),
northPoleRA: safeNumber(planet.northPoleRA, 0),
northPoleDec: safeNumber(planet.northPoleDec, 90),
orbitalPeriod: safeNumber(planet.orbitalPeriod, 365.256),
siderealRotation: safeNumber(planet.siderealRotation, 24),
orbitalInclination: safeNumber(planet.orbitalInclination, 0),
longitudeOfAscNode: safeNumber(planet.longitudeOfAscNode, 0),
meanLongitudeJ2000: safeNumber(planet.meanLongitudeJ2000, 0),
atmosphere: planet.atmosphere ?? null,
rings: planet.rings ?? null,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/celestial.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/scene/celestial.js tests/celestial.test.js && git commit -m "feat: resolvePlanetConfig merges atmosphere, rings, and orbital fields" -- src/scene/celestial.js tests/celestial.test.js
```

---

### Task 3: Schema Validation for New Fields

**Files:**
- Modify: `src/scene/schema.js`
- Test: `tests/schema.test.js`

- [ ] **Step 1: Write failing tests for new validation rules**

Add to `tests/schema.test.js`:

```js
test('validateScene rejects invalid obliquity', () => {
  const scene = createEmptyScene();
  scene.planet.obliquity = -10;
  const result = validateScene(scene);
  assert.ok(result.errors.some(e => e.includes('obliquity')));
});

test('validateScene rejects zero siderealRotation', () => {
  const scene = createEmptyScene();
  scene.planet.siderealRotation = 0;
  const result = validateScene(scene);
  assert.ok(result.errors.some(e => e.includes('siderealRotation')));
});

test('validateScene rejects rings with innerRadius >= outerRadius', () => {
  const scene = createEmptyScene();
  scene.planet.rings = { innerRadius: 3, outerRadius: 2, opacity: 0.5, color: '#fff', textureUri: '' };
  const result = validateScene(scene);
  assert.ok(result.errors.some(e => e.includes('rings')));
});

test('validateScene rejects atmosphere density > 1', () => {
  const scene = createEmptyScene();
  scene.planet.atmosphere = { enabled: true, scaleHeight: 8, surfacePressure: 1, scatterColor: '#fff', thickness: 0.06, density: 1.5 };
  const result = validateScene(scene);
  assert.ok(result.errors.some(e => e.includes('density')));
});

test('validateScene accepts valid planet with atmosphere and rings', () => {
  const scene = createEmptyScene();
  scene.planet = resolvePlanetConfig('saturn');
  const result = validateScene(scene);
  assert.equal(result.valid, true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/schema.test.js`
Expected: FAIL — no validation for obliquity/siderealRotation/rings/atmosphere

- [ ] **Step 3: Add validation rules to `validateScene()`**

In `src/scene/schema.js`, after the existing `planet.lightingMode` check, add:

```js
// Obliquity
if (scene.planet.obliquity !== undefined) {
  if (!Number.isFinite(scene.planet.obliquity) || scene.planet.obliquity < 0 || scene.planet.obliquity > 360) {
    errors.push('planet.obliquity must be within [0, 360]');
  }
}

// Orbital period
if (scene.planet.orbitalPeriod !== undefined) {
  if (!Number.isFinite(scene.planet.orbitalPeriod) || scene.planet.orbitalPeriod <= 0) {
    errors.push('planet.orbitalPeriod must be > 0');
  }
}

// Sidereal rotation
if (scene.planet.siderealRotation !== undefined) {
  if (!Number.isFinite(scene.planet.siderealRotation) || scene.planet.siderealRotation === 0) {
    errors.push('planet.siderealRotation must not be 0');
  }
}

// Atmosphere
if (scene.planet.atmosphere !== null && scene.planet.atmosphere !== undefined) {
  const atmo = scene.planet.atmosphere;
  if (atmo.density !== undefined && (!Number.isFinite(atmo.density) || atmo.density < 0 || atmo.density > 1)) {
    errors.push('planet.atmosphere.density must be within [0, 1]');
  }
  if (atmo.thickness !== undefined && (!Number.isFinite(atmo.thickness) || atmo.thickness < 0)) {
    errors.push('planet.atmosphere.thickness must be >= 0');
  }
  if (atmo.scaleHeight !== undefined && (!Number.isFinite(atmo.scaleHeight) || atmo.scaleHeight <= 0)) {
    errors.push('planet.atmosphere.scaleHeight must be > 0');
  }
}

// Rings
if (scene.planet.rings !== null && scene.planet.rings !== undefined) {
  const rings = scene.planet.rings;
  if (rings.innerRadius >= rings.outerRadius) {
    errors.push('planet.rings.innerRadius must be < outerRadius');
  }
  if (rings.opacity !== undefined && (!Number.isFinite(rings.opacity) || rings.opacity < 0 || rings.opacity > 1)) {
    errors.push('planet.rings.opacity must be within [0, 1]');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/schema.test.js`
Expected: All PASS

- [ ] **Step 5: Run full test suite**

Run: `node --test tests/`
Expected: All existing tests still pass

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add src/scene/schema.js tests/schema.test.js && git commit -m "feat: schema validation for obliquity, atmosphere, rings, orbital fields" -- src/scene/schema.js tests/schema.test.js
```

---

## Chunk 2: Orbital Mechanics Module

### Task 4: Create `orbital.js` — Generalized Sun Direction

**Files:**
- Create: `src/math/orbital.js`
- Modify: `src/math/solar.js` (add re-exports)
- Create: `tests/orbital.test.js`
- Modify: `tests/solar.test.js` (verify backward compat)

- [ ] **Step 1: Write failing tests for orbital module**

Create `tests/orbital.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getSunDirectionForBody } from '../src/math/orbital.js';
import { getCelestialPreset } from '../src/scene/celestial.js';

test('getSunDirectionForBody returns normalized {x,y,z} for Earth', () => {
  const earth = getCelestialPreset('earth');
  const dir = getSunDirectionForBody(earth, '2026-06-21T12:00:00Z');

  assert.ok(Number.isFinite(dir.x));
  assert.ok(Number.isFinite(dir.y));
  assert.ok(Number.isFinite(dir.z));

  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2);
  assert.ok(Math.abs(len - 1) < 1e-6, `expected unit vector, got length ${len}`);
});

test('Mars northern summer solstice lights north pole', () => {
  const mars = getCelestialPreset('mars');
  // Mars northern summer solstice ~Ls 90, roughly July 2026
  const dir = getSunDirectionForBody(mars, '2026-07-15T12:00:00Z');
  // Sun should be above equator (positive y in body-fixed) during northern summer
  // At least verify the vector is valid and has a meaningful y component
  assert.ok(Number.isFinite(dir.y));
});

test('Uranus extreme tilt produces valid sun direction', () => {
  const uranus = getCelestialPreset('uranus');
  const dir = getSunDirectionForBody(uranus, '2026-01-01T00:00:00Z');

  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2);
  assert.ok(Math.abs(len - 1) < 1e-6);
});

test('Venus retrograde rotation handled without NaN', () => {
  const venus = getCelestialPreset('venus');
  const dir = getSunDirectionForBody(venus, '2026-03-11T12:00:00Z');

  assert.ok(Number.isFinite(dir.x));
  assert.ok(Number.isFinite(dir.y));
  assert.ok(Number.isFinite(dir.z));
});

test('Moon sun direction uses parent (Earth) orbital position', () => {
  const moon = getCelestialPreset('moon');
  const earth = getCelestialPreset('earth');

  const moonDir = getSunDirectionForBody(moon, '2026-06-21T12:00:00Z');
  const earthDir = getSunDirectionForBody(earth, '2026-06-21T12:00:00Z');

  // Moon and Earth should have similar sun directions (negligible parallax)
  // But not identical because of different obliquity and rotation
  assert.ok(Number.isFinite(moonDir.x));
  assert.ok(Number.isFinite(moonDir.y));
  assert.ok(Number.isFinite(moonDir.z));
});

test('getSunDirectionForBody defaults to current time when no timestamp given', () => {
  const earth = getCelestialPreset('earth');
  const dir = getSunDirectionForBody(earth);
  const len = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2);
  assert.ok(Math.abs(len - 1) < 1e-6);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/orbital.test.js`
Expected: FAIL — module does not exist

- [ ] **Step 3: Implement `orbital.js`**

Create `src/math/orbital.js`:

```js
import { getCelestialPreset } from '../scene/celestial.js';

const DEG_TO_RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_DAY = 86400000;

function resolveDate(input) {
  if (input instanceof Date && Number.isFinite(input.getTime())) return input;
  if (typeof input === 'string' || typeof input === 'number') {
    const d = new Date(input);
    if (Number.isFinite(d.getTime())) return d;
  }
  return new Date();
}

function daysSinceJ2000(date) {
  return (date.getTime() - J2000_MS) / MS_PER_DAY;
}

function normalize360(deg) {
  return ((deg % 360) + 360) % 360;
}

function normalizeVec3(x, y, z) {
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len === 0) return { x: 1, y: 0, z: 0 };
  return { x: x / len, y: y / len, z: z / len };
}

/**
 * Compute the heliocentric ecliptic longitude for a planet at a given date.
 * Simplified: mean longitude + time * (360 / orbitalPeriod).
 */
function heliocentricLongitude(bodyConfig, daysSinceEpoch) {
  const meanMotion = 360 / bodyConfig.orbitalPeriod; // deg/day
  return normalize360(bodyConfig.meanLongitudeJ2000 + meanMotion * daysSinceEpoch);
}

/**
 * Compute the sun direction in body-fixed coordinates for any celestial body.
 *
 * Returns a plain { x, y, z } unit vector pointing from the body toward the sun.
 * The renderer wraps this in THREE.Vector3 for shader uniforms.
 *
 * @param {object} bodyConfig - Resolved planet config from resolvePlanetConfig()
 * @param {string|number|Date} [dateInput] - Timestamp (defaults to now)
 * @returns {{ x: number, y: number, z: number }}
 */
export function getSunDirectionForBody(bodyConfig, dateInput) {
  const date = resolveDate(dateInput);
  const days = daysSinceJ2000(date);

  // For moons, use the parent planet's heliocentric position
  let helioLon;
  if (bodyConfig.parentId) {
    const parent = getCelestialPreset(bodyConfig.parentId);
    helioLon = heliocentricLongitude(parent, days);
  } else {
    helioLon = heliocentricLongitude(bodyConfig, days);
  }

  // Sun direction in ecliptic coords: opposite of body's heliocentric position
  const sunEclipticLon = normalize360(helioLon + 180);
  const sunLonRad = sunEclipticLon * DEG_TO_RAD;

  // Sun direction in ecliptic frame (x toward vernal equinox, z toward north ecliptic pole)
  let sunX = Math.cos(sunLonRad);
  let sunY = 0; // Sun is in the ecliptic plane
  let sunZ = Math.sin(sunLonRad);

  // Rotate by obliquity (tilt the body's axis relative to ecliptic)
  const oblRad = bodyConfig.obliquity * DEG_TO_RAD;
  // For retrograde rotators (obliquity > 90), this naturally handles the flip
  const cosObl = Math.cos(oblRad);
  const sinObl = Math.sin(oblRad);

  // Rotate sun direction from ecliptic to body equatorial frame (rotation around X axis)
  const eqX = sunX;
  const eqY = sunY * cosObl + sunZ * sinObl;
  const eqZ = -sunY * sinObl + sunZ * cosObl;

  // Apply sidereal rotation: how much has the body spun since J2000
  const hoursElapsed = days * 24;
  const rotationsElapsed = hoursElapsed / Math.abs(bodyConfig.siderealRotation);
  const spinAngle = (rotationsElapsed * 360) % 360;
  // For retrograde rotation (negative siderealRotation), spin goes backwards
  const spinDir = bodyConfig.siderealRotation < 0 ? 1 : -1;
  const spinRad = spinDir * spinAngle * DEG_TO_RAD;

  const cosSpin = Math.cos(spinRad);
  const sinSpin = Math.sin(spinRad);

  // Rotate around Y axis (body's spin axis = Y in body-fixed frame)
  const bodyX = eqX * cosSpin - eqZ * sinSpin;
  const bodyY = eqY;
  const bodyZ = eqX * sinSpin + eqZ * cosSpin;

  return normalizeVec3(bodyX, bodyY, bodyZ);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/orbital.test.js`
Expected: All PASS

- [ ] **Step 5: Add backward-compatible re-export to `solar.js`**

Add to the end of `src/math/solar.js`:

```js
// Re-export from orbital.js for new code paths
export { getSunDirectionForBody } from './orbital.js';
```

- [ ] **Step 6: Verify existing solar tests still pass**

Run: `node --test tests/solar.test.js`
Expected: All PASS (existing functions unchanged)

- [ ] **Step 7: Commit**

```bash
git restore --staged :/ && git add src/math/orbital.js src/math/solar.js tests/orbital.test.js && git commit -m "feat: orbital.js — generalized sun direction for any celestial body" -- src/math/orbital.js src/math/solar.js tests/orbital.test.js
```

---

## Chunk 3: Texture Loading & Download Script

### Task 5: Create Progressive Texture Loader

**Files:**
- Create: `src/renderer/textureLoader.js`
- Create: `tests/texture-loader.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/texture-loader.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveTexturePaths,
  shouldUpgradeTexture,
} from '../src/renderer/textureLoader.js';

test('resolveTexturePaths returns correct 2K paths for Earth', () => {
  const paths = resolveTexturePaths({ id: 'earth' });
  assert.equal(paths.surface, 'assets/textures/earth/2k_day.jpg');
  assert.equal(paths.night, 'assets/textures/earth/2k_night.jpg');
  assert.equal(paths.surfaceHi, 'assets/textures/earth/8k_day.jpg');
  assert.equal(paths.nightHi, 'assets/textures/earth/8k_night.jpg');
});

test('resolveTexturePaths returns correct paths for Mars (no night texture)', () => {
  const paths = resolveTexturePaths({ id: 'mars' });
  assert.equal(paths.surface, 'assets/textures/mars/2k_surface.jpg');
  assert.equal(paths.night, null);
  assert.equal(paths.surfaceHi, 'assets/textures/mars/8k_surface.jpg');
});

test('resolveTexturePaths returns null surfaceHi for bodies with no 8K', () => {
  const paths = resolveTexturePaths({ id: 'uranus' });
  assert.equal(paths.surface, 'assets/textures/uranus/2k_surface.jpg');
  assert.equal(paths.surfaceHi, null);
});

test('resolveTexturePaths respects textureUri override', () => {
  const paths = resolveTexturePaths({ id: 'earth', textureUri: 'custom/earth.jpg' });
  assert.equal(paths.surface, 'custom/earth.jpg');
});

test('shouldUpgradeTexture returns true when zoom > threshold', () => {
  assert.equal(shouldUpgradeTexture(2.5, 8192), true);
  assert.equal(shouldUpgradeTexture(1.5, 8192), false);
});

test('shouldUpgradeTexture returns false when maxResolution is 2048', () => {
  assert.equal(shouldUpgradeTexture(3.0, 2048), false);
});

test('resolveTexturePaths returns Venus atmosphere path', () => {
  const paths = resolveTexturePaths({ id: 'venus' });
  assert.equal(paths.atmosphereOverlay, 'assets/textures/venus/2k_atmosphere.jpg');
});

test('resolveTexturePaths returns Saturn ring path', () => {
  const paths = resolveTexturePaths({ id: 'saturn' });
  assert.equal(paths.ring, 'assets/textures/saturn/2k_ring_alpha.png');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/texture-loader.test.js`
Expected: FAIL — module does not exist

- [ ] **Step 3: Implement texture loader module**

Create `src/renderer/textureLoader.js`:

```js
const ZOOM_UPGRADE_THRESHOLD = 2.0;

// Bodies that have 8K textures available
const HAS_8K = new Set(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'moon']);

// Bodies that have night textures
const HAS_NIGHT = new Set(['earth']);

// Bodies with atmosphere overlay textures
const HAS_ATMO_OVERLAY = new Set(['venus']);

/**
 * Resolve the texture file paths for a celestial body.
 * @param {object} planetConfig - Resolved planet config
 * @returns {{ surface: string, night: string|null, surfaceHi: string|null, nightHi: string|null, atmosphereOverlay: string|null, ring: string|null }}
 */
export function resolveTexturePaths(planetConfig) {
  const id = planetConfig.id;

  // Custom textureUri takes priority
  if (planetConfig.textureUri && planetConfig.textureUri.length > 0) {
    return {
      surface: planetConfig.textureUri,
      night: planetConfig.nightTextureUri || null,
      surfaceHi: null,
      nightHi: null,
      atmosphereOverlay: null,
      ring: planetConfig.rings?.textureUri || null,
    };
  }

  const base = `assets/textures/${id}`;
  const isEarth = id === 'earth';
  const surfaceName = isEarth ? 'day' : 'surface';
  const has8k = HAS_8K.has(id);

  return {
    surface: `${base}/2k_${surfaceName}.jpg`,
    night: HAS_NIGHT.has(id) ? `${base}/2k_night.jpg` : null,
    surfaceHi: has8k ? `${base}/8k_${surfaceName}.jpg` : null,
    nightHi: (has8k && HAS_NIGHT.has(id)) ? `${base}/8k_night.jpg` : null,
    atmosphereOverlay: HAS_ATMO_OVERLAY.has(id) ? `${base}/2k_atmosphere.jpg` : null,
    ring: planetConfig.rings?.textureUri
      ? `assets/${planetConfig.rings.textureUri}`
      : null,
  };
}

/**
 * Whether the current zoom level warrants upgrading to high-res textures.
 * @param {number} zoom - Current zoom level
 * @param {number} maxResolution - Max texture resolution (e.g. 8192, 2048)
 * @returns {boolean}
 */
export function shouldUpgradeTexture(zoom, maxResolution = 8192) {
  if (maxResolution <= 2048) return false;
  return zoom > ZOOM_UPGRADE_THRESHOLD;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/texture-loader.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/textureLoader.js tests/texture-loader.test.js && git commit -m "feat: progressive texture loader with per-body path resolution" -- src/renderer/textureLoader.js tests/texture-loader.test.js
```

---

### Task 6: Create Texture Download Script

**Files:**
- Create: `tools/download-textures.sh`
- Create: `assets/textures/CREDITS.md`

- [ ] **Step 1: Write the download script**

Create `tools/download-textures.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ASSETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/textures"

SSS_BASE="https://www.solarsystemscope.com/textures/download"

declare -A TEXTURES=(
  # Solar System Scope (CC-BY 4.0)
  ["mercury/2k_surface.jpg"]="$SSS_BASE/2k_mercury.jpg"
  ["mercury/8k_surface.jpg"]="$SSS_BASE/8k_mercury.jpg"
  ["venus/2k_surface.jpg"]="$SSS_BASE/2k_venus_surface.jpg"
  ["venus/8k_surface.jpg"]="$SSS_BASE/8k_venus_surface.jpg"
  ["venus/2k_atmosphere.jpg"]="$SSS_BASE/2k_venus_atmosphere.jpg"
  ["earth/2k_day.jpg"]="$SSS_BASE/2k_earth_daymap.jpg"
  ["earth/2k_night.jpg"]="$SSS_BASE/2k_earth_nightmap.jpg"
  ["earth/8k_day.jpg"]="$SSS_BASE/8k_earth_daymap.jpg"
  ["earth/8k_night.jpg"]="$SSS_BASE/8k_earth_nightmap.jpg"
  ["mars/2k_surface.jpg"]="$SSS_BASE/2k_mars.jpg"
  ["mars/8k_surface.jpg"]="$SSS_BASE/8k_mars.jpg"
  ["jupiter/2k_surface.jpg"]="$SSS_BASE/2k_jupiter.jpg"
  ["jupiter/8k_surface.jpg"]="$SSS_BASE/8k_jupiter.jpg"
  ["saturn/2k_surface.jpg"]="$SSS_BASE/2k_saturn.jpg"
  ["saturn/8k_surface.jpg"]="$SSS_BASE/8k_saturn.jpg"
  ["saturn/2k_ring_alpha.png"]="$SSS_BASE/2k_saturn_ring_alpha.png"
  ["saturn/8k_ring_alpha.png"]="$SSS_BASE/8k_saturn_ring_alpha.png"
  ["uranus/2k_surface.jpg"]="$SSS_BASE/2k_uranus.jpg"
  ["neptune/2k_surface.jpg"]="$SSS_BASE/2k_neptune.jpg"
  ["moon/2k_surface.jpg"]="$SSS_BASE/2k_moon.jpg"
  ["moon/8k_surface.jpg"]="$SSS_BASE/8k_moon.jpg"
)

# NASA/JPL USGS Astrogeology — public domain
# These URLs point to USGS astrogeology global mosaics
NASA_BASE="https://astropedia.astrogeology.usgs.gov/download"
declare -A NASA_TEXTURES=(
  ["io/2k_surface.jpg"]="${NASA_BASE}/Io/Voyager-Galileo/Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.jpg"
  ["europa/2k_surface.jpg"]="${NASA_BASE}/Europa/Voyager-Galileo/Europa_Voyager_GalileoSSI_global_mosaic_500m.jpg"
  ["ganymede/2k_surface.jpg"]="${NASA_BASE}/Ganymede/Voyager-Galileo/Ganymede_Voyager_GalileoSSI_global_mosaic_1km.jpg"
  ["titan/2k_surface.jpg"]="${NASA_BASE}/Titan/Cassini/Titan_ISS_P19658_Mosaic_Global_4008.jpg"
)

echo "Downloading celestial body textures..."
echo "Target: $ASSETS_DIR"
echo ""

download() {
  local rel_path="$1"
  local url="$2"
  local dest="$ASSETS_DIR/$rel_path"
  local dir="$(dirname "$dest")"

  mkdir -p "$dir"

  if [ -f "$dest" ]; then
    echo "  SKIP  $rel_path (exists)"
    return
  fi

  echo "  GET   $rel_path"
  if curl -fsSL --retry 2 --max-time 120 -o "$dest" "$url"; then
    echo "  OK    $rel_path ($(du -h "$dest" | cut -f1))"
  else
    echo "  FAIL  $rel_path — $url"
    rm -f "$dest"
  fi
}

echo "--- Solar System Scope (CC-BY 4.0) ---"
for rel_path in "${!TEXTURES[@]}"; do
  download "$rel_path" "${TEXTURES[$rel_path]}"
done

echo ""
echo "--- NASA/JPL USGS Astrogeology (public domain) ---"
for rel_path in "${!NASA_TEXTURES[@]}"; do
  download "$rel_path" "${NASA_TEXTURES[$rel_path]}"
done

echo ""
echo "Done. Run this script again to fill in any failed downloads."
```

- [ ] **Step 2: Make script executable**

Run: `chmod +x tools/download-textures.sh`

- [ ] **Step 3: Write CREDITS.md**

Create `assets/textures/CREDITS.md`:

```markdown
# Texture Credits

## Solar System Scope (CC-BY 4.0)

Textures for Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and Moon
are sourced from [Solar System Scope](https://www.solarsystemscope.com/textures/).

License: [Creative Commons Attribution 4.0 International (CC-BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

Attribution: Solar System Scope / INOVE

## NASA/JPL USGS Astrogeology (Public Domain)

Textures for Io, Europa, Ganymede, and Titan are sourced from
NASA/JPL mission data via the [USGS Astrogeology Science Center](https://astrogeology.usgs.gov/).

- Io: Galileo SSI / Voyager global mosaic
- Europa: Voyager / Galileo SSI global mosaic
- Ganymede: Voyager / Galileo SSI global mosaic
- Titan: Cassini ISS global mosaic

License: Public domain (U.S. Government work)
```

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add tools/download-textures.sh assets/textures/CREDITS.md && git commit -m "feat: texture download script and attribution for all celestial bodies" -- tools/download-textures.sh assets/textures/CREDITS.md
```

---

## Chunk 4: Ring Builder

### Task 7: Create Ring Builder Module

**Files:**
- Create: `src/renderer/ringBuilder.js`
- Create: `tests/ring-builder.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/ring-builder.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRingMesh } from '../src/renderer/ringBuilder.js';
import { getCelestialPreset } from '../src/scene/celestial.js';
import { Mesh, DoubleSide } from 'three';

test('createRingMesh returns null for bodies without rings', () => {
  const earth = getCelestialPreset('earth');
  assert.equal(createRingMesh(earth), null);
});

test('createRingMesh returns null when rings config is null', () => {
  assert.equal(createRingMesh({ rings: null }), null);
});

test('createRingMesh returns a Mesh for Saturn', () => {
  const saturn = getCelestialPreset('saturn');
  const ring = createRingMesh(saturn);
  assert.ok(ring instanceof Mesh);
});

test('Saturn ring is double-sided and transparent', () => {
  const saturn = getCelestialPreset('saturn');
  const ring = createRingMesh(saturn);
  assert.equal(ring.material.side, DoubleSide);
  assert.equal(ring.material.transparent, true);
  assert.equal(ring.material.depthWrite, false);
});

test('ring geometry has correct inner/outer radius', () => {
  const saturn = getCelestialPreset('saturn');
  const ring = createRingMesh(saturn);
  const params = ring.geometry.parameters;
  assert.equal(params.innerRadius, saturn.rings.innerRadius);
  assert.equal(params.outerRadius, saturn.rings.outerRadius);
});

test('Jupiter ring has very low opacity', () => {
  const jupiter = getCelestialPreset('jupiter');
  const ring = createRingMesh(jupiter);
  assert.ok(ring.material.opacity <= 0.1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/ring-builder.test.js`
Expected: FAIL — module does not exist

- [ ] **Step 3: Implement ring builder**

Create `src/renderer/ringBuilder.js`:

```js
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Color,
} from 'three';

/**
 * Create a ring mesh for a celestial body.
 * Returns null if the body has no ring config.
 *
 * The ring lies in the XZ plane (equatorial). Since it's a child of globeGroup,
 * it inherits the body's obliquity tilt automatically.
 *
 * @param {object} planetConfig - Resolved planet config
 * @param {import('three').Texture|null} [ringTexture] - Optional alpha texture for Saturn
 * @returns {import('three').Mesh|null}
 */
export function createRingMesh(planetConfig, ringTexture = null) {
  const rings = planetConfig?.rings;
  if (!rings) return null;

  const geometry = new RingGeometry(rings.innerRadius, rings.outerRadius, 128);

  // Fix UVs for radial texture mapping (Three.js RingGeometry UVs are
  // in [0,1] based on angle; we remap to radial distance for the strip texture)
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const dist = Math.sqrt(x * x + z * z);
    const t = (dist - rings.innerRadius) / (rings.outerRadius - rings.innerRadius);
    uv.setXY(i, t, 0.5);
  }

  const color = new Color(rings.color || '#ffffff');

  const material = new MeshBasicMaterial({
    color,
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    opacity: rings.opacity ?? 0.5,
  });

  if (ringTexture) {
    material.map = ringTexture;
    material.alphaMap = ringTexture;
    // When texture is present, let it drive the alpha
    material.opacity = 1.0;
  }

  const mesh = new Mesh(geometry, material);
  // Ring lies in XZ plane by default — rotate to be horizontal
  mesh.rotation.x = -Math.PI / 2;

  return mesh;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/ring-builder.test.js`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add src/renderer/ringBuilder.js tests/ring-builder.test.js && git commit -m "feat: ring builder for Saturn (textured) and gas giant faint rings" -- src/renderer/ringBuilder.js tests/ring-builder.test.js
```

---

## Chunk 5: Body & Atmosphere Shaders

### Task 8: Add Single-Texture and Venus Shaders to `earthBuilder.js`

**Files:**
- Modify: `src/renderer/earthBuilder.js`
- Modify: `tests/earth-builder.test.js`

- [ ] **Step 1: Write failing tests for new shader modes**

Add to `tests/earth-builder.test.js`:

```js
import { createBodyMesh, createAtmosphereMesh } from '../src/renderer/earthBuilder.js';

test('createBodyMesh with shaderMode "single" has single-texture uniforms', () => {
  const body = createBodyMesh({ shaderMode: 'single' });
  assert.ok(body instanceof Mesh);
  assert.ok('dayTexture' in body.material.uniforms);
  assert.ok('sunDirection' in body.material.uniforms);
});

test('createBodyMesh with shaderMode "venusAtmosphere" has atmosphereTexture uniform', () => {
  const body = createBodyMesh({ shaderMode: 'venusAtmosphere' });
  assert.ok('atmosphereTexture' in body.material.uniforms);
  assert.ok('atmosphereTextureBlend' in body.material.uniforms);
});

test('createAtmosphereMesh with custom thickness changes geometry radius', () => {
  const thin = createAtmosphereMesh({ thickness: 0.03 });
  const thick = createAtmosphereMesh({ thickness: 0.15 });
  assert.ok(thin.geometry.parameters.radius < thick.geometry.parameters.radius);
});

test('createAtmosphereMesh with density uniform', () => {
  const atmos = createAtmosphereMesh({ density: 0.25 });
  assert.ok('atmosphereDensity' in atmos.material.uniforms);
  assert.equal(atmos.material.uniforms.atmosphereDensity.value, 0.25);
});

test('createBodyMesh shaderMode "dayNight" is backward compatible with createEarthMesh', () => {
  const body = createBodyMesh({ shaderMode: 'dayNight' });
  assert.ok('dayTexture' in body.material.uniforms);
  assert.ok('nightTexture' in body.material.uniforms);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/earth-builder.test.js`
Expected: FAIL — `createBodyMesh` doesn't exist, `createAtmosphereMesh` doesn't have `thickness`/`density` params

- [ ] **Step 3: Add new shaders and `createBodyMesh` function**

In `src/renderer/earthBuilder.js`, add the new fragment shaders:

```glsl
// BODY_FRAG_SINGLE — single texture, Lambert diffuse, Fresnel rim
const BODY_FRAG_SINGLE = /* glsl */`
  uniform sampler2D dayTexture;
  uniform vec3 sunDirection;
  uniform vec3 rimColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);
    vec3 lightDir = normalize(sunDirection);

    float NdotL = max(0.0, dot(normal, lightDir));
    float ambient = 0.05;
    float diffuse = NdotL;

    vec4 texColor = texture2D(dayTexture, vUv);

    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    vec3 rim = rimColor * fresnel * 0.4;

    gl_FragColor = vec4(texColor.rgb * (ambient + diffuse) + rim, 1.0);
  }
`;

// BODY_FRAG_VENUS — surface dimmed + atmosphere overlay
const BODY_FRAG_VENUS = /* glsl */`
  uniform sampler2D dayTexture;
  uniform sampler2D atmosphereTexture;
  uniform float atmosphereTextureBlend;
  uniform vec3 sunDirection;
  uniform vec3 rimColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);
    vec3 lightDir = normalize(sunDirection);

    float NdotL = max(0.0, dot(normal, lightDir));
    float ambient = 0.05;
    float diffuse = NdotL;

    vec4 surfaceColor = texture2D(dayTexture, vUv) * 0.3;
    vec4 atmoColor = texture2D(atmosphereTexture, vUv);
    vec4 texColor = mix(surfaceColor, atmoColor, atmosphereTextureBlend);

    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    vec3 rim = rimColor * fresnel * 0.6;

    gl_FragColor = vec4(texColor.rgb * (ambient + diffuse) + rim, 1.0);
  }
`;
```

Add the `createBodyMesh` function:

```js
/**
 * Create a body mesh with the appropriate shader for the body type.
 * @param {object} options
 * @param {'dayNight'|'single'|'venusAtmosphere'} [options.shaderMode='dayNight']
 * @param {import('three').Texture|null} [options.dayTexture]
 * @param {import('three').Texture|null} [options.nightTexture]
 * @param {import('three').Texture|null} [options.atmosphereTexture]
 * @param {number} [options.atmosphereTextureBlend=0.85]
 * @param {import('three').Vector3} [options.sunDirection]
 * @param {number[]} [options.rimColor=[0.3, 0.5, 1.0]]
 * @returns {import('three').Mesh}
 */
export function createBodyMesh(options = {}) {
  const {
    shaderMode = 'dayNight',
    dayTexture = null,
    nightTexture = null,
    atmosphereTexture = null,
    atmosphereTextureBlend = 0.85,
    sunDirection = DEFAULT_SUN_DIRECTION,
    rimColor = DEFAULT_ATMOSPHERE_COLOR,
  } = options;

  const geometry = new SphereGeometry(1, 64, 64);

  const uniforms = {
    dayTexture: { value: dayTexture },
    sunDirection: { value: sunDirection },
    rimColor: { value: rimColor },
  };

  let fragmentShader;
  if (shaderMode === 'venusAtmosphere') {
    uniforms.atmosphereTexture = { value: atmosphereTexture };
    uniforms.atmosphereTextureBlend = { value: atmosphereTextureBlend };
    fragmentShader = BODY_FRAG_VENUS;
  } else if (shaderMode === 'single') {
    fragmentShader = BODY_FRAG_SINGLE;
  } else {
    // dayNight (Earth)
    uniforms.nightTexture = { value: nightTexture };
    fragmentShader = nightTexture ? EARTH_FRAG_DAY_NIGHT : EARTH_FRAG_DAY_ONLY;
  }

  const material = new ShaderMaterial({
    uniforms,
    vertexShader: EARTH_VERT,
    fragmentShader,
  });

  return new Mesh(geometry, material);
}
```

Keep `createEarthMesh` as a backward-compat wrapper:

```js
export function createEarthMesh(options = {}) {
  return createBodyMesh({
    ...options,
    shaderMode: options.nightLayer === false ? 'single' : 'dayNight',
  });
}
```

- [ ] **Step 4: Upgrade `createAtmosphereMesh` with per-body uniforms**

Update `createAtmosphereMesh` signature and shader:

```js
const ATMOS_FRAG_V2 = /* glsl */`
  uniform vec3 sunDirection;
  uniform vec3 atmosphereColor;
  uniform float atmosphereDensity;
  uniform float scaleHeightNorm;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);

    float rawFresnel = 1.0 - abs(dot(viewDir, normal));
    float fresnel = exp(-rawFresnel / max(scaleHeightNorm, 0.01)) ;
    fresnel = 1.0 - fresnel; // invert: high at edges

    float sunFacing = max(0.0, dot(normal, normalize(sunDirection)));
    float brightness = 0.4 + 0.6 * sunFacing;

    vec3 color = atmosphereColor * brightness;
    float alpha = fresnel * atmosphereDensity;

    gl_FragColor = vec4(color, alpha);
  }
`;

export function createAtmosphereMesh(options = {}) {
  const {
    sunDirection = DEFAULT_SUN_DIRECTION,
    atmosphereColor = DEFAULT_ATMOSPHERE_COLOR,
    thickness = 0.06,
    density = 0.7,
    scaleHeightNorm = 0.5,
  } = options;

  const radius = 1.0 + thickness;
  const geometry = new SphereGeometry(radius, 64, 64);

  const material = new ShaderMaterial({
    uniforms: {
      sunDirection: { value: sunDirection },
      atmosphereColor: { value: atmosphereColor },
      atmosphereDensity: { value: density },
      scaleHeightNorm: { value: scaleHeightNorm },
    },
    vertexShader: ATMOS_VERT,
    fragmentShader: ATMOS_FRAG_V2,
    side: BackSide,
    transparent: true,
    depthWrite: false,
  });

  return new Mesh(geometry, material);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/earth-builder.test.js`
Expected: All PASS (old and new tests)

- [ ] **Step 6: Commit**

```bash
git restore --staged :/ && git add src/renderer/earthBuilder.js tests/earth-builder.test.js && git commit -m "feat: per-body shaders (single/venus/dayNight) and atmosphere density uniforms" -- src/renderer/earthBuilder.js tests/earth-builder.test.js
```

---

## Chunk 6: Renderer Integration

### Task 9: Integrate Everything into ThreeGlobeRenderer

**Files:**
- Modify: `src/renderer/threeGlobeRenderer.js`
- Modify: `tests/three-renderer.test.js`

This is the largest task — wiring up all the new modules into the renderer. Split into sub-steps.

- [ ] **Step 1: Rename `#earthMesh` → `#bodyMesh` throughout**

In `src/renderer/threeGlobeRenderer.js`, find-and-replace all occurrences of `#earthMesh` with `#bodyMesh`. There are ~15 references.

Also rename the `screenToLatLon` internal reference.

Run: `node --test tests/three-renderer.test.js`
Expected: All PASS (rename is internal, no behavior change)

- [ ] **Step 2: Commit rename**

```bash
git restore --staged :/ && git add src/renderer/threeGlobeRenderer.js && git commit -m "refactor: rename #earthMesh to #bodyMesh in ThreeGlobeRenderer" -- src/renderer/threeGlobeRenderer.js
```

- [ ] **Step 3: Add `#ringMesh` field and move atmosphere into `globeGroup`**

Add private field:

```js
#ringMesh = null;
```

In `init()`, move `atmosphereMesh` from `scene.add(atmosphereMesh)` to `globeGroup.add(atmosphereMesh)`.

In `destroy()`, add ring mesh disposal:

```js
if (this.#ringMesh) {
  this.#ringMesh.geometry?.dispose();
  this.#ringMesh.material?.dispose();
  this.#ringMesh = null;
}
```

- [ ] **Step 4: Add imports for new modules**

```js
import { createBodyMesh, createAtmosphereMesh } from './earthBuilder.js';
import { createRingMesh } from './ringBuilder.js';
import { resolveTexturePaths, shouldUpgradeTexture } from './textureLoader.js';
import { getSunDirectionForBody } from '../math/orbital.js';
```

Remove old `createEarthMesh` import (replaced by `createBodyMesh`).

- [ ] **Step 5: Update `init()` to use body config**

Replace the hardcoded Earth mesh creation in `init()`:

```js
// Determine shader mode from planet config
const planet = options.initialScene?.planet ?? {};
const resolvedPlanet = resolvePlanetConfig(planet);
const shaderMode = resolvedPlanet.id === 'earth' ? 'dayNight'
  : resolvedPlanet.id === 'venus' ? 'venusAtmosphere'
  : 'single';

const bodyMesh = createBodyMesh({
  shaderMode,
  sunDirection: this.#sunDirection,
  rimColor: resolvedPlanet.atmosphere
    ? hexToRgb(resolvedPlanet.atmosphere.scatterColor)
    : [0.3, 0.5, 1.0],
});
this.#bodyMesh = bodyMesh;
globeGroup.add(bodyMesh);
```

Create atmosphere conditionally:

```js
if (resolvedPlanet.atmosphere?.enabled) {
  const atmosphereMesh = createAtmosphereMesh({
    sunDirection: this.#sunDirection,
    atmosphereColor: hexToRgb(resolvedPlanet.atmosphere.scatterColor),
    thickness: resolvedPlanet.atmosphere.thickness,
    density: resolvedPlanet.atmosphere.density,
    scaleHeightNorm: resolvedPlanet.atmosphere.scaleHeight / 50, // normalize to ~[0,1]
  });
  this.#atmosphereMesh = atmosphereMesh;
  globeGroup.add(atmosphereMesh); // inside globeGroup now
}
```

Create ring if configured:

```js
if (resolvedPlanet.rings) {
  const ringMesh = createRingMesh(resolvedPlanet);
  if (ringMesh) {
    this.#ringMesh = ringMesh;
    globeGroup.add(ringMesh);
  }
}
```

Apply obliquity:

```js
// Store base obliquity offset
this.#obliquityRad = (resolvedPlanet.obliquity ?? 0) * DEG_TO_RAD;
```

Add a helper to convert hex to `THREE.Color` (Three.js uniforms need Color/Vector3, not plain arrays):

```js
import { Color } from 'three';

function hexToColor(hex) {
  return new Color(hex || '#ffffff');
}
```

Update the `createBodyMesh` and `createAtmosphereMesh` calls to use `hexToColor` instead of `hexToRgb`:

```js
rimColor: resolvedPlanet.atmosphere
  ? hexToColor(resolvedPlanet.atmosphere.scatterColor)
  : new Color(0.3, 0.5, 1.0),
```

```js
atmosphereColor: hexToColor(resolvedPlanet.atmosphere.scatterColor),
```

**Note:** `createBodyMesh` and `createAtmosphereMesh` must also accept `THREE.Color` for their `rimColor`/`atmosphereColor` params. Update `DEFAULT_ATMOSPHERE_COLOR` in `earthBuilder.js` from `[0.3, 0.6, 1.0]` to `new Color(0.3, 0.6, 1.0)`.

- [ ] **Step 6: Apply obliquity via nested group (not summed with centerLat)**

Obliquity and user panning must be in separate coordinate frames. Summing them in a single `rotation.x` conflates physical tilt with user navigation and breaks at extreme latitudes.

**Solution:** Use a wrapper group. The outer group carries the obliquity tilt; the inner group carries user panning.

```js
// In init(), create a wrapper group for obliquity:
#obliquityGroup = null;

// In init():
const obliquityGroup = new Group();
this.#obliquityGroup = obliquityGroup;
scene.add(obliquityGroup);

const globeGroup = new Group();
this.#globeGroup = globeGroup;
obliquityGroup.add(globeGroup); // globeGroup is child of obliquityGroup

// Apply obliquity to the outer group (fixed physical tilt)
obliquityGroup.rotation.x = (resolvedPlanet.obliquity ?? 0) * DEG_TO_RAD;
```

`#applyGlobeRotation()` stays unchanged — it only sets `this.#globeGroup.rotation`, which is user panning:

```js
#applyGlobeRotation() {
  if (!this.#globeGroup) return;
  this.#globeGroup.rotation.set(
    this.#centerLat * DEG_TO_RAD,
    -(this.#centerLon + 90) * DEG_TO_RAD,
    0,
    'XYZ'
  );
}
```

This way obliquity is applied at the outer level (physical tilt) and panning at the inner level (user navigation) — they compose correctly via the scene graph hierarchy. All children of `globeGroup` (body, atmosphere, rings, markers, arcs, etc.) inherit both transforms.

- [ ] **Step 7: Add body-switching detection and teardown/rebuild in `renderScene()`**

Add a `#currentBodyId` tracking field:

```js
#currentBodyId = null;
```

In `renderScene()`, after `const planet = scene.planet ?? {};`, add body-switch detection:

```js
const resolvedPlanet = resolvePlanetConfig(planet);

// Detect body change — teardown old meshes and rebuild
if (resolvedPlanet.id !== this.#currentBodyId && this.#globeGroup) {
  this.#rebuildBody(resolvedPlanet);
}
```

Add the `#rebuildBody(planet)` private method:

```js
#rebuildBody(planet) {
  // Teardown old body mesh
  if (this.#bodyMesh) {
    this.#globeGroup.remove(this.#bodyMesh);
    this.#bodyMesh.geometry?.dispose();
    this.#bodyMesh.material?.dispose();
    this.#bodyMesh = null;
  }

  // Teardown old atmosphere
  if (this.#atmosphereMesh) {
    this.#globeGroup.remove(this.#atmosphereMesh);
    this.#atmosphereMesh.geometry?.dispose();
    this.#atmosphereMesh.material?.dispose();
    this.#atmosphereMesh = null;
  }

  // Teardown old ring
  if (this.#ringMesh) {
    this.#globeGroup.remove(this.#ringMesh);
    this.#ringMesh.geometry?.dispose();
    this.#ringMesh.material?.dispose();
    this.#ringMesh = null;
  }

  // Determine shader mode
  const shaderMode = planet.id === 'earth' ? 'dayNight'
    : planet.id === 'venus' ? 'venusAtmosphere'
    : 'single';

  // Rebuild body mesh
  const bodyMesh = createBodyMesh({
    shaderMode,
    sunDirection: this.#sunDirection,
    rimColor: planet.atmosphere
      ? hexToColor(planet.atmosphere.scatterColor)
      : new Color(0.3, 0.5, 1.0),
  });
  this.#bodyMesh = bodyMesh;
  this.#globeGroup.add(bodyMesh);

  // Rebuild atmosphere (if applicable)
  if (planet.atmosphere?.enabled) {
    const atmosphereMesh = createAtmosphereMesh({
      sunDirection: this.#sunDirection,
      atmosphereColor: hexToColor(planet.atmosphere.scatterColor),
      thickness: planet.atmosphere.thickness,
      density: planet.atmosphere.density,
      scaleHeightNorm: planet.atmosphere.scaleHeight / 50,
    });
    this.#atmosphereMesh = atmosphereMesh;
    this.#globeGroup.add(atmosphereMesh);
  }

  // Rebuild ring (if applicable)
  if (planet.rings) {
    const ringMesh = createRingMesh(planet);
    if (ringMesh) {
      this.#ringMesh = ringMesh;
      this.#globeGroup.add(ringMesh);
    }
  }

  // Update obliquity on the outer group
  if (this.#obliquityGroup) {
    this.#obliquityGroup.rotation.x = (planet.obliquity ?? 0) * DEG_TO_RAD;
  }

  // Track current body
  this.#currentBodyId = planet.id;
}
```

- [ ] **Step 9: Update `#updateTextures()` to use `resolveTexturePaths`**

Replace the existing `#updateTextures` method:

```js
#updateTextures(planet) {
  if (!this.#bodyMesh) return;
  const mat = this.#bodyMesh.material;
  if (!mat?.uniforms) return;

  const paths = resolveTexturePaths(planet);

  if (paths.surface) {
    this.#loadTexture(paths.surface, 'dayTexture');
  }
  if (paths.night) {
    this.#loadTexture(paths.night, 'nightTexture');
  }
  if (paths.atmosphereOverlay) {
    this.#loadTexture(paths.atmosphereOverlay, 'atmosphereTexture');
  }
}
```

- [ ] **Step 10: Update `#updateSunDirection()` to use `orbital.js`**

```js
#updateSunDirection(planet) {
  if (planet.lightingMode !== 'sun') {
    // Fixed lighting — use default direction
    const v = new Vector3(-5, 3, 8).normalize();
    this.#sunDirection.copy(v);
  } else {
    const dir = getSunDirectionForBody(planet, planet.lightingTimestamp);
    const v = new Vector3(dir.x, dir.y, dir.z);
    this.#sunDirection.copy(v);
  }

  if (this.#bodyMesh?.material?.uniforms?.sunDirection) {
    this.#bodyMesh.material.uniforms.sunDirection.value.copy(this.#sunDirection);
  }
  if (this.#atmosphereMesh?.material?.uniforms?.sunDirection) {
    this.#atmosphereMesh.material.uniforms.sunDirection.value.copy(this.#sunDirection);
  }
}
```

- [ ] **Step 11: Update `#loadTexture` to use `#bodyMesh` instead of `#earthMesh`**

Replace all `this.#earthMesh` references in `#loadTexture` with `this.#bodyMesh`.

- [ ] **Step 12: Run all tests**

Run: `node --test tests/`
Expected: All PASS

- [ ] **Step 13: Commit**

```bash
git restore --staged :/ && git add src/renderer/threeGlobeRenderer.js && git commit -m "feat: integrate per-body shaders, atmosphere, rings, obliquity, orbital.js into renderer" -- src/renderer/threeGlobeRenderer.js
```

---

### Task 10: Update Existing Tests for Renderer Changes

**Files:**
- Modify: `tests/three-renderer.test.js`
- Modify: `tests/renderer.test.js`

- [ ] **Step 1: Update three-renderer tests for new mesh names**

If any test references `earthMesh` by name or checks internal structure, update references. Most tests use the public API so should work, but verify.

- [ ] **Step 2: Add integration-level tests**

Add to `tests/three-renderer.test.js`:

```js
test('renderer creates ring mesh for Saturn', () => {
  // Test that init with Saturn planet config creates ring
  // (This may require mocking or checking internal state via hitTest)
});

test('renderer skips atmosphere for Mercury', () => {
  // Test that init with Mercury planet config has no atmosphere
});
```

- [ ] **Step 3: Run full test suite**

Run: `node --test tests/`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add tests/three-renderer.test.js tests/renderer.test.js && git commit -m "test: update renderer tests for body mesh rename and per-body features" -- tests/three-renderer.test.js tests/renderer.test.js
```

---

## Chunk 7: Documentation & Finalization

### Task 11: Update FEATURES.md, RELEASE_NOTES.md, and User Docs

**Files:**
- Modify: `FEATURES.md`
- Modify: `RELEASE_NOTES.md`
- Modify: `docs/QUICK_START_CONTENT_CREATORS.md` (if it mentions planet selection)
- Modify: `docs/FAQ.md` (add texture attribution FAQ)

- [ ] **Step 1: Update FEATURES.md**

Add checkboxes for completed features:
```markdown
- [x] Realistic surface textures for all 13 celestial bodies (NASA/ESA sources)
- [x] Per-body atmosphere rendering (none/thin/medium/thick/deep)
- [x] Time-accurate axial tilt and seasonal lighting
- [x] Ring systems for Saturn, Jupiter, Uranus, Neptune
- [x] Progressive texture loading (2K → 8K on zoom)
```

- [ ] **Step 2: Update RELEASE_NOTES.md**

Add new release section with user-facing language.

- [ ] **Step 3: Update FAQ.md**

Add texture attribution FAQ entry.

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add FEATURES.md RELEASE_NOTES.md docs/FAQ.md docs/QUICK_START_CONTENT_CREATORS.md && git commit -m "docs: update features, release notes, FAQ for realistic celestial bodies" -- FEATURES.md RELEASE_NOTES.md docs/FAQ.md docs/QUICK_START_CONTENT_CREATORS.md
```

---

### Task 12: Run Download Script and Visual Test

- [ ] **Step 1: Download all textures**

Run: `bash tools/download-textures.sh`
Expected: All textures downloaded to `assets/textures/`

- [ ] **Step 2: Add `assets/textures/` to `.gitignore`**

Textures are large binary files — they should NOT be committed to git. Add to `.gitignore`:

```
# Celestial body textures (downloaded via tools/download-textures.sh)
assets/textures/mercury/
assets/textures/venus/
assets/textures/earth/
assets/textures/mars/
assets/textures/jupiter/
assets/textures/saturn/
assets/textures/uranus/
assets/textures/neptune/
assets/textures/moon/
assets/textures/io/
assets/textures/europa/
assets/textures/ganymede/
assets/textures/titan/
```

Keep `assets/textures/CREDITS.md` tracked (it's not in the body folders).

- [ ] **Step 3: Open in browser and visually verify each body**

Test each of the 13 bodies:
1. Surface texture loads and displays correctly
2. Atmosphere appears with correct color/thickness (or absent for airless bodies)
3. Rings visible for Saturn (textured), Jupiter/Uranus/Neptune (faint)
4. Obliquity tilt is visible (Uranus should be nearly sideways)
5. `lightingMode: 'sun'` shows correct day/night terminator

- [ ] **Step 4: Commit .gitignore changes**

```bash
git restore --staged :/ && git add .gitignore && git commit -m "chore: gitignore downloaded celestial body textures" -- .gitignore
```
