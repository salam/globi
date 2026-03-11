# Quick Start: Content Creator Workflow

This guide is for people who create map stories and educational scenes.

## 1) Start the editor
From the project root:

```bash
npm run serve:editor
```

Then open:
- `http://localhost:4173/editor/`

## 2) Build your scene
Use the left panel in this order:
1. Choose `Celestial body` (defaults to Earth)
2. Add markers (places, people, events, or text labels on the globe)
3. Add arcs (connections between two places)
4. Add paths (multi-point routes)
5. Add regions (GeoJSON polygons)
6. Add animations (keyframe JSON)

You can switch language using the locale selector.

## 2a) Load ready-made examples
- Open `Load Example Scene`.
- Pick a preset and click `Load Example`.
- Every built-in example includes full landmass shapes and a low-res NASA Earth texture.
- Included presets:
- `All Capitals`
- `Continents + Seas`
- `ISS Real-Time Position + Orbit` (includes timestamped history dots)
- `Ukraine Conflict (Open Sources)` (non-tactical context layer)
- `Aircraft Carriers (Open Sources)` (source-backed AIS region snapshot with non-tactical context)
- Aircraft carrier sources used in this preset:
- `https://www.marinevesseltraffic.com/navy-ships/US%20Aircraft%20Carriers%20Location%20Tracker`
- `http://www.gonavy.jp/CVLocation.html`
- `https://www.cruisingearth.com/military-ship-tracker/aircraft-carriers/`
- `https://www.vesselfinder.com/`
- `https://www.marinetraffic.com/en/ais/home/centerx:-12.0/centery:25.0/zoom:4`

## 2c) Drop pins from place names (OSM Nominatim)
- Open `Geo Lookup (OSM Nominatim)`.
- Type a prose place name, for example: `Zurich HB, Switzerland`.
- Click `Search Places`.
- Choose a result and click `Drop Pin`.
- The new marker is added to the scene and focused on the globe.

## 2d) Automatic dot colors (color-blind safe)
- If you add a `dot` marker without a color, the system auto-assigns one.
- The first 10 colors come from a color-blind-safe base palette.
- After 10 dots, new dots use shade variants of those same base colors.
- If you choose marker visual type `text`, the marker name is rendered as on-globe label text.

## 2e) Optional sun-position lighting
- Turn on `Use sun position for sphere lighting` to light the globe from the real-time sun direction.
- Turn it off to use the fixed studio light.
- This setting is saved in scene data as `planet.lightingMode`.

## 2f) Compass and km scale
- The viewer shows a small arrow-only compass in the bottom-right corner, and the arrow points to north.
- The same HUD shows a dynamic distance scale in kilometers based on zoom level.
- The globe also idles with a slow rotation based on the selected celestial body's axis rotation direction.
- Initial framing leaves a small UI margin: planet diameter starts at about 90% of the available stage size.

## 2g) Configure the viewer controls
- Open `Viewer UI` in the editor.
- Choose `Button labels` as `Text` or `Icons`.
- Toggle which on-globe controls are visible:
- Body selector
- Fullscreen button
- Legend button
- Inspect button
- Compass
- Kilometer scale
- Changes apply immediately in the globe preview as soon as you toggle/select them.
- These settings are saved as `scene.viewerUi` and exported with the scene JSON.

## 2b) Use Inspect mode for instant editing
- Keep `Inspect mode on click` enabled.
- Click any marker, path, arc, or region directly on the globe.
- The inspect panel opens near the clicked object.
- For markers, the panel stays anchored to the marker position while you pan/zoom.
- Changes are applied live while you type.
- Clicking a marker entry in the legend/key now animates the camera to that location.

## 3) Export your work
Buttons in the Data section:
- `Export JSON` for full project data
- `Export GeoJSON` for GIS workflows
- `Export OBJ` for 3D tool handoff
- `Export USDZ Placeholder` for future USDZ pipelines

## 4) Import existing data
- Paste JSON scene data and click `Import JSON`
- Paste GeoJSON and click `Import GeoJSON`

## 5) Tips for clean projects
- Keep IDs short and stable (example: `route-zrh-nyc`)
- Use one category style per story type
- Keep long descriptions in `description` and short labels in `name`

## 6) Current limits
- Direct OSM PBF and Shapefile parsing are not wired in yet.
- USDZ output is currently a placeholder package for pipeline integration.
