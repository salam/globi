# Callout Clustering Design

**Date:** 2026-03-12
**Status:** Approved

## Problem

When multiple markers are placed near each other on the globe, their callout labels overlap and become unreadable. There is no mechanism to detect or resolve spatial collisions between callout labels.

## Solution

Cluster overlapping callouts at the schema level based on geographic proximity (haversine distance). Render small clusters (2-3) as a stacked card cascade; render large clusters (4+) as a collapsible group badge.

## Requirements

- Clustering is geographic (lat/lon), not screen-projected
- Clustering runs during scene normalization (schema.js), not per-frame
- Default threshold: 2 degrees of arc
- Threshold is configurable per scene via `calloutCluster.thresholdDeg`
- Clustering can be disabled with `calloutCluster.enabled: false`
- Markers with `calloutMode: 'none'` are excluded from clustering
- Altitude (`alt`) is ignored for clustering — two markers at the same lat/lon but different altitudes will cluster together

## Schema Changes

New optional property on the scene root:

```js
calloutCluster: {
  enabled: true,         // default true
  thresholdDeg: 2,       // great-circle degrees, default 2
}
```

During `normalizeScene()`, after normalizing markers, a clustering pass annotates each marker with computed fields:

- `_clusterId` — string like `"cluster_0"` or `null` if unclustered
- `_clusterIndex` — position within the cluster (0, 1, 2...)
- `_clusterSize` — total markers in this cluster
- `_clusterCenter` — `{ lat, lon }` vector centroid of the cluster (see Centroid Calculation below)

The `_` prefix signals these are computed/transient, not user-authored.

### Centroid Calculation

To avoid antimeridian and pole issues, the centroid is computed using 3D vector averaging:

1. Convert each marker's (lat, lon) to a unit 3D vector (x, y, z)
2. Average the vectors component-wise
3. Convert the average vector back to (lat, lon)

This produces correct centroids regardless of longitude wrapping.

## Clustering Algorithm

Greedy single-pass clustering using haversine distance, bounded by radius from centroid:

1. Sort markers by lat (stable ordering)
2. For each unassigned marker, create a new cluster with it as seed
3. Walk remaining unassigned markers — if haversine distance to seed <= `thresholdDeg`, tentatively add to cluster
4. After tentative assignment, run a convergence loop: compute the cluster centroid, evict any member that exceeds `thresholdDeg` from the centroid, recompute centroid, repeat until no members are evicted. Evicted markers are returned to the unassigned pool and may seed a new cluster in subsequent iterations of the outer loop (step 2).
5. After all assigned, annotate each with `_clusterId`, `_clusterIndex`, `_clusterSize`, `_clusterCenter`

This prevents non-contiguous "chain" clusters where markers are daisy-chained via the seed but far from the actual centroid. The convergence loop guarantees every cluster member is within `thresholdDeg` of its final centroid.

Complexity: O(n^2), acceptable for typical marker counts (<1000).

## Rendering Behavior

CalloutManager reads the `_cluster*` fields and renders based on cluster size:

### Solo markers (`_clusterId === null`)

No change from current behavior.

### Small clusters (2-3 markers) — Stacked Card Cascade

- Each label gets a vertical CSS offset: `clusterIndex * 20px` downward
- Each label gets a horizontal offset: `clusterIndex * 4px` rightward
- Slight opacity reduction per layer: 1.0, 0.9, 0.8
- All share a single leader line to the cluster center
- Labels with `calloutMode: 'always'` are visible simultaneously
- Labels with `calloutMode: 'hover'` or `'click'` show only when their individual trigger fires (hover/click the cascade area); their cascade slot is reserved but empty until triggered

### Large clusters (4+ markers) — Group Badge

- Render a single callout label showing "N markers" (localized)
- Single leader line to cluster center
- Click to expand into stacked cascade showing all individual labels
- Click again or click elsewhere to collapse back

The leader line always originates from `_clusterCenter` for clustered markers.

### Visibility / Front-back Culling

The cluster badge (or cascade group) is registered in `#calloutData` under a synthetic ID (e.g. `"cluster_0"`) with `surfacePosition` set to the cluster center's cartesian coordinates. This allows `updateVisibility()` to cull the badge/cascade when the cluster center rotates to the far side of the globe, using the same dot-product check as individual callouts.

## Interaction

### Expand/Collapse

- Click group badge -> hide badge, show individual labels in cascade
- `_clusterExpanded` state is tracked per cluster in CalloutManager (transient UI state, not schema)
- Click badge again -> collapse back
- Click elsewhere on globe -> collapse back (listener on container element, not global)

### Hover/Click Modes Within Clusters

- Markers with `calloutMode: 'hover'` or `'click'` still participate in clustering
- In small clusters (2-3): their cascade slot is reserved but label appears only on trigger
- In large clusters (4+): their label only appears when the cluster is expanded AND their trigger fires
- Group badge always counts all clustered markers regardless of mode

### Filter Interaction

When `filterCallouts(matchingIds)` is called:

- **Collapsed badge:** If any member marker matches, the badge stays at full opacity. If no members match, the badge dims to 20% opacity. The badge text does not change (still shows total count).
- **Expanded cluster / small cascade:** Each individual label follows the existing dim/full logic based on whether its marker ID is in the match set.
- **Reset (null):** Badges and cascades restore opacity to 1.0 and return to full display (matching the existing opacity-based pattern in `filterCallouts`).

### Events

- Clicking an individual label (cascade or expanded group) fires existing `calloutClick` CustomEvent
- Clicking the group badge fires `calloutClick` with `kind: 'cluster'` and `detail.markerIds: [...]`

## Testing Strategy

### CalloutManager tests (`tests/callout-manager.test.js`)

1. Two markers within 2 deg -> same cluster, cascade offsets applied
2. Two markers 10 deg apart -> no clustering, individual callouts
3. Four markers within 2 deg -> group badge created, individual labels hidden
4. Custom `thresholdDeg` respected
5. Expand/collapse state toggling (badge click to expand, badge click to collapse)
6. Collapse on click-elsewhere (container-level listener)
7. `calloutMode: 'none'` markers excluded from clusters
8. `filterCallouts` dims badge when no members match, keeps full when some match
9. Badge visibility culled when cluster center is backfacing

### Schema tests

1. `normalizeScene` adds `_cluster*` fields correctly
2. Default `calloutCluster` config when omitted
3. `enabled: false` skips clustering entirely
4. Centroid calculation handles antimeridian wrap (lon 179 + lon -179)
5. Evicted marker (within seed threshold but outside centroid) forms its own cluster

## Files Modified

- `src/scene/schema.js` — clustering in normalizeScene, new calloutCluster config, centroid calculation
- `src/renderer/calloutManager.js` — cascade/badge rendering, expand/collapse state, cluster visibility
- `src/renderer/threeGlobeRenderer.js` — wire expand/collapse click handlers, container click-elsewhere listener
- `tests/callout-manager.test.js` — clustering + rendering tests
- `tests/schema.test.js` or `tests/examples.test.js` — schema clustering tests
