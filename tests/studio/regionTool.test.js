import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RegionTool } from '../../studio/tools/regionTool.js';

describe('RegionTool', () => {
  it('creates GeoJSON polygon with lon/lat ordering', () => {
    let created = null;
    let clickCount = 0;
    const points = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    const fakeController = { screenToLatLon: () => points[clickCount++] };
    const tool = new RegionTool({ controller: fakeController, onPlace: (r) => { created = r; } });
    tool.handleClick({});
    tool.handleClick({});
    tool.handleClick({});
    tool.finish();
    assert.ok(created);
    const coords = created.geojson.coordinates[0];
    assert.deepEqual(coords[0], [20, 10]);
    assert.deepEqual(coords[1], [40, 30]);
    assert.deepEqual(coords[2], [60, 50]);
    assert.deepEqual(coords[3], [20, 10]); // closed ring
  });

  it('requires at least 3 points', () => {
    let created = null;
    let clickCount = 0;
    const fakeController = { screenToLatLon: () => ({ lat: clickCount, lon: clickCount++ }) };
    const tool = new RegionTool({ controller: fakeController, onPlace: (r) => { created = r; } });
    tool.handleClick({});
    tool.handleClick({});
    tool.finish();
    assert.equal(created, null);
  });
});
