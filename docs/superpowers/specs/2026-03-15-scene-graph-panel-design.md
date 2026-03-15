# Scene Graph Panel — Design Spec

## Overview

A tree panel listing all scene entities (markers, arcs, paths, regions) grouped by type. Supports two docking positions (left sidebar / top of properties panel) toggled by the user. Hidden by default; auto-shows briefly on globe selection.

## New File

`studio/components/sceneGraph.js` — self-contained component following the same pattern as `propertiesPanel.js`.

## Docking Positions

### Position A — Left Sidebar (default)
- Panel appears between tool strip and viewport
- Width: ~200px
- Full height of the main area

### Position B — Top of Properties Panel
- Scene graph renders above the properties panel content
- Resizable divider between scene graph and properties
- Shares the 280px properties column
- Divider is a 4px drag handle; min height for scene graph: 80px, min height for properties: 120px
- Divider position is ephemeral (not persisted)

### Toggle
- Dock button in the scene graph header (⇥ to move right, ⇤ to move left)
- Preference stored in `editorStore` as `sceneGraphDock: 'left' | 'right'`

## Auto-Show / Hide Behavior

- `sceneGraphPinned: false` by default in editorStore
- On globe selection (via selectTool): panel slides in, stays for ~2 seconds, then fades out
- Each new selection resets the 2-second timer
- If the user hovers or interacts with the panel during auto-show, it stays open until the mouse leaves
- Pin button (📌) in the header toggles `sceneGraphPinned`
- When pinned, panel stays visible permanently
- When unpinned, panel hides after mouse leaves

## Tree Structure

### Groups
- Four collapsible groups: Markers, Arcs, Paths, Regions
- Each group header shows: icon (reuse the same Unicode characters from `toolStrip.js`) + type name + count in parentheses
- Click header to expand/collapse
- Collapse state is ephemeral (not persisted across sessions)
- Empty groups are still shown (collapsed)

### Entity Rows
Each row displays:
- Type-colored icon (same Unicode characters as tool strip)
- Entity name (localized, using current scene locale)
- Eye icon (visibility toggle) — shown on hover or when `visible === false`
- Selected items highlighted with accent color (`#7a7aff`) left border + tinted background

## Interactions

### Selection
- Click item → dispatches `editorStore.dispatch({ type: 'select', ids: [id] })`
- Ctrl/Cmd+click → toggle item in/out of multi-selection
- Shift+click → range select within same group
- Selection syncs bidirectionally:
  - Globe → tree: `editorStore` 'change' event triggers tree re-render with new `selectedIds`
  - Tree → globe: `onSelect` callback in app.js updates selection via `editorStore.dispatch` and shows arc handle if the selected entity is an arc (reusing the existing `onSelect` logic from selectTool)

### Visibility Toggle
- Eye icon per row: toggles `visible` field on the entity
- `visible` property is only written when set to `false` — absence means visible (default `true`)
- Group header eye icon: toggles all items in that group
- Hidden items: dimmed text + crossed-out eye icon
- Renderer skips entities with `visible !== false` check in each render loop (markers, arcs, paths, regions)
- View menu: "Show Hidden Objects" toggle — when on, studio renders hidden entities with opacity 0.25
- All visibility changes go through `pushScene()` for undo/redo integration

### Context Menu (right-click)
- Custom context menu DOM element (dark popup, matching studio theme) — no existing context menu in the codebase, so build a lightweight one-off
- **On item:** Rename, Duplicate, Delete, Toggle Visibility
- **On group header:** Select All, Show All, Hide All
- Works on multi-selection (e.g., "Delete 3 items")
- Delete/Duplicate callbacks reuse the existing `handleMenuAction('deleteSelected')` / `handleMenuAction('duplicate')` logic in app.js — extend `duplicate` to support arcs, paths, and regions (currently only supports markers)

### Inline Rename
- Double-click entity name → editable text input
- Enter to confirm, Escape to cancel
- `onRename` callback receives `(entityType, id, newName)` — the caller (app.js) is responsible for wrapping it as `entity.name[scene.locale] = newName` using the current scene locale

### Drag to Reorder
- Drag items within their group to change array position
- Visual drop indicator (horizontal line) between items
- Reordering changes the entity's position in `scene[type]` array (affects render order)
- Cannot drag between groups
- Reorder calls `pushScene()` for undo/redo integration

## Component API

```javascript
class SceneGraph {
  constructor(container, {
    onSelect,           // (ids: string[]) => void
    onVisibilityChange, // (entityType: string, id: string, visible: boolean) => void
    onReorder,          // (entityType: string, fromIndex: number, toIndex: number) => void
    onRename,           // (entityType: string, id: string, newName: string) => void — caller wraps into localized name
    onDelete,           // (ids: string[]) => void
    onDuplicate,        // (ids: string[]) => void
  })

  render(scene, selectedIds)  // Re-render tree from scene data
  setDock(position)           // 'left' | 'right'
  show()                      // Slide in (for auto-show)
  hide()                      // Slide out
  destroy()                   // Cleanup
}
```

## EditorStore Changes

New state fields (add to DEFAULTS and switch cases):
- `sceneGraphDock: 'left' | 'right'` — default `'left'`
- `sceneGraphPinned: boolean` — default `false`
- `showHiddenObjects: boolean` — default `false`

New actions (add `case` branches in `dispatch()`):
- `setSceneGraphDock` — sets dock position, payload: `{ dock: 'left' | 'right' }`
- `toggleSceneGraphPinned` — toggles pin state
- `toggleShowHiddenObjects` — toggles hidden object visibility in studio

## DOM Structure Changes

### index.html
Add a single `<div id="scene-graph-dock"></div>` inside `.main`, between `#tool-strip` and `#viewport` (position A default). When docking to position B, the SceneGraph component moves its root element into a `<div id="scene-graph-slot"></div>` prepended inside `#properties`. Only one slot div exists at a time; the empty one is hidden or absent.

## CSS

- Panel background: match the existing properties panel background from `styles.css`
- Group headers: slightly lighter background, `#888` text, uppercase, small font
- Entity rows: hover highlight, selected state with `#7a7aff` accent
- Eye icon: `#666` default, `#7a7aff` on hover, `#ff4444` crossed-out when hidden
- Transition: `transform 0.2s ease` for slide in/out
- Context menu: absolute-positioned dark popup, `z-index` above viewport

## Menu Bar Changes

### View menu — add items:
- "Show Scene Graph" (G) — toggles pinned state
- "Show Hidden Objects" — toggles `showHiddenObjects`

### Keyboard shortcut:
- G — toggle scene graph pinned (bare key, no modifier)

## Renderer Changes

- In each entity render loop (markers, arcs, paths, regions), add `if (entity.visible === false) continue;` at the top of the iteration
- When `showHiddenObjects` is true (studio-only flag passed via scene or controller), render hidden entities with opacity 0.25 instead of skipping them
- The `showHiddenObjects` flag is a studio concern — pass it through `viewer.setStudioOptions({ showHiddenObjects })` or similar, not in the scene JSON

## Files Modified

1. `studio/components/sceneGraph.js` — **NEW** — scene graph component
2. `studio/app.js` — instantiate SceneGraph, wire callbacks, handle dock position DOM moves, extend duplicate to all entity types
3. `studio/components/menuBar.js` — add View menu items
4. `studio/state/editorStore.js` — add new state fields and actions
5. `studio/index.html` — add `scene-graph-dock` and `scene-graph-slot` containers
6. `studio/styles.css` — scene graph panel and context menu styles
7. `src/renderer/threeGlobeRenderer.js` — skip `visible === false` entities, support `showHiddenObjects` opacity
8. Tests for the new component
