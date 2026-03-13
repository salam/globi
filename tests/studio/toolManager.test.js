import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ToolManager } from '../../studio/tools/toolManager.js';

describe('ToolManager', () => {
  it('activates a tool', () => {
    const log = [];
    const fakeTool = {
      activate() { log.push('activate'); },
      deactivate() { log.push('deactivate'); },
    };
    const tm = new ToolManager({ select: fakeTool });
    tm.setActive('select');
    assert.deepEqual(log, ['activate']);
  });

  it('deactivates previous tool when switching', () => {
    const log = [];
    const toolA = {
      activate() { log.push('a-activate'); },
      deactivate() { log.push('a-deactivate'); },
    };
    const toolB = {
      activate() { log.push('b-activate'); },
      deactivate() { log.push('b-deactivate'); },
    };
    const tm = new ToolManager({ a: toolA, b: toolB });
    tm.setActive('a');
    tm.setActive('b');
    assert.deepEqual(log, ['a-activate', 'a-deactivate', 'b-activate']);
  });

  it('returns active tool name', () => {
    const tool = { activate() {}, deactivate() {} };
    const tm = new ToolManager({ select: tool });
    tm.setActive('select');
    assert.equal(tm.activeName, 'select');
  });
});
