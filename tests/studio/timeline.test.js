import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let Timeline;
beforeEach(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="tl"></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  ({ Timeline } = await import('../../studio/components/timeline.js'));
});

describe('Timeline', () => {
  it('renders element rows', () => {
    const el = document.getElementById('tl');
    const tl = new Timeline(el, {
      scene: {
        markers: [{ id: 'm1', name: { en: 'Berlin' }, color: '#ff0000' }],
        arcs: [{ id: 'a1', name: { en: 'Arc' }, color: '#0000ff' }],
        paths: [], regions: [], animations: [], cameraAnimation: [],
      },
      locale: 'en', playheadMs: 0,
      onPlayheadChange: () => {}, onVisibilityChange: () => {}, onTransport: () => {},
    });
    tl.render();
    const rows = el.querySelectorAll('.tl-row');
    assert.ok(rows.length >= 3);
  });

  it('renders transport controls', () => {
    const el = document.getElementById('tl');
    const tl = new Timeline(el, {
      scene: { markers: [], arcs: [], paths: [], regions: [], animations: [], cameraAnimation: [] },
      locale: 'en', playheadMs: 0,
      onPlayheadChange: () => {}, onVisibilityChange: () => {}, onTransport: () => {},
    });
    tl.render();
    const playBtn = el.querySelector('[data-action="play"]');
    assert.ok(playBtn);
  });

  it('fires transport action on button click', () => {
    const el = document.getElementById('tl');
    let action = null;
    const tl = new Timeline(el, {
      scene: { markers: [], arcs: [], paths: [], regions: [], animations: [], cameraAnimation: [] },
      locale: 'en', playheadMs: 0,
      onPlayheadChange: () => {}, onVisibilityChange: () => {},
      onTransport: (a) => { action = a; },
    });
    tl.render();
    const playBtn = el.querySelector('[data-action="play"]');
    playBtn.click();
    assert.equal(action, 'play');
  });
});
