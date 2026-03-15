# Screenshot & Thumbnail Capture — Design Spec

**Date:** 2026-03-15
**Status:** Approved

## Overview

Add a `captureScreenshot()` API to `<globi-viewer>` that produces a clean image of the globe (sphere, markers, arcs, paths, regions, background) with all HUD elements hidden. Two consumers:

1. **Context menu "Copy as Image"** — captures at native viewport dimensions, copies to clipboard
2. **Community platform auto-thumbnail** — captures at 1200×630 with 15% zoom-out padding when saving a globe without a manual thumbnail

## 1. `captureScreenshot(options?)` on `<globi-viewer>`

### Signature

```js
async captureScreenshot({ width, height, padding, format, quality } = {}) → Promise<Blob>
```

### Parameters

| Param | Default | Description |
|-------|---------|-------------|
| `width` | viewer's current width | Output width in pixels |
| `height` | viewer's current height | Output height in pixels |
| `padding` | `0` | Camera zoom-out factor (0.15 = 15% extra space around globe) |
| `format` | `'image/png'` | MIME type |
| `quality` | `0.92` | JPEG quality (ignored for PNG) |

### Capture Flow

1. Save current camera distance from `GlobeController`
2. If `padding > 0`, multiply camera distance by `1 + padding`
3. Create a temporary `WebGLRenderer` with `preserveDrawingBuffer: true` at target `width × height`
4. Render the existing Three.js scene to the temporary renderer (reuses scene graph — no texture reload)
5. `canvas.toBlob()` → resolve with Blob
6. Dispose the temporary renderer
7. Restore camera distance

### What Gets Captured

- Globe sphere, atmosphere, rings
- Markers, arcs, paths, regions
- Landmasses, borders, graticule
- Background (matches current theme)

### What's Excluded

- All shadow DOM HUD elements (controls, legend, nav-hud, attribution, loading-indicator)
- CSS2D overlays (callouts, geo-labels) — they're DOM-based, not part of WebGL scene

## 2. Context Menu — "Copy as Image"

Add `{ label: 'Copy as image', action: 'copyAsImage' }` to `buildMenuItems()` in `src/accessibility/contextMenu.js`, after "Copy coordinates" and before the separator.

**Action handler** in `globi-viewer.js`:
- Call `captureScreenshot()` with no options (native viewport dimensions, no padding)
- Write Blob to clipboard via `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`
- On clipboard failure, fall back to file download (`<a download="globi-screenshot.png">`)

## 3. Community Platform — Auto-Thumbnail on Save

**Trigger:** User clicks Save/Publish on Create/Edit page with no manual thumbnail set.

**Flow:**
1. Call `viewerEl.captureScreenshot({ width: 1200, height: 630, padding: 0.15 })`
2. Show captured thumbnail as a small preview with a "Retake" button
3. User can reframe the globe and click "Retake" to re-capture
4. Upload Blob as the `thumbnail` file field to PocketBase

**Dependency:** Requires `scene-loaded` event so the community page knows when the globe is ready.

## 4. `scene-loaded` Event

New `CustomEvent` dispatched from `<globi-viewer>` when:
- The active renderer has loaded textures
- At least one frame has rendered (after `#dirty` is cleared post-render)

The `GlobiViewer.jsx` component already listens for this event.

## 5. Error Handling

- WebGL context creation failure for temp renderer → reject Promise with descriptive error
- Clipboard write failure → fall back to file download
- Community page: if `captureScreenshot` rejects → skip thumbnail, let user upload manually

## Files to Modify

| File | Change |
|------|--------|
| `src/renderer/threeGlobeRenderer.js` | Add `captureScreenshot()` method using temporary offscreen renderer |
| `src/controller/globeController.js` | Expose `captureScreenshot()` by delegating to active renderer |
| `src/components/globi-viewer.js` | Expose `captureScreenshot()` as public method; dispatch `scene-loaded` event |
| `src/accessibility/contextMenu.js` | Add "Copy as image" menu item |
| `globi-community/src/pages/Create.jsx` | Auto-capture thumbnail on save, show preview with retake |
| `globi-community/src/components/GlobiViewer.jsx` | Wire up `onSceneLoaded` callback |
