# Surface-Grab Drag Rotation

**Date:** 2026-03-11
**Status:** Approved

## Problem

The current drag rotation uses a fixed coefficient (0.18° per pixel) to convert screen-space mouse deltas into globe rotation. This means:

- The point under the cursor drifts during drag — it doesn't feel like grabbing the surface
- Drag sensitivity doesn't scale with zoom level — zoomed in or out, the same pixel movement produces the same degree change

## Desired Behavior

When the user presses down on the globe, the geographic point under the cursor should "stick" to the cursor. As the mouse/touch moves, the globe rotates so that point tracks the cursor — like physically grabbing and turning a ball.

### Requirements

1. **Surface grab:** The lat/lon under the cursor at pointer-down anchors to the cursor throughout the drag
2. **Zoom scaling:** Automatic — when zoomed in, the same pixel movement maps to a smaller geographic delta because the globe fills more screen space
3. **No inertia:** The globe stops immediately on pointer-up (removes current momentum/friction behavior)
4. **Off-disk fallback:** When the cursor leaves the visible globe disk (during drag), rotation continues in the same direction using zoom-scaled screen-space deltas
5. **Click detection preserved:** Drags with < 6px travel are still treated as clicks for inspection

## Approach: Raycast-to-Surface via Inverse Orthographic Projection

Use the existing `inverseOrthographicProject()` function to map screen pixels to lat/lon on the globe surface. This function already accounts for globe radius (which includes zoom), center position, and viewport dimensions.

### Alternatives Considered

- **Arcball (quaternion-based):** Overkill — introduces tilt/roll which doesn't apply to a lat/lon-constrained globe. Conflicts with the existing Euler-based rotation system.
- **Zoom-scaled screen delta:** Simpler but doesn't actually grab the surface — the point under the cursor still drifts during drag.

## Design

### Files Changed

| File | Change |
|------|--------|
| `src/components/globe-viewer.js` | Modify `#onPointerDown`, `#onPointerMove`, `#onPointerUp`; remove `#startInertia` |
| `src/controller/globeController.js` | Add `getProjectionParams()` to expose width, height, globeRadius, centerLon, centerLat |
| `src/renderer/threeGlobeRenderer.js` | Add `getProjectionParams()` to expose projection state |

### Phase 1: Pointer Down

1. Record screen position (for click-vs-drag travel detection)
2. Get projection params from controller: `{ width, height, globeRadius, centerLon, centerLat }`
3. Convert `clientX`/`clientY` to canvas-local coords via `getBoundingClientRect()`
4. Call `inverseOrthographicProject(localX, localY, params)` → `grabLatLon`
5. Store `grabLatLon` on the drag state
6. If `grabLatLon` is `null` (clicked outside the globe disk), flag for fallback mode

### Phase 2: Pointer Move (On-Disk)

1. Get fresh projection params (centerLon/centerLat updated since last move)
2. Convert client coords to canvas-local
3. Call `inverseOrthographicProject(localX, localY, params)` → `currentLatLon`
4. If `currentLatLon` is not null:
   - `deltaLon = grabLatLon.lon - currentLatLon.lon`
   - `deltaLat = grabLatLon.lat - currentLatLon.lat`
   - Call `controller.panBy(deltaLon, deltaLat)`
   - Note: `panBy` subtracts `deltaLon` from `centerLon` and adds `deltaLat` to `centerLat` internally, so the signs here match the "grab point tracks cursor" semantic
5. Update screen position for travel tracking

### Phase 3: Pointer Move (Off-Disk Fallback)

When `inverseOrthographicProject` returns `null` (cursor has left the globe disk):

- Fall back to screen-space pixel deltas
- Scale by zoom: `coefficient = 0.18 / zoom`
- This continues rotation in the same direction smoothly
- Update `lastX`/`lastY` for next frame's delta calculation

### Phase 4: Pointer Up

1. End drag, release pointer capture
2. If travel < 6px → treat as click (existing inspection behavior)
3. No inertia — globe stops immediately

### Coordinate Conversion

`inverseOrthographicProject` expects pixel coordinates relative to the canvas origin (top-left = 0,0). The drag handlers receive `clientX`/`clientY` (viewport-relative). Convert via:

```
const rect = canvas.getBoundingClientRect();
const localX = clientX - rect.left;
const localY = clientY - rect.top;
```

This pattern already exists in the hit-test code.

### getProjectionParams API

New method on both controller and renderer:

```js
getProjectionParams() {
  return {
    width: canvasWidth,
    height: canvasHeight,
    globeRadius: getGlobeRadius(canvasWidth, canvasHeight, this.#zoom),
    centerLon: this.#centerLon,
    centerLat: this.#centerLat,
  };
}
```

### Removed Code

- `#startInertia()` method — no more momentum after drag release
- `#inertiaFrame` field — no animation frame tracking for inertia
- `vx`/`vy` velocity tracking on drag state — not needed without inertia

### Edge Cases

| Case | Handling |
|------|----------|
| Grab outside disk initially | Fallback mode for entire drag (zoom-scaled screen deltas) |
| Cursor drifts off disk mid-drag | Switch to fallback seamlessly; screen-delta direction naturally continues rotation |
| Zoom while dragging | Not applicable — wheel zoom doesn't fire during pointer-captured drag |
| Very fast drag across the disk | Each move event re-projects; large deltas are fine since `panBy` clamps latitude and wraps longitude |

## Testing

- Unit test: surface grab produces correct panBy deltas for known screen positions
- Unit test: off-disk fallback uses zoom-scaled deltas
- Unit test: no inertia after pointer-up
- Unit test: click detection (< 6px travel) still works
- Manual test: grab a recognizable point (e.g., a city marker) and verify it tracks the cursor
- Manual test: zoom in and verify drag sensitivity decreases proportionally
