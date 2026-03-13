# Blueprint 01: System Architecture

## Goal
Implement a reusable, framework-agnostic globe product with clear separation between rendering core, domain model, and authoring tools.

## Top-Level Modules
- `globi-viewer` (Web Component): public API and event bridge.
- `rendering-core`: OpenGlobus-backed scene/layer runtime.
- `scene-store`: canonical state for entities and animation timelines.
- `editor-app`: WYSIWYG authoring interface.
- `import-export`: data adapters and serializers.

## Proposed Package Split
- `packages/globi-viewer`
- `packages/rendering-core`
- `packages/scene-schema`
- `apps/editor`
- `packages/io`

## Public API Contract (`<globi-viewer>`)
- Methods:
  - `setPlanet(config)`
  - `setScene(sceneData)`
  - `setMarkers(markers)`
  - `setPaths(paths)`
  - `setArcs(arcs)`
  - `setRegions(regions)`
  - `playAnimation(id)` / `pauseAnimation(id)`
  - `flyTo(target, options)`
- Events:
  - `markerClick`
  - `regionHover`
  - `sceneChange`
  - `animationComplete`
  - `error`

## Scene Schema (Versioned)
- Root:
  - `version`
  - `planet`
  - `markers[]`
  - `paths[]`
  - `arcs[]`
  - `regions[]`
  - `animations[]`
  - `locale`
- Rules:
  - IDs must be stable and unique.
  - Coordinates validated per planet radius.
  - All entities referenceable by `entityId`.

## Rendering Flow
1. Web component receives data.
2. Schema validator normalizes + migrates data.
3. Scene store updates immutable state snapshot.
4. Rendering core diffs previous/current state.
5. Layer managers apply minimal updates.
6. Interaction events emit back through component.

## Layer Managers
- `MarkerManager`: dot/billboard/model marker creation and updates.
- `PathManager`: polyline generation and dash animation.
- `ArcManager`: great-circle interpolation and altitude profile.
- `RegionManager`: GeoJSON parsing and extrusion.
- `AnimationManager`: keyframe interpolation and timeline control.

## Security and Accessibility by Design
- Callout HTML sanitized before render.
- Keyboard navigation for marker traversal/focus.
- ARIA labels for interactive controls.
- Visible focus states required in host/editor UI.

## OpenGlobus Integration Strategy
- Use OpenGlobus for camera, globe, terrain, and base vector/entity primitives.
- Keep PRD-specific behavior in wrapper layers (schema, editor UX, exporters).
- Avoid direct coupling of editor internals to OpenGlobus object graph.
