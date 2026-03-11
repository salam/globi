## Release 2.3 (Tue, Mar 11 23:30)

* Search now dims non-matching legend/key items to 20% opacity instead of leaving them at full brightness
* Matching legend items are shown in bold for quick scanning
* Legend auto-scrolls to the first search hit
* Clicking a dimmed legend item temporarily undims it and its callout for 2 seconds

## Release 2.2 (Wed, Mar 12 03:00)

* Fixed ISS orbit path gap: the trail now connects all the way from the last history sample to the current live position (BUG6)
* Added pulsating ring animation around the current ISS marker for better visibility
* Added a simple procedural 3D ISS model (body + solar panel arrays) that hovers above the dot marker

## Release 2.1 (Tue, Mar 11 23:00)

* Callout labels and leader lines now match each marker's color instead of using a fixed golden color
* Clicking a marker or callout label always opens the inspect popup (no need to enable inspect mode first)
* Compass click resets the globe to its initial position (north at top, centered at lat=0, lon=0)
* Added fulltext search bar: type to filter markers by name, description, or ID; single match flies to and centers the marker; multiple matches hide non-matching callouts

## Release 2.0 (Tue, Mar 11 19:00)

* Upgraded globe rendering from Canvas 2D to Three.js WebGL for GPU-accelerated 60 FPS performance
* Added realistic day/night earth textures with city lights blending and GLSL shaders
* Added Fresnel atmospheric glow effect around the globe
* Added spatially anchored callout labels with leader lines colored per marker
* Callout text is selectable, copy-pastable, and screen-reader accessible (real HTML via CSS2DRenderer)
* Added `calloutMode` per marker: `"always"` / `"hover"` / `"click"` / `"none"` (default: `"always"`)
* Added `calloutLabel` for localized callout text (falls back to marker `name`)
* Arcs and paths now render as fat lines with configurable stroke width
* Regions use earcut triangulation for correct rendering of concave polygons
* Deleted the old Canvas 2D renderer (no backward compatibility)

## Release 1.7 (Wed, Mar 11 00:00)

- Added `ThreeGlobeRenderer` — full Three.js-based globe renderer integrating EarthBuilder, GraticuleBuilder, MarkerManager, ArcPathManager, RegionManager, and CalloutManager into a unified render pipeline with rAF loop, dirty-flag optimization, WebGL texture loading with error events, hit-testing via Raycaster, and CSS2D callout labels.

## Release 1.6 (Wed, Mar 11 00:00)

- Added ArcPathManager for rendering great-circle arcs and multi-point paths on the globe using fat lines (Three.js `Line2`), with support for configurable stroke width, color, and dash patterns.

## Release 1.5 (Wed, Mar 11 00:00)

- Added CalloutManager for rendering leader lines (WebGL `THREE.Line`) from marker surface points, with label positioning, backface culling, visibility modes (`always`, `hover`, `click`, `none`), and `showCallout`/`hideCallout` for event-driven display.
- Added RegionManager for rendering GeoJSON Polygon and MultiPolygon regions on the globe with earcut triangulation and support for extruded (altitude > 0) regions with side faces.
- Added EarthBuilder module for Three.js-based globe rendering with realistic day/night texture blending, Fresnel rim lighting, and atmospheric glow shell.

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
