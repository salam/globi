# Blueprint 03: Testing and Quality

## Test Pyramid
- Unit tests: schema validation, geometry helpers, interpolation logic.
- Integration tests: API-to-render pipeline, editor-to-preview synchronization.
- End-to-end tests: user workflows in embed mode and editor mode.

## Required Test Suites
- `scene-schema`:
  - Valid entity acceptance.
  - Invalid coordinate and ID rejection.
  - Migration coverage between schema versions.
- `rendering-core`:
  - Marker/path/arc/region layer diff updates.
  - `flyTo` and animation state transitions.
- `globe-viewer`:
  - Attribute/property reflection.
  - Custom event contract.
- `editor`:
  - Create/edit/delete flows.
  - Timeline keyframe creation.
  - Locale switching and localized content persistence.
- `import-export`:
  - GeoJSON import mapping.
  - OSM/Shapefile conversion smoke tests.
  - JSON/GeoJSON/OBJ/USDZ export integrity checks.

## Non-Functional Validation
- Performance scenarios:
  - `100`, `500`, `1000` markers.
  - `10`, `50`, `100` paths.
  - Mixed marker types and active animations.
- Accessibility:
  - Keyboard-only operation.
  - Screen reader labels and announcements.
- Security:
  - Callout sanitization test matrix (script/event/style injection attempts).
- Compatibility:
  - Latest Chrome, Firefox, Safari, Edge.
  - iOS Safari and Android Chrome.

## CI Quality Gates
- Lint and type-check must pass.
- Unit and integration suites must pass.
- End-to-end smoke tests for embed and editor must pass.
- Performance regression threshold checks for critical scenarios.
