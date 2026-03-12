# Context Menu, Accessibility Text, LLMs.txt & Agent Interface

**Date:** 2026-03-12
**Status:** Draft

## Overview

Add four interconnected capabilities to Globi:

1. **Contextual right-click menu** with export options (USDZ, GeoJSON, OBJ, JSON), accessibility text copy, coordinate copy, and entity-specific actions
2. **Screen reader description generator** producing brief or detailed natural-language descriptions of the current view
3. **LLMs.txt formatter** producing a compact, structured plain-text representation of the current view state for LLM consumption
4. **Agent interface** combining a `window.globi` JS API with semantic `data-*` DOM attributes for AI agent discoverability and control

Additionally, rename the web component from `<globe-viewer>` to `<globi-viewer>` across the entire codebase.

## Prerequisite: Rename `<globe-viewer>` → `<globi-viewer>`

Before implementing new features, rename the custom element:

- Rename `src/components/globe-viewer.js` → `src/components/globi-viewer.js`
- Update `customElements.define('globi-viewer', ...)` registration
- Update all references in `editor/app.js`, example HTML files, docs, and tests
- Update CSS selectors targeting `globe-viewer`
- Public API and attributes remain unchanged — only the tag name changes

## Architecture

Layered module stack with a shared view state query foundation:

```
src/accessibility/
  viewStateQuery.js    — shared view state queries
  contextMenu.js       — right-click menu
  viewDescriber.js     — screen reader text generator
  agentInterface.js    — window.globi API + data-* attributes
src/io/
  llmsTxt.js           — LLMs.txt formatter
```

Each module is independently testable. The `ViewStateQuery` provides the shared foundation that all others depend on.

## Module 1: View State Query Layer

**File:** `src/accessibility/viewStateQuery.js`

Answers: "What is the user looking at right now?"

### API

- `getViewAngle(renderer)` → `{ lat, lon, zoom, projection }` — camera orientation
- `getVisibleEntities(scene, renderer)` → `{ markers, arcs, paths, regions }` — entities currently within viewport bounds
- `getEntityAtPoint(x, y, renderer)` → `{ type: 'marker'|'arc'|'region'|null, entity }` — hit-test a screen coordinate (reuses existing renderer hit-test logic)
- `getViewportBounds(renderer)` → `{ north, south, east, west }` — approximate lat/lon bounding box of the visible area
- `getSunPosition(scene)` → day/night terminator info (when lighting is active)

### Visibility determination

Uses the renderer's `projectPointToClient()` to project each entity's coordinates to screen space, then checks against viewport bounds. For regions, checks if any vertex of the polygon is within bounds.

Works with both ThreeGlobeRenderer (3D) and FlatMapRenderer (2D) — the query layer abstracts over both via the renderer's projection API.

## Module 2: Context Menu

**File:** `src/accessibility/contextMenu.js`

### Trigger

- `contextmenu` event on `.stage` container (suppresses browser default)
- Keyboard: Shift+F10 or Menu key (accessibility)

### Menu items — contextual based on hit-test

**Always present:**

| Item | Submenu | Action |
|------|---------|--------|
| Export visible → | GeoJSON, JSON, OBJ, USDZ | Export filtered scene via `viewStateQuery.getVisibleEntities()` then existing `src/io/` exporters |
| Export full scene → | GeoJSON, JSON, OBJ, USDZ | Export full scene via existing exporters |
| Copy description → | Brief, Detailed | Copy screen reader text to clipboard via `viewDescriber` |
| Copy LLMs.txt | — | Copy LLMs.txt to clipboard via `llmsTxt` formatter |
| Copy coordinates | — | Copy lat/lon at click point |

**On empty globe surface (no entity under cursor):**

| Item | Action |
|------|--------|
| Drop marker here | Add a default marker at the clicked lat/lon |
| Fly to center | Animate camera to center on clicked point |

**On a marker:**

| Item | Action |
|------|--------|
| Inspect marker | Open inspect panel for this marker |
| Copy marker info | Copy marker name, coordinates, category to clipboard |
| Fly to marker | Animate camera to marker location |

**On a region:**

| Item | Action |
|------|--------|
| Inspect region | Open inspect panel for this region |
| Copy region info | Copy region name and metadata to clipboard |

### Rendering

- Pure DOM: a positioned `<div role="menu">` with `<button role="menuitem">` children
- Inserted into the shadow DOM of `<globi-viewer>`
- Styled to match existing dark UI: `#07152f` background, `#f3f6ff` text
- Submenus use `<div role="menu">` with `aria-haspopup="true"` on parent items
- Opens on hover or arrow-right; closes on arrow-left

### Accessibility

- Full keyboard navigation: arrow keys within menu, Enter to select, Escape to close
- Focus trapped within menu while open
- `aria-haspopup`, `aria-expanded` on submenu triggers
- Closes on: Escape, click-outside, scroll, resize

## Module 3: View Describer

**File:** `src/accessibility/viewDescriber.js`

### API

`describeView(scene, renderer, level)` → string

- `level: 'brief'` — single paragraph, ~50 words
- `level: 'detailed'` — structured narrative, ~150-200 words

### Brief output example

> "Globe showing Earth. 5 markers visible: Berlin, Tokyo, New York, São Paulo, Lagos. 2 arcs. Viewing north-east, Europe centered, moderate zoom."

### Detailed output example

> "Interactive 3D globe showing Earth, viewed from the north-east at moderate zoom (1.5×). Europe and northern Africa are centered. Viewport spans approximately 45°N to 15°S, 20°W to 55°E. 5 of 12 markers visible: Berlin (52.5°N, 13.4°E, capital), Tokyo (35.7°N, 139.7°E, capital), New York (40.7°N, 74.0°W, capital), São Paulo (23.6°S, 46.6°W, capital), Lagos (6.5°N, 3.4°E, capital). Two flight arcs: Berlin → Tokyo, New York → Lagos. 1 region: EU (27 polygons). Day/night terminator crosses eastern Europe. Globe rotating slowly."

### Generation logic

1. Describe body name and projection type
2. Compass direction from camera + zoom level (human-readable: "close", "moderate", "far")
3. Center region described by nearest major landmark or continent
4. List visible markers with coordinates and categories
5. Summarize arcs, paths, regions by count and key details
6. Note lighting state and animation state if active

### Integration

- Context menu "Copy description" items call `describeView()`
- An `aria-live="polite"` region in the shadow DOM updates with brief description on significant view changes (debounced 500ms after interaction stops)
- Agent interface exposes via `window.globi.describe(level)`

## Module 4: LLMs.txt Formatter

**File:** `src/io/llmsTxt.js`

### API

`formatLlmsTxt(scene, renderer)` → string

### Output format

```
# Globi View State
body: Earth
projection: globe
theme: photo
view: lat=45.2 lon=23.4 zoom=1.5
viewport: 15°S–45°N, 20°W–55°E
lighting: sun at lon=12.3

# Visible Markers (5 of 12)
- Berlin | 52.5°N 13.4°E | capital | dot | callout=always
- Tokyo | 35.7°N 139.7°E | capital | dot | callout=hover
- New York | 40.7°N 74.0°W | capital | image | callout=click
- São Paulo | 23.6°S 46.6°W | capital | dot | callout=none
- Lagos | 6.5°N 3.4°E | capital | dot | callout=always

# Visible Arcs (2)
- Berlin → Tokyo | color=#ff0 | altitude=0.3 | animated
- New York → Lagos | color=#0af | altitude=0.2

# Visible Regions (1)
- EU | 27 polygons | cap=#336699 | altitude=0.01

# Visible Paths (0)

# Filters Active
- category: capitals (3 of 5 options selected)
- time: 2024-01-01 to 2024-06-30

# Available Actions
flyTo(lat, lon, zoom) | setTheme(name) | addMarker({...}) | toggleLegend() | setProjection(name) | rotate(dLat, dLon) | zoom(level) | describe(level) | export(format, scope)
```

### Design decisions

- `key=value` and `|`-delimited fields — trivially parseable by any LLM
- Only includes visible entities (via `viewStateQuery`), keeping token count small
- Hidden entities summarized as counts ("5 of 12")
- "Available Actions" section so an LLM reading this knows what commands exist
- Optionally exposed via a hidden `<div data-globi-llms>` in the DOM for agents that scrape page content

## Module 5: Agent Interface

**File:** `src/accessibility/agentInterface.js`

Two layers for two types of agents.

### Layer A: `window.globi` JS API

Set when `<globi-viewer>` connects; removed on disconnect.

#### Read commands

| Method | Returns | Description |
|--------|---------|-------------|
| `globi.state()` | `{ lat, lon, zoom, projection, theme, body }` | Current view state |
| `globi.scene()` | Scene object | Full scene data |
| `globi.visible()` | `{ markers, arcs, paths, regions }` | Currently visible entities |
| `globi.describe(level?)` | string | Accessibility text ('brief' or 'detailed') |
| `globi.llmsTxt()` | string | Current LLMs.txt output |
| `globi.entityAt(x, y)` | `{ type, entity }` or null | Hit-test a screen point |
| `globi.help()` | Manifest object | Full capability manifest (see below) |

#### Navigate commands

| Method | Params | Description |
|--------|--------|-------------|
| `globi.flyTo(lat, lon, zoom?)` | numbers | Animated camera move |
| `globi.rotate(deltaLat, deltaLon)` | numbers | Incremental rotation |
| `globi.zoom(level)` | number | Set zoom level |
| `globi.setProjection(name)` | string | Switch projection |

#### Mutate commands

| Method | Params | Description |
|--------|--------|-------------|
| `globi.addMarker(opts)` | object | Add marker, returns id |
| `globi.removeMarker(id)` | string | Remove marker |
| `globi.updateMarker(id, opts)` | string, object | Update marker properties |
| `globi.addArc(opts)` / `removeArc(id)` / `updateArc(id, opts)` | — | Arc CRUD |
| `globi.addPath(opts)` / `removePath(id)` | — | Path CRUD |
| `globi.addRegion(opts)` / `removeRegion(id)` | — | Region CRUD |
| `globi.loadScene(sceneObj)` | object | Load entire scene |

#### UI control

| Method | Description |
|--------|-------------|
| `globi.setTheme(name)` | Switch theme |
| `globi.setPlanet(id)` | Switch celestial body |
| `globi.toggleLegend()` | Show/hide legend |
| `globi.toggleInspect()` | Toggle inspect mode |
| `globi.export(format, scope)` | Export; format='json'\|'geojson'\|'obj'\|'usdz'\|'llmstxt'; scope='full'\|'visible' |

#### Events

- `globi.on(event, callback)` / `globi.off(event, callback)`
- Mirrors existing custom events: `sceneChange`, `markerClick`, `inspectSelect`, `searchResults`, `keyboardNavigate`, `themeChange`, `planetChange`

#### Discovery: `globi.help()`

Returns:
```json
{
  "version": "1.0",
  "commands": [
    { "name": "flyTo", "params": ["lat: number", "lon: number", "zoom?: number"], "description": "Animate camera to coordinates" },
    { "name": "addMarker", "params": ["opts: {name, lat, lon, color?, category?, ...}"], "description": "Add a marker to the scene" }
  ],
  "events": ["sceneChange", "markerClick", "inspectSelect"],
  "currentState": { "body": "Earth", "projection": "globe", "markerCount": 12, "zoom": 1.5 }
}
```

#### Multiple viewer instances

- `window.globi` targets the first `<globi-viewer>` on the page
- `window.globiAll` returns an array of all instances
- Each `<globi-viewer>` element exposes `.globi` as an instance property: `document.querySelector('#my-globe').globi.flyTo(...)`

### Layer B: DOM `data-*` Attributes

Semantic attributes on elements within the shadow DOM, updated reactively:

| Element | Attributes |
|---------|------------|
| `<globi-viewer>` | `data-globi-role="viewer"` `data-globi-body="Earth"` `data-globi-projection="globe"` `data-globi-zoom="1.5"` |
| Control buttons | `data-globi-action="toggleLegend"` `data-globi-action="toggleFullscreen"` etc. |
| Legend items | `data-globi-action="filterCategory"` `data-globi-param="capitals"` |
| Stage container | `data-globi-role="viewport"` |

These allow generic browser agents (Playwright accessibility tree crawlers, Computer Use) to discover and reason about available actions without needing `window.globi`.

## Integration & Wiring

### Initialization (`globi-viewer.js` `connectedCallback`)

1. Create `ViewStateQuery` instance, passing the active renderer
2. Create `ContextMenu`, `ViewDescriber`, `AgentInterface` — each receives `ViewStateQuery` + the viewer element
3. `AgentInterface` sets `window.globi` and applies `data-*` attributes
4. `ContextMenu` attaches `contextmenu` listener to `.stage`
5. `ViewDescriber` inserts `aria-live="polite"` region and starts debounced updates

### Cleanup (`disconnectedCallback`)

- Remove event listeners, delete `window.globi`, remove `aria-live` region

### Renderer switching

When projection changes, `ViewStateQuery` receives the new renderer reference. Hit-testing and visibility logic adapts — the query layer abstracts over both renderers.

## Testing

One test file per module:

| Test file | Coverage |
|-----------|----------|
| `tests/view-state-query.test.js` | Visibility filtering, hit-testing, viewport bounds with mock scene + renderer |
| `tests/context-menu.test.js` | Correct items for empty surface, marker, region contexts; keyboard navigation |
| `tests/view-describer.test.js` | Brief and detailed output format; correct entity counts; compass direction |
| `tests/agent-interface.test.js` | Command dispatch, manifest correctness, multi-instance support |
| `tests/llms-txt.test.js` | Format compliance, visible-only filtering, available actions section |

## No Breaking Changes

- All new code — no modifications to existing public APIs
- `window.globi` only set when `<globi-viewer>` is on the page
- Context menu is additive (no existing right-click behavior)
- `aria-live` region is passive and non-intrusive
- The `<globe-viewer>` → `<globi-viewer>` rename is the only breaking change and is handled as a prerequisite step
