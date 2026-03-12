# Data Source Attribution

## Overview

Display data source attribution on the globe viewer, showing which external data sources contributed to the current visualization. An abbreviated label at the bottom-right shows active sources; clicking it reveals a slide-in panel with full details, links, and categorized source lists based on viewport visibility.

## Schema Extension

### `scene.dataSources[]` (optional)

A new top-level array on the scene object. Each entry:

```js
{
  id: string,          // unique key, e.g. 'rest-countries'
  name: string,        // full display name, e.g. 'REST Countries API'
  shortName: string,   // abbreviated label, e.g. 'RC'
  url: string,         // clickable link to the source
  description: string, // optional, shown in expanded panel
  license: string,     // optional, e.g. 'Public Domain', 'CC BY 4.0'
}
```

Validation rules:
- `id` must match `ID_PATTERN` (`/^[a-zA-Z0-9_-]{1,128}$/`)
- `id` values must be unique within the `dataSources` array
- `name` and `shortName` are required non-empty strings
- `url` is a required non-empty string
- `description` and `license` are optional strings

### `sourceId` on entities (optional)

Markers, paths, arcs, and regions each get an optional `sourceId: string` field. When present, it must reference a valid `dataSources[].id` in the same scene.

Normalization: `sourceId` defaults to `''` (empty string) if not provided.

Validation: if `sourceId` is non-empty, it must match an entry in `dataSources[].id`. A warning (not error) is issued for unresolved references.

### Defaults in `createEmptyScene` and `normalizeScene`

- `createEmptyScene` returns `dataSources: []`
- `normalizeScene`: if `scene.dataSources` is missing or not an array, defaults to `[]`. Each entry is normalized with `id`, `name`, `shortName`, `url` as required strings and `description`/`license` defaulting to `''`.

## `viewerUi` Extension

Add `showAttribution: boolean` (default `true`) to `viewerUi`. When `false`, the attribution label and panel are hidden entirely.

## Abbreviated Label (bottom-right)

### Position & Style
- Positioned bottom-right, below the navigation HUD (compass + scale bar)
- Small font (10px), muted color, semi-transparent background pill
- Uses the attribution SVG icon (`assets/noun-attribution-6854685.svg`) inline before the text
- Format: `[icon] NE · RC · ISS` (middle-dot separated short names)

### Content Logic
- Only shows `shortName` values for sources with **at least one currently visible data point** in the viewport
- "Visible" means: the entity's lat/lon projects to a screen position within the canvas bounds AND is on the front-facing hemisphere (checked via `projectPointToClient` returning `visible: true` and coordinates within canvas rect)
- Sources with data points but none visible in viewport: omitted from abbreviated label
- Sources defined but with zero referencing entities: omitted from abbreviated label
- If no sources have visible data, the label shows just the attribution icon (no text)

### Dynamic Updates
- Recalculated on every camera change (pan, zoom, rotation) via debounced update (~200ms)
- Hooks into the existing `#updateNavigationHud()` call path which fires on pan/zoom/keyboard/wheel events

### Interaction
- Cursor changes to pointer on hover
- Click opens the expanded attribution panel

## Expanded Attribution Panel (slide-in from right)

### Layout
- Slides in from the right edge of the viewer, 280px wide
- Same visual style as existing panels (dark semi-transparent background, border, border-radius)
- Contains selectable HTML text, clickable URL links (`target="_blank"`, `rel="noopener"`)
- Has a close button (x) in the top-right corner

### Three Sections

**1. "Data Sources"**
Sources with at least one entity visible in the current viewport.
Each entry shows:
- Full name (bold)
- Description (if provided)
- License (if provided, in muted text)
- URL as clickable link

**2. "Outside current view"**
Sources that have referencing entities in the scene, but none are currently visible in the viewport.
Same display format as section 1.

**3. "Without data for this visualization"**
Sources defined in `dataSources[]` but with zero referencing entities (markers/paths/arcs/regions) in the entire scene.
Same display format, but visually muted (lower opacity).

### Live Updates While Open

When the panel is open and the user pans/zooms, the panel content updates dynamically — sources move between the three sections in real-time. The debounced visibility update (~200ms) rebuilds the panel DOM when the categorization changes.

### Dismissal
- Click the attribution label again (toggle)
- Click outside the panel: a click on the stage area that is not a drag (travel < 6px, matching existing click detection in `#onPointerUp`) and does not result in an entity selection
- Click the x close button
- Escape key

## Counting & Visibility Logic

### Static Count (total entity references)
For each data source, count how many entities (markers + paths + arcs + regions) have a matching `sourceId`. This determines section 3 (zero total references).

### Viewport Visibility Check
For sources with >0 total references, determine if any of their entities are currently visible:

**Per-entity-type projection rules:**

- **Markers**: project `{ lat, lon, alt }` directly
- **Arcs**: project both `start` and `end` points; arc is visible if either point is visible
- **Paths**: project each point in `points[]`; path is visible if any point is visible
- **Regions**: extract the first coordinate ring from `geojson.coordinates` and sample up to 8 evenly-spaced vertices; region is visible if any sampled vertex is visible

**Visibility test per projected point:**

1. Call `projectPointToClient({ lat, lon, alt })` on the renderer
2. A point is "visible" if:
   - `result.visible === true` (front hemisphere)
   - `result.clientX` is within the canvas bounds
   - `result.clientY` is within the canvas bounds
3. If any entity for a source passes the visibility check, the source is in section 1; otherwise section 2

### Performance
- Only check visibility when camera state changes (debounced at ~200ms)
- Cache the source-to-entity mapping when the scene changes (rebuild on `sceneChange`)
- For scenes with many entities, sample up to 200 entities per source — take every Nth entity to get spatial distribution (if any sampled entity is visible, the source is visible)

## Implementation Files

### New File: `src/renderer/attributionManager.js`
Manages the attribution UI: abbreviated label element, expanded panel element, visibility computation, and panel toggle state. Follows the pattern of existing managers (CalloutManager, GeoLabelManager).

Key responsibilities:
- Create and position the attribution label DOM element
- Create and manage the slide-in panel DOM element
- Compute source visibility from scene data + camera state
- Expose `update(scene, projectPointFn, canvasRect)` called on camera changes. `globe-viewer.js` calls this from `#updateNavigationHud()`, passing `this.#controller.projectPointToClient.bind(this.#controller)` and the renderer's canvas rect via `this.#controller.getCanvasRect()`
- Expose `dispose()` for cleanup

### Modified Files

| File | Change |
|------|--------|
| `src/scene/schema.js` | Add `dataSources[]` normalization and validation; add `sourceId` to entity normalizers |
| `src/scene/viewerUi.js` | Add `showAttribution` boolean |
| `src/components/globe-viewer.js` | Instantiate AttributionManager, wire up panel toggle, add CSS styles, hook into camera updates |
| `src/renderer/threeGlobeRenderer.js` | Expose `getCanvasRect()` method returning the WebGL canvas bounding rect |
| `src/examples/loaders.js` | Add `dataSources[]` and `sourceId` to all 7 example loaders |
| `editor/app.js` | Show attribution config in editor (optional, low priority) |

### Example Loader Updates

Each example gets a `dataSources` array and `sourceId` on its entities:

**1) All Capitals**
```js
dataSources: [
  { id: 'rest-countries', name: 'REST Countries API', shortName: 'RC', url: 'https://restcountries.com/' },
  { id: 'natural-earth', name: 'Natural Earth', shortName: 'NE', url: 'https://www.naturalearthdata.com/', license: 'Public Domain' },
]
// Markers: sourceId: 'rest-countries'
// Regions (landmass): sourceId: 'natural-earth'
```

**2) Continents + Seas**
```js
dataSources: [
  { id: 'natural-earth', name: 'Natural Earth', shortName: 'NE', url: 'https://www.naturalearthdata.com/', license: 'Public Domain' },
]
// All entities: sourceId: 'natural-earth'
```

**3) ISS Real-Time**
```js
dataSources: [
  { id: 'wheretheiss', name: 'Where the ISS at?', shortName: 'ISS', url: 'https://wheretheiss.at/' },
  { id: 'natural-earth', name: 'Natural Earth', shortName: 'NE', url: 'https://www.naturalearthdata.com/', license: 'Public Domain' },
]
// ISS markers/paths: sourceId: 'wheretheiss'
// Landmass regions: sourceId: 'natural-earth'
```

**4) Ukraine Conflict**
```js
dataSources: [
  { id: 'geo-countries', name: 'Geo Countries', shortName: 'GC', url: 'https://github.com/datasets/geo-countries', license: 'ODC PDDL' },
  { id: 'natural-earth', name: 'Natural Earth', shortName: 'NE', url: 'https://www.naturalearthdata.com/', license: 'Public Domain' },
]
// Ukraine region: sourceId: 'geo-countries'
// Landmass regions: sourceId: 'natural-earth'
```

**5) Naval Vessels (OSINT)**
```js
dataSources: [
  { id: 'osint-vessels', name: 'Curated OSINT Reports', shortName: 'OSINT', url: '#', description: 'Curated open-source intelligence reports' },
  { id: 'natural-earth', name: 'Natural Earth', shortName: 'NE', url: 'https://www.naturalearthdata.com/', license: 'Public Domain' },
]
// Vessel markers/paths: sourceId: 'osint-vessels'
// Landmass regions: sourceId: 'natural-earth'
```

**6) Vessel Tracking (Multi-Source)**
```js
dataSources: [
  { id: 'osint-vessels', name: 'OSINT Reports', shortName: 'OSINT', url: '#', description: 'Open-source intelligence reports' },
  { id: 'ais-feeds', name: 'AIS Feeds', shortName: 'AIS', url: '#', description: 'Automatic Identification System vessel feeds' },
  { id: 'natural-earth', name: 'Natural Earth', shortName: 'NE', url: 'https://www.naturalearthdata.com/', license: 'Public Domain' },
]
// Vessel markers/paths: sourceId based on vessel.source field
// Landmass regions: sourceId: 'natural-earth'
```

**7) Civil Shipping**
```js
dataSources: [
  { id: 'ais-sample', name: 'AIS Sample Data', shortName: 'AIS', url: '#', description: 'Sample AIS vessel data' },
  { id: 'natural-earth', name: 'Natural Earth', shortName: 'NE', url: 'https://www.naturalearthdata.com/', license: 'Public Domain' },
]
// Civil vessel markers: sourceId: 'ais-sample'
// Landmass regions: sourceId: 'natural-earth'
```

## Testing Strategy

### Unit Tests (`tests/attribution-manager.test.js`)
- Source counting: correct active/outside-view/no-data categorization
- Visibility check with mocked `projectPointToClient`
- Abbreviated label text generation (only visible sources, middle-dot separated)
- Empty dataSources gracefully handled (no label shown)
- Panel toggle state (open/close/toggle)

### Schema Tests (extend `tests/examples.test.js`)
- `dataSources` normalization and validation
- `sourceId` on entities normalized to empty string
- Invalid `sourceId` references produce validation warnings
- Round-trip: normalize -> validate -> no errors for valid scenes

### Integration Tests (extend `tests/three-renderer.test.js`)
- Attribution label rendered in DOM when `dataSources` present
- Attribution label hidden when `showAttribution: false`
- Panel opens/closes on click

## Edge Cases

- **No `dataSources`**: attribution label not rendered at all
- **Empty `dataSources` array**: attribution label not rendered
- **All sources have zero references**: label shows icon only, panel shows all in section 3
- **Entity with unknown `sourceId`**: ignored in counting (validation warning already issued)
- **Multiple entities share one `sourceId`**: counted once per source, not per entity
- **Very long source lists**: panel scrolls vertically
