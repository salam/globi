import { clampLatitude, normalizeLongitude } from '../math/sphereProjection.js';

function clampUnit(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(1, number));
}

export function shortestLongitudeDelta(fromLon, toLon) {
  const from = normalizeLongitude(fromLon ?? 0);
  const to = normalizeLongitude(toLon ?? 0);
  return normalizeLongitude(to - from);
}

export function easeInOutCubic(t) {
  const progress = clampUnit(t);
  if (progress < 0.5) {
    return 4 * progress * progress * progress;
  }
  const f = -2 * progress + 2;
  return 1 - (f * f * f) / 2;
}

export function interpolateCameraState(start = {}, end = {}, progress) {
  const t = easeInOutCubic(progress);
  const startLat = clampLatitude(start.lat ?? start.centerLat ?? 0);
  const endLat = clampLatitude(end.lat ?? end.centerLat ?? 0);
  const startLon = normalizeLongitude(start.lon ?? start.centerLon ?? 0);
  const deltaLon = shortestLongitudeDelta(startLon, end.lon ?? end.centerLon ?? 0);

  return {
    lat: clampLatitude(startLat + (endLat - startLat) * t),
    lon: normalizeLongitude(startLon + deltaLon * t),
  };
}
