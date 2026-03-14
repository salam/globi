/**
 * PropertiesPanel — shows editable properties for selected entities or scene settings.
 */
export class PropertiesPanel {
  constructor(container, opts) {
    this._container = container;
    this._opts = opts;
  }

  update(newOpts) {
    this._opts = { ...this._opts, ...newOpts };
    this.render();
  }

  render() {
    const { scene, selectedIds, locale, onChange } = this._opts;

    // Preserve scroll position across re-renders
    const scrollTop = this._container.scrollTop;

    // Clear
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }

    if (!selectedIds || selectedIds.length === 0) {
      this._renderSceneSettings(scene, locale, onChange);
    } else {
      const entity = this._findEntity(scene, selectedIds[0]);
      if (entity) {
        this._renderEntityProps(entity.item, entity.type, locale, onChange);
      }
    }

    // Restore scroll position
    this._container.scrollTop = scrollTop;
  }

  _findEntity(scene, id) {
    const collections = [
      { type: 'marker', list: scene.markers || [] },
      { type: 'arc', list: scene.arcs || [] },
      { type: 'path', list: scene.paths || [] },
      { type: 'region', list: scene.regions || [] },
    ];
    for (const { type, list } of collections) {
      const item = list.find(e => e.id === id);
      if (item) return { type, item };
    }
    return null;
  }

  _renderSceneSettings(scene, locale, onChange) {
    const header = document.createElement('div');
    header.className = 'props-header';
    header.textContent = 'Scene Settings';
    this._container.appendChild(header);

    this._container.appendChild(this._makeSection('Appearance'));
    this._container.appendChild(this._makeSelect('Theme', 'theme',
      ['photo', 'wireframe-shaded', 'wireframe-flat', 'grayscale-shaded', 'grayscale-flat'],
      scene.theme ?? 'photo', 'scene', '__scene__', onChange));
    this._container.appendChild(this._makeSelect('Projection', 'projection',
      ['globe', 'azimuthalEquidistant', 'orthographic', 'equirectangular'],
      scene.projection ?? 'globe', 'scene', '__scene__', onChange));
    this._container.appendChild(this._makeSelect('Locale', 'locale',
      ['en', 'de', 'fr', 'es', 'zh', 'ja', 'ar', 'pt', 'ru', 'hi', 'ko'],
      scene.locale ?? locale ?? 'en', 'scene', '__scene__', onChange));
    this._container.appendChild(this._makeColorPicker('Surface Tint', 'surfaceTint',
      scene.surfaceTint || '#000000', 'scene', '__scene__', onChange));
    this._container.appendChild(this._makeColorPicker('Overlay Tint', 'overlayTint',
      scene.overlayTint || '#000000', 'scene', '__scene__', onChange));

    // Camera section
    this._container.appendChild(this._makeSection('Camera'));
    this._container.appendChild(this._makeField('Initial Zoom', 'initialZoom',
      scene.initialZoom ?? 1, 'scene', '__scene__', onChange, 'number'));

    // Live zoom display with "use current" action
    const { getCamera, onFlyTo } = this._opts;
    if (getCamera) {
      const cam = getCamera();
      if (cam) {
        const zoomRow = document.createElement('div');
        zoomRow.className = 'field';
        const zoomLabel = document.createElement('label');
        zoomLabel.className = 'field-label';
        zoomLabel.textContent = 'Current Zoom';
        zoomRow.appendChild(zoomLabel);
        const zoomLink = document.createElement('span');
        zoomLink.style.cssText = 'text-decoration: underline; cursor: pointer; color: #7a7aff; font-size: 12px;';
        zoomLink.textContent = cam.zoom.toFixed(2);
        zoomLink.title = 'Click to set as initial zoom';
        zoomLink.addEventListener('click', () => {
          onChange('scene', '__scene__', 'initialZoom', parseFloat(cam.zoom.toFixed(2)));
        });
        zoomRow.appendChild(zoomLink);
        this._container.appendChild(zoomRow);
      }
    }

    this._container.appendChild(this._makeField('Initial Lat', 'initialLat',
      scene.initialLat ?? 0, 'scene', '__scene__', onChange, 'number'));
    this._container.appendChild(this._makeField('Initial Lon', 'initialLon',
      scene.initialLon ?? 0, 'scene', '__scene__', onChange, 'number'));

    // "Use current position" action
    if (getCamera) {
      const cam = getCamera();
      if (cam) {
        const posRow = document.createElement('div');
        posRow.className = 'field';
        const posLabel = document.createElement('label');
        posLabel.className = 'field-label';
        posLabel.textContent = 'Current Pos';
        posRow.appendChild(posLabel);
        const posLink = document.createElement('span');
        posLink.style.cssText = 'text-decoration: underline; cursor: pointer; color: #7a7aff; font-size: 12px;';
        posLink.textContent = `${cam.centerLat.toFixed(1)}, ${cam.centerLon.toFixed(1)}`;
        posLink.title = 'Click to set as initial focus';
        posLink.addEventListener('click', () => {
          onChange('scene', '__scene__', 'initialLat', parseFloat(cam.centerLat.toFixed(2)));
          onChange('scene', '__scene__', 'initialLon', parseFloat(cam.centerLon.toFixed(2)));
        });
        posRow.appendChild(posLink);
        this._container.appendChild(posRow);
      }
    }

    // Crosshair button to pick location from globe
    if (onFlyTo) {
      const pickRow = document.createElement('div');
      pickRow.className = 'field';
      const pickLabel = document.createElement('label');
      pickLabel.className = 'field-label';
      pickLabel.textContent = '';
      pickRow.appendChild(pickLabel);
      const pickBtn = document.createElement('button');
      pickBtn.className = 'preview-btn';
      pickBtn.style.cssText = 'font-size: 11px; padding: 3px 10px;';
      pickBtn.textContent = '\u271A Go to Initial';
      pickBtn.title = 'Fly camera to the saved initial position';
      pickBtn.addEventListener('click', () => {
        onFlyTo({
          lat: scene.initialLat ?? 0,
          lon: scene.initialLon ?? 0,
        }, { zoom: scene.initialZoom ?? 1 });
      });
      pickRow.appendChild(pickBtn);
      this._container.appendChild(pickRow);
    }

    this._container.appendChild(this._makeSection('Planet'));
    this._container.appendChild(this._makeSelect('Body', 'planet.id',
      ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon', 'io', 'europa', 'ganymede', 'titan'],
      scene.planet?.id ?? 'earth', 'scene', '__scene__', onChange));
    this._container.appendChild(this._makeSelect('Lighting', 'planet.lightingMode',
      ['fixed', 'sun'], scene.planet?.lightingMode ?? 'fixed', 'scene', '__scene__', onChange));
    this._container.appendChild(this._makeCheckbox('Borders', 'planet.showBorders',
      scene.planet?.showBorders ?? true, 'scene', '__scene__', onChange));
    this._container.appendChild(this._makeCheckbox('Labels', 'planet.showLabels',
      scene.planet?.showLabels ?? true, 'scene', '__scene__', onChange));

    this._container.appendChild(this._makeSection('Viewer UI'));
    const ui = scene.viewerUi || {};
    this._container.appendChild(this._makeSelect('Control Style', 'viewerUi.controlStyle',
      ['text', 'icon'], ui.controlStyle ?? 'text', 'scene', '__scene__', onChange));
    const uiBooleans = [
      ['Body Selector', 'viewerUi.showBodySelector', ui.showBodySelector],
      ['Fullscreen', 'viewerUi.showFullscreenButton', ui.showFullscreenButton],
      ['Legend', 'viewerUi.showLegendButton', ui.showLegendButton],
      ['Inspect', 'viewerUi.showInspectButton', ui.showInspectButton],
      ['Compass', 'viewerUi.showCompass', ui.showCompass],
      ['Scale', 'viewerUi.showScale', ui.showScale],
      ['Marker Filter', 'viewerUi.showMarkerFilter', ui.showMarkerFilter],
      ['Attribution', 'viewerUi.showAttribution', ui.showAttribution],
      ['Projection Toggle', 'viewerUi.showProjectionToggle', ui.showProjectionToggle],
      ['Theme Toggle', 'viewerUi.showThemeToggle', ui.showThemeToggle],
    ];
    for (const [label, field, value] of uiBooleans) {
      this._container.appendChild(this._makeCheckbox(label, field, value ?? true, 'scene', '__scene__', onChange));
    }
  }

  _renderEntityProps(item, entityType, locale, onChange) {
    const header = document.createElement('div');
    header.className = 'props-header';

    const title = document.createElement('span');
    title.textContent = 'Properties';
    header.appendChild(title);

    const badge = document.createElement('span');
    badge.className = 'props-type-badge';
    badge.textContent = entityType;
    header.appendChild(badge);

    this._container.appendChild(header);

    // Primary fields
    const nameVal = item.name
      ? (typeof item.name === 'object' ? (item.name[locale] ?? item.name.en ?? '') : item.name)
      : '';
    this._container.appendChild(this._makeField('Name', 'name', nameVal, entityType, item.id, onChange));

    if (item.lat !== undefined) {
      this._container.appendChild(this._makeField('Lat', 'lat', item.lat, entityType, item.id, onChange, 'number'));
    }
    if (item.lon !== undefined) {
      this._container.appendChild(this._makeField('Lon', 'lon', item.lon, entityType, item.id, onChange, 'number'));
    }
    if (item.color !== undefined) {
      this._container.appendChild(this._makeColorPicker('Color', 'color', item.color, entityType, item.id, onChange));
    }

    // Appearance section
    this._container.appendChild(this._makeSection('Appearance'));
    if (item.visualType !== undefined) {
      this._container.appendChild(this._makeSelect('Visual Type', 'visualType',
        ['dot', 'pin', 'pulse', 'ring', 'label', 'sprite'],
        item.visualType, entityType, item.id, onChange));
    }
    if (item.calloutMode !== undefined) {
      this._container.appendChild(this._makeSelect('Callout Mode', 'calloutMode',
        ['none', 'hover', 'always', 'click'],
        item.calloutMode, entityType, item.id, onChange));
    }

    // Metadata section
    this._container.appendChild(this._makeSection('Metadata'));
    this._container.appendChild(this._makeField('Category', 'category', item.category ?? '', entityType, item.id, onChange));
    const descVal = item.description
      ? (typeof item.description === 'object' ? (item.description[locale] ?? item.description.en ?? '') : item.description)
      : '';
    this._container.appendChild(this._makeField('Description', 'description', descVal, entityType, item.id, onChange));
    const calloutVal = item.calloutLabel
      ? (typeof item.calloutLabel === 'object' ? (item.calloutLabel[locale] ?? item.calloutLabel.en ?? '') : item.calloutLabel)
      : '';
    this._container.appendChild(this._makeField('Callout Label', 'calloutLabel', calloutVal, entityType, item.id, onChange));
    if (item.markerScale !== undefined || entityType === 'marker') {
      this._container.appendChild(this._makeField('Scale', 'markerScale', item.markerScale ?? 1, entityType, item.id, onChange, 'number'));
    }

    // Animation section
    this._container.appendChild(this._makeSection('Animation'));
  }

  _makeField(label, field, value, entityType, entityId, onChange, inputType = 'text') {
    const row = document.createElement('div');
    row.className = 'field';

    const lbl = document.createElement('label');
    lbl.className = 'field-label';
    lbl.textContent = label;
    row.appendChild(lbl);

    const input = document.createElement('input');
    input.className = 'field-input';
    input.type = inputType;
    input.dataset.field = field;
    input.value = value ?? '';

    input.addEventListener('change', () => {
      const newVal = inputType === 'number' ? parseFloat(input.value) : input.value;
      onChange(entityType, entityId, field, newVal);
    });

    row.appendChild(input);
    return row;
  }

  _makeSection(title) {
    const heading = document.createElement('div');
    heading.className = 'props-section-header';
    heading.textContent = title;
    return heading;
  }

  _makeSelect(label, field, options, value, entityType, entityId, onChange) {
    const row = document.createElement('div');
    row.className = 'field';
    const lbl = document.createElement('label');
    lbl.className = 'field-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    const select = document.createElement('select');
    select.className = 'field-select';
    select.dataset.field = field;
    for (const opt of options) {
      const option = document.createElement('option');
      const optValue = typeof opt === 'object' ? opt.value : opt;
      const optLabel = typeof opt === 'object' ? opt.label : opt;
      option.value = optValue;
      option.textContent = optLabel;
      if (optValue === value) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      onChange(entityType, entityId, field, select.value);
    });
    row.appendChild(select);
    return row;
  }

  _makeCheckbox(label, field, checked, entityType, entityId, onChange) {
    const row = document.createElement('div');
    row.className = 'field';
    const lbl = document.createElement('label');
    lbl.className = 'field-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    const input = document.createElement('input');
    input.className = 'field-checkbox';
    input.type = 'checkbox';
    input.dataset.field = field;
    input.checked = !!checked;
    input.addEventListener('change', () => {
      onChange(entityType, entityId, field, input.checked);
    });
    row.appendChild(input);
    return row;
  }

  _makeColorPicker(label, field, value, entityType, entityId, onChange) {
    const row = document.createElement('div');
    row.className = 'field';
    const lbl = document.createElement('label');
    lbl.className = 'field-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    const input = document.createElement('input');
    input.className = 'field-color';
    input.type = 'color';
    input.dataset.field = field;
    input.value = value || '#000000';
    // Use 'change' (not 'input') so the native color picker stays open
    // while the user is dragging in the gradient area
    input.addEventListener('change', () => {
      onChange(entityType, entityId, field, input.value);
    });
    row.appendChild(input);
    return row;
  }
}
