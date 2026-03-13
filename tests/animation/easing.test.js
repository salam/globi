import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AnimationEngine } from '../../src/animation/engine.js';

describe('AnimationEngine easing', () => {
  it('linear easing (default) interpolates linearly', () => {
    const engine = new AnimationEngine();
    engine.register('e1', [
      { t: 0, value: { x: 0 } },
      { t: 1000, value: { x: 100 } },
    ]);
    const v = engine.sample('e1', 500);
    assert.equal(v.x, 50);
  });

  it('ease-in produces slower start', () => {
    const engine = new AnimationEngine();
    engine.register('e1', [
      { t: 0, value: { x: 0 }, easing: 'ease-in' },
      { t: 1000, value: { x: 100 } },
    ]);
    const v = engine.sample('e1', 500);
    assert.ok(v.x < 50, `expected < 50, got ${v.x}`);
  });

  it('ease-out produces faster start', () => {
    const engine = new AnimationEngine();
    engine.register('e1', [
      { t: 0, value: { x: 0 }, easing: 'ease-out' },
      { t: 1000, value: { x: 100 } },
    ]);
    const v = engine.sample('e1', 500);
    assert.ok(v.x > 50, `expected > 50, got ${v.x}`);
  });

  it('ease-in-out produces S-curve', () => {
    const engine = new AnimationEngine();
    engine.register('e1', [
      { t: 0, value: { x: 0 }, easing: 'ease-in-out' },
      { t: 1000, value: { x: 100 } },
    ]);
    const v25 = engine.sample('e1', 250);
    const v75 = engine.sample('e1', 750);
    assert.ok(v25.x < 25, `expected < 25, got ${v25.x}`);
    assert.ok(v75.x > 75, `expected > 75, got ${v75.x}`);
  });

  it('supports cubic-bezier(x1,y1,x2,y2)', () => {
    const engine = new AnimationEngine();
    engine.register('e1', [
      { t: 0, value: { x: 0 }, easing: 'cubic-bezier(0.42,0,0.58,1)' },
      { t: 1000, value: { x: 100 } },
    ]);
    const v = engine.sample('e1', 500);
    assert.ok(v.x > 40 && v.x < 60, `expected 40-60, got ${v.x}`);
  });

  it('keyframes without easing default to linear', () => {
    const engine = new AnimationEngine();
    engine.register('e1', [
      { t: 0, value: { x: 0 } },
      { t: 1000, value: { x: 100 } },
    ]);
    const v = engine.sample('e1', 250);
    assert.equal(v.x, 25);
  });
});
