const PRESETS = [
  {
    id: 'mercury',
    label: 'Mercury',
    kind: 'planet',
    parentId: null,
    radius: 0.383,
    baseColor: '#9a8f83',
    textureUri: '',
    rotationSpeed: 0.0008,
    obliquity: 0.03,
    northPoleRA: 281.01,
    northPoleDec: 61.41,
    orbitalPeriod: 87.97,
    siderealRotation: 1407.6,
    orbitalInclination: 7.00,
    longitudeOfAscNode: 48.33,
    meanLongitudeJ2000: 252.25,
    atmosphere: null,
    rings: null,
  },
  {
    id: 'venus',
    label: 'Venus',
    kind: 'planet',
    parentId: null,
    radius: 0.949,
    baseColor: '#d5b27d',
    textureUri: '',
    rotationSpeed: -0.0002,
    obliquity: 177.4,
    northPoleRA: 272.76,
    northPoleDec: 67.16,
    orbitalPeriod: 224.70,
    siderealRotation: -5832.5,
    orbitalInclination: 3.39,
    longitudeOfAscNode: 76.68,
    meanLongitudeJ2000: 181.98,
    atmosphere: { enabled: true, scaleHeight: 15.9, surfacePressure: 92, scatterColor: '#d4a55c', thickness: 0.12, density: 0.9 },
    rings: null,
  },
  {
    id: 'earth',
    label: 'Earth',
    kind: 'planet',
    parentId: null,
    radius: 1,
    baseColor: '#1e90ff',
    textureUri: '',
    rotationSpeed: 0.001,
    obliquity: 23.44,
    northPoleRA: 0.0,
    northPoleDec: 90.0,
    orbitalPeriod: 365.256,
    siderealRotation: 23.934,
    orbitalInclination: 0.0,
    longitudeOfAscNode: 348.74,
    meanLongitudeJ2000: 100.46,
    atmosphere: { enabled: true, scaleHeight: 8.5, surfacePressure: 1.0, scatterColor: '#6b93d6', thickness: 0.06, density: 0.7 },
    rings: null,
  },
  {
    id: 'mars',
    label: 'Mars',
    kind: 'planet',
    parentId: null,
    radius: 0.532,
    baseColor: '#c86f53',
    textureUri: '',
    rotationSpeed: 0.00097,
    obliquity: 25.19,
    northPoleRA: 317.68,
    northPoleDec: 52.89,
    orbitalPeriod: 686.97,
    siderealRotation: 24.623,
    orbitalInclination: 1.85,
    longitudeOfAscNode: 49.56,
    meanLongitudeJ2000: 355.45,
    atmosphere: { enabled: true, scaleHeight: 11.1, surfacePressure: 0.006, scatterColor: '#c47d5e', thickness: 0.03, density: 0.25 },
    rings: null,
  },
  {
    id: 'jupiter',
    label: 'Jupiter',
    kind: 'planet',
    parentId: null,
    radius: 11.209,
    baseColor: '#c59a6d',
    textureUri: '',
    rotationSpeed: 0.0024,
    obliquity: 3.13,
    northPoleRA: 268.06,
    northPoleDec: 64.50,
    orbitalPeriod: 4332.59,
    siderealRotation: 9.925,
    orbitalInclination: 1.30,
    longitudeOfAscNode: 100.46,
    meanLongitudeJ2000: 34.40,
    atmosphere: { enabled: true, scaleHeight: 27.0, surfacePressure: 1000, scatterColor: '#8b7355', thickness: 0.08, density: 0.4 },
    rings: { innerRadius: 1.72, outerRadius: 1.81, textureUri: '', opacity: 0.05, color: '#8b7355' },
  },
  {
    id: 'saturn',
    label: 'Saturn',
    kind: 'planet',
    parentId: null,
    radius: 9.449,
    baseColor: '#d9c47f',
    textureUri: '',
    rotationSpeed: 0.0022,
    obliquity: 26.73,
    northPoleRA: 40.60,
    northPoleDec: 83.54,
    orbitalPeriod: 10759.22,
    siderealRotation: 10.656,
    orbitalInclination: 2.49,
    longitudeOfAscNode: 113.64,
    meanLongitudeJ2000: 49.94,
    atmosphere: { enabled: true, scaleHeight: 59.5, surfacePressure: 1000, scatterColor: '#c4a95a', thickness: 0.08, density: 0.4 },
    rings: { innerRadius: 1.24, outerRadius: 2.27, textureUri: 'textures/saturn/2k_ring_alpha.png', opacity: 0.85, color: '#c4a574' },
  },
  {
    id: 'uranus',
    label: 'Uranus',
    kind: 'planet',
    parentId: null,
    radius: 4.007,
    baseColor: '#9ddbe8',
    textureUri: '',
    rotationSpeed: -0.0014,
    obliquity: 97.77,
    northPoleRA: 257.31,
    northPoleDec: -15.18,
    orbitalPeriod: 30688.5,
    siderealRotation: -17.24,
    orbitalInclination: 0.77,
    longitudeOfAscNode: 74.01,
    meanLongitudeJ2000: 313.23,
    atmosphere: { enabled: true, scaleHeight: 27.7, surfacePressure: 1000, scatterColor: '#9ddbe8', thickness: 0.06, density: 0.55 },
    rings: { innerRadius: 1.64, outerRadius: 2.00, textureUri: '', opacity: 0.08, color: '#555555' },
  },
  {
    id: 'neptune',
    label: 'Neptune',
    kind: 'planet',
    parentId: null,
    radius: 3.883,
    baseColor: '#4f74d6',
    textureUri: '',
    rotationSpeed: 0.0015,
    obliquity: 28.32,
    northPoleRA: 299.36,
    northPoleDec: 43.46,
    orbitalPeriod: 60182.0,
    siderealRotation: 16.11,
    orbitalInclination: 1.77,
    longitudeOfAscNode: 131.72,
    meanLongitudeJ2000: 304.88,
    atmosphere: { enabled: true, scaleHeight: 19.7, surfacePressure: 1000, scatterColor: '#4f74d6', thickness: 0.06, density: 0.6 },
    rings: { innerRadius: 1.69, outerRadius: 2.54, textureUri: '', opacity: 0.04, color: '#3a4a6b' },
  },
  {
    id: 'moon',
    label: 'Moon',
    kind: 'moon',
    parentId: 'earth',
    radius: 0.273,
    baseColor: '#b8b8b8',
    textureUri: '',
    rotationSpeed: 0.00014,
    obliquity: 6.68,
    northPoleRA: 0.0,
    northPoleDec: 90.0,
    orbitalPeriod: 27.322,
    siderealRotation: 655.73,
    orbitalInclination: 5.14,
    longitudeOfAscNode: 125.08,
    meanLongitudeJ2000: 218.32,
    atmosphere: null,
    rings: null,
  },
  {
    id: 'io',
    label: 'Io',
    kind: 'moon',
    parentId: 'jupiter',
    radius: 0.286,
    baseColor: '#d5c16d',
    textureUri: '',
    rotationSpeed: 0.0008,
    obliquity: 0.04,
    northPoleRA: 268.05,
    northPoleDec: 64.50,
    orbitalPeriod: 1.769,
    siderealRotation: 42.459,
    orbitalInclination: 0.04,
    longitudeOfAscNode: 43.98,
    meanLongitudeJ2000: 106.07,
    atmosphere: null,
    rings: null,
  },
  {
    id: 'europa',
    label: 'Europa',
    kind: 'moon',
    parentId: 'jupiter',
    radius: 0.245,
    baseColor: '#cdc7b4',
    textureUri: '',
    rotationSpeed: 0.0009,
    obliquity: 0.47,
    northPoleRA: 268.08,
    northPoleDec: 64.51,
    orbitalPeriod: 3.551,
    siderealRotation: 85.228,
    orbitalInclination: 0.47,
    longitudeOfAscNode: 219.11,
    meanLongitudeJ2000: 176.41,
    atmosphere: null,
    rings: null,
  },
  {
    id: 'ganymede',
    label: 'Ganymede',
    kind: 'moon',
    parentId: 'jupiter',
    radius: 0.413,
    baseColor: '#9e927d',
    textureUri: '',
    rotationSpeed: 0.00065,
    obliquity: 0.17,
    northPoleRA: 268.20,
    northPoleDec: 64.57,
    orbitalPeriod: 7.155,
    siderealRotation: 171.71,
    orbitalInclination: 0.18,
    longitudeOfAscNode: 63.55,
    meanLongitudeJ2000: 121.35,
    atmosphere: null,
    rings: null,
  },
  {
    id: 'titan',
    label: 'Titan',
    kind: 'moon',
    parentId: 'saturn',
    radius: 0.404,
    baseColor: '#b58f5f',
    textureUri: '',
    rotationSpeed: 0.00045,
    obliquity: 0.33,
    northPoleRA: 40.59,
    northPoleDec: 83.53,
    orbitalPeriod: 15.945,
    siderealRotation: 382.68,
    orbitalInclination: 0.33,
    longitudeOfAscNode: 28.06,
    meanLongitudeJ2000: 15.15,
    atmosphere: { enabled: true, scaleHeight: 21.0, surfacePressure: 1.45, scatterColor: '#c48a3f', thickness: 0.15, density: 0.85 },
    rings: null,
  },
];

const PRESET_BY_ID = new Map(PRESETS.map((entry) => [entry.id, entry]));

export const CELESTIAL_PRESET_IDS = PRESETS.map((entry) => entry.id);

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

function safeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toTitleCase(value) {
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function isCelestialPresetId(id) {
  return PRESET_BY_ID.has(id);
}

export function listCelestialPresets() {
  return PRESETS.map(clonePreset);
}

export function getCelestialPreset(id = 'earth') {
  const preset = PRESET_BY_ID.get(id) ?? PRESET_BY_ID.get('earth');
  return clonePreset(preset);
}

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

export function resolvePlanetConfig(input) {
  if (typeof input === 'string') {
    return getCelestialPreset(input);
  }

  const planet = input && typeof input === 'object' && !Array.isArray(input)
    ? input
    : {};

  const hasInput = Object.keys(planet).length > 0;
  const id = typeof planet.id === 'string' && planet.id.length > 0 ? planet.id : 'earth';

  if (isCelestialPresetId(id)) {
    const preset = getCelestialPreset(id);
    return {
      ...preset,
      ...planet,
      id,
      label: typeof planet.label === 'string' && planet.label.length > 0 ? planet.label : preset.label,
      kind: planet.kind ?? preset.kind,
      parentId: planet.parentId ?? preset.parentId,
      radius: safeNumber(planet.radius, preset.radius),
      baseColor: String(planet.baseColor ?? preset.baseColor),
      textureUri: String(planet.textureUri ?? preset.textureUri),
      backdropUri: String(planet.backdropUri ?? preset.backdropUri ?? ''),
      rotationSpeed: safeNumber(planet.rotationSpeed, preset.rotationSpeed),
      lightingMode: planet.lightingMode === 'sun' ? 'sun' : 'fixed',
      lightingTimestamp: (typeof planet.lightingTimestamp === 'string' || typeof planet.lightingTimestamp === 'number')
        ? planet.lightingTimestamp
        : '',
      showBorders: planet.showBorders !== false,
      showLabels: planet.showLabels !== false,
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
    };
  }

  if (!hasInput) {
    return getCelestialPreset('earth');
  }

  return {
    ...getCelestialPreset('earth'),
    ...planet,
    id,
    label: typeof planet.label === 'string' && planet.label.length > 0 ? planet.label : toTitleCase(id),
    kind: planet.kind ?? 'custom',
    parentId: planet.parentId ?? null,
    radius: safeNumber(planet.radius, 1),
    baseColor: String(planet.baseColor ?? '#1e90ff'),
    textureUri: String(planet.textureUri ?? ''),
    backdropUri: String(planet.backdropUri ?? ''),
    rotationSpeed: safeNumber(planet.rotationSpeed, 0),
    lightingMode: planet.lightingMode === 'sun' ? 'sun' : 'fixed',
    lightingTimestamp: (typeof planet.lightingTimestamp === 'string' || typeof planet.lightingTimestamp === 'number')
      ? planet.lightingTimestamp
      : '',
    showBorders: planet.showBorders !== false,
    showLabels: planet.showLabels !== false,
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
  };
}
