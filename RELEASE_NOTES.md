## Release 1.4 (Mon, Mar 2 14:00)

- Fixed earth surface texture to be properly projected onto the sphere surface with correct rotation, occlusion, and spherical distortion (BUG4).

## Release 1.3 (Mon, Mar 2 02:59)

- Updated all built-in example scenes to always include full landmass shapes.
- Added a low-resolution NASA Earth texture to all built-in examples.
- Improved globe rendering so `planet.textureUri` is visibly drawn on the sphere.
- Added `text` marker visual type so labels can be rendered directly on the globe.
- Updated the ISS example to show historical dot markers with timestamp tooltip text from sampled API positions.
- Added a bottom-right north arrow compass and dynamic kilometer scale overlay in the globe viewer.
- Updated legend marker selection to animate camera rotation/pan to the selected location.
- Added idle slow globe rotation that follows the selected body rotation direction/speed.
- Reduced default initial globe framing so the planet uses 90% of the container (improves control/HUD visibility).
- Added editor `Viewer UI` controls to choose visible on-globe controls and switch button labels between text/icons.
- Updated the aircraft carriers example to use a source-backed AIS snapshot with region-based coordinates (not homeports), plus embedded links to MarineVesselTraffic, GoNavy, CruisingEarth, VesselFinder, and MarineTraffic.
- Updated Viewer UI editor toggles to apply immediately in the globe preview (instant hide/show and label-style updates).
- Fixed compass HUD visibility handling and made Viewer UI editor controls respond reliably on both `input` and `change` events.
- Updated the compass HUD to an arrow-only north indicator (removed the spherical compass ornament).
- Added stricter example-loader test coverage to enforce landmass shapes across all built-in examples for easier planet orientation.

## Release 1.2 (Sun, Mar 1 11:39)

- Added a full globe runtime with a reusable `<globe-viewer>` web component.
- Added scene schema validation, migration, and localization-ready content fields.
- Added marker, path, arc, and region rendering with keyboard, drag, zoom, and fullscreen support.
- Added animation keyframe engine with loop support.
- Added editor app for creating and previewing markers, arcs, paths, regions, and animations.
- Added JSON/GeoJSON import/export plus OBJ export and USDZ placeholder export contract.
- Added security sanitization for callout HTML.
- Added automated lint and unit tests for schema, geometry, animation, store, IO, and controller behavior.
- Added quick-start guides and FAQ documentation for embedders and content creators.
- Added inspect mode in the globe viewer for click-to-select editing.
- Added inline inspector panel in the editor for immediate live updates of markers, arcs, paths, and regions.
- Added built-in celestial presets with Earth as the default baseline.
- Added quick toggle support for all 8 planets and 5 popular moons.
- Added OSM Nominatim prose place lookup to search and drop marker pins.
- Fixed globe rendering to use a true orthographic spherical projection (front hemisphere culling and globe shading) instead of a flat map-like render.
- Replaced mesh-style sphere rendering with smoother non-glare sphere shading.
- Updated legend/key entries to display marker-style colored symbols (dot, square, triangle) matching marker appearance.
- Added automatic dot marker color assignment with a 10-color color-blind-safe palette and shade variants after 10 markers.
- Fixed inspect/callout panel alignment by anchoring it to the selected marker position and keeping it aligned while panning/zooming.
- Added optional sun-position-based sphere lighting mode with an editor toggle.
- Added one-click example scene loader with 5 presets (capitals, continents+seas, ISS live, and open-source conflict/carrier context layers).
