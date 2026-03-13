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

## Approach: Three.js Raycasting Against the Sphere Mesh

Use Three.js `Raycaster` to intersect the cursor ray with the globe sphere mesh, then convert the 3D intersection point to geographic lat/lon. This is exact for the perspective camera (FOV 45°) that the renderer uses — unlike `inverseOrthographicProject` which assumes orthographic projection and would produce drift at the globe edges.

The `hitTest` method already demonstrates this raycasting pattern. A new lightweight method `screenToLatLon(clientX, clientY)` will be added to the renderer to raycast against the earth mesh and return `{ lat, lon }` or `null`.

### Alternatives Considered

- **Inverse orthographic projection:** The codebase has `inverseOrthographicProject`, but the renderer uses a `PerspectiveCamera`. The mismatch causes progressive drift toward the globe limb — exactly the problem we're solving.
- **Arcball (quaternion-based):** Overkill — introduces tilt/roll which doesn't apply to a lat/lon-constrained globe. Conflicts with the existing Euler-based rotation system.
- **Zoom-scaled screen delta:** Simpler but doesn't actually grab the surface — the point under the cursor still drifts during drag.

## Design

### Files Changed

| File | Change |
| ---- | ------ |
| `src/components/globi-viewer.js` | Modify `#onPointerDown`, `#onPointerMove`, `#onPointerUp`; remove `#startInertia` |
| `src/controller/globeController.js` | Add `screenToLatLon(clientX, clientY)` passthrough |
| `src/renderer/threeGlobeRenderer.js` | Add `screenToLatLon(clientX, clientY)` using raycaster |

### screenToLatLon API

New method on the renderer (passed through by controller). The earth mesh has radius 1.0 (unit sphere). Uses the existing `cartesianToLatLon` from `src/math/geo.js` to avoid duplicating coordinate conversion logic.

```js
screenToLatLon(clientX, clientY) {
  // 1. Convert clientX/clientY to NDC (same as hitTest)
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

  // 2. Raycast against earth mesh (radius 1.0 unit sphere)
  const raycaster = new Raycaster();
  raycaster.setFromCamera(new Vector2(ndcX, ndcY), camera);
  const hits = raycaster.intersectObject(earthMesh);
  if (hits.length === 0) return null;

  // 3. Get intersection point in world space, undo globe rotation to get
  //    the point in unrotated (geographic) space
  const worldPoint = hits[0].point.clone();
  const inverseRotation = globeGroup.quaternion.clone().invert();
  worldPoint.applyQuaternion(inverseRotation);

  // 4. Convert cartesian to lat/lon using existing utility
  return cartesianToLatLon(worldPoint.x, worldPoint.y, worldPoint.z);
}
```

### Phase 1: Pointer Down

1. Cancel any in-progress flyTo animation (existing `#stopFocusAnimation()` call)
2. Pause idle rotation (save current `rotationSpeed`, set to 0 for the drag duration)
3. Record screen position (for click-vs-drag travel detection)
4. Call `controller.screenToLatLon(clientX, clientY)` → `grabLatLon`
5. Store `grabLatLon` on the drag state
6. Store `lastX`/`lastY` screen position for fallback deltas
7. If `grabLatLon` is `null` (clicked outside the globe disk), flag for fallback mode
8. Get zoom from `controller.getCameraState().zoom` and store on drag state for fallback scaling

### Phase 2: Pointer Move (On-Disk)

1. Call `controller.screenToLatLon(clientX, clientY)` → `currentLatLon`
2. If `currentLatLon` is not null:
   - `deltaLon = grabLatLon.lon - currentLatLon.lon`
   - `deltaLat = grabLatLon.lat - currentLatLon.lat`
   - Call `controller.panBy(deltaLon, deltaLat)`
   - Sign explanation: if the user drags east, `currentLatLon.lon > grabLatLon.lon`, so `deltaLon` is negative. `panBy` does `centerLon -= deltaLon`, which adds to centerLon — moving the view east. The grab point stays under the cursor.
3. Update screen position and travel for click detection
4. When cursor re-enters the disk after being off-disk, re-anchor `grabLatLon` to the current lat/lon under the cursor to avoid a discontinuity

### Phase 3: Pointer Move (Off-Disk Fallback)

When `screenToLatLon` returns `null` (cursor has left the globe disk):

- Use screen-space pixel deltas from `lastX`/`lastY`
- Scale by zoom: `coefficient = (180 / Math.PI) / globeScreenRadius` where `globeScreenRadius = min(canvasWidth, canvasHeight) * 0.45 * zoom` (the apparent globe radius in pixels). This derives from the angular rate per pixel at the globe limb, ensuring a smooth transition when the cursor crosses the disk boundary.
- Call `controller.panBy(dx * coefficient, -dy * coefficient)`
- Update `lastX`/`lastY` for next frame's delta calculation

### Phase 4: Pointer Up

1. End drag, release pointer capture
2. Restore idle rotation speed (saved in Phase 1)
3. If travel < 6px → treat as click (existing inspection behavior)
4. No inertia — globe stops immediately

### Camera State Access

The off-disk fallback needs zoom to compute the scaling coefficient. This is already available via the existing `getCameraState()` API which returns `{ centerLon, centerLat, zoom }`. No new API needed.

### Removed Code

- `#startInertia()` method — no more momentum after drag release
- `#inertiaFrame` field — no animation frame tracking for inertia
- `vx`/`vy` velocity tracking on drag state — not needed without inertia

### Edge Cases

| Case | Handling |
| ---- | -------- |
| Grab outside disk initially | Fallback mode for entire drag (zoom-scaled screen deltas) |
| Cursor drifts off disk mid-drag | Switch to fallback seamlessly; screen-delta direction naturally continues rotation |
| Cursor returns to disk after off-disk | Re-anchor `grabLatLon` to current lat/lon under cursor (avoids jump) |
| Idle rotation active during drag | Paused on pointer-down, restored on pointer-up (prevents drift fighting grab) |
| FlyTo animation in progress | Cancelled on pointer-down (existing `#stopFocusAnimation()`) |
| Zoom while dragging | Not applicable — wheel zoom doesn't fire during pointer-captured drag |
| Very fast drag across the disk | Each move event re-raycasts; large deltas are fine since `panBy` clamps latitude and wraps longitude |
| Window/canvas resize during drag | Handled implicitly — raycaster uses current canvas dimensions each frame |

## Testing

- Unit test: `screenToLatLon` returns correct lat/lon for known NDC positions on the sphere
- Unit test: surface grab produces correct panBy deltas for known screen positions
- Unit test: off-disk fallback uses zoom-scaled deltas
- Unit test: no inertia after pointer-up
- Unit test: click detection (< 6px travel) still works
- Unit test: re-anchoring when cursor returns to disk after off-disk
- Unit test: round-trip accuracy — project lat/lon to screen via perspective camera, then invert via `screenToLatLon`, measure error
- Manual test: grab a recognizable point (e.g., a city marker) and verify it tracks the cursor
- Manual test: zoom in and verify drag sensitivity decreases proportionally
- Manual test: drag cursor off the globe edge and verify smooth continued rotation
