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
  },
];

const PRESET_BY_ID = new Map(PRESETS.map((entry) => [entry.id, entry]));

export const CELESTIAL_PRESET_IDS = PRESETS.map((entry) => entry.id);

function clonePreset(preset) {
  return {
    ...preset,
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
  };
}
