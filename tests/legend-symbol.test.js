import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeMarkerVisualType,
  getLegendSymbol,
} from '../src/components/legendSymbol.js';

test('normalizeMarkerVisualType supports dot, image, model, text and defaults to dot', () => {
  assert.equal(normalizeMarkerVisualType('dot'), 'dot');
  assert.equal(normalizeMarkerVisualType('image'), 'image');
  assert.equal(normalizeMarkerVisualType('model'), 'model');
  assert.equal(normalizeMarkerVisualType('text'), 'text');
  assert.equal(normalizeMarkerVisualType('something-else'), 'dot');
  assert.equal(normalizeMarkerVisualType(undefined), 'dot');
});

test('getLegendSymbol returns color and shape for dot marker', () => {
  const symbol = getLegendSymbol({ visualType: 'dot', color: '#12ab34' });

  assert.equal(symbol.shape, 'dot');
  assert.equal(symbol.color, '#12ab34');
});

test('getLegendSymbol returns simplified shape for image, model, and text markers', () => {
  const imageSymbol = getLegendSymbol({ visualType: 'image', color: '#2244ff' });
  const modelSymbol = getLegendSymbol({ visualType: 'model', color: '#ff8844' });
  const textSymbol = getLegendSymbol({ visualType: 'text', color: '#ffffff' });

  assert.equal(imageSymbol.shape, 'image');
  assert.equal(imageSymbol.color, '#2244ff');
  assert.equal(modelSymbol.shape, 'model');
  assert.equal(modelSymbol.color, '#ff8844');
  assert.equal(textSymbol.shape, 'text');
  assert.equal(textSymbol.color, '#ffffff');
});
