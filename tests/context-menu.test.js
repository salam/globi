import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildMenuItems } from '../src/accessibility/contextMenu.js';

describe('buildMenuItems', () => {
  it('returns base items when no entity at point', () => {
    const items = buildMenuItems({ entityAtPoint: null, latLon: { lat: 45, lon: 10 } });
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('Copy coordinates'));
    assert.ok(labels.includes('Copy LLMs.txt'));
    assert.ok(labels.includes('Drop marker here'));
    assert.ok(labels.includes('Fly to center'));
  });

  it('returns marker items when marker at point', () => {
    const marker = { id: 'm1', name: { en: 'Berlin' }, lat: 52.5, lon: 13.4 };
    const items = buildMenuItems({ entityAtPoint: { type: 'marker', entity: marker }, latLon: { lat: 52.5, lon: 13.4 } });
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('Inspect marker'));
    assert.ok(labels.includes('Copy marker info'));
    assert.ok(labels.includes('Fly to marker'));
    assert.ok(!labels.includes('Drop marker here'));
  });

  it('returns region items when region at point', () => {
    const region = { id: 'r1', name: { en: 'EU' } };
    const items = buildMenuItems({ entityAtPoint: { type: 'region', entity: region }, latLon: { lat: 50, lon: 10 } });
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes('Inspect region'));
    assert.ok(labels.includes('Copy region info'));
  });

  it('includes export submenus always', () => {
    const items = buildMenuItems({ entityAtPoint: null, latLon: { lat: 0, lon: 0 } });
    const exportItems = items.filter((i) => i.label.startsWith('Export'));
    assert.ok(exportItems.length >= 2);
  });

  it('includes description submenu always', () => {
    const items = buildMenuItems({ entityAtPoint: null, latLon: { lat: 0, lon: 0 } });
    const descItems = items.filter((i) => i.label.startsWith('Copy description'));
    assert.ok(descItems.length >= 1);
  });
});
