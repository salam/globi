import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let PreviewMode;
beforeEach(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="studio" class="studio"><div id="menu-bar" class="menu-bar"></div><div class="main"><div id="tool-strip" class="tool-strip"></div><div id="viewport" class="viewport"></div><div id="properties" class="properties"></div></div><div id="timeline" class="timeline"></div></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  ({ PreviewMode } = await import('../../studio/components/previewMode.js'));
});

describe('PreviewMode', () => {
  it('hides editor panels on enter', () => {
    const pm = new PreviewMode({
      studioEl: document.getElementById('studio'),
      onEnter: () => {},
      onExit: () => {},
    });
    pm.enter();
    assert.ok(document.getElementById('studio').classList.contains('preview'));
  });

  it('restores panels on exit', () => {
    const pm = new PreviewMode({
      studioEl: document.getElementById('studio'),
      onEnter: () => {},
      onExit: () => {},
    });
    pm.enter();
    pm.exit();
    assert.ok(!document.getElementById('studio').classList.contains('preview'));
  });
});
