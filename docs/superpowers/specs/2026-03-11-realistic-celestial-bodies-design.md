# Realistic Celestial Body Surfaces, Atmospheres & Orbital Mechanics

**Date:** 2026-03-11
**Status:** Approved

## Overview

Upgrade all 13 celestial body presets (8 planets + 5 moons) with NASA/ESA-sourced surface textures, physically-based per-body atmospheres, time-accurate axial tilt and orbital lighting, and ring systems for all four gas giants.

## Goals

- Every body looks distinct and scientifically recognizable
- Textures sourced from NASA missions and Solar System Scope (CC-BY 4.0)
- Atmosphere rendering varies by body type (none → thin → medium → thick → deep)
- Axial tilt and seasonal lighting computed from real orbital elements
- Saturn's iconic rings fully textured; faint rings for Jupiter, Uranus, Neptune

## Non-Goals

- JPL HORIZONS-level orbital precision (educational accuracy is sufficient)
- Ring shadow mapping (stretch goal, not in initial scope)
- Procedural cloud animation
- Additional moons beyond the existing 5

---

## 1. Asset Organization & Texture Loading

### Folder Structure

```
assets/
  textures/
    mercury/
      2k_surface.jpg
      8k_surface.jpg
    venus/
      2k_surface.jpg
      8k_surface.jpg
      2k_atmosphere.jpg
      4k_atmosphere.jpg
    earth/
      2k_day.jpg           (existing, renamed from earth_day_2k.jpg)
      2k_night.jpg          (existing, renamed from earth_night_2k.jpg)
      8k_day.jpg
      8k_night.jpg
    mars/
      2k_surface.jpg
      8k_surface.jpg
    jupiter/
      2k_surface.jpg
      8k_surface.jpg
    saturn/
      2k_surface.jpg
      8k_surface.jpg
      2k_ring_alpha.png
      8k_ring_alpha.png
    uranus/
      2k_surface.jpg
    neptune/
      2k_surface.jpg
    moon/
      2k_surface.jpg
      8k_surface.jpg
    io/
      2k_surface.jpg
    europa/
      2k_surface.jpg
    ganymede/
      2k_surface.jpg
    titan/
      2k_surface.jpg
    CREDITS.md
```

### Texture Sources

| Body | Source | License | Resolutions |
|------|--------|---------|-------------|
| Mercury | Solar System Scope | CC-BY 4.0 | 2K, 8K |
| Venus (surface) | Solar System Scope | CC-BY 4.0 | 2K, 8K |
| Venus (atmosphere) | Solar System Scope | CC-BY 4.0 | 2K, 4K |
| Earth (day/night) | Solar System Scope | CC-BY 4.0 | 2K, 8K |
| Mars | Solar System Scope | CC-BY 4.0 | 2K, 8K |
| Jupiter | Solar System Scope | CC-BY 4.0 | 2K, 8K |
| Saturn (surface) | Solar System Scope | CC-BY 4.0 | 2K, 8K |
| Saturn (rings) | Solar System Scope | CC-BY 4.0 | 2K, 8K |
| Uranus | Solar System Scope | CC-BY 4.0 | 2K only |
| Neptune | Solar System Scope | CC-BY 4.0 | 2K only |
| Moon | Solar System Scope | CC-BY 4.0 | 2K, 8K |
| Io | NASA/JPL Galileo mission | Public domain | 2K |
| Europa | NASA/JPL Galileo mission | Public domain | 2K |
| Ganymede | NASA/JPL Galileo mission | Public domain | 2K |
| Titan | NASA/JPL Cassini mission | Public domain | 2K |

### Loading Strategy

- Only the selected body's textures are loaded — one body per page, ever
- Initial load: 2K texture(s)
- Progressive upgrade: when zoom > 2.0, lazy-load 8K variant and swap seamlessly via `TextureLoader`
- Texture cache persists across zoom levels — 2K stays in memory as fallback
- On load failure: fall back to existing `baseColor` gradient shader
- `textureUri` in scene config still overrides preset texture paths (custom textures take priority)

### Download Script

`tools/download-textures.sh` fetches all textures from Solar System Scope and NASA/JPL USGS astrogeology maps. Run once at project setup, not at runtime. The script:
- Downloads to `assets/textures/<body>/`
- Verifies file sizes/checksums
- Skips already-downloaded files

---

## 2. Celestial Body Physical Data Registry

Extend `src/scene/celestial.js` presets with accurate physical parameters from the [NASA Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/).

### New Fields Per Body

```js
{
  // existing: id, label, kind, radius, baseColor, rotationSpeed, textureUri...

  // Axial tilt & orientation
  obliquity: 23.44,            // degrees, axial tilt relative to orbital plane
  northPoleRA: 0.0,            // right ascension of north pole (degrees, J2000)
  northPoleDec: 90.0,          // declination of north pole (degrees, J2000)

  // Orbital mechanics
  orbitalPeriod: 365.256,      // days, sidereal orbital period
  siderealRotation: 23.934,    // hours, sidereal rotation period
  orbitalInclination: 0.0,     // degrees, to ecliptic
  longitudeOfAscNode: 0.0,     // degrees, Ω (J2000)
  meanLongitudeJ2000: 100.46,  // degrees, mean longitude at J2000 epoch

  // Atmosphere (object or null)
  atmosphere: {
    enabled: true,
    scaleHeight: 8.5,          // km
    surfacePressure: 1.0,      // atm (relative to Earth)
    scatterColor: '#6b93d6',   // dominant Rayleigh scatter color
    thickness: 0.06,           // visual shell size (fraction of body radius)
    density: 0.7,              // opacity factor (0–1)
  },

  // Ring system (object or null)
  rings: {
    innerRadius: 1.24,         // × body radius
    outerRadius: 2.27,
    textureUri: 'textures/saturn/2k_ring_alpha.png',
    opacity: 0.85,
    color: '#c4a574',          // fallback if no texture
  },
}
```

### Complete Physical Data Table

| Body | Obliquity (°) | Orbital Period (d) | Sidereal Rot (h) | Atmo Type | Scale Height (km) | Scatter Color | Rings |
|------|--------------|-------------------|-------------------|-----------|-------------------|---------------|-------|
| Mercury | 0.03 | 87.97 | 1407.6 | none | — | — | no |
| Venus | 177.4 | 224.70 | −5832.5 | thick | 15.9 | #d4a55c (golden) | no |
| Earth | 23.44 | 365.26 | 23.93 | medium | 8.5 | #6b93d6 (blue) | no |
| Mars | 25.19 | 686.97 | 24.62 | thin | 11.1 | #c47d5e (dusty pink) | no |
| Jupiter | 3.13 | 4332.59 | 9.92 | deep | 27.0 | #8b7355 (tan haze) | yes (faint) |
| Saturn | 26.73 | 10759.22 | 10.66 | deep | 59.5 | #c4a95a (amber) | yes (textured) |
| Uranus | 97.77 | 30688.50 | −17.24 | medium | 27.7 | #9ddbe8 (cyan) | yes (faint) |
| Neptune | 28.32 | 60182.00 | 16.11 | medium | 19.7 | #4f74d6 (deep blue) | yes (faint) |
| Moon | 6.68 | 27.32 | 655.73 | none | — | — | no |
| Io | 0.04 | 1.77 | 42.46 | none | — | — | no |
| Europa | 0.47 | 3.55 | 85.23 | none | — | — | no |
| Ganymede | 0.17 | 7.15 | 171.71 | none | — | — | no |
| Titan | 0.33 | 15.95 | 382.68 | thick | 21.0 | #c48a3f (orange) | no |

Negative sidereal rotation indicates retrograde rotation (Venus, Uranus).

---

## 3. Atmosphere Rendering

### Current State

Single Fresnel glow shader with hardcoded constants. Same appearance for all bodies.

### New Approach

Per-body atmosphere uniforms drive a single upgraded shader.

### Shader Uniforms

```glsl
uniform vec3  atmosphereColor;     // from scatterColor
uniform float atmosphereThickness; // shell radius multiplier (1.02–1.15)
uniform float atmosphereDensity;   // opacity factor (0.0–1.0)
uniform float scaleHeightNorm;     // normalized scale height for falloff curve
uniform float sunIntensity;        // brightness on sun-facing side
```

### Visual Behavior Per Body Type

| Type | Bodies | Shell Multiplier | Density | Visual Effect |
|------|--------|-----------------|---------|---------------|
| None | Mercury, Moon, Io, Europa, Ganymede | — | — | No atmosphere mesh created |
| Thin | Mars | 1.03 | 0.25 | Faint dusty-pink halo at horizon |
| Medium | Earth, Uranus, Neptune | 1.06 | 0.55–0.7 | Clear Fresnel rim, smooth terminator glow |
| Thick | Venus, Titan | 1.12–1.15 | 0.85–0.9 | Dense opaque shell, almost hides surface at grazing angles |
| Deep | Jupiter, Saturn | 1.08 | 0.4 | Subtle haze over cloud tops, no hard edge |

### Shader Changes

Modify `earthBuilder.js`:
- Replace hardcoded atmosphere constants with body-driven uniforms
- Density falloff: `exp(-altitude / scaleHeightNorm)` instead of `pow(fresnel, 2.0)`
- Sun-side brightness weighted by `atmosphereDensity` for thick atmospheres
- For `atmosphere.enabled === false`: skip atmosphere mesh entirely

### Venus Special Case

Venus's dense atmosphere obscures its surface. The surface texture is dimmed (multiplied by ~0.3) and the Venus atmosphere overlay texture is blended on top.

---

## 4. Time-Accurate Orbital Mechanics

### Current State

`solar.js` computes Earth's subsolar point from a timestamp. No generalization to other bodies.

### New Module: `src/math/orbital.js`

Generalizes sun direction computation for any body.

### Core Function

```js
/**
 * Compute the sun direction vector in body-fixed coordinates
 * for any celestial body at a given timestamp.
 *
 * Uses a simplified Keplerian orbital model (mean anomaly + obliquity).
 * Accuracy: within a few degrees — educational, not navigational.
 */
getSunDirectionForBody(bodyConfig, timestamp) → THREE.Vector3
```

### Algorithm (Simplified Keplerian)

1. **Mean anomaly** — position in orbit from `orbitalPeriod` + `meanLongitudeJ2000`
2. **Ecliptic longitude** — approximate heliocentric position on the ecliptic plane
3. **Axial tilt transform** — rotate sun vector by `obliquity`, accounting for pole orientation
4. **Sidereal rotation** — rotate by spin angle at the given timestamp

### Integration

- `solar.js` re-exports from `orbital.js` for backward compatibility
- `earthBuilder.js` receives `sunDirection` from `orbital.js` instead of computing internally
- `threeGlobeRenderer.js` calls `getSunDirectionForBody(planet, timestamp)` per frame when `lightingMode: 'sun'`

### Globe Mesh Orientation

The globe mesh receives a base rotation offset matching the body's obliquity, applied before user panning. When you first load Mars, it appears tilted 25.19° relative to the ecliptic.

### Accuracy Target

Visually correct seasons and lighting to within a few degrees. Not JPL HORIZONS precision.

---

## 5. Ring Systems

### Ring Data

| Body | Inner Radius (×body) | Outer Radius (×body) | Opacity | Visual Prominence |
|------|---------------------|---------------------|---------|-------------------|
| Saturn | 1.24 | 2.27 | 0.85 | Fully textured (Cassini data) |
| Jupiter | 1.72 | 1.81 | 0.05 | Gossamer-thin wisp |
| Uranus | 1.64 | 2.00 | 0.08 | Narrow dark rings |
| Neptune | 1.69 | 2.54 | 0.04 | Extremely faint arcs |

### Geometry

`THREE.RingGeometry(innerRadius, outerRadius, 128)` — flat annulus.

### Orientation

Ring plane = body's equatorial plane, tilted by `obliquity`. Saturn at 26.73°, Uranus at 97.77° — dramatically different orientations.

### Materials

**Saturn:** Textured with `saturn_ring_alpha.png`, `DoubleSide`, `transparent: true`, `depthWrite: false`. Lit by `sunDirection`.

**Jupiter/Uranus/Neptune:** Simple semi-transparent `MeshBasicMaterial` with body-specific color and very low alpha. No texture needed at these opacities.

### Shadow (Stretch Goal)

Ring-planet mutual shadows can be faked in the fragment shader via geometric ring-plane intersection test. Not in initial scope — can ship without it.

### Ring Config

```js
rings: {
  innerRadius: 1.24,     // × body radius
  outerRadius: 2.27,
  textureUri: 'textures/saturn/2k_ring_alpha.png',
  opacity: 0.85,
  color: '#c4a574',       // fallback if no texture
}
```

---

## 6. Architecture Changes

### Files Modified

| File | Change |
|------|--------|
| `src/scene/celestial.js` | Extended presets: obliquity, orbital elements, atmosphere config, ring config for all 13 bodies |
| `src/scene/schema.js` | Schema validation for new atmosphere/ring/orbital fields |
| `src/math/solar.js` → `src/math/orbital.js` | Generalized sun direction for any body. `solar.js` re-exports for compat |
| `src/renderer/earthBuilder.js` | Atmosphere shader with per-body uniforms. Venus dimming. Accepts body config |
| `src/renderer/threeGlobeRenderer.js` | Wires up orbital.js, ring builder, progressive texture loading, obliquity mesh orientation |

### New Files

| File | Purpose |
|------|---------|
| `src/renderer/ringBuilder.js` | Ring geometry + material creation |
| `src/renderer/textureLoader.js` | Progressive 2K → 8K texture loading, per-body path resolution, cache |
| `assets/textures/<body>/` | Texture folders (13 bodies) |
| `assets/textures/CREDITS.md` | Attribution for all texture sources |
| `tools/download-textures.sh` | One-time texture download script |

### Scene Hierarchy

```
globeGroup
├── bodyMesh          (renamed from earthMesh)
├── ringMesh          (NEW — only for bodies with rings config)
├── graticule
├── markerGroup
├── arcGroup
├── regionGroup
└── calloutGroup
atmosphereMesh        (upgraded per-body shader)
```

### Backward Compatibility

- Existing scenes with `planet: { id: 'earth' }` work identically
- `textureUri` override in scene config still takes priority over preset paths
- `lightingMode: 'fixed'` unchanged
- `solar.js` import paths continue to work via re-export

---

## 7. Testing Strategy

### Unit Tests

| Test File | Covers |
|-----------|--------|
| `tests/celestial.test.js` (extend) | All 13 presets have valid obliquity, orbital period, atmosphere config; ring inner < outer |
| `tests/orbital.test.js` (new) | Earth sun direction matches existing solar.js; Mars solstice correct pole; Uranus extreme tilt; Venus retrograde |
| `tests/texture-loader.test.js` (new) | 2K path resolution per body; 8K upgrade at zoom threshold; cache hit; fallback on missing texture |
| `tests/ring-builder.test.js` (new) | Correct radii; orientation matches obliquity; Saturn textured, Jupiter basic; null config → no ring |
| `tests/atmosphere.test.js` (new) | Skipped for airless bodies; Venus thick (1.12×); Mars thin (1.03×); uniforms match config |

### Integration Test

Load each of the 13 bodies in sequence: mesh created, correct texture path requested, atmosphere present/absent, ring present/absent, no WebGL errors.

### On-Device Test

Visual check per body in browser: surface appearance, atmosphere color/thickness, ring orientation, day/night terminator at a known date.

---

## Sources

- [NASA Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
- [Solar System Scope Textures](https://www.solarsystemscope.com/textures/) (CC-BY 4.0)
- [Planet Pixel Emporium](https://planetpixelemporium.com/planets.html)
- [NASA 3D Resources](https://nasa3d.arc.nasa.gov/images)
- [NASA/JPL Solar System Maps](https://space.jpl.nasa.gov/tmaps/)
- [Wikipedia: Axial Tilt](https://en.wikipedia.org/wiki/Axial_tilt)
- [Wikipedia: Scale Height](https://en.wikipedia.org/wiki/Scale_height)
