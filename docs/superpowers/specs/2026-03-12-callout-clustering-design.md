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
- `_clusterCenter` — `{ lat, lon }` centroid of the cluster

The `_` prefix signals these are computed/transient, not user-authored.

## Clustering Algorithm

Greedy single-pass clustering using haversine distance:

1. Sort markers by lat (stable ordering)
2. For each unassigned marker, create a new cluster with it as seed
3. Walk remaining unassigned markers — if haversine distance to seed <= `thresholdDeg`, add to cluster
4. After all assigned, annotate each with `_clusterId`, `_clusterIndex`, `_clusterSize`, `_clusterCenter`

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
- All labels are visible simultaneously

### Large clusters (4+ markers) — Group Badge

- Render a single callout label showing "N markers" (localized)
- Single leader line to cluster center
- Click to expand into stacked cascade showing all individual labels
- Click again or click elsewhere to collapse back

The leader line always originates from `_clusterCenter` for clustered markers.

## Interaction

### Expand/Collapse

- Click group badge -> hide badge, show individual labels in cascade
- `_clusterExpanded` state is tracked per cluster in CalloutManager (transient UI state, not schema)
- Click badge again or click elsewhere on globe -> collapse back
- Collapse listener on container element, not global

### Hover/Click Modes Within Clusters

- Markers with `calloutMode: 'hover'` or `'click'` still participate in clustering
- Their individual labels only appear when their trigger fires AND the cluster is expanded
- Group badge always counts all clustered markers regardless of mode

### Events

- Clicking an individual label (cascade or expanded group) fires existing `calloutClick` CustomEvent
- Clicking the group badge fires `calloutClick` with `kind: 'cluster'` and `detail.markerIds: [...]`

## Testing Strategy

### CalloutManager tests (`tests/callout-manager.test.js`)

1. Two markers within 2 deg -> same cluster, cascade offsets applied
2. Two markers 10 deg apart -> no clustering, individual callouts
3. Four markers within 2 deg -> group badge created, individual labels hidden
4. Custom `thresholdDeg` respected
5. Expand/collapse state toggling
6. `calloutMode: 'none'` markers excluded from clusters

### Schema tests

7. `normalizeScene` adds `_cluster*` fields correctly
8. Default `calloutCluster` config when omitted
9. `enabled: false` skips clustering entirely

## Files Modified

- `src/scene/schema.js` — clustering in normalizeScene, new calloutCluster config
- `src/renderer/calloutManager.js` — cascade/badge rendering, expand/collapse state
- `src/renderer/threeGlobeRenderer.js` — wire expand/collapse click handlers
- `tests/callout-manager.test.js` — clustering + rendering tests
- `tests/schema.test.js` or `tests/examples.test.js` — schema clustering tests
