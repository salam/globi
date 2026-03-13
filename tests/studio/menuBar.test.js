import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let MenuBar;
beforeEach(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="menu-bar"></div></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.HTMLElement = dom.window.HTMLElement;
  ({ MenuBar } = await import('../../studio/components/menuBar.js'));
});

describe('MenuBar', () => {
  it('renders menu items', () => {
    const el = document.getElementById('menu-bar');
    const mb = new MenuBar(el, { onAction: () => {} });
    const items = el.querySelectorAll('.menu-item');
    assert.ok(items.length >= 5, 'should have File, Edit, View, Tools, Help');
  });

  it('renders preview button', () => {
    const el = document.getElementById('menu-bar');
    const mb = new MenuBar(el, { onAction: () => {} });
    const preview = el.querySelector('.preview-btn');
    assert.ok(preview, 'preview button should exist');
  });

  it('fires action on menu item click', () => {
    const el = document.getElementById('menu-bar');
    let fired = null;
    const mb = new MenuBar(el, { onAction: (action) => { fired = action; } });
    const preview = el.querySelector('.preview-btn');
    preview.click();
    assert.equal(fired, 'togglePreview');
  });
});
