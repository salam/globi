const SUPPORTED_VISUAL_TYPES = new Set(['dot', 'image', 'model', 'text']);

export function normalizeMarkerVisualType(value) {
  if (typeof value !== 'string') {
    return 'dot';
  }
  return SUPPORTED_VISUAL_TYPES.has(value) ? value : 'dot';
}

export function getLegendSymbol(marker = {}) {
  const shape = normalizeMarkerVisualType(marker.visualType);
  const color = typeof marker.color === 'string' && marker.color.trim().length > 0
    ? marker.color.trim()
    : '#ff6a00';

  return {
    shape,
    color,
    assetUri: shape === 'image' && marker.assetUri ? marker.assetUri : null,
  };
}
