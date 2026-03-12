export const VIEWER_CONTROL_STYLE_TEXT = 'text';
export const VIEWER_CONTROL_STYLE_ICON = 'icon';

const DEFAULT_VIEWER_UI = Object.freeze({
  controlStyle: VIEWER_CONTROL_STYLE_TEXT,
  showBodySelector: true,
  showFullscreenButton: true,
  showLegendButton: true,
  showInspectButton: true,
  showCompass: true,
  showScale: true,
  showMarkerFilter: true,
  showAttribution: true,
});

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function pickBooleanOrDefault(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

export function getDefaultViewerUiConfig() {
  return { ...DEFAULT_VIEWER_UI };
}

export function normalizeViewerUiConfig(input = {}) {
  const value = isObject(input) ? input : {};
  return {
    controlStyle: value.controlStyle ?? DEFAULT_VIEWER_UI.controlStyle,
    showBodySelector: value.showBodySelector ?? DEFAULT_VIEWER_UI.showBodySelector,
    showFullscreenButton: value.showFullscreenButton ?? DEFAULT_VIEWER_UI.showFullscreenButton,
    showLegendButton: value.showLegendButton ?? DEFAULT_VIEWER_UI.showLegendButton,
    showInspectButton: value.showInspectButton ?? DEFAULT_VIEWER_UI.showInspectButton,
    showCompass: value.showCompass ?? DEFAULT_VIEWER_UI.showCompass,
    showScale: value.showScale ?? DEFAULT_VIEWER_UI.showScale,
    showMarkerFilter: value.showMarkerFilter ?? DEFAULT_VIEWER_UI.showMarkerFilter,
    showAttribution: value.showAttribution ?? DEFAULT_VIEWER_UI.showAttribution,
  };
}

export function resolveViewerUiConfig(input = {}) {
  const normalized = normalizeViewerUiConfig(input);
  return {
    controlStyle: normalized.controlStyle === VIEWER_CONTROL_STYLE_ICON
      ? VIEWER_CONTROL_STYLE_ICON
      : VIEWER_CONTROL_STYLE_TEXT,
    showBodySelector: pickBooleanOrDefault(normalized.showBodySelector, DEFAULT_VIEWER_UI.showBodySelector),
    showFullscreenButton: pickBooleanOrDefault(normalized.showFullscreenButton, DEFAULT_VIEWER_UI.showFullscreenButton),
    showLegendButton: pickBooleanOrDefault(normalized.showLegendButton, DEFAULT_VIEWER_UI.showLegendButton),
    showInspectButton: pickBooleanOrDefault(normalized.showInspectButton, DEFAULT_VIEWER_UI.showInspectButton),
    showCompass: pickBooleanOrDefault(normalized.showCompass, DEFAULT_VIEWER_UI.showCompass),
    showScale: pickBooleanOrDefault(normalized.showScale, DEFAULT_VIEWER_UI.showScale),
    showMarkerFilter: pickBooleanOrDefault(normalized.showMarkerFilter, DEFAULT_VIEWER_UI.showMarkerFilter),
    showAttribution: pickBooleanOrDefault(normalized.showAttribution, DEFAULT_VIEWER_UI.showAttribution),
  };
}

export function mergeViewerUiConfig(current = {}, patch = {}) {
  const safeCurrent = isObject(current) ? current : {};
  const safePatch = isObject(patch) ? patch : {};
  return resolveViewerUiConfig({
    ...safeCurrent,
    ...safePatch,
  });
}

export function validateViewerUiConfig(viewerUi, pointer, errors) {
  const value = normalizeViewerUiConfig(viewerUi);

  if (![VIEWER_CONTROL_STYLE_TEXT, VIEWER_CONTROL_STYLE_ICON].includes(value.controlStyle)) {
    errors.push(`${pointer}.controlStyle must be one of text|icon`);
  }

  const booleanFields = [
    'showBodySelector',
    'showFullscreenButton',
    'showLegendButton',
    'showInspectButton',
    'showCompass',
    'showScale',
    'showMarkerFilter',
    'showAttribution',
  ];

  for (const field of booleanFields) {
    if (typeof value[field] !== 'boolean') {
      errors.push(`${pointer}.${field} must be a boolean`);
    }
  }
}
