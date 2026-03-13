import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SelectTool } from '../../studio/tools/selectTool.js';

describe('SelectTool', () => {
  it('calls onSelect with hit entity on click', () => {
    let selected = null;
    const fakeController = {
      hitTest: (x, y) => ({ kind: 'marker', id: 'm1' }),
      screenToLatLon: () => ({ lat: 0, lon: 0 }),
    };
    const tool = new SelectTool({
      controller: fakeController,
      onSelect: (entity) => { selected = entity; },
      onDeselect: () => {},
      onMove: () => {},
    });
    tool.handleClick({ clientX: 100, clientY: 100 });
    assert.deepEqual(selected, { kind: 'marker', id: 'm1' });
  });

  it('calls onDeselect when clicking empty space', () => {
    let deselected = false;
    const fakeController = {
      hitTest: () => null,
      screenToLatLon: () => ({ lat: 0, lon: 0 }),
    };
    const tool = new SelectTool({
      controller: fakeController,
      onSelect: () => {},
      onDeselect: () => { deselected = true; },
      onMove: () => {},
    });
    tool.handleClick({ clientX: 100, clientY: 100 });
    assert.equal(deselected, true);
  });
});
