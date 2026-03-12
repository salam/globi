# FEATURES

Derived from `docs/PRD for Spherical Earth Model.md`.

## Spec TODO (2026-03-02)
- [x] Ensure every built-in example scene includes all available Natural Earth landmass shapes for easier orientation.
- [x] Apply a low-resolution NASA Earth texture to built-in example scenes.
- [x] Add `text` marker visual type so labels can be written directly on the globe.
- [x] Add timestamped ISS history dot markers to the ISS real-time example using API position samples.
- [x] Add pulsating ring animation around the current ISS position marker.
- [x] Add simple procedural 3D ISS model (body + solar panels) as a visual marker for ISS current position.
- [x] Add an arrow-only north compass and dynamic kilometer scale overlay in the viewer.
- [x] Animate camera pan/rotation when selecting markers from the legend.
- [x] Add idle slow globe rotation based on planet axis rotation direction/speed.
- [x] Reduce default initial globe framing so the planet uses 90% of container size (keeps UI controls visible).
- [x] Add editor controls for configuring which viewer UI controls are visible and whether buttons use icons or text.
- [x] Update aircraft carriers example to use source-backed AIS snapshot data from MarineVesselTraffic, GoNavy, CruisingEarth, VesselFinder, and MarineTraffic (region anchors, not homeports).
- [x] Apply Viewer UI toggles immediately so globe controls hide/show as soon as options are changed in the editor.
- [x] Fix compass HUD visibility defaults and make Viewer UI control changes reliable across browsers (`input` + `change` handling).
- [x] Simplify compass UI to arrow-only and keep the arrow north-oriented.

## Celestial Bodies

- [x] Realistic surface textures for all 13 celestial bodies (NASA/ESA sources)
- [x] Per-body atmosphere rendering (none/thin/medium/thick/deep)
- [x] Time-accurate axial tilt and seasonal lighting
- [x] Ring systems for Saturn, Jupiter, Uranus, Neptune
- [x] Progressive texture loading (2K → 8K on zoom)
- [x] Body-switching with automatic teardown/rebuild
- [x] Body-specific landmark labels (Olympus Mons, Great Red Spot, Sea of Tranquility, etc.)
- [x] Earth borders hidden on non-Earth bodies
- [x] Ring texture loading for Saturn

## Core Globe
- [x] Implement `<globe-viewer>` web component bootstrap (init, destroy, resize).
- [x] Render textured spherical Earth with configurable planet presets.
- [x] Offer sun-position-based sphere lighting as an optional mode.
- [x] Default to Earth when no base data is provided.
- [x] Add planet/moon preset toggle (8 planets + 5 popular moons).
- [x] Add rotation, zoom, pan for mouse/touch/keyboard.
- [x] Add surface-grab drag rotation (grab point tracks cursor, zoom-scaled sensitivity, no inertia).
- [x] Add fullscreen toggle and ESC listener.
- [x] Make renderer responsive to container size changes.
- [x] Migrate rendering from Canvas 2D to Three.js WebGL with GPU-accelerated shaders.
- [x] Add day/night texture blending with city lights and Fresnel atmospheric glow.
- [x] Add spatially anchored callout labels with leader lines (CSS2DRenderer for selectable/accessible text).
- [x] Add `calloutMode` (always/hover/click/none) and `calloutLabel` (localized) to marker schema.
- [x] Load default earth texture at init for proper surface rendering.
- [x] Add country border outlines from Natural Earth 110m GeoJSON (white line overlay).
- [x] Add curved ocean and continent labels rendered on the globe surface.
- [x] Add `showBorders` and `showLabels` planet config flags with editor toggles.

## Flat Map Projection

- [x] Azimuthal Equidistant projection (default flat map mode)
- [x] Orthographic and Equirectangular projections (extensible registry)
- [x] 2D canvas renderer with full feature parity (markers, arcs, paths, regions, borders, labels, callouts)
- [x] UI toggle button to switch between globe and flat map
- [x] `projection` HTML attribute for programmatic control
- [x] `scene.projection` field in scene schema
- [x] Instant mode switching with preserved center and zoom
- [x] Texture re-projection with low-res drag optimization
- [x] Anti-meridian break detection for polylines
- [x] Zoom-into-cursor behavior in flat map mode
- [x] Scale bar works in flat map mode (km per pixel at projection center)
- [x] All 13 celestial bodies supported
- [x] Graticule grid lines, borders (Earth only), geo labels per body
- [x] `showProjectionToggle` viewer UI config option

## Data Source Attribution
- [x] Scene-level `dataSources[]` array with id, name, shortName, url, description, license
- [x] Per-entity `sourceId` field on markers, paths, arcs, and regions
- [x] Abbreviated attribution label at bottom-right with middle-dot-separated shortNames
- [x] Attribution icon (person-in-circle) before label text
- [x] Slide-in panel with full source details, clickable links, and selectable text
- [x] Three-section panel: visible sources, outside current view, without data for this visualization
- [x] Viewport-aware dynamic updates: only sources with visible entities shown in abbreviated label
- [x] Panel dismissal via label click, click-outside, × button, Escape key
- [x] `showAttribution` viewerUi toggle (defaults to true)
- [x] All 7 example loaders updated with dataSources and sourceId

## Scene Data Model

- [x] Define versioned schema for `Marker`, `Path`, `Arc`, `Region`, `Animation`.
- [x] Add runtime validation and migration for scene JSON.
- [x] Support multilingual marker content (`name`/`description` per locale).

## Visual Layers
- [x] Implement marker layer with `dot`, `image` (billboard), and `model` visual types.
- [x] Auto-assign color-blind-safe colors for unspecified dot markers (shade variants after first 10).
- [x] Implement path layer with color, width, dash pattern, and animation duration.
- [x] Implement arc layer (great-circle + max altitude + dash animation).
- [ ] Implement region layer (GeoJSON polygon/multipolygon with extrusion).

## Interaction and UI
- [x] Add marker picking, tooltip/callout rendering, and focus management.
- [x] Implement `flyTo`/"center marker" API and camera transition presets.
- [x] Build legend panel with filtering and click-to-focus behavior.
- [x] Add keyboard-first interaction paths for accessibility.
- [x] Add inspect-mode selection events for click-to-edit workflows.
- [x] Anchor inspect panel to selected marker position and keep it aligned during camera movement.
- [x] Clicking a marker or callout always triggers the inspect popup (no inspect-mode toggle needed).
- [x] Add fulltext search: single match flies to marker, multiple matches filter callouts to show only hits.

## Animation System
- [x] Build keyframe timeline engine for position/rotation/scale.
- [x] Support looping/non-looping animation playback.
- [ ] Emit animation lifecycle events (`start`, `tick`, `complete`).

## Editor App
- [x] Create WYSIWYG editor shell with globe preview integration.
- [x] Add forms for markers, arcs, paths, and regions.
- [x] Add loadable example scenes (capitals, continents+seas, ISS live, and open-source conflict/carrier context presets).
- [x] Add "Unload All" option to example dropdown and auto-unload examples on body switch.
- [ ] Add timeline editor for keyframe authoring.
- [x] Add multilingual content editing UI.
- [x] Add inline inspect panel for immediate click-and-edit updates.
- [x] Add prose place-name lookup (OSM Nominatim) to search and drop marker pins.

## Import/Export
- [x] Import GeoJSON and map to scene entities.
- [ ] Add OSM and Shapefile ingestion pipeline (conversion + filtering).
- [x] Export scene data as JSON/GeoJSON.
- [x] Export 3D assets as OBJ/USDZ.

## Non-Functional Requirements
- [ ] Reach target performance envelope (~1000 markers, 100 paths).
- [ ] Test compatibility on Chrome, Firefox, Safari, Edge, iOS, Android.
- [x] Sanitize callout HTML/Markdown to prevent XSS.
- [x] Smart callout clustering — nearby markers auto-stack (2-3) or collapse into group badges (4+).
- [x] Add i18n dictionaries for `en`, `de`, `fr`, `it`.
- [ ] Add screen-reader and keyboard accessibility checks.

## Delivery Plan
- [x] Phase 1 (Weeks 1-4): core globe, web component, base data model.
- [x] Phase 2 (Weeks 5-8): advanced layers + animations.
- [x] Phase 3 (Weeks 9-12): editor + import/export + i18n.
- [ ] Phase 4 (Weeks 13-14): performance, accessibility, hardening.

## Vessel Data Pipeline
- [x] Vessel aggregator CLI tool (`tools/vessel-aggregator.js`) for merging OSINT + AIS sources
- [x] AISHub and VesselFinder adapter support with API key config
- [x] MMSI-based and name-fallback deduplication across sources
- [x] Trail deduplication (0.1 deg / 1 hour threshold)
- [x] Unified vessel schema output to `data/vessels.json`
- [x] OSINT-only mode when no config file or API keys present
- [x] Curated OSINT dataset with 21 vessels from 5 nations (US/FR/GB/RU/CN)
- [x] Globi example loader "Vessel Tracking (Multi-Source)" with nation-colored markers and dashed trail paths
- [x] Naval Vessels (OSINT) example with timestamps in names and trail paths
- [x] Civil Shipping (Global Straits) example with 18 vessels across 9 major shipping chokepoints
- [x] Configurable marker filter system (scene `filters` array, viewer dropdown)
- [x] UN membership filter for capitals example
- [x] NATO membership filter for capitals example (compound categories)
- [x] Nation filter for naval vessels example (US/FR/GB/RU/CN)
- [x] Nation filter for vessel tracking (multi-source) example
- [x] Strait filter for civil shipping example (9 shipping straits)
- [x] Time range filter (from/to date inputs) for military vessel examples
- [x] Marker `timestamp` field for time-based filtering
- [x] Legend groups markers into sections by filter categories (alphabetical within each section)

## Remaining Gaps
- [ ] Replace placeholder USDZ export with production-grade USD/USDZ packaging.
- [ ] Integrate real OSM PBF and Shapefile parsers.
- [ ] Add end-to-end browser tests for embed mode and editor mode.
