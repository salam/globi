const DEG_TO_RAD = Math.PI / 180;

function toRadians(degrees) {
  return degrees * DEG_TO_RAD;
}

export function clampLatitude(latitude) {
  const value = Number(latitude);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(-89.999, Math.min(89.999, value));
}

export function normalizeLongitude(longitude) {
  const value = Number(longitude);
  if (!Number.isFinite(value)) {
    return 0;
  }
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return normalized;
}

export function getGlobeRadius(width, height, zoom = 1) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const safeZoom = Math.max(0.3, Math.min(4, Number(zoom) || 1));
  return Math.min(safeWidth, safeHeight) * 0.45 * safeZoom;
}

/**
 * Inverse orthographic projection: converts a screen-space pixel position
 * back to geographic (lat, lon) coordinates on the unit sphere.
 * Returns null if the pixel is outside the globe circle.
 */
export function inverseOrthographicProject(px, py, options = {}) {
  const width = Math.max(1, Number(options.width) || 1);
  const height = Math.max(1, Number(options.height) || 1);
  const globeRadius = Math.max(1, Number(options.globeRadius) || getGlobeRadius(width, height, 1));

  const centerLat = clampLatitude(options.centerLat ?? 0);
  const centerLon = normalizeLongitude(options.centerLon ?? 0);

  const centerX = width / 2;
  const centerY = height / 2;

  const nx = (px - centerX) / globeRadius;
  const ny = (centerY - py) / globeRadius;
  const rhoSq = nx * nx + ny * ny;

  if (rhoSq > 1) {
    return null;
  }

  const rho = Math.sqrt(rhoSq);
  const centerLatRad = toRadians(centerLat);
  const sinCenterLat = Math.sin(centerLatRad);
  const cosCenterLat = Math.cos(centerLatRad);

  let lat;
  let lon;

  if (rho < 1e-10) {
    lat = centerLat;
    lon = centerLon;
  } else {
    const c = Math.asin(Math.min(1, rho));
    const cosC = Math.cos(c);
    const sinC = Math.sin(c);

    lat = (Math.asin(cosC * sinCenterLat + (ny * sinC * cosCenterLat) / rho)) * (180 / Math.PI);
    lon = centerLon + Math.atan2(
      nx * sinC,
      rho * cosCenterLat * cosC - ny * sinCenterLat * sinC
    ) * (180 / Math.PI);
  }

  lat = Math.max(-90, Math.min(90, lat));
  lon = normalizeLongitude(lon);

  return { lat, lon };
}

export function orthographicProject(point, options = {}) {
  const width = Math.max(1, Number(options.width) || 1);
  const height = Math.max(1, Number(options.height) || 1);
  const globeRadius = Math.max(1, Number(options.globeRadius) || getGlobeRadius(width, height, 1));

  const lat = clampLatitude(point.lat ?? 0);
  const lon = normalizeLongitude(point.lon ?? 0);
  const alt = Math.max(0, Number(point.alt ?? 0));

  const centerLat = clampLatitude(options.centerLat ?? 0);
  const centerLon = normalizeLongitude(options.centerLon ?? 0);

  const latRad = toRadians(lat);
  const lonRad = toRadians(lon);
  const centerLatRad = toRadians(centerLat);
  const centerLonRad = toRadians(centerLon);
  const lonDelta = lonRad - centerLonRad;

  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinCenterLat = Math.sin(centerLatRad);
  const cosCenterLat = Math.cos(centerLatRad);

  const cosC = sinCenterLat * sinLat + cosCenterLat * cosLat * Math.cos(lonDelta);
  const visibilityThreshold = -Math.min(0.85, alt * 0.35);
  const visible = cosC > visibilityThreshold;

  const xUnit = cosLat * Math.sin(lonDelta);
  const yUnit = cosCenterLat * sinLat - sinCenterLat * cosLat * Math.cos(lonDelta);
  const radialScale = 1 + alt;

  const centerX = width / 2;
  const centerY = height / 2;

  return {
    x: centerX + globeRadius * radialScale * xUnit,
    y: centerY - globeRadius * radialScale * yUnit,
    visible,
    depth: cosC,
    right: xUnit,
    up: yUnit,
    radialScale,
    centerX,
    centerY,
  };
}
