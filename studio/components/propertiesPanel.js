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

    const fields = [
      { label: 'Theme', field: 'theme', type: 'text', value: scene.theme ?? '' },
      { label: 'Projection', field: 'projection', type: 'text', value: scene.projection ?? '' },
      { label: 'Locale', field: 'locale', type: 'text', value: scene.locale ?? locale ?? '' },
    ];

    for (const f of fields) {
      this._container.appendChild(this._makeField(f.label, f.field, f.value, 'scene', '__scene__', onChange));
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
      this._container.appendChild(this._makeField('Color', 'color', item.color, entityType, item.id, onChange, 'color'));
    }

    // Appearance section
    this._container.appendChild(this._makeSection('Appearance'));
    if (item.visualType !== undefined) {
      this._container.appendChild(this._makeField('Visual Type', 'visualType', item.visualType, entityType, item.id, onChange));
    }
    if (item.calloutMode !== undefined) {
      this._container.appendChild(this._makeField('Callout Mode', 'calloutMode', item.calloutMode, entityType, item.id, onChange));
    }

    // Metadata section
    this._container.appendChild(this._makeSection('Metadata'));

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
}
