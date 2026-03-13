import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let PropertiesPanel, dom;
beforeEach(async () => {
  dom = new JSDOM('<!DOCTYPE html><html><body><div id="props"></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.Event = dom.window.Event;
  ({ PropertiesPanel } = await import('../../studio/components/propertiesPanel.js'));
});

describe('PropertiesPanel', () => {
  it('shows scene settings when nothing selected', () => {
    const el = document.getElementById('props');
    const panel = new PropertiesPanel(el, {
      scene: { theme: 'photo', planet: { id: 'earth' }, projection: 'globe', locale: 'en' },
      selectedIds: [],
      locale: 'en',
      onChange: () => {},
    });
    panel.render();
    assert.ok(el.textContent.includes('Scene') || el.querySelector('.props-header'));
  });

  it('shows marker fields when marker selected', () => {
    const el = document.getElementById('props');
    const panel = new PropertiesPanel(el, {
      scene: {
        markers: [{ id: 'm1', name: { en: 'Berlin' }, lat: 52.52, lon: 13.405, color: '#ff0000', visualType: 'dot', calloutMode: 'hover' }],
        arcs: [], paths: [], regions: [],
      },
      selectedIds: ['m1'],
      locale: 'en',
      onChange: () => {},
    });
    panel.render();
    const nameInput = el.querySelector('[data-field="name"]');
    assert.ok(nameInput);
  });

  it('fires onChange when field is edited', () => {
    const el = document.getElementById('props');
    let change = null;
    const panel = new PropertiesPanel(el, {
      scene: {
        markers: [{ id: 'm1', name: { en: 'Berlin' }, lat: 52.52, lon: 13.405, color: '#ff0000', visualType: 'dot', calloutMode: 'hover' }],
        arcs: [], paths: [], regions: [],
      },
      selectedIds: ['m1'],
      locale: 'en',
      onChange: (entityType, id, field, value) => { change = { entityType, id, field, value }; },
    });
    panel.render();
    const nameInput = el.querySelector('[data-field="name"]');
    nameInput.value = 'Munich';
    nameInput.dispatchEvent(new Event('change'));
    assert.ok(change);
    assert.equal(change.field, 'name');
    assert.equal(change.value, 'Munich');
  });
});
