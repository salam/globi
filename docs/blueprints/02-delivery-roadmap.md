# Blueprint 02: Delivery Roadmap

## Phase 1 (Weeks 1-4): Foundation

### Scope
- Repository/package layout.
- `<globe-viewer>` shell with lifecycle + resize.
- Earth rendering with interaction baseline (rotate/zoom/pan/fullscreen).
- Initial scene schema + validation.

### Exit Criteria
- Web component renders Earth reliably on desktop + mobile browsers.
- Scene schema accepted and validated with useful error messages.
- `setMarkers` and `flyTo` functional.

## Phase 2 (Weeks 5-8): Advanced Visualization

### Scope
- Marker visual types (`dot|image|model`).
- Paths, arcs (altitude), and region extrusion.
- Animation timeline for entity motion.

### Exit Criteria
- Paths/arcs/regions visually stable and configurable.
- Timeline playback and looping validated.
- Performance baseline measured against target envelope.

## Phase 3 (Weeks 9-12): Authoring + Interop

### Scope
- Editor app with forms + live preview.
- Timeline editor UI.
- Import (GeoJSON first, then OSM/Shapefile pipeline).
- Export JSON/GeoJSON, initial OBJ/USDZ path.
- i18n content workflow in editor.

### Exit Criteria
- Non-technical user can create/edit/publish a scene.
- Import and export roundtrip succeeds for sample projects.
- Localized marker content persists and renders correctly.

## Phase 4 (Weeks 13-14): Hardening

### Scope
- Cross-browser/mobile validation.
- Accessibility pass (keyboard + screen reader).
- Security hardening (XSS sanitization tests).
- Stress and regression tests.

### Exit Criteria
- Critical flows pass QA matrix.
- Performance targets met or documented with mitigation plan.
- Release candidate ready with user-facing docs.

## Dependency Graph
1. Schema + store before advanced layer work.
2. Layer APIs before editor forms.
3. Import pipeline before robust export roundtrips.
4. Accessibility/security hardening before release cut.

## Risks and Mitigations
- Rendering complexity risk: keep abstraction boundary between OpenGlobus runtime and app schema.
- Data quality risk: enforce schema validation + import normalization.
- Performance risk: benchmark every phase with synthetic datasets.
- Product complexity risk: phase gates and strict exit criteria.
