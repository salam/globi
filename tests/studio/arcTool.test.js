import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ArcTool } from '../../studio/tools/arcTool.js';

describe('ArcTool', () => {
  it('creates arc after two clicks', () => {
    let created = null;
    let clickNum = 0;
    const fakeController = {
      screenToLatLon: () => {
        clickNum++;
        return clickNum === 1 ? { lat: 52.52, lon: 13.405 } : { lat: 35.676, lon: 139.65 };
      },
    };
    const tool = new ArcTool({ controller: fakeController, onPlace: (arc) => { created = arc; } });
    tool.handleClick({ clientX: 100, clientY: 100 });
    assert.equal(created, null);
    tool.handleClick({ clientX: 200, clientY: 200 });
    assert.ok(created);
    assert.equal(created.start.lat, 52.52);
    assert.equal(created.end.lat, 35.676);
  });

  it('resets state on deactivate', () => {
    const fakeController = { screenToLatLon: () => ({ lat: 0, lon: 0 }) };
    const tool = new ArcTool({ controller: fakeController, onPlace: () => {} });
    tool.handleClick({ clientX: 100, clientY: 100 });
    tool.deactivate();
    tool.activate();
    let created = null;
    tool._onPlace = (arc) => { created = arc; };
    tool.handleClick({ clientX: 100, clientY: 100 });
    assert.equal(created, null);
  });
});
