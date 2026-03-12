// Attribution manager — categorizes data sources by visibility and renders
// an abbreviated label + expandable panel in the globe viewer.

const ATTRIBUTION_ICON_SVG = '<svg width="100pt" height="100pt" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="m43.582 29.168c0.050781-2.5859 1.6484-4.8867 4.0469-5.8398 2.4023-0.95312 5.1406-0.375 6.9492 1.4688 1.8125 1.8477 2.3359 4.5977 1.3359 6.9766-1 2.3828-3.332 3.9336-5.9141 3.9336-1.7227 0-3.375-0.69141-4.582-1.9219-1.207-1.2305-1.8672-2.8945-1.8359-4.6172zm11.293 9.25h-9.75c-3 0.023437-5.418 2.457-5.418 5.457v15.125c0 2.8516 2.3164 5.168 5.168 5.168v7.707c0 2.832 2.293 5.125 5.125 5.125s5.125-2.293 5.125-5.125v-7.582c2.8516 0 5.168-2.3164 5.168-5.168v-15.125c0-3-2.418-5.4336-5.418-5.457zm36.793 11.582c0 11.051-4.3906 21.648-12.207 29.461-7.8125 7.8164-18.41 12.207-29.461 12.207s-21.648-4.3906-29.461-12.207c-7.8164-7.8125-12.207-18.41-12.207-29.461s4.3906-21.648 12.207-29.461c7.8125-7.8164 18.41-12.207 29.461-12.207s21.648 4.3906 29.461 12.207c7.8164 7.8125 12.207 18.41 12.207 29.461zm-5.832 0h-0.003907c0-9.5039-3.7734-18.617-10.492-25.34-6.7227-6.7188-15.836-10.492-25.34-10.492s-18.617 3.7734-25.34 10.492c-6.7188 6.7227-10.492 15.836-10.492 25.34s3.7734 18.617 10.492 25.34c6.7227 6.7188 15.836 10.492 25.34 10.492 9.5-0.007812 18.609-3.7891 25.324-10.508 6.7188-6.7148 10.5-15.824 10.508-25.324z"/></svg>';

/**
 * Extract projection-testable points from an entity based on its kind.
 */
function extractEntityPoints(entity, kind) {
  if (kind === 'marker') return [{ lat: entity.lat, lon: entity.lon, alt: entity.alt ?? 0 }];
  if (kind === 'arc') return [entity.start, entity.end];
  if (kind === 'path') return entity.points || [];
  if (kind === 'region') return sampleRegionVertices(entity.geojson);
  return [];
}

/**
 * Sample up to 8 evenly-spaced vertices from a GeoJSON polygon ring.
 * GeoJSON coordinates are [lon, lat], so we swap when building point objects.
 */
function sampleRegionVertices(geojson) {
  if (!geojson) return [];
  let ring = null;
  if (geojson.type === 'Polygon' && Array.isArray(geojson.coordinates?.[0])) {
    ring = geojson.coordinates[0];
  } else if (geojson.type === 'MultiPolygon' && Array.isArray(geojson.coordinates?.[0]?.[0])) {
    ring = geojson.coordinates[0][0];
  }
  if (!ring || ring.length === 0) return [];
  const MAX_SAMPLES = 8;
  const step = Math.max(1, Math.floor(ring.length / MAX_SAMPLES));
  const samples = [];
  for (let i = 0; i < ring.length && samples.length < MAX_SAMPLES; i += step) {
    const coord = ring[i];
    // GeoJSON is [lon, lat]
    samples.push({ lat: coord[1], lon: coord[0], alt: 0 });
  }
  return samples;
}

/**
 * Check whether a geographic point projects to a visible on-screen position.
 */
function isPointVisible(point, projectFn, canvasRect) {
  const proj = projectFn(point);
  if (!proj || !proj.visible) return false;
  return proj.clientX >= canvasRect.left && proj.clientX <= canvasRect.right &&
         proj.clientY >= canvasRect.top && proj.clientY <= canvasRect.bottom;
}

export class AttributionManager {
  #labelEl = null;
  #panelEl = null;
  #textNode = null;
  #iconEl = null;
  #panelOpen = false;
  #container = null;
  #lastCategories = null;

  /**
   * Categorize every data source in the scene into one of three buckets:
   *   visible      — at least one linked entity projects on-screen
   *   outsideView  — linked entities exist but none are on-screen
   *   noData       — no entities reference this source
   */
  categorizeSources(scene, projectFn, canvasRect) {
    const dataSources = scene.dataSources || [];
    if (dataSources.length === 0) return { visible: [], outsideView: [], noData: [] };

    // Build index: sourceId -> list of {entity, kind}
    const sourceIndex = new Map();
    for (const ds of dataSources) sourceIndex.set(ds.id, []);

    for (const m of (scene.markers || [])) {
      if (m.sourceId && sourceIndex.has(m.sourceId)) sourceIndex.get(m.sourceId).push({ entity: m, kind: 'marker' });
    }
    for (const p of (scene.paths || [])) {
      if (p.sourceId && sourceIndex.has(p.sourceId)) sourceIndex.get(p.sourceId).push({ entity: p, kind: 'path' });
    }
    for (const a of (scene.arcs || [])) {
      if (a.sourceId && sourceIndex.has(a.sourceId)) sourceIndex.get(a.sourceId).push({ entity: a, kind: 'arc' });
    }
    for (const r of (scene.regions || [])) {
      if (r.sourceId && sourceIndex.has(r.sourceId)) sourceIndex.get(r.sourceId).push({ entity: r, kind: 'region' });
    }

    const visible = [];
    const outsideView = [];
    const noData = [];

    for (const ds of dataSources) {
      const entities = sourceIndex.get(ds.id) || [];
      if (entities.length === 0) {
        noData.push(ds);
        continue;
      }

      let hasVisible = false;
      // Sample up to 200 entities to cap work
      const sampled = entities.length > 200 ? entities.slice(0, 200) : entities;

      for (const { entity, kind } of sampled) {
        const points = extractEntityPoints(entity, kind);
        for (const pt of points) {
          if (isPointVisible(pt, projectFn, canvasRect)) {
            hasVisible = true;
            break;
          }
        }
        if (hasVisible) break;
      }

      if (hasVisible) {
        visible.push(ds);
      } else {
        outsideView.push(ds);
      }
    }

    return { visible, outsideView, noData };
  }

  /**
   * Join visible source short names with a middle-dot separator.
   */
  buildAbbreviatedText(visibleSources) {
    return visibleSources.map(s => s.shortName).join(' \u00B7 ');
  }

  /**
   * Create and attach the attribution label and panel to a container element.
   * Note: The SVG icon is a static compile-time constant, not dynamic content.
   */
  attach(container) {
    this.#container = container;

    // Create label
    this.#labelEl = document.createElement('div');
    this.#labelEl.className = 'attribution-label';

    // Parse static SVG icon safely using template element
    const tpl = document.createElement('template');
    tpl.innerHTML = ATTRIBUTION_ICON_SVG; // static constant, safe
    this.#iconEl = tpl.content.firstChild;
    this.#iconEl.classList.add('attribution-icon');
    this.#iconEl.removeAttribute('width');
    this.#iconEl.removeAttribute('height');

    this.#textNode = document.createTextNode('');
    this.#labelEl.appendChild(this.#iconEl);
    this.#labelEl.appendChild(this.#textNode);
    this.#labelEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePanel();
    });

    // Create panel
    this.#panelEl = document.createElement('div');
    this.#panelEl.className = 'attribution-panel';
    this.#panelEl.addEventListener('click', (e) => e.stopPropagation());

    container.appendChild(this.#labelEl);
    container.appendChild(this.#panelEl);
  }

  /**
   * Re-categorize sources and update the label text. If the panel is open,
   * rebuild its contents as well.
   */
  update(scene, projectFn, canvasRect) {
    const categories = this.categorizeSources(scene, projectFn, canvasRect);
    this.#lastCategories = categories;

    const abbr = this.buildAbbreviatedText(categories.visible);
    if (this.#textNode) this.#textNode.textContent = abbr;

    if (this.#labelEl) {
      this.#labelEl.style.display = (scene.dataSources || []).length === 0 ? 'none' : '';
    }

    if (this.#panelOpen) {
      this.#rebuildPanel(categories);
    }
  }

  #rebuildPanel(categories) {
    if (!this.#panelEl) return;
    // Clear panel
    this.#panelEl.textContent = '';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'attribution-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.closePanel());
    this.#panelEl.appendChild(closeBtn);

    // Title
    const title = document.createElement('h3');
    title.style.cssText = 'margin: 0 0 12px; font-size: 14px; color: #e8effc;';
    title.textContent = 'Data Sources';
    this.#panelEl.appendChild(title);

    // Visible section
    if (categories.visible.length > 0) {
      this.#appendSection('Data Sources', categories.visible, false);
    }

    // Outside view section
    if (categories.outsideView.length > 0) {
      this.#appendSection('Outside current view', categories.outsideView, true);
    }

    // No data section
    if (categories.noData.length > 0) {
      this.#appendSection('Without data for this visualization', categories.noData, true);
    }
  }

  #appendSection(titleText, sources, muted) {
    const section = document.createElement('div');
    section.className = 'attribution-section' + (muted ? ' muted' : '');

    const heading = document.createElement('div');
    heading.className = 'attribution-section-title';
    heading.textContent = titleText;
    section.appendChild(heading);

    for (const ds of sources) {
      const entry = document.createElement('div');
      entry.className = 'attribution-entry';

      const nameEl = document.createElement('div');
      nameEl.className = 'attribution-name';
      nameEl.textContent = ds.name;
      entry.appendChild(nameEl);

      if (ds.description) {
        const descEl = document.createElement('div');
        descEl.className = 'attribution-desc';
        descEl.textContent = ds.description;
        entry.appendChild(descEl);
      }

      if (ds.license) {
        const licenseEl = document.createElement('div');
        licenseEl.className = 'attribution-license';
        licenseEl.textContent = 'License: ' + ds.license;
        entry.appendChild(licenseEl);
      }

      if (ds.url && ds.url !== '#') {
        const linkEl = document.createElement('a');
        linkEl.className = 'attribution-link';
        linkEl.href = ds.url;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
        linkEl.textContent = ds.url;
        entry.appendChild(linkEl);
      }

      section.appendChild(entry);
    }

    this.#panelEl.appendChild(section);
  }

  togglePanel() {
    if (this.#panelOpen) {
      this.closePanel();
    } else {
      this.#panelOpen = true;
      if (this.#panelEl) this.#panelEl.classList.add('open');
      if (this.#lastCategories) this.#rebuildPanel(this.#lastCategories);
    }
  }

  closePanel() {
    this.#panelOpen = false;
    if (this.#panelEl) this.#panelEl.classList.remove('open');
  }

  isPanelOpen() {
    return this.#panelOpen;
  }

  setVisible(visible) {
    if (this.#labelEl) this.#labelEl.style.display = visible ? '' : 'none';
    if (this.#panelEl && !visible) this.closePanel();
  }

  dispose() {
    if (this.#labelEl) this.#labelEl.remove();
    if (this.#panelEl) this.#panelEl.remove();
    this.#labelEl = null;
    this.#panelEl = null;
    this.#textNode = null;
    this.#iconEl = null;
    this.#container = null;
    this.#lastCategories = null;
    this.#panelOpen = false;
  }
}
