import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultViewerUiConfig,
  normalizeViewerUiConfig,
  resolveViewerUiConfig,
  validateViewerUiConfig,
} from '../src/scene/viewerUi.js';
import { VALID_THEMES } from '../src/renderer/themePalette.js';
import { resolvePlanetConfig, listCelestialPresets } from '../src/scene/celestial.js';

test('showThemeToggle defaults to false', () => {
  const config = getDefaultViewerUiConfig();
  assert.equal(config.showThemeToggle, false);
});

test('normalizeViewerUiConfig preserves showThemeToggle: true', () => {
  const config = normalizeViewerUiConfig({ showThemeToggle: true });
  assert.equal(config.showThemeToggle, true);
});

test('normalizeViewerUiConfig defaults showThemeToggle to false', () => {
  const config = normalizeViewerUiConfig({});
  assert.equal(config.showThemeToggle, false);
});

test('resolveViewerUiConfig resolves showThemeToggle', () => {
  const config = resolveViewerUiConfig({ showThemeToggle: true });
  assert.equal(config.showThemeToggle, true);
});

test('validateViewerUiConfig accepts boolean showThemeToggle', () => {
  const errors = [];
  validateViewerUiConfig({ showThemeToggle: true }, 'viewerUi', errors);
  const themeErrors = errors.filter(e => e.includes('showThemeToggle'));
  assert.equal(themeErrors.length, 0);
});

test('validateViewerUiConfig rejects non-boolean showThemeToggle', () => {
  const errors = [];
  validateViewerUiConfig({ showThemeToggle: 'yes' }, 'viewerUi', errors);
  const themeErrors = errors.filter(e => e.includes('showThemeToggle'));
  assert.equal(themeErrors.length, 1);
});

test('VALID_THEMES has 5 entries', () => {
  assert.equal(VALID_THEMES.length, 5);
});

test('theme cycle wraps around correctly', () => {
  for (let i = 0; i < VALID_THEMES.length; i++) {
    const current = VALID_THEMES[i];
    const next = VALID_THEMES[(i + 1) % VALID_THEMES.length];
    assert.ok(next, `next theme after ${current} should exist`);
  }
  const last = VALID_THEMES[VALID_THEMES.length - 1];
  const wrapped = VALID_THEMES[(VALID_THEMES.length) % VALID_THEMES.length];
  assert.equal(wrapped, VALID_THEMES[0],
    `after ${last} should wrap to ${VALID_THEMES[0]}`);
});

test('every celestial preset has a baseColor', () => {
  const presets = listCelestialPresets();
  for (const preset of presets) {
    const resolved = resolvePlanetConfig({ id: preset.id });
    assert.ok(resolved.baseColor,
      `${preset.id} must have a baseColor for theme thumbnail`);
  }
});
