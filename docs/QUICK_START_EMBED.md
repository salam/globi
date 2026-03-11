# Quick Start: Embed the Globe

This guide shows how to place the globe on any website.

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
      globe-viewer { width: 100vw; height: 100vh; display: block; }
    </style>
  </head>
  <body>
    <globe-viewer id="world" language="en" planet="earth"></globe-viewer>

    <script type="module">
      import { registerGlobeViewer } from './src/index.js';
      registerGlobeViewer();

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

Viewer UI options:
- `setViewerUi({ controlStyle: 'text' })` or `setViewerUi({ controlStyle: 'icon' })`
- `setViewerUi({ showBodySelector: false, showFullscreenButton: false })`
- `setViewerUi({ showLegendButton: true, showInspectButton: true, showCompass: true, showScale: true })`
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

## 5) Notes
- The current renderer is dependency-free and lightweight.
- It supports textured planet backgrounds and marker image assets.
- OSM PBF and Shapefile direct import are planned, not fully integrated yet.
