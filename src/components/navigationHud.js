import {
  clampLatitude,
  getGlobeRadius,
  normalizeLongitude,
  orthographicProject,
} from '../math/sphereProjection.js';

const EARTH_RADIUS_KM = 6371;
const NICE_SCALE_STEPS = [1, 2, 5, 10];
const KM_INTEGER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const KM_DECIMAL_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function safeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function resolvePlanetRadiusKm(planetRadiusRatio) {
  const ratio = safeNumber(planetRadiusRatio, 1);
  return EARTH_RADIUS_KM * Math.max(0.05, ratio);
}

function formatKilometers(kilometers) {
  const value = safeNumber(kilometers, 0);
  if (value < 10 && !Number.isInteger(value)) {
    return KM_DECIMAL_FORMAT.format(value);
  }
  return KM_INTEGER_FORMAT.format(value);
}

export function chooseScaleKilometers(targetKilometers) {
  const target = safeNumber(targetKilometers, 0);
  if (target <= 0) {
    return 0;
  }

  const exponent = Math.floor(Math.log10(target));
  const base = 10 ** exponent;

  let selected = base;
  for (const step of NICE_SCALE_STEPS) {
    const value = step * base;
    if (value <= target * 1.000001) {
      selected = value;
    } else {
      break;
    }
  }

  return Number(selected.toPrecision(12));
}

export function computeNorthArrowRotation(camera = {}) {
  const centerLat = clampLatitude(camera.centerLat ?? 0);
  const centerLon = normalizeLongitude(camera.centerLon ?? 0);

  const sampleLat = clampLatitude(centerLat + 0.25);
  const width = 200;
  const height = 200;
  const centerX = width / 2;
  const centerY = height / 2;
  const globeRadius = getGlobeRadius(width, height, 1);

  const projectedNorth = orthographicProject(
    { lat: sampleLat, lon: centerLon, alt: 0 },
    {
      width,
      height,
      globeRadius,
      centerLat,
      centerLon,
    }
  );

  if (!projectedNorth.visible) {
    return 0;
  }

  const dx = projectedNorth.x - centerX;
  const dy = projectedNorth.y - centerY;
  if (Math.hypot(dx, dy) < 0.000001) {
    return 0;
  }

  const rotation = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return Number(rotation.toFixed(1));
}

export function computeScaleBar(options = {}) {
  const width = Math.max(1, safeNumber(options.width, 1));
  const height = Math.max(1, safeNumber(options.height, 1));
  const zoom = safeNumber(options.zoom, 1);
  const targetPixels = Math.max(24, safeNumber(options.targetPixels, 96));

  const globeRadiusPx = Math.max(1, getGlobeRadius(width, height, zoom));
  const planetRadiusKm = resolvePlanetRadiusKm(options.planetRadiusRatio);
  const kilometersPerPixel = planetRadiusKm / globeRadiusPx;
  const targetKilometers = kilometersPerPixel * targetPixels;
  const kilometers = chooseScaleKilometers(targetKilometers);

  if (kilometers <= 0 || !Number.isFinite(kilometersPerPixel) || kilometersPerPixel <= 0) {
    return {
      kilometers: 0,
      pixels: 0,
      label: '0 km',
    };
  }

  return {
    kilometers,
    pixels: kilometers / kilometersPerPixel,
    label: `${formatKilometers(kilometers)} km`,
  };
}
