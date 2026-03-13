import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildMenuItems } from '../../src/accessibility/contextMenu.js';

describe('contextMenu Open Studio', () => {
  it('includes Open Studio item at the top level', () => {
    const items = buildMenuItems({ entityAtPoint: null, latLon: { lat: 0, lon: 0 } });
    const studioItem = items.find(i => i.action === 'openStudio');
    assert.ok(studioItem, 'Open Studio item should exist');
    assert.equal(studioItem.label, 'Open Studio');
  });

  it('includes Open Studio even when entity is present', () => {
    const items = buildMenuItems({
      entityAtPoint: { kind: 'marker', id: 'm1' },
      latLon: { lat: 10, lon: 20 },
    });
    const studioItem = items.find(i => i.action === 'openStudio');
    assert.ok(studioItem);
  });
});
