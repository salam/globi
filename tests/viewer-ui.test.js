import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDefaultViewerUiConfig,
  mergeViewerUiConfig,
  VIEWER_CONTROL_STYLE_ICON,
  VIEWER_CONTROL_STYLE_TEXT,
} from '../src/scene/viewerUi.js';

test('mergeViewerUiConfig applies partial patch and keeps existing values', () => {
  const current = {
    ...getDefaultViewerUiConfig(),
    controlStyle: VIEWER_CONTROL_STYLE_TEXT,
    showLegendButton: true,
    showCompass: true,
  };

  const merged = mergeViewerUiConfig(current, {
    controlStyle: VIEWER_CONTROL_STYLE_ICON,
    showLegendButton: false,
  });

  assert.equal(merged.controlStyle, VIEWER_CONTROL_STYLE_ICON);
  assert.equal(merged.showLegendButton, false);
  assert.equal(merged.showCompass, true);
  assert.equal(merged.showScale, true);
});

test('mergeViewerUiConfig falls back to valid defaults for invalid values', () => {
  const merged = mergeViewerUiConfig(
    {
      controlStyle: 'emoji',
      showBodySelector: 'yes',
      showFullscreenButton: false,
    },
    {
      showScale: 'no',
    }
  );

  assert.equal(merged.controlStyle, VIEWER_CONTROL_STYLE_TEXT);
  assert.equal(merged.showBodySelector, true);
  assert.equal(merged.showFullscreenButton, false);
  assert.equal(merged.showScale, true);
});

test('mergeViewerUiConfig ignores non-object patch values', () => {
  const current = {
    ...getDefaultViewerUiConfig(),
    showInspectButton: false,
  };

  const merged = mergeViewerUiConfig(current, null);

  assert.equal(merged.showInspectButton, false);
  assert.equal(merged.controlStyle, VIEWER_CONTROL_STYLE_TEXT);
});
