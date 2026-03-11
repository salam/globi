import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bindControlEvents,
  resolveNavigationHudVisibility,
} from '../src/components/viewerUiInteractions.js';

class FakeControl {
  constructor({ type = 'text', value = '', checked = false } = {}) {
    this.type = type;
    this.value = value;
    this.checked = checked;
    this.listeners = new Map();
  }

  addEventListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
  }

  removeEventListener(type, callback) {
    if (!this.listeners.has(type)) {
      return;
    }
    this.listeners.get(type).delete(callback);
  }

  dispatch(type) {
    const callbacks = this.listeners.get(type);
    if (!callbacks) {
      return;
    }
    for (const callback of callbacks) {
      callback({ type, currentTarget: this });
    }
  }
}

test('BUG3: resolveNavigationHudVisibility keeps compass and HUD visible by default', () => {
  // BUG3
  const visibility = resolveNavigationHudVisibility();

  assert.equal(visibility.showCompass, true);
  assert.equal(visibility.showScale, true);
  assert.equal(visibility.showNavHud, true);
});

test('BUG3: resolveNavigationHudVisibility hides HUD only when both compass and scale are disabled', () => {
  // BUG3
  const visibility = resolveNavigationHudVisibility({
    showCompass: false,
    showScale: false,
  });

  assert.equal(visibility.showCompass, false);
  assert.equal(visibility.showScale, false);
  assert.equal(visibility.showNavHud, false);
});

test('BUG3b: bindControlEvents reacts to change events (not only input)', () => {
  // BUG3b
  const checkbox = new FakeControl({ type: 'checkbox', checked: true });
  let calls = 0;

  const unsubscribe = bindControlEvents(checkbox, () => {
    calls += 1;
  });

  checkbox.checked = false;
  checkbox.dispatch('change');

  assert.equal(calls, 1);

  unsubscribe();
  checkbox.checked = true;
  checkbox.dispatch('change');
  assert.equal(calls, 1);
});

test('BUG3b: bindControlEvents de-duplicates equivalent input+change pair', () => {
  // BUG3b
  const select = new FakeControl({ type: 'select-one', value: 'text' });
  let calls = 0;

  bindControlEvents(select, () => {
    calls += 1;
  });

  select.value = 'icon';
  select.dispatch('input');
  select.dispatch('change');

  assert.equal(calls, 1);
});
