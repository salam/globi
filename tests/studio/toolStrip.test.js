import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let ToolStrip;
beforeEach(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="ts"></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  ({ ToolStrip } = await import('../../studio/components/toolStrip.js'));
});

describe('ToolStrip', () => {
  it('renders all tool buttons', () => {
    const el = document.getElementById('ts');
    const ts = new ToolStrip(el, { onToolChange: () => {} });
    const btns = el.querySelectorAll('.tool-btn');
    assert.ok(btns.length >= 6);
  });

  it('highlights active tool', () => {
    const el = document.getElementById('ts');
    const ts = new ToolStrip(el, { onToolChange: () => {} });
    ts.setActive('marker');
    const active = el.querySelector('.tool-btn.active');
    assert.ok(active);
    assert.equal(active.dataset.tool, 'marker');
  });

  it('fires onToolChange on click', () => {
    const el = document.getElementById('ts');
    let changed = null;
    const ts = new ToolStrip(el, { onToolChange: (t) => { changed = t; } });
    const markerBtn = el.querySelector('[data-tool="marker"]');
    markerBtn.click();
    assert.equal(changed, 'marker');
  });
});
