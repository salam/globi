# Globi — Agent Interaction Guide

## Overview

Globi is an interactive 3D globe web component. This guide explains how AI agents can create, modify, and interact with Globi scenes programmatically.

## Creating a Scene

A Globi scene is a JSON object. Minimal example:

```json
{
  "version": 1,
  "locale": "en",
  "theme": "photo",
  "planet": { "body": "earth" },
  "markers": [
    {
      "id": "paris",
      "name": { "en": "Paris" },
      "lat": 48.8566,
      "lon": 2.3522,
      "visualType": "dot",
      "color": "#3b82f6",
      "calloutMode": "always",
      "calloutLabel": { "en": "Paris" }
    }
  ],
  "paths": [],
  "arcs": [],
  "regions": []
}
```

## Embedding

```html
<script type="module">
  import { registerGlobiViewer } from './src/components/globi-viewer.js';
  registerGlobiViewer();
</script>
<globi-viewer id="viewer"></globi-viewer>
<script type="module">
  const viewer = document.getElementById('viewer');
  viewer.setScene(myScene);
</script>
```

## Programmatic Control

After the viewer is initialized, use these methods:

### Navigation
- `viewer.flyTo({ lat, lon }, { zoom, durationMs })` — Animate camera to position
- Camera zoom range: 0.5 (far) to 8 (close)

### Entity Management
- `viewer.setScene(sceneObject)` — Load a complete scene
- `viewer.setMarkers(markersArray)` — Replace all markers
- Markers, paths, arcs, and regions are set via the scene object

### Agent API (window.globi)
When a viewer is on the page, `window.globi` exposes:
- `window.globi.flyTo(lat, lon, zoom)` — Navigate
- `window.globi.getScene()` — Get current scene JSON
- `window.globi.setMarkers(markers)` — Set markers
- `window.globi.getVisibleMarkers()` — Get markers in current viewport
- `window.globi.search(query)` — Search markers
- `window.globi.setTheme(name)` — Switch theme
- `window.globi.setProjection(name)` — Switch projection

### Available Themes
- `photo` — Photo-realistic with day/night textures
- `wireframe-shaded` — Black-and-white wireframe
- `wireframe-flat` — Flat wireframe
- `grayscale-shaded` — Desaturated cartographic
- `grayscale-flat` — Flat grayscale

### Available Projections
- `globe` — 3D sphere (default)
- `flat-equirectangular` — Flat map
- `flat-azimuthal` — Azimuthal equidistant
- `flat-orthographic` — Orthographic

### Available Celestial Bodies
earth, moon, mars, mercury, venus, jupiter, saturn, uranus, neptune, io, europa, ganymede, titan

## Common Tasks

### Add a marker at a location
```javascript
const scene = window.globi.getScene();
scene.markers.push({
  id: 'new-marker',
  name: { en: 'New Location' },
  lat: 51.5074,
  lon: -0.1278,
  visualType: 'dot',
  color: '#ef4444',
  calloutMode: 'always',
  calloutLabel: { en: 'London' }
});
window.globi.setMarkers(scene.markers);
```

### Draw a path between two points
```javascript
const scene = window.globi.getScene();
scene.paths.push({
  id: 'my-path',
  name: { en: 'Route' },
  points: [
    { lat: 48.86, lon: 2.35 },
    { lat: 51.51, lon: -0.13 }
  ],
  color: '#3b82f6',
  strokeWidth: 2
});
viewer.setScene(scene);
```

### Create a scrollytelling experience
Use IntersectionObserver on narrative elements, call `viewer.flyTo()` and `viewer.setScene()` when each step enters the viewport. See the Battle of Midway example for a complete implementation.

## Entity ID Rules
- Must match: `/^[a-zA-Z0-9_-]{1,128}$/`
- Must be unique within the scene

## Data Attribution
Add sources to `dataSources[]` and reference via `sourceId` on markers, paths, arcs, and regions. The viewer displays attributed sources automatically.
