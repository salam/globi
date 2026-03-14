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

  it('uses CSS class names matching styles.css', () => {
    const el = document.getElementById('props');
    const panel = new PropertiesPanel(el, {
      scene: { theme: 'photo', planet: { id: 'earth' }, projection: 'globe', locale: 'en' },
      selectedIds: [], locale: 'en', onChange: () => {},
    });
    panel.render();
    assert.ok(el.querySelector('.field-label'), 'should use field-label class');
    assert.ok(el.querySelector('.field-input') || el.querySelector('.field-select'), 'should use field-input or field-select class');
    assert.ok(el.querySelector('.field'), 'should use field class for rows');
  });

  it('renders theme as a select with valid values', () => {
    const el = document.getElementById('props');
    const panel = new PropertiesPanel(el, {
      scene: { theme: 'photo', planet: { id: 'earth' }, projection: 'globe', locale: 'en' },
      selectedIds: [], locale: 'en', onChange: () => {},
    });
    panel.render();
    const themeSelect = el.querySelector('select[data-field="theme"]');
    assert.ok(themeSelect, 'theme should be a select');
    assert.equal(themeSelect.value, 'photo');
    assert.equal(themeSelect.options.length, 5);
  });

  it('renders projection as a select with valid values', () => {
    const el = document.getElementById('props');
    const panel = new PropertiesPanel(el, {
      scene: { theme: 'photo', planet: { id: 'earth' }, projection: 'globe', locale: 'en' },
      selectedIds: [], locale: 'en', onChange: () => {},
    });
    panel.render();
    const projSelect = el.querySelector('select[data-field="projection"]');
    assert.ok(projSelect);
    assert.equal(projSelect.value, 'globe');
    const values = [...projSelect.options].map(o => o.value);
    assert.deepEqual(values, ['globe', 'azimuthalEquidistant', 'orthographic', 'equirectangular']);
  });

  it('renders body as a select with celestial preset IDs', () => {
    const el = document.getElementById('props');
    const panel = new PropertiesPanel(el, {
      scene: { theme: 'photo', planet: { id: 'mars' }, projection: 'globe', locale: 'en' },
      selectedIds: [], locale: 'en', onChange: () => {},
    });
    panel.render();
    const bodySelect = el.querySelector('select[data-field="planet.id"]');
    assert.ok(bodySelect);
    assert.equal(bodySelect.value, 'mars');
  });

  it('renders lightingMode as a select with fixed and sun', () => {
    const el = document.getElementById('props');
    const panel = new PropertiesPanel(el, {
      scene: { theme: 'photo', planet: { id: 'earth', lightingMode: 'fixed', showBorders: true, showLabels: true }, projection: 'globe', locale: 'en' },
      selectedIds: [], locale: 'en', onChange: () => {},
    });
    panel.render();
    const lightSelect = el.querySelector('select[data-field="planet.lightingMode"]');
    assert.ok(lightSelect);
    assert.deepEqual([...lightSelect.options].map(o => o.value), ['fixed', 'sun']);
  });

  it('renders showBorders as a checkbox', () => {
    const el = document.getElementById('props');
    const panel = new PropertiesPanel(el, {
      scene: { theme: 'photo', planet: { id: 'earth', lightingMode: 'fixed', showBorders: true, showLabels: false }, projection: 'globe', locale: 'en' },
      selectedIds: [], locale: 'en', onChange: () => {},
    });
    panel.render();
    const checkbox = el.querySelector('input[type="checkbox"][data-field="planet.showBorders"]');
    assert.ok(checkbox);
    assert.equal(checkbox.checked, true);
  });

  it('renders surfaceTint as a color picker', () => {
    const el = document.getElementById('props');
    const panel = new PropertiesPanel(el, {
      scene: { theme: 'photo', planet: { id: 'earth' }, projection: 'globe', locale: 'en', surfaceTint: '#ff0000' },
      selectedIds: [], locale: 'en', onChange: () => {},
    });
    panel.render();
    const colorInput = el.querySelector('input[type="color"][data-field="surfaceTint"]');
    assert.ok(colorInput);
    assert.equal(colorInput.value, '#ff0000');
  });
});
