# Product Comparison: PRD vs OpenGlobus

## Scope
Comparison between the requirements in `docs/PRD for Spherical Earth Model.md` and capabilities documented for OpenGlobus (`https://www.openglobus.org/` and official GitHub/docs pages).

## Summary
OpenGlobus is a strong technical base for rendering, layers, controls, and geospatial data formats. The largest PRD gaps are product-layer capabilities: WYSIWYG authoring, explicit multi-language content workflows, and scene export to OBJ/USDZ.

## Capability Matrix
| PRD Area | PRD Expectation | OpenGlobus Evidence | Fit | Gap / Required Work |
|---|---|---|---|---|
| 3D globe rendering | Textured spherical Earth and custom planets | README describes interactive 3D maps/globes and terrain support | Strong | Build planet preset system on top of core API |
| Interaction (rotate/zoom/pan/fly) | Mouse/touch/keyboard + smooth camera movement | README lists controls and camera animations; API docs include `FlyAnimation` and controls | Strong | Add exact UX contract (inertia behavior, keyboard mapping) |
| Marker types | Dot, billboard image, 3D model marker | API docs expose `Billboard`, `Label`, `GeoObject`, `EntityCollection` | Strong | Standardize one PRD-level marker schema and adapters |
| Paths and arcs | Curved paths and elevated arcs with animation | Polyline/vector primitives exist; no direct "arc layer" parity documented | Partial | Implement PRD arc generator (great-circle + altitude + dash animation) |
| Regions/polygons | Extruded polygon regions with cap/side styling | Vector/polygon support exists; explicit extrusion pipeline not clearly documented | Partial | Build region extrusion/styling module on top of vector layers |
| Time-based animation | Keyframes for entities and path animation | `TimelineControl` and animation classes are present | Partial | Create PRD keyframe engine + schema binding |
| WYSIWYG editor | Browser authoring UI for non-dev users | No built-in editor documented | Gap | Build dedicated editor app (React/Vue) |
| Import (GeoJSON/OSM/Shapefile) | Ingest external GIS data | API list includes `GeoJson` format support | Partial | Add OSM/Shapefile ingestion pipeline and validation |
| Export (OBJ/USDZ + JSON/GeoJSON) | Scene/model export | No official OBJ/USDZ exporter documented | Gap | Implement export service (three.js exporter or backend converter) |
| i18n and localized content | UI strings + per-language marker content | No dedicated i18n framework documented | Gap | Add i18n layer in host app + localized data model |
| Embedding model | Web Component for framework-agnostic embed | OpenGlobus is JS library, not a ready-made custom element | Partial | Ship `<globe-viewer>` wrapper with stable public API |
| Accessibility and content safety | Keyboard/screen reader/XSS-safe callouts | Not a primary documented feature | Gap | Add accessibility semantics and HTML sanitization in app layer |

## Practical Recommendation
Use OpenGlobus as the rendering/runtime core and implement a product shell around it:
- Web Component wrapper (`<globe-viewer>`) with stable API.
- Scene/domain model (`Marker`, `Path`, `Arc`, `Region`, `Animation`).
- Editor app for content creation.
- Import/export pipeline and i18n/a11y/security layers.

This approach minimizes low-level rendering risk while preserving PRD differentiation.

## Sources
- OpenGlobus organization README (features, controls, layers): <https://github.com/openglobus>
- OpenGlobus API docs (classes incl. `Billboard`, `GeoObject`, `EntityCollection`, `FlyAnimation`, `TimelineControl`): <https://docs.openglobus.org/classes/index.EntityCollection.html>
- OpenGlobus examples/docs entry points: <https://openglobus.github.io/>
- OpenGlobus website: <https://www.openglobus.org/>
