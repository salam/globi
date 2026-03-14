import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let showModal, dom;
beforeEach(async () => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Event = dom.window.Event;
  globalThis.KeyboardEvent = dom.window.KeyboardEvent;
  ({ showModal } = await import('../../studio/components/modal.js'));
});

describe('showModal', () => {
  it('creates overlay on document.body', () => {
    const content = document.createElement('p');
    content.textContent = 'Hello';
    const close = showModal('Test Title', content);
    const overlay = document.querySelector('.modal-overlay');
    assert.ok(overlay, 'overlay should exist');
    assert.ok(overlay.textContent.includes('Test Title'));
    assert.ok(overlay.textContent.includes('Hello'));
    close();
  });

  it('removes overlay on close', () => {
    const content = document.createElement('p');
    const close = showModal('Title', content);
    assert.ok(document.querySelector('.modal-overlay'));
    close();
    assert.ok(!document.querySelector('.modal-overlay'), 'overlay should be removed');
  });

  it('closes on Escape key', () => {
    const content = document.createElement('p');
    showModal('Title', content);
    assert.ok(document.querySelector('.modal-overlay'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    assert.ok(!document.querySelector('.modal-overlay'));
  });
});
