import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  Vector3,
} from 'three';
import { latLonToCartesian } from '../math/geo.js';

const LEADER_LENGTH = 0.25;
const LEADER_COLOR_DEFAULT = '#f6b73c';
const LEADER_OPACITY = 0.7;

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export class CalloutManager {
  #group = null;
  #calloutData = new Map();
  #css2dObjects = [];
  #css2dByMarkerId = new Map();
  #css2dByClusterId = new Map();
  #clusterBadgeIds = new Set();
  #expandedClusters = new Set();
  #textColor = null;

  resolveLabel(marker, locale) {
    const label = marker.calloutLabel?.[locale] ?? marker.calloutLabel?.en ?? '';
    if (label) return label;
    return marker.name?.[locale] ?? marker.name?.en ?? '';
  }

  update(group, markers, locale = 'en', { leaderColor = LEADER_COLOR_DEFAULT, textColor = null, zoom = 1 } = {}) {
    this.#group = group;
    this.#textColor = textColor;
    this.#clear();
    // Only shorten leaders when zoomed in (zoom > 1). At zoom <= 1, keep base length.
    // Divide by zoom² so the leader shrinks in screen-space (zoom alone is cancelled by camera).
    const effectiveZoom = Math.max(zoom, 1);
    const leaderLength = LEADER_LENGTH / (effectiveZoom * effectiveZoom);

    // First pass: collect cluster info for large clusters (4+)
    const largeClusterCenters = new Map(); // clusterId -> { center, count, color }
    for (const marker of markers) {
      const mode = marker.calloutMode ?? 'always';
      if (mode === 'none') continue;
      const label = this.resolveLabel(marker, locale);
      if (!label) continue;

      const clusterId = marker._clusterId;
      const clusterSize = marker._clusterSize ?? 1;
      if (clusterId && clusterSize >= 4) {
        if (!largeClusterCenters.has(clusterId)) {
          largeClusterCenters.set(clusterId, {
            center: marker._clusterCenter,
            count: clusterSize,
            color: marker.color || leaderColor,
          });
        }
      }
    }

    // Create one leader line per large cluster (from cluster center)
    for (const [clusterId, info] of largeClusterCenters) {
      const { center, count, color } = info;
      const surfacePos = latLonToCartesian(center.lat ?? 0, center.lon ?? 0, 1, 0);
      const surfaceVec = new Vector3(surfacePos.x, surfacePos.y, surfacePos.z);
      const direction = surfaceVec.clone().normalize();
      const labelPos = surfaceVec.clone().add(direction.clone().multiplyScalar(leaderLength));

      const lineGeo = new BufferGeometry();
      lineGeo.setAttribute('position', new Float32BufferAttribute([
        surfaceVec.x, surfaceVec.y, surfaceVec.z,
        labelPos.x, labelPos.y, labelPos.z,
      ], 3));
      const lineMat = new LineBasicMaterial({
        color,
        transparent: true,
        opacity: LEADER_OPACITY,
        depthWrite: false,
        depthTest: false,
      });
      const line = new Line(lineGeo, lineMat);
      line.renderOrder = 2;
      line.userData = { clusterId, isLeaderLine: true };
      group.add(line);

      // Register badge entry keyed by clusterId
      this.#calloutData.set(clusterId, {
        marker: null,
        label: `${count} markers`,
        line,
        labelPosition: labelPos,
        surfacePosition: surfaceVec,
        mode: 'always',
        color,
        visible: true,
        _isBadge: true,
        _badgeClusterId: clusterId,
        _badgeCount: count,
      });
      this.#clusterBadgeIds.add(clusterId);
    }

    for (const marker of markers) {
      const mode = marker.calloutMode ?? 'always';
      if (mode === 'none') continue;

      const label = this.resolveLabel(marker, locale);
      if (!label) continue;

      const clusterId = marker._clusterId;
      const clusterSize = marker._clusterSize ?? 1;
      const isLargeCluster = clusterId && clusterSize >= 4;
      const isSmallCluster = clusterId && clusterSize >= 2 && clusterSize <= 3;

      // For large clusters: individual markers get no leader line, invisible by default
      if (isLargeCluster) {
        const surfacePos = latLonToCartesian(marker.lat ?? 0, marker.lon ?? 0, 1, marker.alt ?? 0);
        const surfaceVec = new Vector3(surfacePos.x, surfacePos.y, surfacePos.z);
        const direction = surfaceVec.clone().normalize();
        const labelPos = surfaceVec.clone().add(direction.clone().multiplyScalar(leaderLength));
        const markerColor = marker.color || leaderColor;

        this.#calloutData.set(marker.id, {
          marker, label, line: null, labelPosition: labelPos,
          surfacePosition: surfaceVec, mode, color: markerColor,
          visible: false,
        });
        continue;
      }

      const surfacePos = latLonToCartesian(marker.lat ?? 0, marker.lon ?? 0, 1, marker.alt ?? 0);
      const surfaceVec = new Vector3(surfacePos.x, surfacePos.y, surfacePos.z);
      const direction = surfaceVec.clone().normalize();

      // For small clusters: use cluster center for leader line origin (index 0 only),
      // non-index-0 members share the cluster's leader via the index-0 entry
      let lineOrigin = surfaceVec;
      if (isSmallCluster) {
        const centerPos = latLonToCartesian(
          marker._clusterCenter.lat ?? 0,
          marker._clusterCenter.lon ?? 0,
          1, 0,
        );
        lineOrigin = new Vector3(centerPos.x, centerPos.y, centerPos.z);
      }

      const labelPos = lineOrigin.clone().normalize()
        .multiplyScalar(lineOrigin.length() + leaderLength)
        .add(lineOrigin.clone().normalize().multiplyScalar(leaderLength));
      // Simpler: label goes along the normal of the surface position
      const labelPosSimple = surfaceVec.clone().add(
        surfaceVec.clone().normalize().multiplyScalar(leaderLength),
      );

      const markerColor = marker.color || leaderColor;

      let line = null;
      // Only create a leader line for the first member of a small cluster (or solo markers)
      if (!isSmallCluster || marker._clusterIndex === 0) {
        const lineStart = isSmallCluster ? lineOrigin : surfaceVec;
        const lineGeo = new BufferGeometry();
        lineGeo.setAttribute('position', new Float32BufferAttribute([
          lineStart.x, lineStart.y, lineStart.z,
          labelPosSimple.x, labelPosSimple.y, labelPosSimple.z,
        ], 3));
        const lineMat = new LineBasicMaterial({
          color: markerColor,
          transparent: true,
          opacity: LEADER_OPACITY,
          depthWrite: false,
          depthTest: false,
        });
        line = new Line(lineGeo, lineMat);
        line.renderOrder = 2;
        line.userData = { markerId: marker.id, calloutMode: mode, isLeaderLine: true };

        // 'always' starts visible, 'hover'/'click' start hidden
        if (mode !== 'always') {
          line.visible = false;
        }

        group.add(line);
      }

      this.#calloutData.set(marker.id, {
        marker, label, line, labelPosition: labelPosSimple,
        surfacePosition: surfaceVec, mode, color: markerColor,
        visible: mode === 'always',
      });
    }
  }

  createCSS2DLabels(CSS2DObject) {
    const labels = [];
    for (const [id, data] of this.#calloutData) {
      // Badge for large cluster
      if (this.#clusterBadgeIds.has(id)) {
        const div = document.createElement('div');
        div.className = 'globe-callout-badge';
        div.dataset.clusterId = id;
        div.textContent = `${data._badgeCount} markers`;
        const bc = data.color || LEADER_COLOR_DEFAULT;
        const bcRgba12 = hexToRgba(bc, 0.15);
        const bcRgba40 = hexToRgba(bc, 0.5);
        div.style.cssText = `
          color: ${bc};
          font-size: 11px;
          font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif;
          font-weight: 700;
          padding: 3px 10px;
          background: ${bcRgba12};
          border: 1px solid ${bcRgba40};
          border-radius: 12px;
          pointer-events: auto;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        `;
        const css2dObj = new CSS2DObject(div);
        css2dObj.position.copy(data.labelPosition);
        css2dObj.userData = { clusterId: id };
        css2dObj.visible = true;
        labels.push({ id, object: css2dObj, div });
        this.#css2dObjects.push(css2dObj);
        this.#css2dByClusterId.set(id, css2dObj);
        continue;
      }

      const div = document.createElement('div');
      div.className = 'globe-callout-label';
      div.dataset.markerId = id;
      div.textContent = data.label;
      div.setAttribute('role', 'status');
      div.setAttribute('aria-label', data.label);
      div.setAttribute('tabindex', '0');
      const c = data.color || LEADER_COLOR_DEFAULT;
      const rgba12 = hexToRgba(c, 0.12);
      const rgba40 = hexToRgba(c, 0.4);
      const displayColor = this.#textColor || c;
      div.style.cssText = `
        color: ${displayColor};
        font-size: 12px;
        font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif;
        font-weight: 600;
        padding: 2px 8px;
        background: ${rgba12};
        border: 1px solid ${rgba40};
        border-radius: 4px;
        pointer-events: auto;
        cursor: pointer;
        user-select: text;
        white-space: nowrap;
      `;

      // Cascade offset for small clusters (2-3 markers)
      const marker = data.marker;
      if (marker && marker._clusterId && (marker._clusterSize ?? 1) <= 3 && (marker._clusterSize ?? 1) >= 2) {
        const idx = marker._clusterIndex;
        if (idx > 0) {
          div.style.marginTop = `${idx * 20}px`;
          div.style.marginLeft = `${idx * 4}px`;
          div.style.opacity = `${1.0 - idx * 0.1}`;
        }
        // Reserve cascade slot for hover/click markers — slot is positioned but label is hidden
        if (data.mode !== 'always') {
          div.style.visibility = 'hidden';
        }
      }

      const css2dObj = new CSS2DObject(div);
      css2dObj.position.copy(data.labelPosition);
      css2dObj.userData = { markerId: id, calloutMode: data.mode };
      // Large-cluster individual markers are hidden by default
      const isLargeClusterMember = marker && marker._clusterId &&
        (marker._clusterSize ?? 1) >= 4;
      if (data.mode !== 'always' || isLargeClusterMember) {
        css2dObj.visible = false;
      }
      labels.push({ id, object: css2dObj, div });
      this.#css2dObjects.push(css2dObj);
      this.#css2dByMarkerId.set(id, css2dObj);
    }
    return labels;
  }

  updateVisibility(cameraPosition, globeQuaternion) {
    const camDir = cameraPosition.clone().normalize();
    for (const [id, data] of this.#calloutData) {
      if (!data.surfacePosition) continue;
      const rotatedNormal = data.surfacePosition.clone().normalize()
        .applyQuaternion(globeQuaternion);
      const facing = rotatedNormal.dot(camDir);
      const frontFacing = facing > 0;

      // Handle cluster badge entries
      if (this.#clusterBadgeIds.has(id)) {
        data.visible = frontFacing;
        if (data.line) data.line.visible = frontFacing && !this.#expandedClusters.has(id);
        const css2d = this.#css2dByClusterId.get(id);
        if (css2d) css2d.visible = frontFacing && !this.#expandedClusters.has(id);
        continue;
      }

      // BUG12b: large-cluster members stay hidden unless their cluster is expanded
      const isLargeClusterMember = data.marker?._clusterId &&
        (data.marker._clusterSize ?? 1) >= 4;
      if (isLargeClusterMember) {
        const expanded = this.#expandedClusters.has(data.marker._clusterId);
        const show = frontFacing && expanded;
        data.visible = show;
        const css2d = this.#css2dByMarkerId.get(id);
        if (css2d) css2d.visible = show;
        continue;
      }

      if (data.mode === 'always') {
        if (data.line) data.line.visible = frontFacing;
        data.visible = frontFacing;
        const css2d = this.#css2dByMarkerId.get(id) || this.#css2dByClusterId.get(id);
        if (css2d) css2d.visible = frontFacing;
      }
      // hover/click modes are handled by showCallout/hideCallout
    }
  }

  /**
   * After CSS2DRenderer renders, hide leader lines whose labels fall outside
   * the container bounds (clipped by overflow:hidden on the host).
   */
  cullOffscreenLines(camera, globeGroup, containerWidth, containerHeight) {
    const _v = new Vector3();
    const margin = 40;
    for (const [id, data] of this.#calloutData) {
      if (!data.line || !data.line.visible) continue;
      if (!data.labelPosition) continue;

      _v.copy(data.labelPosition);
      globeGroup.localToWorld(_v);
      _v.project(camera);

      const sx = (1 + _v.x) * 0.5 * containerWidth;
      const sy = (1 - _v.y) * 0.5 * containerHeight;

      const inBounds = sx >= -margin && sx <= containerWidth + margin &&
                       sy >= -margin && sy <= containerHeight + margin &&
                       _v.z >= 0 && _v.z <= 1;

      if (!inBounds) {
        data.line.visible = false;
      }
    }
  }

  showCallout(markerId) {
    const data = this.#calloutData.get(markerId);
    if (!data) return;
    if (data.line) data.line.visible = true;
    data.visible = true;
    const css2d = this.#css2dByMarkerId.get(markerId);
    if (css2d) css2d.visible = true;
  }

  hideCallout(markerId) {
    const data = this.#calloutData.get(markerId);
    if (!data) return;
    if (data.line) data.line.visible = false;
    data.visible = false;
    const css2d = this.#css2dByMarkerId.get(markerId);
    if (css2d) css2d.visible = false;
  }

  filterCallouts(matchingIds) {
    if (!matchingIds) {
      // null/undefined = reset, restore all 'always' callouts to full opacity
      for (const [id, data] of this.#calloutData) {
        // Badge reset: respect expand state
        if (this.#clusterBadgeIds.has(id)) {
          const show = !this.#expandedClusters.has(id);
          if (data.line) {
            data.line.visible = show;
            data.line.material.opacity = LEADER_OPACITY;
          }
          data.visible = true;
          const css2d = this.#css2dByClusterId.get(id);
          if (css2d) {
            css2d.visible = show;
            if (css2d.element) css2d.element.style.opacity = '1';
          }
          continue;
        }

        const show = data.mode === 'always';
        if (data.line) {
          data.line.visible = show;
          data.line.material.opacity = LEADER_OPACITY;
        }
        data.visible = show;
        const css2d = this.#css2dByMarkerId.get(id);
        if (css2d) {
          css2d.visible = show;
          if (css2d.element) css2d.element.style.opacity = '1';
        }
      }
      return;
    }
    const ids = new Set(matchingIds);
    for (const [id, data] of this.#calloutData) {
      // Badge: check if any member matches
      if (this.#clusterBadgeIds.has(id)) {
        const memberIds = [...this.#calloutData.entries()]
          .filter(([, d]) => d.marker?._clusterId === id)
          .map(([mid]) => mid);
        const anyMatch = memberIds.some(mid => ids.has(mid));
        if (data.line) data.line.material.opacity = anyMatch ? LEADER_OPACITY : LEADER_OPACITY * 0.2;
        data.visible = true;
        const css2d = this.#css2dByClusterId.get(id);
        if (css2d?.element) css2d.element.style.opacity = anyMatch ? '1' : '0.2';
        continue;
      }

      const match = ids.has(id);
      // Keep all visible, but dim non-matches to 20%
      if (data.line) {
        data.line.visible = true;
        data.line.material.opacity = match ? LEADER_OPACITY : LEADER_OPACITY * 0.2;
      }
      data.visible = true;
      const css2d = this.#css2dByMarkerId.get(id);
      if (css2d) {
        css2d.visible = true;
        if (css2d.element) css2d.element.style.opacity = match ? '1' : '0.2';
      }
    }
  }

  getCalloutData() {
    return this.#calloutData;
  }

  // Task 6: Expand/collapse state management

  isClusterExpanded(clusterId) {
    return this.#expandedClusters.has(clusterId);
  }

  toggleCluster(clusterId) {
    if (this.#expandedClusters.has(clusterId)) {
      this.#expandedClusters.delete(clusterId);
    } else {
      this.#expandedClusters.add(clusterId);
    }
    this.#updateClusterVisibility(clusterId);
  }

  collapseAllClusters() {
    const wasExpanded = [...this.#expandedClusters];
    this.#expandedClusters.clear();
    for (const cid of wasExpanded) {
      this.#updateClusterVisibility(cid);
    }
  }

  #updateClusterVisibility(clusterId) {
    const expanded = this.#expandedClusters.has(clusterId);
    const badge = this.#calloutData.get(clusterId);
    if (badge) {
      if (badge.line) badge.line.visible = !expanded;
      badge.visible = !expanded;
      const badgeCss2d = this.#css2dByClusterId.get(clusterId);
      if (badgeCss2d) badgeCss2d.visible = !expanded;
    }
    for (const [id, data] of this.#calloutData) {
      if (data.marker?._clusterId === clusterId && (data.marker._clusterSize ?? 1) >= 4) {
        const css2d = this.#css2dByMarkerId.get(id);
        if (css2d) css2d.visible = expanded;
        data.visible = expanded;
      }
    }
  }

  #clear() {
    if (this.#group) {
      for (const [, data] of this.#calloutData) {
        if (data.line) {
          this.#group.remove(data.line);
          data.line.geometry.dispose();
          data.line.material.dispose();
        }
      }
    }
    for (const obj of this.#css2dObjects) {
      obj.removeFromParent();
      if (obj.element?.parentNode) obj.element.parentNode.removeChild(obj.element);
    }
    this.#calloutData.clear();
    this.#css2dObjects = [];
    this.#css2dByMarkerId.clear();
    this.#css2dByClusterId.clear();
    this.#clusterBadgeIds.clear();
    this.#expandedClusters.clear();
  }

  dispose() {
    this.#clear();
  }
}
