import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let EasingEditor;
beforeEach(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="ee"></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  ({ EasingEditor } = await import('../../studio/components/easingEditor.js'));
});

describe('EasingEditor', () => {
  it('renders preset buttons', () => {
    const el = document.getElementById('ee');
    const ee = new EasingEditor(el, { onSelect: () => {} });
    ee.show();
    const presets = el.querySelectorAll('[data-easing]');
    assert.ok(presets.length >= 6, 'should have linear, ease-in, ease-out, ease-in-out, bounce, elastic');
  });

  it('fires onSelect when preset clicked', () => {
    const el = document.getElementById('ee');
    let selected = null;
    const ee = new EasingEditor(el, { onSelect: (e) => { selected = e; } });
    ee.show();
    el.querySelector('[data-easing="ease-in"]').click();
    assert.equal(selected, 'ease-in');
  });
});
