import { getCelestialPreset } from '../scene/celestial.js';

const DEG_TO_RAD = Math.PI / 180;
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
