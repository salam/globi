import test from 'node:test';
import assert from 'node:assert/strict';
import { getThemePalette, VALID_THEMES } from '../src/renderer/themePalette.js';

test('VALID_THEMES contains all 5 theme names', () => {
  assert.deepEqual(VALID_THEMES, [
    'photo', 'wireframe-shaded', 'wireframe-flat', 'grayscale-shaded', 'grayscale-flat',
  ]);
});

test('getThemePalette returns a palette with all expected keys for each theme', () => {
  const expectedKeys = [
    'background', 'backgroundFlat', 'borderColor', 'borderOpacity',
    'graticuleColor', 'graticuleOpacity', 'graticuleVisible',
    'atmosphereEnabled', 'atmosphereColor', 'rimColor',
    'useTextures', 'desaturate', 'shaded', 'flatLighting',
    'labelStyles', 'leaderColor', 'calloutTextColor', 'landmassColor',
  ];
  for (const theme of VALID_THEMES) {
    const palette = getThemePalette(theme);
    for (const key of expectedKeys) {
      assert.ok(key in palette, `theme '${theme}' missing key '${key}'`);
    }
  }
});

test('getThemePalette falls back to photo for unknown themes', () => {
  const fallback = getThemePalette('banana');
  const photo = getThemePalette('photo');
  assert.deepEqual(fallback, photo);
});

test('photo theme has dark background and textures enabled', () => {
  const p = getThemePalette('photo');
  assert.equal(p.background, 0x020b18);
  assert.equal(p.useTextures, true);
  assert.equal(p.desaturate, 0.0);
  assert.equal(p.atmosphereEnabled, true);
});

test('wireframe-shaded has white bg, no textures, shading on', () => {
  const p = getThemePalette('wireframe-shaded');
  assert.equal(p.background, 0xffffff);
  assert.equal(p.useTextures, false);
  assert.equal(p.shaded, true);
  assert.equal(p.atmosphereEnabled, false);
});

test('wireframe-flat has shading off', () => {
  const p = getThemePalette('wireframe-flat');
  assert.equal(p.shaded, false);
  assert.equal(p.useTextures, false);
});

test('grayscale-shaded has textures, desaturate 1.0, shading on', () => {
  const p = getThemePalette('grayscale-shaded');
  assert.equal(p.useTextures, true);
  assert.equal(p.desaturate, 1.0);
  assert.equal(p.shaded, true);
  assert.equal(p.flatLighting, false);
});

test('grayscale-flat has flatLighting true', () => {
  const p = getThemePalette('grayscale-flat');
  assert.equal(p.flatLighting, true);
  assert.equal(p.shaded, false);
});

test('wireframe themes have landmassColor, others have null', () => {
  const ws = getThemePalette('wireframe-shaded');
  assert.ok(typeof ws.landmassColor === 'string', 'wireframe-shaded should have a landmassColor string');
  assert.ok(ws.landmassColor.startsWith('rgba('));

  const wf = getThemePalette('wireframe-flat');
  assert.ok(typeof wf.landmassColor === 'string', 'wireframe-flat should have a landmassColor string');
  assert.ok(wf.landmassColor.startsWith('rgba('));

  assert.equal(getThemePalette('photo').landmassColor, null);
  assert.equal(getThemePalette('grayscale-shaded').landmassColor, null);
  assert.equal(getThemePalette('grayscale-flat').landmassColor, null);
});

test('labelStyles has all 4 label types for each theme', () => {
  for (const theme of VALID_THEMES) {
    const p = getThemePalette(theme);
    assert.ok(p.labelStyles.continent);
    assert.ok(p.labelStyles.ocean);
    assert.ok(p.labelStyles.region);
    assert.ok(p.labelStyles.feature);
  }
});
