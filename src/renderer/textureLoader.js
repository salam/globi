const ZOOM_UPGRADE_THRESHOLD = 2.0;

// Bodies that have 8K textures available
const HAS_8K = new Set(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'moon']);

// Bodies that have night textures
const HAS_NIGHT = new Set(['earth']);

// Bodies with atmosphere overlay textures
const HAS_ATMO_OVERLAY = new Set(['venus']);

// Known ring texture paths for bodies with rings
const RING_TEXTURES = {
  saturn: '/assets/textures/saturn/2k_ring_alpha.png',
};

/**
 * Resolve the texture file paths for a celestial body.
 * @param {object} planetConfig - Resolved planet config
 * @returns {{ surface: string, night: string|null, surfaceHi: string|null, nightHi: string|null, atmosphereOverlay: string|null, ring: string|null }}
 */
export function resolveTexturePaths(planetConfig) {
  const id = planetConfig.id;

  // Custom textureUri takes priority
  if (planetConfig.textureUri && planetConfig.textureUri.length > 0) {
    return {
      surface: planetConfig.textureUri,
      night: planetConfig.nightTextureUri || null,
      surfaceHi: null,
      nightHi: null,
      atmosphereOverlay: null,
      ring: planetConfig.rings?.textureUri || RING_TEXTURES[id] || null,
    };
  }

  const base = `/assets/textures/${id}`;
  const isEarth = id === 'earth';
  const surfaceName = isEarth ? 'day' : 'surface';
  const has8k = HAS_8K.has(id);

  return {
    surface: `${base}/2k_${surfaceName}.jpg`,
    night: HAS_NIGHT.has(id) ? `${base}/2k_night.jpg` : null,
    surfaceHi: has8k ? `${base}/8k_${surfaceName}.jpg` : null,
    nightHi: (has8k && HAS_NIGHT.has(id)) ? `${base}/8k_night.jpg` : null,
    atmosphereOverlay: HAS_ATMO_OVERLAY.has(id) ? `${base}/2k_atmosphere.jpg` : null,
    ring: planetConfig.rings?.textureUri
      ? `/assets/${planetConfig.rings.textureUri}`
      : (RING_TEXTURES[id] || null),
  };
}

/**
 * Whether the current zoom level warrants upgrading to high-res textures.
 * @param {number} zoom - Current zoom level
 * @param {number} maxResolution - Max texture resolution (e.g. 8192, 2048)
 * @returns {boolean}
 */
export function shouldUpgradeTexture(zoom, maxResolution = 8192) {
  if (maxResolution <= 2048) return false;
  return zoom > ZOOM_UPGRADE_THRESHOLD;
}
