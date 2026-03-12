import {
  registerGlobeViewer,
  createEmptyScene,
  getCelestialPreset,
  listCelestialPresets,
  geocodePlaceName,
  createMarkerFromGeocode,
  exportSceneToJSON,
  importSceneFromJSON,
  exportSceneToGeoJSON,
  importGeoJSONToScene,
  exportSceneToOBJ,
  exportSceneToUSDZ,
  listExampleDefinitions,
  loadExampleScene,
  bindControlEvents,
  mergeViewerUiConfig,
  normalizeViewerUiConfig,
} from '../src/index.js';

registerGlobeViewer();

const viewer = document.getElementById('viewer');
const markerForm = document.getElementById('marker-form');
const arcForm = document.getElementById('arc-form');
const pathForm = document.getElementById('path-form');
const regionForm = document.getElementById('region-form');
const animationForm = document.getElementById('animation-form');
const jsonBuffer = document.getElementById('json-buffer');
const exportJsonButton = document.getElementById('export-json');
const importJsonButton = document.getElementById('import-json');
const exportGeoJsonButton = document.getElementById('export-geojson');
const importGeoJsonButton = document.getElementById('import-geojson');
const exportObjButton = document.getElementById('export-obj');
const exportUsdzButton = document.getElementById('export-usdz');
const localeSelect = document.getElementById('locale');
const celestialBodySelect = document.getElementById('celestial-body');
const themeModeSelect = document.getElementById('theme-mode');
const backdropUriInput = document.getElementById('backdrop-uri');
const sunLightingToggle = document.getElementById('sun-lighting');
const geocodeForm = document.getElementById('geocode-form');
const geocodeQueryInput = document.getElementById('geocode-query');
const geocodeStatus = document.getElementById('geocode-status');
const geocodeResults = document.getElementById('geocode-results');
const inspectModeToggle = document.getElementById('inspect-mode');
const viewerUiControlStyle = document.getElementById('viewer-ui-control-style');
const viewerUiShowBodySelector = document.getElementById('viewer-ui-show-body-selector');
const viewerUiShowFullscreenButton = document.getElementById('viewer-ui-show-fullscreen-button');
const viewerUiShowLegendButton = document.getElementById('viewer-ui-show-legend-button');
const viewerUiShowInspectButton = document.getElementById('viewer-ui-show-inspect-button');
const viewerUiShowCompass = document.getElementById('viewer-ui-show-compass');
const viewerUiShowScale = document.getElementById('viewer-ui-show-scale');
const showBordersToggle = document.getElementById('viewer-ui-show-borders');
const showLabelsToggle = document.getElementById('viewer-ui-show-labels');
const exampleSceneSelect = document.getElementById('example-scene');
const loadExampleButton = document.getElementById('load-example');
const exampleStatus = document.getElementById('example-status');
const inspectPanel = document.getElementById('inspect-panel');
const inspectTitle = document.getElementById('inspect-title');
const inspectFields = document.getElementById('inspect-fields');
const inspectClose = document.getElementById('inspect-close');

let scene = createEmptyScene('en');
let inspectSelection = null;
let geocodeRequestCounter = 0;
let inspectAnchorFrame = 0;
const celestialPresets = listCelestialPresets();
const INSPECT_PANEL_PADDING = 8;
const INSPECT_ANCHOR_OFFSET = 16;
const EXAMPLE_SCENES = listExampleDefinitions();

viewer.setScene(scene);
viewer.setInspectMode(true);
viewer.setAttribute('theme', scene.theme);

function renderCelestialOptions() {
  celestialBodySelect.innerHTML = '';
  for (const preset of celestialPresets) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.kind === 'moon'
      ? `${preset.label} (Moon)`
      : preset.label;
    celestialBodySelect.appendChild(option);
  }
}

function renderExampleOptions() {
  exampleSceneSelect.innerHTML = '';
  for (const entry of EXAMPLE_SCENES) {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.label;
    exampleSceneSelect.appendChild(option);
  }
}

function setExampleStatus(text, isError = false) {
  exampleStatus.textContent = text;
  exampleStatus.style.color = isError ? '#b00020' : '#365695';
}

function upsertById(collection, item) {
  const index = collection.findIndex((entry) => entry.id === item.id);
  if (index === -1) {
    return [...collection, item];
  }
  const copy = collection.slice();
  copy[index] = item;
  return copy;
}

function upsertByEntityId(collection, item) {
  const index = collection.findIndex((entry) => entry.entityId === item.entityId);
  if (index === -1) {
    return [...collection, item];
  }
  const copy = collection.slice();
  copy[index] = item;
  return copy;
}

function ensureUniqueMarkerId(baseId) {
  let candidate = baseId;
  let suffix = 2;

  const hasMarkerId = (id) => scene.markers.some((entry) => entry.id === id);
  while (hasMarkerId(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function setMarkerFormValues(marker) {
  const locale = currentLocale();
  markerForm.elements.id.value = marker.id;
  markerForm.elements.name.value = marker.name?.[locale] ?? marker.name?.en ?? marker.id;
  markerForm.elements.description.value = marker.description?.[locale] ?? marker.description?.en ?? '';
  markerForm.elements.lat.value = marker.lat;
  markerForm.elements.lon.value = marker.lon;
  markerForm.elements.alt.value = marker.alt ?? 0;
  markerForm.elements.visualType.value = marker.visualType ?? 'dot';
  markerForm.elements.assetUri.value = marker.assetUri ?? '';
}

function parsePoints(lines) {
  return String(lines)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [lat, lon, alt = '0'] = line.split(',').map((part) => part.trim());
      return {
        lat: Number(lat),
        lon: Number(lon),
        alt: Number(alt),
      };
    });
}

function currentLocale() {
  return scene.locale || 'en';
}

function currentViewerUi() {
  return normalizeViewerUiConfig(scene.viewerUi);
}

function updateViewerUi(patch) {
  const nextViewerUi = mergeViewerUiConfig(scene.viewerUi, patch);
  const appliedViewerUi = viewer.setViewerUi(nextViewerUi);

  scene = {
    ...scene,
    viewerUi: normalizeViewerUiConfig(appliedViewerUi),
  };

  viewerUiControlStyle.value = scene.viewerUi.controlStyle;
  viewerUiShowBodySelector.checked = scene.viewerUi.showBodySelector;
  viewerUiShowFullscreenButton.checked = scene.viewerUi.showFullscreenButton;
  viewerUiShowLegendButton.checked = scene.viewerUi.showLegendButton;
  viewerUiShowInspectButton.checked = scene.viewerUi.showInspectButton;
  viewerUiShowCompass.checked = scene.viewerUi.showCompass;
  viewerUiShowScale.checked = scene.viewerUi.showScale;
  jsonBuffer.value = exportSceneToJSON(viewer.exportScene());
}

function renderToViewer(options = {}) {
  scene = {
    ...scene,
    viewerUi: currentViewerUi(),
  };
  viewer.setScene(scene);
  viewer.setAttribute('theme', scene.theme);
  if (scene.planet?.id) {
    celestialBodySelect.value = scene.planet.id;
  }
  themeModeSelect.value = scene.theme;
  backdropUriInput.value = scene.planet?.backdropUri ?? '';
  sunLightingToggle.checked = scene.planet?.lightingMode === 'sun';
  viewerUiControlStyle.value = scene.viewerUi.controlStyle;
  viewerUiShowBodySelector.checked = scene.viewerUi.showBodySelector;
  viewerUiShowFullscreenButton.checked = scene.viewerUi.showFullscreenButton;
  viewerUiShowLegendButton.checked = scene.viewerUi.showLegendButton;
  viewerUiShowInspectButton.checked = scene.viewerUi.showInspectButton;
  viewerUiShowCompass.checked = scene.viewerUi.showCompass;
  viewerUiShowScale.checked = scene.viewerUi.showScale;
  showBordersToggle.checked = scene.planet?.showBorders !== false;
  showLabelsToggle.checked = scene.planet?.showLabels !== false;
  jsonBuffer.value = exportSceneToJSON(scene);
  if (!options.skipInspectRefresh) {
    syncInspectSelection();
  }
  updateInspectPanelPosition();
}

function clearGeocodeResults() {
  geocodeResults.innerHTML = '';
}

function setGeocodeStatus(text, isError = false) {
  geocodeStatus.textContent = text;
  geocodeStatus.style.color = isError ? '#b00020' : '#365695';
}

function addMarkerFromGeocode(result) {
  const marker = createMarkerFromGeocode(result, {
    locale: scene.locale,
    idPrefix: 'geo',
  });
  marker.id = ensureUniqueMarkerId(marker.id);

  scene = {
    ...scene,
    markers: upsertById(scene.markers, marker),
  };

  setMarkerFormValues(marker);
  renderToViewer();
  viewer.flyTo({ lat: marker.lat, lon: marker.lon, alt: marker.alt ?? 0.1 }, { durationMs: 900, zoom: 1.1 });
}

function renderGeocodeResults(results) {
  clearGeocodeResults();
  for (const result of results) {
    const row = document.createElement('li');

    const title = document.createElement('div');
    title.className = 'geocode-result-title';
    title.textContent = result.displayName;
    row.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'geocode-result-meta';
    meta.textContent = `lat ${result.lat.toFixed(5)}, lon ${result.lon.toFixed(5)} | ${result.class}/${result.type}`;
    row.appendChild(meta);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'geocode-result-action';
    action.textContent = 'Drop Pin';
    action.addEventListener('click', () => {
      addMarkerFromGeocode(result);
      setGeocodeStatus(`Dropped pin: ${result.displayName}`);
    });
    row.appendChild(action);

    geocodeResults.appendChild(row);
  }
}

function getEntity(kind, id) {
  if (kind === 'marker') {
    return scene.markers.find((entry) => entry.id === id) ?? null;
  }
  if (kind === 'arc') {
    return scene.arcs.find((entry) => entry.id === id) ?? null;
  }
  if (kind === 'path') {
    return scene.paths.find((entry) => entry.id === id) ?? null;
  }
  if (kind === 'region') {
    return scene.regions.find((entry) => entry.id === id) ?? null;
  }
  return null;
}

function updateEntity(kind, id, mutator, options = {}) {
  const updateCollection = (collection) => collection.map((entry) => {
    if (entry.id !== id) {
      return entry;
    }
    return mutator(entry);
  });

  if (kind === 'marker') {
    scene = { ...scene, markers: updateCollection(scene.markers) };
  }
  if (kind === 'arc') {
    scene = { ...scene, arcs: updateCollection(scene.arcs) };
  }
  if (kind === 'path') {
    scene = { ...scene, paths: updateCollection(scene.paths) };
  }
  if (kind === 'region') {
    scene = { ...scene, regions: updateCollection(scene.regions) };
  }

  renderToViewer(options);
}

function clearInspectSelection() {
  stopInspectAnchorLoop();
  inspectSelection = null;
  inspectPanel.classList.add('hidden');
  inspectFields.innerHTML = '';
  inspectTitle.textContent = 'Inspect';
  resetInspectPanelPosition();
}

function syncInspectSelection() {
  if (!inspectSelection) {
    return;
  }
  const entity = getEntity(inspectSelection.kind, inspectSelection.id);
  if (!entity) {
    clearInspectSelection();
    return;
  }
  updateInspectPanelPosition();
}

function stopInspectAnchorLoop() {
  if (!inspectAnchorFrame) {
    return;
  }
  cancelAnimationFrame(inspectAnchorFrame);
  inspectAnchorFrame = 0;
}

function startInspectAnchorLoop() {
  stopInspectAnchorLoop();

  const tick = () => {
    if (!inspectSelection || inspectPanel.classList.contains('hidden')) {
      inspectAnchorFrame = 0;
      return;
    }

    updateInspectPanelPosition();
    inspectAnchorFrame = requestAnimationFrame(tick);
  };

  inspectAnchorFrame = requestAnimationFrame(tick);
}

function resetInspectPanelPosition() {
  inspectPanel.style.left = '';
  inspectPanel.style.top = '';
  inspectPanel.style.right = '';
  inspectPanel.style.bottom = '';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function positionInspectPanelAt(anchor) {
  if (!anchor) {
    resetInspectPanelPosition();
    return;
  }

  const wrap = inspectPanel.parentElement;
  if (!wrap) {
    resetInspectPanelPosition();
    return;
  }

  const wrapRect = wrap.getBoundingClientRect();
  if (wrapRect.width <= 0 || wrapRect.height <= 0) {
    resetInspectPanelPosition();
    return;
  }

  const panelRect = inspectPanel.getBoundingClientRect();
  const panelWidth = panelRect.width > 0
    ? panelRect.width
    : Math.min(360, Math.max(220, wrapRect.width - INSPECT_PANEL_PADDING * 2));
  const panelHeight = panelRect.height > 0
    ? panelRect.height
    : Math.min(420, Math.max(160, wrapRect.height - INSPECT_PANEL_PADDING * 2));

  const localX = anchor.clientX - wrapRect.left;
  const localY = anchor.clientY - wrapRect.top;

  let left = localX + INSPECT_ANCHOR_OFFSET;
  if (left + panelWidth + INSPECT_PANEL_PADDING > wrapRect.width) {
    left = localX - panelWidth - INSPECT_ANCHOR_OFFSET;
  }
  let top = localY - panelHeight * 0.3;

  left = clamp(left, INSPECT_PANEL_PADDING, wrapRect.width - panelWidth - INSPECT_PANEL_PADDING);
  top = clamp(top, INSPECT_PANEL_PADDING, wrapRect.height - panelHeight - INSPECT_PANEL_PADDING);

  inspectPanel.style.left = `${Math.round(left)}px`;
  inspectPanel.style.top = `${Math.round(top)}px`;
  inspectPanel.style.right = 'auto';
  inspectPanel.style.bottom = 'auto';
}

function resolveInspectAnchor() {
  if (!inspectSelection) {
    return null;
  }

  if (inspectSelection.kind === 'marker') {
    const marker = getEntity('marker', inspectSelection.id);
    if (!marker) {
      return null;
    }
    const projected = viewer.projectPointToClient({
      lat: marker.lat,
      lon: marker.lon,
      alt: marker.alt ?? 0,
    });
    if (projected?.visible) {
      return {
        clientX: projected.clientX,
        clientY: projected.clientY,
      };
    }
    return null;
  }

  if (
    Number.isFinite(inspectSelection.anchor?.clientX)
    && Number.isFinite(inspectSelection.anchor?.clientY)
  ) {
    return {
      clientX: inspectSelection.anchor.clientX,
      clientY: inspectSelection.anchor.clientY,
    };
  }

  return null;
}

function updateInspectPanelPosition() {
  if (!inspectSelection || inspectPanel.classList.contains('hidden')) {
    return;
  }
  const anchor = resolveInspectAnchor();
  positionInspectPanelAt(anchor);
}

function makeLabel(text) {
  const label = document.createElement('label');
  label.textContent = text;
  return label;
}

function addTextField(container, text, value, onInput, options = {}) {
  const label = makeLabel(text);
  const input = document.createElement('input');
  input.type = options.type || 'text';
  input.value = value ?? '';
  if (options.step) {
    input.step = options.step;
  }
  if (options.placeholder) {
    input.placeholder = options.placeholder;
  }
  if (options.readOnly) {
    input.readOnly = true;
  }
  input.addEventListener('input', () => onInput(input.value));
  label.appendChild(input);
  container.appendChild(label);
}

function addSelectField(container, text, value, values, onInput) {
  const label = makeLabel(text);
  const select = document.createElement('select');
  for (const optionValue of values) {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    if (optionValue === value) {
      option.selected = true;
    }
    select.appendChild(option);
  }
  select.addEventListener('input', () => onInput(select.value));
  label.appendChild(select);
  container.appendChild(label);
}

function addTextAreaField(container, text, value, onChange, options = {}) {
  const label = makeLabel(text);
  const textarea = document.createElement('textarea');
  textarea.rows = options.rows ?? 4;
  textarea.value = value ?? '';
  textarea.addEventListener('change', () => onChange(textarea.value));
  label.appendChild(textarea);
  container.appendChild(label);
  return textarea;
}

function addHint(container, text) {
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = text;
  container.appendChild(hint);
}

function renderMarkerInspector(marker) {
  const locale = currentLocale();
  addTextField(inspectFields, 'ID', marker.id, () => {}, { readOnly: true });
  addTextField(inspectFields, `Name (${locale})`, marker.name?.[locale] ?? marker.name?.en ?? '', (value) => {
    updateEntity('marker', marker.id, (entry) => ({
      ...entry,
      name: { ...(entry.name ?? {}), [locale]: value },
    }), { skipInspectRefresh: true });
  });

  addTextField(inspectFields, `Description (${locale})`, marker.description?.[locale] ?? marker.description?.en ?? '', (value) => {
    updateEntity('marker', marker.id, (entry) => ({
      ...entry,
      description: { ...(entry.description ?? {}), [locale]: value },
      callout: value,
    }), { skipInspectRefresh: true });
  });

  addTextField(inspectFields, 'Latitude', marker.lat, (value) => {
    updateEntity('marker', marker.id, (entry) => ({ ...entry, lat: Number(value || 0) }), { skipInspectRefresh: true });
  }, { type: 'number', step: 'any' });

  addTextField(inspectFields, 'Longitude', marker.lon, (value) => {
    updateEntity('marker', marker.id, (entry) => ({ ...entry, lon: Number(value || 0) }), { skipInspectRefresh: true });
  }, { type: 'number', step: 'any' });

  addTextField(inspectFields, 'Altitude', marker.alt ?? 0, (value) => {
    updateEntity('marker', marker.id, (entry) => ({ ...entry, alt: Number(value || 0) }), { skipInspectRefresh: true });
  }, { type: 'number', step: 'any' });

  addSelectField(inspectFields, 'Visual Type', marker.visualType ?? 'dot', ['dot', 'image', 'model', 'text'], (value) => {
    updateEntity('marker', marker.id, (entry) => ({ ...entry, visualType: value }), { skipInspectRefresh: true });
  });

  addTextField(inspectFields, 'Color', marker.color ?? '#ff6a00', (value) => {
    updateEntity('marker', marker.id, (entry) => ({ ...entry, color: value }), { skipInspectRefresh: true });
  });

  addTextField(inspectFields, 'Asset URI', marker.assetUri ?? '', (value) => {
    updateEntity('marker', marker.id, (entry) => ({ ...entry, assetUri: value }), { skipInspectRefresh: true });
  });
}

function renderArcInspector(arc) {
  addTextField(inspectFields, 'ID', arc.id, () => {}, { readOnly: true });
  addTextField(inspectFields, 'Start Latitude', arc.start?.lat ?? 0, (value) => {
    updateEntity('arc', arc.id, (entry) => ({
      ...entry,
      start: { ...(entry.start ?? {}), lat: Number(value || 0) },
    }), { skipInspectRefresh: true });
  }, { type: 'number', step: 'any' });

  addTextField(inspectFields, 'Start Longitude', arc.start?.lon ?? 0, (value) => {
    updateEntity('arc', arc.id, (entry) => ({
      ...entry,
      start: { ...(entry.start ?? {}), lon: Number(value || 0) },
    }), { skipInspectRefresh: true });
  }, { type: 'number', step: 'any' });

  addTextField(inspectFields, 'End Latitude', arc.end?.lat ?? 0, (value) => {
    updateEntity('arc', arc.id, (entry) => ({
      ...entry,
      end: { ...(entry.end ?? {}), lat: Number(value || 0) },
    }), { skipInspectRefresh: true });
  }, { type: 'number', step: 'any' });

  addTextField(inspectFields, 'End Longitude', arc.end?.lon ?? 0, (value) => {
    updateEntity('arc', arc.id, (entry) => ({
      ...entry,
      end: { ...(entry.end ?? {}), lon: Number(value || 0) },
    }), { skipInspectRefresh: true });
  }, { type: 'number', step: 'any' });

  addTextField(inspectFields, 'Max Altitude', arc.maxAltitude ?? 0, (value) => {
    updateEntity('arc', arc.id, (entry) => ({ ...entry, maxAltitude: Number(value || 0) }), { skipInspectRefresh: true });
  }, { type: 'number', step: 'any' });

  addTextField(inspectFields, 'Color', arc.color ?? '#ffd000', (value) => {
    updateEntity('arc', arc.id, (entry) => ({ ...entry, color: value }), { skipInspectRefresh: true });
  });

  addTextField(inspectFields, 'Stroke Width', arc.strokeWidth ?? 1, (value) => {
    updateEntity('arc', arc.id, (entry) => ({ ...entry, strokeWidth: Number(value || 1) }), { skipInspectRefresh: true });
  }, { type: 'number', step: 'any' });
}

function renderPathInspector(path) {
  addTextField(inspectFields, 'ID', path.id, () => {}, { readOnly: true });
  addTextField(inspectFields, 'Color', path.color ?? '#00aaff', (value) => {
    updateEntity('path', path.id, (entry) => ({ ...entry, color: value }), { skipInspectRefresh: true });
  });

  addTextField(inspectFields, 'Stroke Width', path.strokeWidth ?? 1, (value) => {
    updateEntity('path', path.id, (entry) => ({ ...entry, strokeWidth: Number(value || 1) }), { skipInspectRefresh: true });
  }, { type: 'number', step: 'any' });

  addHint(inspectFields, 'Path points format: lat,lon,alt (one line per point)');
  addTextAreaField(
    inspectFields,
    'Points',
    (path.points ?? []).map((point) => `${point.lat},${point.lon},${point.alt ?? 0}`).join('\n'),
    (value) => {
      try {
        const points = parsePoints(value);
        updateEntity('path', path.id, (entry) => ({ ...entry, points }), { skipInspectRefresh: true });
      } catch (error) {
        alert(`Invalid path points: ${error.message}`);
      }
    },
    { rows: 6 }
  );
}

function renderRegionInspector(region) {
  addTextField(inspectFields, 'ID', region.id, () => {}, { readOnly: true });
  addTextField(inspectFields, 'Cap Color', region.capColor ?? '#4caf50', (value) => {
    updateEntity('region', region.id, (entry) => ({ ...entry, capColor: value }), { skipInspectRefresh: true });
  });

  addTextField(inspectFields, 'Side Color', region.sideColor ?? '#2e7d32', (value) => {
    updateEntity('region', region.id, (entry) => ({ ...entry, sideColor: value }), { skipInspectRefresh: true });
  });

  addTextField(inspectFields, 'Altitude', region.altitude ?? 0, (value) => {
    updateEntity('region', region.id, (entry) => ({ ...entry, altitude: Number(value || 0) }), { skipInspectRefresh: true });
  }, { type: 'number', step: 'any' });

  addHint(inspectFields, 'GeoJSON geometry object');
  addTextAreaField(inspectFields, 'GeoJSON', JSON.stringify(region.geojson ?? {}, null, 2), (value) => {
    try {
      const geojson = JSON.parse(value);
      updateEntity('region', region.id, (entry) => ({ ...entry, geojson }), { skipInspectRefresh: true });
    } catch (error) {
      alert(`Invalid region GeoJSON: ${error.message}`);
    }
  }, { rows: 8 });
}

function renderInspectSelection(selection) {
  if (!selection) {
    clearInspectSelection();
    return;
  }

  const entity = getEntity(selection.kind, selection.id);
  if (!entity) {
    clearInspectSelection();
    return;
  }

  inspectSelection = {
    kind: selection.kind,
    id: selection.id,
    anchor: selection.anchor ?? null,
  };
  inspectPanel.classList.remove('hidden');
  inspectFields.innerHTML = '';
  inspectTitle.textContent = `${selection.kind}: ${selection.id}`;

  if (selection.kind === 'marker') {
    renderMarkerInspector(entity);
  } else if (selection.kind === 'arc') {
    renderArcInspector(entity);
  } else if (selection.kind === 'path') {
    renderPathInspector(entity);
  } else if (selection.kind === 'region') {
    renderRegionInspector(entity);
  }

  updateInspectPanelPosition();
  if (selection.kind === 'marker') {
    startInspectAnchorLoop();
  } else {
    stopInspectAnchorLoop();
  }
}

geocodeForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const query = String(geocodeQueryInput.value ?? '').trim();
  if (!query) {
    setGeocodeStatus('Enter a place name to search.', true);
    clearGeocodeResults();
    return;
  }

  const requestId = geocodeRequestCounter + 1;
  geocodeRequestCounter = requestId;

  setGeocodeStatus('Searching OSM Nominatim...');
  clearGeocodeResults();

  try {
    const results = await geocodePlaceName(query, {
      limit: 6,
      language: scene.locale,
    });

    if (requestId !== geocodeRequestCounter) {
      return;
    }

    if (results.length === 0) {
      setGeocodeStatus('No matches found for this place name.', true);
      return;
    }

    renderGeocodeResults(results);
    setGeocodeStatus(`Found ${results.length} result(s). Choose one to drop a pin.`);
  } catch (error) {
    if (requestId !== geocodeRequestCounter) {
      return;
    }
    setGeocodeStatus(`Lookup failed: ${error.message}`, true);
  }
});

markerForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(markerForm);
  const marker = {
    id: String(formData.get('id')),
    name: { [scene.locale]: String(formData.get('name')) },
    description: { [scene.locale]: String(formData.get('description') || '') },
    lat: Number(formData.get('lat')),
    lon: Number(formData.get('lon')),
    alt: Number(formData.get('alt') || 0),
    visualType: String(formData.get('visualType') || 'dot'),
    assetUri: String(formData.get('assetUri') || ''),
    callout: String(formData.get('description') || ''),
  };

  scene = {
    ...scene,
    markers: upsertById(scene.markers, marker),
  };

  renderToViewer();
});

arcForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(arcForm);
  const arc = {
    id: String(formData.get('id')),
    name: { [scene.locale]: String(formData.get('id')) },
    start: {
      lat: Number(formData.get('startLat')),
      lon: Number(formData.get('startLon')),
      alt: 0,
    },
    end: {
      lat: Number(formData.get('endLat')),
      lon: Number(formData.get('endLon')),
      alt: 0,
    },
    maxAltitude: Number(formData.get('maxAltitude') || 0),
    color: String(formData.get('color') || '#ffd000'),
  };

  scene = {
    ...scene,
    arcs: upsertById(scene.arcs, arc),
  };

  renderToViewer();
});

pathForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(pathForm);
  const path = {
    id: String(formData.get('id')),
    name: { [scene.locale]: String(formData.get('id')) },
    points: parsePoints(formData.get('points')),
    color: String(formData.get('color') || '#00aaff'),
    strokeWidth: Number(formData.get('strokeWidth') || 1),
  };

  scene = {
    ...scene,
    paths: upsertById(scene.paths, path),
  };

  renderToViewer();
});

regionForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(regionForm);
  let geometry;
  try {
    geometry = JSON.parse(String(formData.get('geojson')));
  } catch (error) {
    alert(`Invalid region GeoJSON: ${error.message}`);
    return;
  }

  const region = {
    id: String(formData.get('id')),
    name: { [scene.locale]: String(formData.get('id')) },
    geojson: geometry,
    capColor: String(formData.get('capColor') || '#4caf50'),
    sideColor: String(formData.get('sideColor') || '#2e7d32'),
    altitude: Number(formData.get('altitude') || 0),
  };

  scene = {
    ...scene,
    regions: upsertById(scene.regions, region),
  };

  renderToViewer();
});

animationForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(animationForm);
  let keyframes;
  try {
    keyframes = JSON.parse(String(formData.get('keyframes')));
  } catch (error) {
    alert(`Invalid keyframes JSON: ${error.message}`);
    return;
  }

  const animation = {
    entityId: String(formData.get('entityId')),
    keyframes,
    loop: formData.get('loop') === 'on',
  };

  scene = {
    ...scene,
    animations: upsertByEntityId(scene.animations, animation),
  };

  try {
    viewer.setAnimations(scene.animations);
    renderToViewer();
  } catch (error) {
    alert(error.message);
  }
});

viewer.addEventListener('inspectSelect', (event) => {
  const selection = event.detail;
  if (!selection) {
    clearInspectSelection();
    return;
  }
  renderInspectSelection(selection);
});

viewer.addEventListener('inspectToggle', (event) => {
  inspectModeToggle.checked = Boolean(event.detail?.enabled);
});

viewer.addEventListener('planetChange', (event) => {
  const planet = event.detail;
  if (planet?.id) {
    const lightingMode = scene.planet?.lightingMode === 'sun' ? 'sun' : 'fixed';
    const lightingTimestamp = scene.planet?.lightingTimestamp ?? '';
    scene = {
      ...scene,
      planet: {
        ...scene.planet,
        ...planet,
        lightingMode,
        lightingTimestamp,
      },
    };
    celestialBodySelect.value = planet.id;
    backdropUriInput.value = planet.backdropUri ?? '';
    sunLightingToggle.checked = lightingMode === 'sun';
    jsonBuffer.value = exportSceneToJSON(scene);
  }
});

viewer.addEventListener('themeChange', (event) => {
  const theme = event.detail === 'light' ? 'light' : 'dark';
  scene = {
    ...scene,
    theme,
  };
  themeModeSelect.value = theme;
  jsonBuffer.value = exportSceneToJSON(scene);
});

inspectModeToggle.addEventListener('change', () => {
  viewer.setInspectMode(inspectModeToggle.checked);
  if (!inspectModeToggle.checked) {
    clearInspectSelection();
  }
});

bindControlEvents(viewerUiControlStyle, () => {
  updateViewerUi({
    controlStyle: viewerUiControlStyle.value,
  });
});

bindControlEvents(viewerUiShowBodySelector, () => {
  updateViewerUi({
    showBodySelector: viewerUiShowBodySelector.checked,
  });
});

bindControlEvents(viewerUiShowFullscreenButton, () => {
  updateViewerUi({
    showFullscreenButton: viewerUiShowFullscreenButton.checked,
  });
});

bindControlEvents(viewerUiShowLegendButton, () => {
  updateViewerUi({
    showLegendButton: viewerUiShowLegendButton.checked,
  });
});

bindControlEvents(viewerUiShowInspectButton, () => {
  updateViewerUi({
    showInspectButton: viewerUiShowInspectButton.checked,
  });
});

bindControlEvents(viewerUiShowCompass, () => {
  updateViewerUi({
    showCompass: viewerUiShowCompass.checked,
  });
});

bindControlEvents(viewerUiShowScale, () => {
  updateViewerUi({
    showScale: viewerUiShowScale.checked,
  });
});

showBordersToggle.addEventListener('change', () => {
  scene = {
    ...scene,
    planet: {
      ...scene.planet,
      showBorders: showBordersToggle.checked,
    },
  };
  renderToViewer();
});

showLabelsToggle.addEventListener('change', () => {
  scene = {
    ...scene,
    planet: {
      ...scene.planet,
      showLabels: showLabelsToggle.checked,
    },
  };
  renderToViewer();
});

inspectClose.addEventListener('click', () => {
  clearInspectSelection();
});

window.addEventListener('resize', () => {
  updateInspectPanelPosition();
});

exportJsonButton.addEventListener('click', () => {
  jsonBuffer.value = exportSceneToJSON(viewer.exportScene());
});

importJsonButton.addEventListener('click', () => {
  try {
    scene = importSceneFromJSON(jsonBuffer.value);
    renderToViewer();
  } catch (error) {
    alert(error.message);
  }
});

exportGeoJsonButton.addEventListener('click', () => {
  jsonBuffer.value = JSON.stringify(exportSceneToGeoJSON(viewer.exportScene()), null, 2);
});

importGeoJsonButton.addEventListener('click', () => {
  try {
    const parsed = JSON.parse(jsonBuffer.value);
    scene = {
      ...scene,
      ...importGeoJSONToScene(parsed, { locale: scene.locale }),
      locale: scene.locale,
    };
    renderToViewer();
  } catch (error) {
    alert(error.message);
  }
});

exportObjButton.addEventListener('click', () => {
  jsonBuffer.value = exportSceneToOBJ(viewer.exportScene());
});

exportUsdzButton.addEventListener('click', () => {
  jsonBuffer.value = JSON.stringify(exportSceneToUSDZ(viewer.exportScene()), null, 2);
});

localeSelect.addEventListener('change', () => {
  scene = {
    ...scene,
    locale: localeSelect.value,
  };
  viewer.setAttribute('language', localeSelect.value);
  renderToViewer();
  if (inspectSelection) {
    renderInspectSelection(inspectSelection);
  }
});

celestialBodySelect.addEventListener('change', () => {
  const preset = getCelestialPreset(celestialBodySelect.value);
  const lightingMode = scene.planet?.lightingMode === 'sun' ? 'sun' : 'fixed';
  const lightingTimestamp = scene.planet?.lightingTimestamp ?? '';
  scene = {
    ...scene,
    planet: {
      ...scene.planet,
      ...preset,
      lightingMode,
      lightingTimestamp,
    },
  };
  renderToViewer();
});

themeModeSelect.addEventListener('change', () => {
  scene = {
    ...scene,
    theme: themeModeSelect.value,
  };
  renderToViewer();
});

backdropUriInput.addEventListener('change', () => {
  scene = {
    ...scene,
    planet: {
      ...scene.planet,
      backdropUri: String(backdropUriInput.value ?? '').trim(),
    },
  };
  renderToViewer();
});

sunLightingToggle.addEventListener('change', () => {
  scene = {
    ...scene,
    planet: {
      ...scene.planet,
      lightingMode: sunLightingToggle.checked ? 'sun' : 'fixed',
    },
  };
  renderToViewer();
});

loadExampleButton.addEventListener('click', async () => {
  const selectedId = String(exampleSceneSelect.value ?? '').trim();
  if (!selectedId) {
    setExampleStatus('Pick an example first.', true);
    return;
  }

  loadExampleButton.disabled = true;
  setExampleStatus('Loading example...');
  try {
    const loaded = await loadExampleScene(selectedId, {
      locale: scene.locale,
    });
    scene = {
      ...loaded,
      locale: scene.locale,
    };
    renderToViewer();
    setExampleStatus(`Loaded: ${selectedId}`);
  } catch (error) {
    setExampleStatus(`Example failed: ${error.message}`, true);
  } finally {
    loadExampleButton.disabled = false;
  }
});

renderCelestialOptions();
renderExampleOptions();
inspectModeToggle.checked = true;
renderToViewer();
