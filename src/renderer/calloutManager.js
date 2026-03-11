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

  resolveLabel(marker, locale) {
    const label = marker.calloutLabel?.[locale] ?? marker.calloutLabel?.en ?? '';
    if (label) return label;
    return marker.name?.[locale] ?? marker.name?.en ?? '';
  }

  update(group, markers, locale = 'en') {
    this.#group = group;
    this.#clear();

    for (const marker of markers) {
      const mode = marker.calloutMode ?? 'always';
      if (mode === 'none') continue;

      const label = this.resolveLabel(marker, locale);
      if (!label) continue;

      const surfacePos = latLonToCartesian(marker.lat ?? 0, marker.lon ?? 0, 1, marker.alt ?? 0);
      const surfaceVec = new Vector3(surfacePos.x, surfacePos.y, surfacePos.z);
      const direction = surfaceVec.clone().normalize();
      const labelPos = surfaceVec.clone().add(direction.clone().multiplyScalar(LEADER_LENGTH));

      const markerColor = marker.color || LEADER_COLOR_DEFAULT;

      // Leader line
      const lineGeo = new BufferGeometry();
      lineGeo.setAttribute('position', new Float32BufferAttribute([
        surfaceVec.x, surfaceVec.y, surfaceVec.z,
        labelPos.x, labelPos.y, labelPos.z,
      ], 3));
      const lineMat = new LineBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: LEADER_OPACITY,
        depthWrite: false,
      });
      const line = new Line(lineGeo, lineMat);
      line.userData = { markerId: marker.id, calloutMode: mode, isLeaderLine: true };

      // 'always' starts visible, 'hover'/'click' start hidden
      if (mode !== 'always') {
        line.visible = false;
      }

      group.add(line);
      this.#calloutData.set(marker.id, {
        marker, label, line, labelPosition: labelPos,
        surfacePosition: surfaceVec, mode, color: markerColor,
        visible: mode === 'always',
      });
    }
  }

  createCSS2DLabels(CSS2DObject) {
    const labels = [];
    for (const [id, data] of this.#calloutData) {
      const div = document.createElement('div');
      div.className = 'globe-callout-label';
      div.textContent = data.label;
      div.setAttribute('role', 'status');
      div.setAttribute('aria-label', data.label);
      div.setAttribute('tabindex', '0');
      const c = data.color || LEADER_COLOR_DEFAULT;
      const rgba12 = hexToRgba(c, 0.12);
      const rgba40 = hexToRgba(c, 0.4);
      div.style.cssText = `
        color: ${c};
        font-size: 12px;
        font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif;
        font-weight: 600;
        padding: 2px 8px;
        background: ${rgba12};
        border: 1px solid ${rgba40};
        border-radius: 4px;
        pointer-events: auto;
        cursor: default;
        user-select: text;
        white-space: nowrap;
      `;
      const css2dObj = new CSS2DObject(div);
      css2dObj.position.copy(data.labelPosition);
      css2dObj.userData = { markerId: id, calloutMode: data.mode };
      if (data.mode !== 'always') css2dObj.visible = false;
      labels.push({ id, object: css2dObj, div });
      this.#css2dObjects.push(css2dObj);
    }
    return labels;
  }

  updateVisibility(cameraPosition, globeQuaternion) {
    const camDir = cameraPosition.clone().normalize();
    for (const [id, data] of this.#calloutData) {
      const rotatedNormal = data.surfacePosition.clone().normalize()
        .applyQuaternion(globeQuaternion);
      const facing = rotatedNormal.dot(camDir);
      const frontFacing = facing > 0;

      if (data.mode === 'always') {
        data.line.visible = frontFacing;
        data.visible = frontFacing;
        const css2d = this.#css2dObjects.find(o => o.userData?.markerId === id);
        if (css2d) css2d.visible = frontFacing;
      }
      // hover/click modes are handled by showCallout/hideCallout
    }
  }

  showCallout(markerId) {
    const data = this.#calloutData.get(markerId);
    if (!data) return;
    data.line.visible = true;
    data.visible = true;
    const css2d = this.#css2dObjects.find(o => o.userData?.markerId === markerId);
    if (css2d) css2d.visible = true;
  }

  hideCallout(markerId) {
    const data = this.#calloutData.get(markerId);
    if (!data) return;
    data.line.visible = false;
    data.visible = false;
    const css2d = this.#css2dObjects.find(o => o.userData?.markerId === markerId);
    if (css2d) css2d.visible = false;
  }

  filterCallouts(matchingIds) {
    if (!matchingIds) {
      // null/undefined = reset, restore all 'always' callouts to full opacity
      for (const [id, data] of this.#calloutData) {
        const show = data.mode === 'always';
        data.line.visible = show;
        data.line.material.opacity = LEADER_OPACITY;
        data.visible = show;
        const css2d = this.#css2dObjects.find(o => o.userData?.markerId === id);
        if (css2d) {
          css2d.visible = show;
          if (css2d.element) css2d.element.style.opacity = '1';
        }
      }
      return;
    }
    const ids = new Set(matchingIds);
    for (const [id, data] of this.#calloutData) {
      const match = ids.has(id);
      // Keep all visible, but dim non-matches to 20%
      data.line.visible = true;
      data.line.material.opacity = match ? LEADER_OPACITY : LEADER_OPACITY * 0.2;
      data.visible = true;
      const css2d = this.#css2dObjects.find(o => o.userData?.markerId === id);
      if (css2d) {
        css2d.visible = true;
        if (css2d.element) css2d.element.style.opacity = match ? '1' : '0.2';
      }
    }
  }

  getCalloutData() {
    return this.#calloutData;
  }

  #clear() {
    if (this.#group) {
      for (const [, data] of this.#calloutData) {
        this.#group.remove(data.line);
        data.line.geometry.dispose();
        data.line.material.dispose();
      }
    }
    for (const obj of this.#css2dObjects) {
      obj.removeFromParent();
      if (obj.element?.parentNode) obj.element.parentNode.removeChild(obj.element);
    }
    this.#calloutData.clear();
    this.#css2dObjects = [];
  }

  dispose() {
    this.#clear();
  }
}
