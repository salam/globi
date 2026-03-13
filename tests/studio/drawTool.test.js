import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DrawTool, simplifyRDP } from '../../studio/tools/drawTool.js';

describe('simplifyRDP', () => {
  it('removes collinear points', () => {
    const points = [{ lat: 0, lon: 0 }, { lat: 1, lon: 1 }, { lat: 2, lon: 2 }, { lat: 3, lon: 3 }];
    const result = simplifyRDP(points, 0.1);
    assert.equal(result.length, 2);
    assert.deepEqual(result[0], { lat: 0, lon: 0 });
    assert.deepEqual(result[1], { lat: 3, lon: 3 });
  });

  it('preserves sharp turns', () => {
    const points = [{ lat: 0, lon: 0 }, { lat: 5, lon: 0 }, { lat: 5, lon: 5 }];
    const result = simplifyRDP(points, 0.1);
    assert.equal(result.length, 3);
  });

  it('returns input for 2 or fewer points', () => {
    const points = [{ lat: 0, lon: 0 }];
    assert.deepEqual(simplifyRDP(points, 0.1), points);
  });
});

describe('DrawTool point-to-point mode', () => {
  it('toggles between freehand and point-to-point', () => {
    const fakeController = { screenToLatLon: () => ({ lat: 0, lon: 0 }) };
    const tool = new DrawTool({ controller: fakeController, onPlace: () => {} });
    assert.equal(tool.mode, 'freehand');
    tool.toggleMode();
    assert.equal(tool.mode, 'point-to-point');
    tool.toggleMode();
    assert.equal(tool.mode, 'freehand');
  });

  it('in point-to-point mode, clicks add waypoints like PathTool', () => {
    let created = null;
    let count = 0;
    const pts = [{ lat: 0, lon: 0 }, { lat: 10, lon: 10 }, { lat: 20, lon: 20 }];
    const fakeController = { screenToLatLon: () => pts[count++] };
    const tool = new DrawTool({ controller: fakeController, onPlace: (p) => { created = p; } });
    tool.toggleMode();
    tool.handleClick({});
    tool.handleClick({});
    tool.handleClick({});
    tool.finish();
    assert.ok(created);
    assert.equal(created.points.length, 3);
  });
});

describe('DrawTool', () => {
  it('collects points during drag and creates path on finish', () => {
    let created = null;
    let moveCount = 0;
    const positions = [
      { lat: 0, lon: 0 }, { lat: 1, lon: 0 }, { lat: 2, lon: 0 },
      { lat: 3, lon: 5 }, { lat: 4, lon: 5 },
    ];
    const fakeController = { screenToLatLon: () => positions[moveCount++] };
    const tool = new DrawTool({ controller: fakeController, onPlace: (p) => { created = p; } });
    tool.handleMouseDown({ clientX: 0, clientY: 0 });
    for (let i = 1; i < positions.length; i++) {
      tool.handleMouseMove({ clientX: i, clientY: i });
    }
    tool.handleMouseUp({});
    assert.ok(created);
    assert.ok(created.points.length >= 2);
    assert.ok(created.points.length <= positions.length);
  });
});
