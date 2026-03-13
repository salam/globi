import { resolvePlanetConfig } from './celestial.js';
import { getDefaultViewerUiConfig, normalizeViewerUiConfig, validateViewerUiConfig } from './viewerUi.js';
import { greatCircleDistanceDegrees, latLonToCartesian, cartesianToLatLon } from '../math/geo.js';
import { VALID_THEMES } from '../renderer/themePalette.js';
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export const VALID_PROJECTIONS = ['globe', 'azimuthalEquidistant', 'orthographic', 'equirectangular'];

export const SCENE_SCHEMA_VERSION = 1;

export function createEmptyScene(locale = 'en') {
  return {
    version: SCENE_SCHEMA_VERSION,
    locale,
    theme: 'photo',
    planet: resolvePlanetConfig('earth'),
    viewerUi: getDefaultViewerUiConfig(),
    markers: [],
    paths: [],
    arcs: [],
    regions: [],
    animations: [],
    filters: [],
    timeRange: null,
    dataSources: [],
    projection: 'globe',
    surfaceTint: null,
    overlayTint: null,
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
    calloutMode: ['always', 'hover', 'click', 'none'].includes(marker.calloutMode)
      ? marker.calloutMode
      : 'always',
    calloutLabel: normalizeLocalizedText(marker.calloutLabel),
    timestamp: typeof marker.timestamp === 'string' ? marker.timestamp : (marker.timestamp ?? null),
    sourceId: typeof marker.sourceId === 'string' ? marker.sourceId : '',
    pulse: marker.pulse === true,
    markerScale: typeof marker.markerScale === 'number' ? marker.markerScale : null,
    orbitWaypoints: Array.isArray(marker.orbitWaypoints) ? marker.orbitWaypoints : null,
    fetchedAtMs: typeof marker.fetchedAtMs === 'number' ? marker.fetchedAtMs : null,
    velocityKmh: typeof marker.velocityKmh === 'number' ? marker.velocityKmh : null,
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
    category: path.category ?? '',
    sourceId: typeof path.sourceId === 'string' ? path.sourceId : '',
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
    animationDelay: Number(arc.animationDelay ?? 0),
    category: arc.category ?? '',
    sourceId: typeof arc.sourceId === 'string' ? arc.sourceId : '',
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
    sourceId: typeof region.sourceId === 'string' ? region.sourceId : '',
  };
}

function normalizeDataSource(ds = {}) {
  return {
    id: String(ds.id ?? ''),
    name: String(ds.name ?? ''),
    shortName: String(ds.shortName ?? ''),
    url: String(ds.url ?? ''),
    description: String(ds.description ?? ''),
    license: String(ds.license ?? ''),
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

function normalizeFilterOption(option = {}) {
  return {
    value: String(option.value ?? ''),
    label: String(option.label ?? ''),
    categories: Array.isArray(option.categories) ? option.categories.map(String) : [],
  };
}

function normalizeFilter(filter = {}) {
  return {
    id: String(filter.id ?? ''),
    label: String(filter.label ?? ''),
    options: Array.isArray(filter.options) ? filter.options.map(normalizeFilterOption) : [],
  };
}

function normalizeTimeRange(tr) {
  if (!tr || typeof tr !== 'object') return null;
  const min = typeof tr.min === 'string' ? tr.min : '';
  const max = typeof tr.max === 'string' ? tr.max : '';
  if (!min || !max) return null;
  return { min, max };
}

function cryptoRandomId(prefix) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${suffix}`;
}

function normalizeCalloutCluster(config) {
  const c = ensureObject(config, {});
  return {
    enabled: typeof c.enabled === 'boolean' ? c.enabled : true,
    thresholdDeg: Number.isFinite(c.thresholdDeg) && c.thresholdDeg > 0
      ? c.thresholdDeg
      : 2,
  };
}

function computeClusterCentroid(members) {
  let sx = 0, sy = 0, sz = 0;
  for (const m of members) {
    const p = latLonToCartesian(m.lat, m.lon, 1, 0);
    sx += p.x; sy += p.y; sz += p.z;
  }
  const n = members.length;
  return cartesianToLatLon(sx / n, sy / n, sz / n);
}

export function clusterMarkers(markers, config) {
  for (const m of markers) {
    m._clusterId = null;
    m._clusterIndex = 0;
    m._clusterSize = 1;
    m._clusterCenter = null;
  }

  if (!config.enabled) return;

  const threshold = config.thresholdDeg;
  const eligible = markers.filter(m => m.calloutMode !== 'none');
  const assigned = new Set();
  let clusterId = 0;

  const sorted = [...eligible].sort((a, b) => a.lat - b.lat);

  for (const seed of sorted) {
    if (assigned.has(seed.id)) continue;

    const candidates = [seed];
    for (const other of sorted) {
      if (other.id === seed.id || assigned.has(other.id)) continue;
      const dist = greatCircleDistanceDegrees(seed, other);
      if (dist <= threshold) candidates.push(other);
    }

    let members = candidates;
    let stable = false;
    while (!stable) {
      const centroid = computeClusterCentroid(members);
      const kept = [];
      for (const m of members) {
        const dist = greatCircleDistanceDegrees(m, centroid);
        if (dist <= threshold) kept.push(m);
      }
      stable = kept.length === members.length;
      members = kept;
      if (members.length <= 1) break;
    }

    if (members.length < 2) {
      assigned.add(seed.id);
      continue;
    }

    const cid = `cluster_${clusterId++}`;
    const centroid = computeClusterCentroid(members);
    for (let i = 0; i < members.length; i++) {
      members[i]._clusterId = cid;
      members[i]._clusterIndex = i;
      members[i]._clusterSize = members.length;
      members[i]._clusterCenter = { lat: centroid.lat, lon: centroid.lon };
      assigned.add(members[i].id);
    }
  }
}

export function normalizeScene(input) {
  const scene = ensureObject(input, {});
  let theme = scene.theme;
  if (theme === 'dark' || theme === 'light') theme = 'photo';
  if (!VALID_THEMES.includes(theme)) theme = 'photo';
  const projection = VALID_PROJECTIONS.includes(scene.projection) ? scene.projection : 'globe';
  const HEX_RE = /^#[0-9a-fA-F]{6}$/;
  const surfaceTint = (typeof scene.surfaceTint === 'string' && HEX_RE.test(scene.surfaceTint)) ? scene.surfaceTint : null;
  const overlayTint = (typeof scene.overlayTint === 'string' && HEX_RE.test(scene.overlayTint)) ? scene.overlayTint : null;
  const result = {
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
    filters: Array.isArray(scene.filters) ? scene.filters.map(normalizeFilter) : [],
    timeRange: normalizeTimeRange(scene.timeRange),
    dataSources: Array.isArray(scene.dataSources) ? scene.dataSources.map(normalizeDataSource) : [],
    calloutCluster: normalizeCalloutCluster(scene.calloutCluster),
    projection,
    surfaceTint,
    overlayTint,
  };
  clusterMarkers(result.markers, result.calloutCluster);
  return result;
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
  const rawScene = ensureObject(sceneInput, {});
  const scene = normalizeScene(sceneInput);
  const errors = [];
  const ids = new Set();

  if (scene.version !== SCENE_SCHEMA_VERSION) {
    errors.push(`version must be ${SCENE_SCHEMA_VERSION}`);
  }

  if (typeof scene.locale !== 'string' || scene.locale.length === 0) {
    errors.push('locale must be a non-empty string');
  }

  const ACCEPTED_THEMES = [...VALID_THEMES, 'dark', 'light'];
  if (rawScene.theme !== undefined && !ACCEPTED_THEMES.includes(rawScene.theme)) {
    errors.push('theme must be one of ' + VALID_THEMES.join('|'));
  }

  if (rawScene.projection !== undefined && !VALID_PROJECTIONS.includes(rawScene.projection)) {
    errors.push('scene.projection must be one of: ' + VALID_PROJECTIONS.join(', '));
  }

  const TINT_HEX_RE = /^#[0-9a-fA-F]{6}$/;
  if (rawScene.surfaceTint != null && (typeof rawScene.surfaceTint !== 'string' || !TINT_HEX_RE.test(rawScene.surfaceTint))) {
    errors.push('surfaceTint must be a 7-character hex color string (e.g. #aabbcc) or null');
  }
  if (rawScene.overlayTint != null && (typeof rawScene.overlayTint !== 'string' || !TINT_HEX_RE.test(rawScene.overlayTint))) {
    errors.push('overlayTint must be a 7-character hex color string (e.g. #aabbcc) or null');
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

  if (scene.planet.showBorders !== undefined && typeof scene.planet.showBorders !== 'boolean') {
    errors.push('planet.showBorders must be a boolean');
  }
  if (scene.planet.showLabels !== undefined && typeof scene.planet.showLabels !== 'boolean') {
    errors.push('planet.showLabels must be a boolean');
  }

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

  const dataSourceIds = new Set();
  scene.dataSources.forEach((ds, index) => {
    const pointer = `dataSources[${index}]`;
    if (typeof ds.id !== 'string' || !ID_PATTERN.test(ds.id)) {
      errors.push(`${pointer}.id must match ${ID_PATTERN}`);
    } else if (dataSourceIds.has(ds.id)) {
      errors.push(`${pointer}.id duplicate id: ${ds.id}`);
    } else {
      dataSourceIds.add(ds.id);
    }
    if (typeof ds.name !== 'string' || ds.name.length === 0) {
      errors.push(`${pointer}.name must be a non-empty string`);
    }
    if (typeof ds.shortName !== 'string' || ds.shortName.length === 0) {
      errors.push(`${pointer}.shortName must be a non-empty string`);
    }
    if (typeof ds.url !== 'string' || ds.url.length === 0) {
      errors.push(`${pointer}.url must be a non-empty string`);
    }
  });

  const rawMarkers = Array.isArray(rawScene.markers) ? rawScene.markers : [];
  scene.markers.forEach((marker, index) => {
    const pointer = `markers[${index}]`;
    validateEntityId(marker.id, pointer, ids, errors);
    validateLocalizedText(marker.name, `${pointer}.name`, errors);
    validateLocalizedText(marker.description, `${pointer}.description`, errors);
    validatePoint(marker, pointer, errors);
    if (!['dot', 'image', 'model', 'text'].includes(marker.visualType)) {
      errors.push(`${pointer}.visualType must be one of dot|image|model|text`);
    }
    const rawCalloutMode = rawMarkers[index]?.calloutMode;
    if (rawCalloutMode !== undefined && !['always', 'hover', 'click', 'none'].includes(rawCalloutMode)) {
      errors.push(`${pointer}.calloutMode must be one of always|hover|click|none`);
    }
    if (marker.sourceId && !dataSourceIds.has(marker.sourceId)) {
      errors.push(`${pointer}.sourceId references unknown dataSources id: ${marker.sourceId}`);
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
    if (path.sourceId && !dataSourceIds.has(path.sourceId)) {
      errors.push(`${pointer}.sourceId references unknown dataSources id: ${path.sourceId}`);
    }
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
    if (arc.sourceId && !dataSourceIds.has(arc.sourceId)) {
      errors.push(`${pointer}.sourceId references unknown dataSources id: ${arc.sourceId}`);
    }
  });

  scene.regions.forEach((region, index) => {
    const pointer = `regions[${index}]`;
    validateEntityId(region.id, pointer, ids, errors);
    validateLocalizedText(region.name, `${pointer}.name`, errors);
    if (!region.geojson || typeof region.geojson !== 'object') {
      errors.push(`${pointer}.geojson must be an object`);
    }
    if (region.sourceId && !dataSourceIds.has(region.sourceId)) {
      errors.push(`${pointer}.sourceId references unknown dataSources id: ${region.sourceId}`);
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
