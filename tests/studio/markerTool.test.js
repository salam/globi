import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MarkerTool } from '../../studio/tools/markerTool.js';

describe('MarkerTool', () => {
  it('creates a marker at clicked position', () => {
    let created = null;
    const fakeController = { screenToLatLon: () => ({ lat: 47.3769, lon: 8.5417 }) };
    const tool = new MarkerTool({ controller: fakeController, onPlace: (marker) => { created = marker; } });
    tool.handleClick({ clientX: 200, clientY: 200 });
    assert.ok(created);
    assert.equal(created.lat, 47.3769);
    assert.equal(created.lon, 8.5417);
    assert.ok(created.id);
  });

  it('does nothing when click misses the globe', () => {
    let created = null;
    const fakeController = { screenToLatLon: () => null };
    const tool = new MarkerTool({ controller: fakeController, onPlace: (m) => { created = m; } });
    tool.handleClick({ clientX: 0, clientY: 0 });
    assert.equal(created, null);
  });
});
