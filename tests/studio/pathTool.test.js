import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PathTool } from '../../studio/tools/pathTool.js';

describe('PathTool', () => {
  it('creates path after multiple clicks + finish', () => {
    let created = null;
    let clickCount = 0;
    const points = [{ lat: 0, lon: 0 }, { lat: 10, lon: 10 }, { lat: 20, lon: 20 }];
    const fakeController = { screenToLatLon: () => points[clickCount++] };
    const tool = new PathTool({ controller: fakeController, onPlace: (p) => { created = p; } });
    tool.handleClick({ clientX: 0, clientY: 0 });
    tool.handleClick({ clientX: 0, clientY: 0 });
    tool.handleClick({ clientX: 0, clientY: 0 });
    tool.finish();
    assert.ok(created);
    assert.equal(created.points.length, 3);
  });

  it('ignores finish with fewer than 2 points', () => {
    let created = null;
    const fakeController = { screenToLatLon: () => ({ lat: 0, lon: 0 }) };
    const tool = new PathTool({ controller: fakeController, onPlace: (p) => { created = p; } });
    tool.handleClick({ clientX: 0, clientY: 0 });
    tool.finish();
    assert.equal(created, null);
  });
});
