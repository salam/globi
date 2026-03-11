import { resolvePlanetConfig } from './celestial.js';
import { getDefaultViewerUiConfig, normalizeViewerUiConfig, validateViewerUiConfig } from './viewerUi.js';
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export const SCENE_SCHEMA_VERSION = 1;

export function createEmptyScene(locale = 'en') {
  return {
    version: SCENE_SCHEMA_VERSION,
    locale,
    theme: 'dark',
    planet: resolvePlanetConfig('earth'),
    viewerUi: getDefaultViewerUiConfig(),
    markers: [],
    paths: [],
    arcs: [],
    regions: [],
    animations: [],
  };
}

function ensureObject(value, fallback) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return fallback;
}

function normalizeLocalizedText(value) {
  if (typeof value === 'string') {
    return { en: value };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return {};
}

function normalizePoint(point = {}) {
  return {
    lat: Number(point.lat ?? 0),
    lon: Number(point.lon ?? 0),
    alt: Number(point.alt ?? 0),
  };
}

function normalizeMarker(marker = {}) {
  return {
    id: String(marker.id ?? cryptoRandomId('marker')),
    name: normalizeLocalizedText(marker.name ?? ''),
    description: normalizeLocalizedText(marker.description ?? ''),
    lat: Number(marker.lat ?? 0),
    lon: Number(marker.lon ?? 0),
    alt: Number(marker.alt ?? 0),
    visualType: marker.visualType ?? 'dot',
    assetUri: marker.assetUri ?? '',
    callout: marker.callout ?? '',
    movements: Array.isArray(marker.movements) ? marker.movements.map(normalizeMovement) : [],
    category: marker.category ?? 'default',
    color: marker.color ?? '',
  };
}

function normalizeMovement(movement = {}) {
  return {
    t: Number(movement.t ?? 0),
    ...normalizePoint(movement),
  };
}

function normalizePath(path = {}) {
  return {
    id: String(path.id ?? cryptoRandomId('path')),
    name: normalizeLocalizedText(path.name ?? ''),
    points: Array.isArray(path.points) ? path.points.map(normalizePoint) : [],
    color: path.color ?? '#00aaff',
    strokeWidth: Number(path.strokeWidth ?? 1),
    dashPattern: Array.isArray(path.dashPattern) ? path.dashPattern.map(Number) : [],
    animationDuration: Number(path.animationDuration ?? 0),
  };
}

function normalizeArc(arc = {}) {
  return {
    id: String(arc.id ?? cryptoRandomId('arc')),
    name: normalizeLocalizedText(arc.name ?? ''),
    start: normalizePoint(arc.start),
    end: normalizePoint(arc.end),
    maxAltitude: Number(arc.maxAltitude ?? 0),
    color: arc.color ?? '#ffd000',
    strokeWidth: Number(arc.strokeWidth ?? 1),
    dashPattern: Array.isArray(arc.dashPattern) ? arc.dashPattern.map(Number) : [],
    animationTime: Number(arc.animationTime ?? 0),
  };
}

function normalizeRegion(region = {}) {
  return {
    id: String(region.id ?? cryptoRandomId('region')),
    name: normalizeLocalizedText(region.name ?? ''),
    geojson: ensureObject(region.geojson, { type: 'Polygon', coordinates: [] }),
    capColor: region.capColor ?? '#4caf50',
    sideColor: region.sideColor ?? '#2e7d32',
    altitude: Number(region.altitude ?? 0),
  };
}

function normalizeAnimation(animation = {}) {
  return {
    entityId: String(animation.entityId ?? ''),
    keyframes: Array.isArray(animation.keyframes) ? animation.keyframes.map((frame) => ({
      t: Number(frame.t ?? 0),
      value: ensureObject(frame.value, {}),
    })) : [],
    loop: Boolean(animation.loop),
  };
}

function cryptoRandomId(prefix) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${suffix}`;
}

export function normalizeScene(input) {
  const scene = ensureObject(input, {});
  const theme = scene.theme === 'light' || scene.theme === 'dark'
    ? scene.theme
    : 'dark';
  return {
    version: Number(scene.version ?? SCENE_SCHEMA_VERSION),
    locale: typeof scene.locale === 'string' ? scene.locale : 'en',
    theme,
    planet: resolvePlanetConfig(scene.planet),
    viewerUi: normalizeViewerUiConfig(scene.viewerUi),
    markers: Array.isArray(scene.markers) ? scene.markers.map(normalizeMarker) : [],
    paths: Array.isArray(scene.paths) ? scene.paths.map(normalizePath) : [],
    arcs: Array.isArray(scene.arcs) ? scene.arcs.map(normalizeArc) : [],
    regions: Array.isArray(scene.regions) ? scene.regions.map(normalizeRegion) : [],
    animations: Array.isArray(scene.animations) ? scene.animations.map(normalizeAnimation) : [],
  };
}

function validatePoint(point, pointer, errors) {
  if (!Number.isFinite(point.lat) || point.lat < -90 || point.lat > 90) {
    errors.push(`${pointer}.lat must be within [-90, 90]`);
  }
  if (!Number.isFinite(point.lon) || point.lon < -180 || point.lon > 180) {
    errors.push(`${pointer}.lon must be within [-180, 180]`);
  }
  if (!Number.isFinite(point.alt)) {
    errors.push(`${pointer}.alt must be a finite number`);
  }
}

function validateEntityId(id, pointer, ids, errors) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    errors.push(`${pointer}.id must match ${ID_PATTERN}`);
    return;
  }
  if (ids.has(id)) {
    errors.push(`${pointer}.id duplicate id: ${id}`);
    return;
  }
  ids.add(id);
}

function validateLocalizedText(value, pointer, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${pointer} must be a locale map object`);
    return;
  }
  for (const [locale, text] of Object.entries(value)) {
    if (typeof locale !== 'string' || locale.length === 0) {
      errors.push(`${pointer} has invalid locale key`);
    }
    if (typeof text !== 'string') {
      errors.push(`${pointer}.${locale} must be a string`);
    }
  }
}

export function validateScene(sceneInput) {
  const scene = normalizeScene(sceneInput);
  const errors = [];
  const ids = new Set();

  if (scene.version !== SCENE_SCHEMA_VERSION) {
    errors.push(`version must be ${SCENE_SCHEMA_VERSION}`);
  }

  if (typeof scene.locale !== 'string' || scene.locale.length === 0) {
    errors.push('locale must be a non-empty string');
  }

  if (!['light', 'dark'].includes(scene.theme)) {
    errors.push('theme must be one of light|dark');
  }

  if (!Number.isFinite(scene.planet.radius) || scene.planet.radius <= 0) {
    errors.push('planet.radius must be > 0');
  }

  if (!['fixed', 'sun'].includes(scene.planet.lightingMode)) {
    errors.push('planet.lightingMode must be one of fixed|sun');
  }

  validateViewerUiConfig(scene.viewerUi, 'viewerUi', errors);

  if (scene.planet.lightingTimestamp !== '' && scene.planet.lightingTimestamp != null) {
    const timestamp = new Date(scene.planet.lightingTimestamp).getTime();
    if (!Number.isFinite(timestamp)) {
      errors.push('planet.lightingTimestamp must be parseable as a date/time');
    }
  }

  scene.markers.forEach((marker, index) => {
    const pointer = `markers[${index}]`;
    validateEntityId(marker.id, pointer, ids, errors);
    validateLocalizedText(marker.name, `${pointer}.name`, errors);
    validateLocalizedText(marker.description, `${pointer}.description`, errors);
    validatePoint(marker, pointer, errors);
    if (!['dot', 'image', 'model', 'text'].includes(marker.visualType)) {
      errors.push(`${pointer}.visualType must be one of dot|image|model|text`);
    }
  });

  scene.paths.forEach((path, index) => {
    const pointer = `paths[${index}]`;
    validateEntityId(path.id, pointer, ids, errors);
    validateLocalizedText(path.name, `${pointer}.name`, errors);
    if (!Array.isArray(path.points) || path.points.length < 2) {
      errors.push(`${pointer}.points must contain at least 2 points`);
    }
    path.points.forEach((point, pointIndex) => {
      validatePoint(point, `${pointer}.points[${pointIndex}]`, errors);
    });
  });

  scene.arcs.forEach((arc, index) => {
    const pointer = `arcs[${index}]`;
    validateEntityId(arc.id, pointer, ids, errors);
    validateLocalizedText(arc.name, `${pointer}.name`, errors);
    validatePoint(arc.start, `${pointer}.start`, errors);
    validatePoint(arc.end, `${pointer}.end`, errors);
    if (!Number.isFinite(arc.maxAltitude) || arc.maxAltitude < 0) {
      errors.push(`${pointer}.maxAltitude must be >= 0`);
    }
  });

  scene.regions.forEach((region, index) => {
    const pointer = `regions[${index}]`;
    validateEntityId(region.id, pointer, ids, errors);
    validateLocalizedText(region.name, `${pointer}.name`, errors);
    if (!region.geojson || typeof region.geojson !== 'object') {
      errors.push(`${pointer}.geojson must be an object`);
    }
  });

  scene.animations.forEach((animation, index) => {
    const pointer = `animations[${index}]`;
    if (typeof animation.entityId !== 'string' || animation.entityId.length === 0) {
      errors.push(`${pointer}.entityId must be a non-empty string`);
    }
    if (!Array.isArray(animation.keyframes) || animation.keyframes.length < 2) {
      errors.push(`${pointer}.keyframes must contain at least 2 keyframes`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    scene,
  };
}
