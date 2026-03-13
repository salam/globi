export const VALID_THEMES = [
  'photo', 'wireframe-shaded', 'wireframe-flat', 'grayscale-shaded', 'grayscale-flat',
];

const PHOTO_LABEL_STYLES = {
  continent: 'rgba(255, 255, 255, 0.3)',
  ocean: 'rgba(150, 190, 255, 0.3)',
  region: 'rgba(255, 255, 255, 0.3)',
  feature: 'rgba(255, 220, 150, 0.35)',
};

const BW_LABEL_STYLES = {
  continent: 'rgba(34, 34, 34, 0.5)',
  ocean: 'rgba(68, 68, 68, 0.4)',
  region: 'rgba(34, 34, 34, 0.5)',
  feature: 'rgba(51, 51, 51, 0.45)',
};

const PALETTES = {
  photo: {
    background: 0x020b18,
    backgroundFlat: '#0a0e1a',
    borderColor: 0xffffff,
    borderOpacity: 0.35,
    graticuleColor: 0xbed8ff,
    graticuleOpacity: 0.16,
    graticuleVisible: false,
    atmosphereEnabled: true,
    atmosphereColor: [0.3, 0.6, 1.0],
    rimColor: [0.3, 0.5, 1.0],
    useTextures: true,
    desaturate: 0.0,
    shaded: true,
    flatLighting: false,
    labelStyles: PHOTO_LABEL_STYLES,
    leaderColor: '#f6b73c',
    calloutTextColor: 'rgba(255, 255, 255, 0.9)',
    landmassColor: null,
  },
  'wireframe-shaded': {
    background: 0xffffff,
    backgroundFlat: '#ffffff',
    borderColor: 0x222222,
    borderOpacity: 1.0,
    graticuleColor: 0x999999,
    graticuleOpacity: 0.5,
    graticuleVisible: true,
    atmosphereEnabled: false,
    atmosphereColor: [0, 0, 0],
    rimColor: [0, 0, 0],
    useTextures: false,
    desaturate: 0.0,
    shaded: true,
    flatLighting: false,
    labelStyles: BW_LABEL_STYLES,
    leaderColor: '#333333',
    calloutTextColor: 'rgba(34, 34, 34, 0.9)',
    landmassColor: 'rgba(200, 200, 200, 0.35)',
  },
  'wireframe-flat': {
    background: 0xffffff,
    backgroundFlat: '#ffffff',
    borderColor: 0x222222,
    borderOpacity: 1.0,
    graticuleColor: 0x999999,
    graticuleOpacity: 0.5,
    graticuleVisible: true,
    atmosphereEnabled: false,
    atmosphereColor: [0, 0, 0],
    rimColor: [0, 0, 0],
    useTextures: false,
    desaturate: 0.0,
    shaded: false,
    flatLighting: false,
    labelStyles: BW_LABEL_STYLES,
    leaderColor: '#333333',
    calloutTextColor: 'rgba(34, 34, 34, 0.9)',
    landmassColor: 'rgba(210, 210, 210, 0.4)',
  },
  'grayscale-shaded': {
    background: 0xffffff,
    backgroundFlat: '#ffffff',
    borderColor: 0x333333,
    borderOpacity: 0.8,
    graticuleColor: 0x999999,
    graticuleOpacity: 0.3,
    graticuleVisible: false,
    atmosphereEnabled: false,
    atmosphereColor: [0, 0, 0],
    rimColor: [0.2, 0.2, 0.2],
    useTextures: true,
    desaturate: 1.0,
    shaded: true,
    flatLighting: false,
    labelStyles: BW_LABEL_STYLES,
    leaderColor: '#333333',
    calloutTextColor: 'rgba(34, 34, 34, 0.9)',
    landmassColor: null,
  },
  'grayscale-flat': {
    background: 0xffffff,
    backgroundFlat: '#ffffff',
    borderColor: 0x333333,
    borderOpacity: 0.8,
    graticuleColor: 0x999999,
    graticuleOpacity: 0.3,
    graticuleVisible: false,
    atmosphereEnabled: false,
    atmosphereColor: [0, 0, 0],
    rimColor: [0.2, 0.2, 0.2],
    useTextures: true,
    desaturate: 1.0,
    shaded: false,
    flatLighting: true,
    labelStyles: BW_LABEL_STYLES,
    leaderColor: '#333333',
    calloutTextColor: 'rgba(34, 34, 34, 0.9)',
    landmassColor: null,
  },
};

export function getThemePalette(theme, surfaceTint = null, overlayTint = null) {
  const palette = PALETTES[theme] || PALETTES.photo;
  if (!surfaceTint && !overlayTint) return palette;
  return applyTint(palette, surfaceTint, overlayTint);
}

// ── HSL color blending utilities ──

function hexToRgb(hex) {
  const n = typeof hex === 'number' ? hex : parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
}

function tintColor(originalRgb, tintHsl) {
  const origHsl = rgbToHsl(originalRgb[0], originalRgb[1], originalRgb[2]);
  const isAchromatic = origHsl[1] < 0.05;
  // For achromatic colors, apply 60% of the tint's saturation so the
  // hue shift is clearly visible on B&W themes
  const finalSat = isAchromatic ? tintHsl[1] * 0.6 : tintHsl[1];
  // For very bright achromatic colors (near-white), pull lightness down slightly
  // so the tint hue becomes visible
  let finalL = origHsl[2];
  if (isAchromatic && finalL > 0.92) {
    finalL = 0.92;
  }
  return hslToRgb(tintHsl[0], finalSat, finalL);
}

function tintHexNumber(hexNum, tintHsl) {
  const rgb = hexToRgb(hexNum);
  const [r, g, b] = tintColor(rgb, tintHsl);
  return (r << 16) | (g << 8) | b;
}

function tintCssHex(hexStr, tintHsl) {
  const rgb = hexToRgb(hexStr);
  const [r, g, b] = tintColor(rgb, tintHsl);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function tintCssRgba(rgbaStr, tintHsl) {
  const m = rgbaStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!m) return rgbaStr;
  const [r, g, b] = tintColor([+m[1], +m[2], +m[3]], tintHsl);
  const a = m[4] ?? '1';
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function tintFloatRgb(floatArr, tintHsl) {
  const rgb = [Math.round(floatArr[0] * 255), Math.round(floatArr[1] * 255), Math.round(floatArr[2] * 255)];
  const [r, g, b] = tintColor(rgb, tintHsl);
  return [r / 255, g / 255, b / 255];
}

export function applyTint(palette, surfaceTint, overlayTint) {
  const result = { ...palette };

  if (surfaceTint) {
    const rgb = hexToRgb(surfaceTint);
    const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    result.background = tintHexNumber(palette.background, hsl);
    result.backgroundFlat = tintCssHex(palette.backgroundFlat, hsl);
    result.atmosphereColor = tintFloatRgb(palette.atmosphereColor, hsl);
    result.rimColor = tintFloatRgb(palette.rimColor, hsl);
  }

  if (overlayTint) {
    const rgb = hexToRgb(overlayTint);
    const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    result.borderColor = tintHexNumber(palette.borderColor, hsl);
    result.graticuleColor = tintHexNumber(palette.graticuleColor, hsl);
    result.leaderColor = tintCssHex(palette.leaderColor, hsl);
    result.calloutTextColor = tintCssRgba(palette.calloutTextColor, hsl);
    if (palette.landmassColor) {
      result.landmassColor = tintCssRgba(palette.landmassColor, hsl);
    }
    result.labelStyles = {};
    for (const [key, val] of Object.entries(palette.labelStyles)) {
      result.labelStyles[key] = tintCssRgba(val, hsl);
    }
  }

  return result;
}
