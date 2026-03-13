# Globi Studio — Design Specification

## Overview

Globi Studio is a WYSIWYG editor for creating and editing Globi scenes. It replaces the form-based workflow of the current editor with a direct-manipulation interface where users interact with the globe itself — clicking to place markers, drawing paths, adjusting properties in a side panel, and sequencing animations on a timeline.

Studio coexists with the old editor (`editor/`) until it reaches feature parity, at which point the old editor is deprecated.

## Entry Points

### Context Menu → "Open Studio"
The existing `<globi-viewer>` context menu gains an "Open Studio" item. This is added directly to `buildMenuItems()` in `src/accessibility/contextMenu.js` as a new top-level menu entry. Clicking it:

1. Serializes the current scene to `sessionStorage` under a known key (`globi-studio-scene`). For large scenes (e.g. detailed GeoJSON regions), if serialization exceeds 4 MB, the scene is compressed via `CompressionStream('gzip')` and stored as a base64 string with a `gzip:` prefix. Studio detects this prefix and decompresses on load.
2. Opens `studio/index.html` in a new tab (relative URL, same origin).
3. Studio reads the scene from `sessionStorage` on load and renders it.

### Direct URL
Users can also navigate directly to `studio/index.html` to start with an empty scene or import via File menu.

### Inspect Overlay
The existing inspect panel (select & inspect floating panel) remains in the viewer as the only overlay. All other editing happens in the full Studio page.

## Layout (Figma/Photoshop Style)

```
┌─────────────────────────────────────────────────────────────────┐
│ GLOBI STUDIO │ File  Edit  View  Tools  Help     │ ▶ Preview   │  ← Menu bar
├──┬──────────────────────────────────────────────┬───────────────┤
│  │                                              │ PROPERTIES    │
│S │                                              │               │
│E │                                              │ Name: [Tokyo] │
│L │              3D Globe Viewport               │ Lat:  [35.67] │
│  │                                              │ Lon: [139.65] │
│◉ │           (full globi-viewer here)           │ Color: [#4ec] │
│⌒ │                                              │ Label: [Toky] │
│∿ │                                              │───────────────│
│▢ │                                              │ ▸ Appearance  │
│──│                                              │ ▸ Metadata    │
│✎ │                                              │ ▸ Animation   │
│  │                                              │               │
├──┴──────────────────────────────────────────────┴───────────────┤
│ TIMELINE │⏮ ▶ ⏭│ 00:03.5 / 00:10.0        │↻ ◆+ ∿ │ Zoom +- │
│──────────┼──────────────────────────────────────────────────────│
│ 👁 ● Tokyo    │ ████████████████████████████████████████████████│
│ 👁 ● Berlin   │      ████████████████████████████████████████████│
│ 👁 ● São Paulo│          ██████████████████████                  │
│ 👁 ● Arc      │              ████████                            │
│   ● Camera    │  ◆         ◆         ◆         ◆                │
└─────────────────────────────────────────────────────────────────┘
```

### Menu Bar
Top horizontal bar containing:
- **GLOBI STUDIO** logo/brand (left)
- **File** — New Scene (Ctrl+N), New from Clipboard (Ctrl+Shift+V), New from File (Ctrl+O), Save as File/Download (Ctrl+S), Export JSON, Export GeoJSON, Export OBJ
- **Edit** — Undo (Ctrl+Z), Redo (Ctrl+Shift+Z), Delete Selected (Del), Duplicate (Ctrl+D), Select All (Ctrl+A)
- **View** — Toggle Properties Panel (P), Toggle Timeline (T), Toggle HUD (H), Zoom to Fit (F), Reset Camera (Shift+R)
- **Tools** — Custom ChatGPT (external link to public CustomGPT), Claude Cowork (external link)
- **Help** — Documentation (external link), Keyboard Shortcuts (?), About Globi Studio
- **Preview button** (right-aligned) — prominent ▶ Preview button with Space shortcut. Activates preview mode: hides all editor UI (tool strip, properties, timeline, menu bar) and plays the scene as the end user would see it. Press Space or Escape to exit.

### Tool Strip (Left)
Vertical strip, 44px wide, containing icon buttons with hover tooltips:
1. **Select** (V) — default mode. Click elements to select, drag to move markers.
2. ── divider ──
3. **Add Marker** (M) — click on globe surface to place a marker.
4. **Add Arc** (A) — click start point, then end point on globe.
5. **Add Path** (L) — click waypoints, double-click or Enter to finish.
6. **Add Region** (R) — click vertices to define polygon, double-click to close.
7. ── divider ──
8. **Freehand Draw** (D) — click and drag to draw a continuous line on the surface. Toggle between freehand and point-to-point via a small subtool indicator (click the tool again or use Shift+D to toggle).

**Freehand draw detail:** During drag, `mousemove` events are raycast against the globe sphere to produce lat/lon samples. Raw samples are collected at 60 Hz and then simplified using the Ramer-Douglas-Peucker algorithm (epsilon ~0.1 degrees) to reduce point count while preserving shape. The resulting points array is stored as a standard Path entity in the scene schema. In point-to-point mode, each click adds a single waypoint — no simplification needed.

**Region tool detail:** Each click raycast produces a `[lon, lat]` coordinate (note: GeoJSON uses lon/lat order, opposite of the UI display which shows lat/lon). On double-click to close, the coordinate array is wrapped into a GeoJSON Polygon (`{type: 'Polygon', coordinates: [ring]}`) where `ring` is the array of `[lon, lat]` pairs with the first point duplicated at the end to close the ring. After creation, individual vertices can be edited by entering point-editing mode (double-click the region in Select mode) which shows draggable handles at each vertex.

### Viewport (Center)
Full `<globi-viewer>` instance with all rendering, HUD elements, and interactions. In Studio, the viewer additionally:
- Shows selection highlights (outline glow on selected elements).
- Supports click-to-select in Select mode.
- Supports click-to-place in Add modes.
- Supports drag-to-move for markers in Select mode.
- Shows cursor feedback (crosshair in add modes, pointer in select mode).

### Properties Panel (Right)
280px wide, scrollable. Content changes based on selection:

**When nothing is selected — Scene Settings:**
- Theme (dropdown: photo, wireframe-shaded, wireframe-flat, grayscale-shaded, grayscale-flat)
- Planet (dropdown: earth, mars, moon, etc.)
- Projection (dropdown: globe, azimuthalEquidistant, orthographic, equirectangular)
- Locale (dropdown: en, de, fr, it)
- Surface Tint (color picker)
- Overlay Tint (color picker)
- ▸ Viewer UI (collapsible) — toggles for compass, scale, legend, fullscreen, inspect, projection, borders, labels, attribution, body selector
- ▸ Data Sources (collapsible) — list of data sources with add/edit/remove
- ▸ Filters (collapsible) — filter definitions

**Localized text fields:** Schema fields like `name`, `description`, and `calloutLabel` are localized text objects (`{en: "...", de: "..."}`) in the schema. The properties panel edits only the currently active locale (as set in Scene Settings > Locale). A small locale badge appears next to text inputs to indicate which locale is being edited. Switching the scene locale updates all text inputs to show that locale's value.

**When a Marker is selected:**
- Primary fields (ungrouped, always visible): Name, Position (Lat/Lon), Color (swatch + hex input), Callout Label
- ▸ Appearance (collapsible): Visual Type (dot/image/model/text), Scale, Pulse toggle, Callout Mode (always/hover/click/none), Asset URI (for image/model types)
- ▸ Metadata (collapsible): Category, Timestamp, Source ID, Description
- ▸ Animation (collapsible): Movement keyframes list, link to timeline

**When an Arc is selected:**
- Primary: Name, Start (Lat/Lon), End (Lat/Lon), Color
- ▸ Appearance: Max Altitude, Stroke Width, Dash Pattern, Animation Time, Animation Delay
- ▸ Metadata: Category, Source ID

**When a Path is selected:**
- Primary: Name, Color, Points count (with "Edit Points" button to enter point-editing mode)
- ▸ Appearance: Stroke Width, Dash Pattern, Animation Duration
- ▸ Metadata: Category, Source ID

**When a Region is selected:**
- Primary: Name, Cap Color, Side Color, Altitude
- ▸ Metadata: Source ID
- ▸ GeoJSON: Read-only preview of polygon data

### Timeline (Bottom)

160px tall, resizable by dragging the top border. Full animation editor with:

**Animation Model Extensions:**
The existing `AnimationEngine` and schema support `{t, value}` keyframes with linear interpolation. Studio extends this:

- **Visibility intervals**: Added to the schema as `visibility: [{from: ms, to: ms}]` per entity. Entities without a visibility array are always visible (backward-compatible). The timeline renders these as colored bars.
- **Easing per keyframe**: Each keyframe gains an optional `easing: string` field (default `'linear'`). Supported values: `'linear'`, `'ease-in'`, `'ease-out'`, `'ease-in-out'`, `'bounce'`, `'elastic'`, `'cubic-bezier(x1,y1,x2,y2)'`. The `AnimationEngine.sample()` method is extended to apply easing between keyframe pairs.
- **Camera keyframes**: Added to the schema as `cameraAnimation: [{t: ms, value: {lat, lon, alt, tilt, rotation}, easing?}]` at the scene level. During playback, the camera tween system (`cameraTween.js`) is bypassed — Studio's playback loop drives camera position directly from interpolated camera keyframes. Outside playback, `cameraTween.js` remains active for user-initiated flyTo operations.
- **Schema version**: Remains version 1. New fields are optional and ignored by older viewers (graceful degradation).

The timeline editor with:

**Transport Bar:**
- Timeline label
- Skip to start (⏮), Play/Pause (▶/⏸), Skip to end (⏭)
- Current time / total duration (editable)
- Spacer
- Loop toggle (↻)
- Add keyframe at playhead (◆+)
- Easing curve editor (∿) — opens a popup with preset curves (linear, ease-in, ease-out, ease-in-out, bounce, elastic) and custom bezier control
- Zoom in/out (+/−) for timeline scale

**Track Area:**
- Left column (140px): element labels with visibility eye toggle (👁) and color dot. Clicking a label selects that element in the viewport. Includes a Camera track row.
- Right area: horizontal tracks per element showing:
  - **Visibility bars** — colored rectangles showing when element is visible. Drag edges to adjust start/end times.
  - **Keyframe diamonds** (◆) — positioned at time points where properties change. Click to select, drag to move, right-click for options (delete, copy, paste). Double-click to edit value.
  - **Playhead** — vertical line with triangle handle, draggable to scrub time.
  - **Ruler** — time markings along the top, scaling with zoom level.

**Camera Track:**
Dedicated track for camera keyframes. Each keyframe stores: lat, lon, altitude (zoom), tilt, rotation. Adding a camera keyframe captures the current viewport state. During playback, the camera interpolates between keyframes using SLERP for position and smooth easing for altitude/tilt.

**Motion Paths:**
When a marker with movement keyframes is selected, a dotted motion path is rendered on the globe surface showing the trajectory. Keyframe positions appear as small draggable handles on the path.

## Preview Mode

Triggered by the ▶ Preview button (or Space key):
1. All editor UI fades out (tool strip, properties panel, timeline, menu bar).
2. The viewport expands to fill the window.
3. The animation plays from the beginning (or from playhead position if Shift+Space).
4. HUD elements appear as configured in viewerUi settings.
5. Press Space or Escape to exit preview and restore the editor UI.

## Data Flow

### Scene Store Integration
Studio wraps the existing `SceneStore` (event emitter pattern). All edits go through the store, which emits change events that the viewer reacts to (live preview).

### Undo/Redo (`studio/state/undoRedo.js`)

A snapshot-based undo/redo system that sits between the editor UI and SceneStore:

- **Interface**: `push(scene)`, `undo() → scene`, `redo() → scene`, `canUndo`, `canRedo`.
- **Mechanism**: Full scene snapshots (JSON-serializable). Each edit pushes the previous scene state onto the undo stack. Undo pops the stack and calls `SceneStore.setScene(snapshot)`. Redo uses a separate forward stack, cleared on any new edit.
- **Stack depth**: Maximum 50 entries. Oldest entries are discarded when the limit is reached.
- **Why snapshots over commands**: The scene JSON is small (typically < 100 KB). Snapshot-based undo avoids the complexity of defining reversible commands for every possible edit, and guarantees correctness.

### Editor Store (`studio/state/editorStore.js`)

Manages UI-only state that does not belong in the scene:

- **Interface**: `getState() → {activeTool, selection, panelsVisible, playbackState}`, `dispatch(action)`, `on(event, handler)`.
- **State shape**: `{activeTool: string, selectedIds: string[], propertiesVisible: bool, timelineVisible: bool, hudVisible: bool, playbackState: 'stopped'|'playing'|'paused', playheadMs: number}`.
- Emits `'change'` events consumed by UI components.

The scene schema remains at version 1. Serialization uses the same `exportSceneToJSON()` / `importSceneFromJSON()` pipeline.

### Session Transfer
- **Viewer → Studio**: Scene JSON written to `sessionStorage['globi-studio-scene']`, Studio reads on load.
- **Studio → File**: File > Save downloads the scene JSON. File > Export produces format-specific output.
- **File → Studio**: File > New from File reads a local JSON/GeoJSON file. File > New from Clipboard parses clipboard content.

## AI Companions

### CustomGPT (Tools > Custom ChatGPT)
A publicly available ChatGPT Custom GPT that:
- Knows the full Globi scene schema (markers, arcs, paths, regions, animations, filters, data sources, viewerUi).
- Guides users through scene creation via conversational Q&A ("What do you want to show on the globe?").
- Generates complete Globi scene JSON that can be pasted into Studio via File > New from Clipboard.
- Can modify existing scenes (user pastes their JSON, asks for changes).
- Suggests best practices (color schemes, callout modes, category grouping).
- Links to Studio and documentation.

Menu item opens the CustomGPT URL in a new tab.

### Claude Cowork (Tools > Claude Cowork)
A similar system prompt for Claude (via claude.ai Projects or API) with the same capabilities. Menu item opens a Claude conversation URL or project link.

Both prompts are stored as text files in the repository (`docs/ai-companions/`).

## File Structure

```
studio/
├── index.html          — Studio page shell
├── app.js              — Main Studio application
├── styles.css          — Studio styles (dark theme)
├── components/
│   ├── menuBar.js      — Menu bar with dropdowns
│   ├── toolStrip.js    — Left tool strip
│   ├── propertiesPanel.js — Right properties panel
│   ├── timeline.js     — Bottom timeline editor
│   ├── easingEditor.js — Easing curve popup
│   └── previewMode.js  — Preview mode overlay
├── state/
│   ├── editorStore.js  — Editor state (selection, active tool, UI toggles)
│   ├── undoRedo.js     — Undo/redo command stack
│   └── sessionTransfer.js — sessionStorage read/write
└── tools/
    ├── selectTool.js   — Select/move interaction handler
    ├── markerTool.js   — Marker placement
    ├── arcTool.js      — Arc placement (two clicks)
    ├── pathTool.js     — Path placement (multi-click + freehand)
    ├── regionTool.js   — Region polygon placement
    └── drawTool.js     — Freehand drawing with surface sampling

docs/ai-companions/
├── globi-custom-gpt-prompt.md  — CustomGPT system prompt
└── globi-claude-cowork-prompt.md — Claude system prompt
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| V | Select tool |
| M | Add Marker tool |
| A | Add Arc tool |
| L | Add Path tool |
| R | Add Region tool |
| D | Freehand Draw tool |
| Shift+D | Toggle freehand / point-to-point |
| Space | Toggle Preview mode |
| Shift+Space | Preview from playhead |
| Escape | Exit (priority: preview exit > tool cancel > deselect) |
| Delete | Delete selected element |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+D | Duplicate selected |
| Ctrl+A | Select all |
| Ctrl+S | Save as File (Download) |
| Ctrl+O | Open File |
| Ctrl+Shift+V | New from Clipboard |
| Ctrl+N | New Scene |
| P | Toggle Properties Panel |
| T | Toggle Timeline |
| H | Toggle HUD |
| F | Zoom to Fit |
| Shift+R | Reset Camera |
| ? | Show Keyboard Shortcuts |

## Non-Functional Requirements

- **No additional dependencies** — Studio is built with vanilla JS/CSS, same as the rest of Globi. No React, no framework.
- **Dark theme** — matches the dark aesthetic of the globe viewport. Accent color: `#7a7aff`.
- **Responsive** — panels can be toggled off on smaller screens. Minimum supported: 1024x768.
- **Performance** — editing operations (select, move, property change) reflect in the viewport within a single frame (~16ms).
- **Bundle** — Studio is a separate entry point, not bundled into `globi.min.js`. It imports from `src/` directly during development and from `dist/globi.js` in production.

## Scope Boundaries

**In scope (v1):**
- Full layout (menu bar, tool strip, viewport, properties panel, timeline)
- All placement tools (marker, arc, path, region, freehand draw)
- Properties editing for all element types
- Scene settings editing
- Timeline with visibility bars, property keyframes, camera keyframes, easing curves, motion paths
- Preview mode
- File operations (new, open, save, export)
- Undo/redo
- Context menu "Open Studio" integration
- CustomGPT and Claude companion prompts

**Out of scope (future):**
- Collaborative editing (multi-user)
- Cloud storage / accounts
- Plugin system
- Custom shader editor
- Video export / screen recording
- Mobile-optimized layout
