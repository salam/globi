import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyScene, normalizeScene, validateScene } from '../src/scene/schema.js';

describe('scene schema — surfaceTint / overlayTint', () => {
  it('createEmptyScene includes tint fields as null', () => {
    const scene = createEmptyScene();
    assert.equal(scene.surfaceTint, null);
    assert.equal(scene.overlayTint, null);
  });

  it('normalizeScene passes through valid hex tints', () => {
    const scene = createEmptyScene();
    scene.surfaceTint = '#d4c5a0';
    scene.overlayTint = '#5c4a2e';
    const normalized = normalizeScene(scene);
    assert.equal(normalized.surfaceTint, '#d4c5a0');
    assert.equal(normalized.overlayTint, '#5c4a2e');
  });

  it('normalizeScene normalizes malformed tints to null', () => {
    const scene = createEmptyScene();
    scene.surfaceTint = 'red';
    scene.overlayTint = '#fff';
    const normalized = normalizeScene(scene);
    assert.equal(normalized.surfaceTint, null);
    assert.equal(normalized.overlayTint, null);
  });

  it('normalizeScene normalizes missing tints to null', () => {
    const scene = createEmptyScene();
    delete scene.surfaceTint;
    delete scene.overlayTint;
    const normalized = normalizeScene(scene);
    assert.equal(normalized.surfaceTint, null);
    assert.equal(normalized.overlayTint, null);
  });

  it('validateScene accepts valid hex tints', () => {
    const scene = createEmptyScene();
    scene.surfaceTint = '#aabbcc';
    scene.overlayTint = '#112233';
    const result = validateScene(scene);
    const tintErrors = result.errors.filter(e => e.includes('Tint') || e.includes('tint'));
    assert.equal(tintErrors.length, 0);
  });

  it('validateScene reports invalid surfaceTint', () => {
    const scene = createEmptyScene();
    scene.surfaceTint = 'notahex';
    const result = validateScene(scene);
    assert.ok(result.errors.some(e => e.includes('surfaceTint')), 'should report surfaceTint error');
  });

  it('validateScene reports invalid overlayTint', () => {
    const scene = createEmptyScene();
    scene.overlayTint = '#fff';
    const result = validateScene(scene);
    assert.ok(result.errors.some(e => e.includes('overlayTint')), 'should report overlayTint error');
  });

  it('validateScene accepts null tints without errors', () => {
    const scene = createEmptyScene();
    scene.surfaceTint = null;
    scene.overlayTint = null;
    const result = validateScene(scene);
    const tintErrors = result.errors.filter(e => e.includes('Tint') || e.includes('tint'));
    assert.equal(tintErrors.length, 0);
  });

  it('validateScene accepts omitted tints without errors', () => {
    const scene = createEmptyScene();
    const result = validateScene(scene);
    const tintErrors = result.errors.filter(e => e.includes('Tint') || e.includes('tint'));
    assert.equal(tintErrors.length, 0);
  });
});
