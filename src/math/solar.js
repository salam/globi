import { clampLatitude, normalizeLongitude, orthographicProject } from './sphereProjection.js';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const DEFAULT_LIGHT_VECTOR = { x: -0.42, y: 0.32, z: 0.85 };

function toRadians(degrees) {
  return degrees * DEG_TO_RAD;
}

function toDegrees(radians) {
  return radians * RAD_TO_DEG;
}

function normalize360(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function normalizeVector3(vector) {
  const x = Number(vector?.x);
  const y = Number(vector?.y);
  const z = Number(vector?.z);
  const length = Math.sqrt(x * x + y * y + z * z);
  if (!Number.isFinite(length) || length <= 0) {
    return { ...DEFAULT_LIGHT_VECTOR };
  }
  return {
    x: x / length,
    y: y / length,
    z: z / length,
  };
}

function resolveDate(input) {
  if (input instanceof Date && Number.isFinite(input.getTime())) {
    return input;
  }

  if (typeof input === 'string' || typeof input === 'number') {
    const parsed = new Date(input);
    if (Number.isFinite(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

export function getSubsolarPoint(dateInput = new Date()) {
  const date = resolveDate(dateInput);
  const jd = julianDay(date);
  const n = jd - 2451545.0;
  const t = n / 36525;

  const meanLongitude = normalize360(280.460 + 0.9856474 * n);
  const meanAnomaly = normalize360(357.528 + 0.9856003 * n);
  const meanAnomalyRad = toRadians(meanAnomaly);

  const eclipticLongitude = normalize360(
    meanLongitude
    + 1.915 * Math.sin(meanAnomalyRad)
    + 0.020 * Math.sin(2 * meanAnomalyRad)
  );
  const obliquity = 23.439 - 0.0000004 * n;

  const lambda = toRadians(eclipticLongitude);
  const epsilon = toRadians(obliquity);
  const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

  const rightAscension = normalize360(toDegrees(
    Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda))
  ));

  const gmst = normalize360(
    280.46061837
    + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * t * t
    - (t * t * t) / 38710000
  );

  return {
    lat: clampLatitude(toDegrees(declination)),
    lon: normalizeLongitude(rightAscension - gmst),
  };
}

export function getSunLightVector(camera = {}, dateInput = new Date()) {
  const subsolar = getSubsolarPoint(dateInput);
  const projected = orthographicProject(
    { lat: subsolar.lat, lon: subsolar.lon, alt: 0 },
    {
      width: 1,
      height: 1,
      globeRadius: 1,
      centerLat: camera.centerLat ?? 0,
      centerLon: camera.centerLon ?? 0,
    }
  );

  return normalizeVector3({
    x: projected.right,
    y: projected.up,
    z: projected.depth,
  });
}

export { getSunDirectionForBody } from './orbital.js';
