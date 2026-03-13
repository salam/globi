import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getThemePalette, applyTint } from '../src/renderer/themePalette.js';

describe('applyTint', () => {
  it('returns palette unchanged when both tints are null', () => {
    const palette = getThemePalette('wireframe-shaded');
    const tinted = applyTint(palette, null, null);
    assert.equal(tinted.background, palette.background);
    assert.equal(tinted.leaderColor, palette.leaderColor);
    assert.equal(tinted.calloutTextColor, palette.calloutTextColor);
  });

  it('applies surfaceTint to background color', () => {
    const palette = getThemePalette('wireframe-shaded');
    const tinted = applyTint(palette, '#d4c5a0', null);
    // Original background is 0xffffff (white). With sepia tint, hue shifts but stays bright.
    assert.notEqual(tinted.background, palette.background);
    assert.equal(typeof tinted.background, 'number');
  });

  it('applies surfaceTint to backgroundFlat CSS string', () => {
    const palette = getThemePalette('wireframe-shaded');
    const tinted = applyTint(palette, '#d4c5a0', null);
    assert.notEqual(tinted.backgroundFlat, palette.backgroundFlat);
    assert.ok(tinted.backgroundFlat.startsWith('#'));
  });

  it('applies surfaceTint to atmosphereColor (0-1 float RGB array)', () => {
    const palette = getThemePalette('photo');
    const tinted = applyTint(palette, '#cc8844', null);
    assert.ok(Array.isArray(tinted.atmosphereColor));
    assert.equal(tinted.atmosphereColor.length, 3);
    // All values should be 0-1 floats
    for (const v of tinted.atmosphereColor) {
      assert.ok(v >= 0 && v <= 1, `atmosphereColor component ${v} out of 0-1 range`);
    }
  });

  it('applies surfaceTint to rimColor (0-1 float RGB array)', () => {
    const palette = getThemePalette('photo');
    const tinted = applyTint(palette, '#cc8844', null);
    assert.ok(Array.isArray(tinted.rimColor));
    assert.equal(tinted.rimColor.length, 3);
    for (const v of tinted.rimColor) {
      assert.ok(v >= 0 && v <= 1, `rimColor component ${v} out of 0-1 range`);
    }
  });

  it('applies overlayTint to borderColor', () => {
    const palette = getThemePalette('wireframe-shaded');
    const tinted = applyTint(palette, null, '#5c4a2e');
    assert.notEqual(tinted.borderColor, palette.borderColor);
    assert.equal(typeof tinted.borderColor, 'number');
  });

  it('applies overlayTint to leaderColor', () => {
    const palette = getThemePalette('wireframe-shaded');
    const tinted = applyTint(palette, null, '#5c4a2e');
    assert.notEqual(tinted.leaderColor, palette.leaderColor);
    assert.ok(tinted.leaderColor.startsWith('#'));
  });

  it('applies overlayTint to calloutTextColor (rgba string)', () => {
    const palette = getThemePalette('wireframe-shaded');
    const tinted = applyTint(palette, null, '#5c4a2e');
    assert.notEqual(tinted.calloutTextColor, palette.calloutTextColor);
    assert.ok(tinted.calloutTextColor.startsWith('rgba('));
  });

  it('applies overlayTint to all labelStyles entries', () => {
    const palette = getThemePalette('wireframe-shaded');
    const tinted = applyTint(palette, null, '#5c4a2e');
    for (const key of ['continent', 'ocean', 'region', 'feature']) {
      assert.notEqual(tinted.labelStyles[key], palette.labelStyles[key]);
      assert.ok(tinted.labelStyles[key].startsWith('rgba('));
    }
  });

  it('applies overlayTint to graticuleColor', () => {
    const palette = getThemePalette('wireframe-shaded');
    const tinted = applyTint(palette, null, '#5c4a2e');
    assert.notEqual(tinted.graticuleColor, palette.graticuleColor);
    assert.equal(typeof tinted.graticuleColor, 'number');
  });

  it('does not tint non-color properties', () => {
    const palette = getThemePalette('wireframe-shaded');
    const tinted = applyTint(palette, '#d4c5a0', '#5c4a2e');
    assert.equal(tinted.borderOpacity, palette.borderOpacity);
    assert.equal(tinted.graticuleOpacity, palette.graticuleOpacity);
    assert.equal(tinted.graticuleVisible, palette.graticuleVisible);
    assert.equal(tinted.useTextures, palette.useTextures);
    assert.equal(tinted.desaturate, palette.desaturate);
    assert.equal(tinted.shaded, palette.shaded);
    assert.equal(tinted.atmosphereEnabled, palette.atmosphereEnabled);
  });

  it('handles achromatic colors with reduced saturation', () => {
    const palette = getThemePalette('wireframe-shaded');
    // background is 0xffffff (pure white, saturation=0)
    const tinted = applyTint(palette, '#ff0000', null);
    // Should get a subtle red tint, not a vivid red
    const r = (tinted.background >> 16) & 0xff;
    const g = (tinted.background >> 8) & 0xff;
    const b = tinted.background & 0xff;
    // R should be higher than G and B (red tint) but not vivid
    assert.ok(r > g, 'red channel should dominate with red tint');
    assert.ok(r > 200, 'lightness should be preserved for white');
  });

  it('applies both surfaceTint and overlayTint independently', () => {
    const palette = getThemePalette('wireframe-shaded');
    const tinted = applyTint(palette, '#d4c5a0', '#5c4a2e');
    // Surface tinted
    assert.notEqual(tinted.background, palette.background);
    // Overlay tinted
    assert.notEqual(tinted.borderColor, palette.borderColor);
    // They should be different from each other (different tints)
    assert.notEqual(tinted.background, tinted.borderColor);
  });
});
