# Quick Start: Embed the Globe

This guide shows how to place the globe on any website.

## 0) Install or load from CDN

**Option A — npm install** (for projects with a bundler):

```bash
npm install globi-viewer
```

Then import in your JavaScript:

```js
import { registerGlobiViewer } from 'globi-viewer';
registerGlobiViewer();
```

**Option B — unpkg CDN** (zero build step, just a `<script>` tag):

```html
<script type="module" src="https://unpkg.com/globi-viewer/dist/globi.min.js"></script>
```

This auto-registers the `<globi-viewer>` web component. No imports needed.

The unminified build and source map are also available:

- `https://unpkg.com/globi-viewer/dist/globi.js`
- `https://unpkg.com/globi-viewer/dist/globi.js.map`

## 1) Add a container page
Create an HTML file and load the component code.

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Globe Embed</title>
    <style>
      body { margin: 0; font-family: sans-serif; }
      globi-viewer { width: 100vw; height: 100vh; display: block; }
    </style>
  </head>
  <body>
    <!-- Option A: unpkg CDN (simplest) -->
    <script type="module" src="https://unpkg.com/globi-viewer/dist/globi.min.js"></script>

    <globi-viewer id="world" language="en" planet="earth"></globi-viewer>

    <script type="module">
      // If using npm/bundler instead of CDN, uncomment these lines:
      // import { registerGlobiViewer } from 'globi-viewer';
      // registerGlobiViewer();

      const world = document.getElementById('world');
      world.setPlanetPreset('earth'); // default if omitted
      world.setMarkers([
        {
          id: 'zurich',
          name: { en: 'Zurich', de: 'Zurich' },
          description: { en: 'Example marker' },
          lat: 47.3769,
          lon: 8.5417,
          alt: 0,
          visualType: 'dot'
        },
        {
          id: 'zurich-label',
          name: { en: 'Zurich' },
          lat: 47.3769,
          lon: 8.5417,
          alt: 0,
          visualType: 'text',
          color: '#ffffff'
        }
      ]);
    </script>
  </body>
</html>
```

## 2) Add more data
You can set these layers:
- `setMarkers([...])`
- `setPaths([...])`
- `setArcs([...])`
- `setRegions([...])`
- `setAnimations([...])`

You can also switch between built-in celestial presets:
- `setPlanetPreset('earth')`
- `setPlanetPreset('mars')`
- `setPlanetPreset('moon')`

Optional lighting mode:
- `setPlanet({ id: 'earth', lightingMode: 'sun' })` for sun-position-based lighting
- `setPlanet({ id: 'earth', lightingMode: 'fixed' })` for fixed studio lighting

Flat map projection mode:

- `<globi-viewer projection="azimuthalEquidistant">` starts in flat map mode
- Available projections: `globe` (default), `azimuthalEquidistant`, `orthographic`, `equirectangular`
- Or set programmatically via scene JSON: `{ projection: 'azimuthalEquidistant' }`
- A toggle button in the toolbar switches between globe and flat map

Viewer UI options:
- `setViewerUi({ controlStyle: 'text' })` or `setViewerUi({ controlStyle: 'icon' })`
- `setViewerUi({ showBodySelector: false, showFullscreenButton: false })`
- `setViewerUi({ showLegendButton: true, showInspectButton: true, showCompass: true, showScale: true })`
- `setViewerUi({ showProjectionToggle: false })` hides the globe/map toggle button
- These values are also part of scene JSON at `viewerUi`.

Available built-ins:
- Planets: `mercury`, `venus`, `earth`, `mars`, `jupiter`, `saturn`, `uranus`, `neptune`
- Moons: `moon`, `io`, `europa`, `ganymede`, `titan`

If you want prose geocoding in your own UI, use:
- `geocodePlaceName('Zurich HB, Switzerland')`
- `createMarkerFromGeocode(result, { locale: 'en' })`

If you want prebuilt demo scenes in your own UI, use:
- `listExampleDefinitions()`
- `loadExampleScene('all-capitals')`
- All built-in examples include full landmass shapes (orientation aid) and a low-res NASA Earth texture.

## 3) Listen to events
Use browser events from the component:
- `sceneChange`
- `markerClick`
- `keyboardNavigate`

Example:

```js
world.addEventListener('markerClick', (event) => {
  console.log('Selected marker:', event.detail.id);
});
```

## 4) Keyboard and mouse controls
- Drag: rotate/pan view
- Mouse wheel: zoom
- Arrow keys: move view
- `+` / `-`: zoom
- Fullscreen button: enter/exit fullscreen
- Initial framing: planet diameter uses about 90% of the container's smaller dimension (leaves room for controls/HUD).
- Legend entries show marker-style symbols (dot/square/triangle) with marker color.
- Clicking a legend entry animates camera rotation/pan to that marker.
- Bottom-right HUD shows a north-pointing arrow compass and a dynamic scale bar in kilometers.
- Globe idles with a slow self-rotation (uses the selected planet preset rotation direction/speed).

## 5) Agent API (`window.globi`)

Every `<globi-viewer>` exposes a `window.globi` JavaScript API for programmatic and AI-agent control.

```js
// Read
window.globi.state()          // { lat, lon, zoom, projection, theme, body }
window.globi.scene()          // full scene object
window.globi.visible()        // currently visible markers, arcs, paths, regions
window.globi.describe('brief') // human-readable view description
window.globi.llmsTxt()        // structured plain-text for LLM consumption
window.globi.help()           // full capability manifest

// Navigate
window.globi.flyTo(47.37, 8.54, 2.5)
window.globi.setProjection('equirectangular')
window.globi.rotate(5, 10)

// Mutate
window.globi.addMarker({ name: 'New', lat: 48.8, lon: 2.35 })
window.globi.removeMarker('m1')
window.globi.updateMarker('m1', { category: 'highlight' })

// Export
window.globi.export('json', 'visible')  // or 'geojson', 'obj', 'full'

// UI
window.globi.setTheme('wireframe-shaded')
window.globi.toggleLegend()
```

Multiple viewers: `window.globiAll` is an array of all active viewer APIs. Each viewer element also has a `.globi` property.

The host element includes `data-globi-*` attributes (`data-globi-role`, `data-globi-body`, `data-globi-projection`, `data-globi-zoom`, `data-globi-marker-count`, `data-globi-actions`) for AI agent discoverability.

## 6) Context menu

Right-click (or long-press on mobile, Shift+F10 on keyboard) anywhere on the viewer to access:

- Export (GeoJSON, JSON, OBJ) for visible or full scene
- Copy coordinates, view description, or LLMs.txt
- Drop a new marker at the clicked point
- Inspect a marker or region under the cursor

## 7) Notes
- The current renderer is dependency-free and lightweight.
- It supports textured planet backgrounds and marker image assets.
- OSM PBF and Shapefile direct import are planned, not fully integrated yet.
