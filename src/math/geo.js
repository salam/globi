const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function toRadians(degrees) {
  return degrees * DEG_TO_RAD;
}

export function toDegrees(radians) {
  return radians * RAD_TO_DEG;
}

export function latLonToCartesian(lat, lon, radius = 1, alt = 0) {
  const r = radius + alt;
  const latRad = toRadians(lat);
  const lonRad = toRadians(lon);
  const cosLat = Math.cos(latRad);

  return {
    x: r * cosLat * Math.cos(lonRad),
    y: r * Math.sin(latRad),
    z: r * cosLat * Math.sin(lonRad),
  };
}

export function cartesianToLatLon(x, y, z) {
  const radius = Math.sqrt(x * x + y * y + z * z) || 1;
  return {
    lat: toDegrees(Math.asin(y / radius)),
    lon: toDegrees(Math.atan2(z, x)),
    radius,
  };
}

function normalizeVector(v) {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return {
    x: v.x / length,
    y: v.y / length,
    z: v.z / length,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function slerpUnitVectors(a, b, t) {
  const dot = clamp(a.x * b.x + a.y * b.y + a.z * b.z, -1, 1);
  if (Math.abs(dot) > 0.9995) {
    const linear = {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
    return normalizeVector(linear);
  }

  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  const scaleA = Math.sin((1 - t) * omega) / sinOmega;
  const scaleB = Math.sin(t * omega) / sinOmega;

  return {
    x: a.x * scaleA + b.x * scaleB,
    y: a.y * scaleA + b.y * scaleB,
    z: a.z * scaleA + b.z * scaleB,
  };
}

export function greatCircleDistanceDegrees(start, end) {
  const a = normalizeVector(latLonToCartesian(start.lat, start.lon, 1, 0));
  const b = normalizeVector(latLonToCartesian(end.lat, end.lon, 1, 0));
  const dot = clamp(a.x * b.x + a.y * b.y + a.z * b.z, -1, 1);
  return toDegrees(Math.acos(dot));
}

export function greatCircleArc(start, end, options = {}) {
  const segments = Math.max(1, Math.floor(options.segments ?? 64));
  const maxAltitude = Number(options.maxAltitude ?? 0);
  const startAlt = Number(start.alt ?? 0);
  const endAlt = Number(end.alt ?? 0);

  const a = normalizeVector(latLonToCartesian(start.lat, start.lon, 1, 0));
  const b = normalizeVector(latLonToCartesian(end.lat, end.lon, 1, 0));

  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const vec = slerpUnitVectors(a, b, t);
    const geo = cartesianToLatLon(vec.x, vec.y, vec.z);
    const arcBoost = Math.sin(Math.PI * t) * maxAltitude;
    const alt = startAlt + (endAlt - startAlt) * t + arcBoost;

    points.push({
      lat: geo.lat,
      lon: geo.lon,
      alt,
    });
  }

  return points;
}

export function densifyPath(points, options = {}) {
  if (!Array.isArray(points) || points.length < 2) {
    return Array.isArray(points) ? points.slice() : [];
  }

  const maxStepDegrees = Math.max(0.5, Number(options.maxStepDegrees ?? 8));
  const output = [points[0]];

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    const distance = greatCircleDistanceDegrees(prev, next);
    const steps = Math.max(1, Math.ceil(distance / maxStepDegrees));
    const segment = greatCircleArc(prev, next, { segments: steps, maxAltitude: 0 });

    for (let j = 1; j < segment.length; j += 1) {
      output.push(segment[j]);
    }
  }

  return output;
}
