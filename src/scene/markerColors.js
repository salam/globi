export const COLOR_BLIND_SAFE_DOT_PALETTE = [
  '#0072B2',
  '#E69F00',
  '#009E73',
  '#CC79A7',
  '#D55E00',
  '#56B4E9',
  '#F0E442',
  '#332288',
  '#44AA99',
  '#999933',
];

function parseHexColor(hex) {
  if (typeof hex !== 'string') {
    return null;
  }
  const value = hex.trim().replace(/^#/, '');

  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return {
      r: Number.parseInt(value.slice(0, 2), 16),
      g: Number.parseInt(value.slice(2, 4), 16),
      b: Number.parseInt(value.slice(4, 6), 16),
    };
  }

  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return {
      r: Number.parseInt(value[0] + value[0], 16),
      g: Number.parseInt(value[1] + value[1], 16),
      b: Number.parseInt(value[2] + value[2], 16),
    };
  }

  return null;
}

function rgbToHex({ r, g, b }) {
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

function mixColor(baseHex, targetHex, amount) {
  const base = parseHexColor(baseHex);
  const target = parseHexColor(targetHex);
  if (!base || !target) {
    return baseHex;
  }

  const t = Math.max(0, Math.min(1, Number(amount) || 0));
  return rgbToHex({
    r: base.r + (target.r - base.r) * t,
    g: base.g + (target.g - base.g) * t,
    b: base.b + (target.b - base.b) * t,
  });
}

function isDotMarker(marker = {}) {
  const type = typeof marker.visualType === 'string' ? marker.visualType : 'dot';
  return type === 'dot';
}

function hasColor(marker = {}) {
  return typeof marker.color === 'string' && marker.color.trim().length > 0;
}

export function getDotColorForIndex(index) {
  const paletteSize = COLOR_BLIND_SAFE_DOT_PALETTE.length;
  const safeIndex = Math.max(0, Math.floor(Number(index) || 0));

  const base = COLOR_BLIND_SAFE_DOT_PALETTE[safeIndex % paletteSize];
  const round = Math.floor(safeIndex / paletteSize);

  if (round === 0) {
    return base;
  }

  const step = Math.min(0.55, 0.14 * Math.ceil(round / 2));
  if (round % 2 === 1) {
    return mixColor(base, '#ffffff', step);
  }
  return mixColor(base, '#000000', step * 0.9);
}

export function assignAutoDotColors(markersInput = []) {
  const markers = Array.isArray(markersInput) ? markersInput : [];
  let dotCount = 0;

  return markers.map((marker) => {
    if (!isDotMarker(marker)) {
      return marker;
    }

    const nextMarker = { ...marker };
    if (!hasColor(nextMarker)) {
      nextMarker.color = getDotColorForIndex(dotCount);
    }

    dotCount += 1;
    return nextMarker;
  });
}
