import { GlobeController } from '../controller/globeController.js';
import { getCelestialPreset, listCelestialPresets } from '../scene/celestial.js';
import { mergeViewerUiConfig, resolveViewerUiConfig, VIEWER_CONTROL_STYLE_ICON } from '../scene/viewerUi.js';
import { interpolateCameraState } from './cameraTween.js';

import { getLegendSymbol } from './legendSymbol.js';
import { groupMarkersByFilter } from './legendGrouping.js';
import { computeNorthArrowRotation, computeScaleBar, chooseScaleKilometers } from './navigationHud.js';
import { AttributionManager } from '../renderer/attributionManager.js';
import { resolveNavigationHudVisibility } from './viewerUiInteractions.js';

const CONTROL_ICONS = {
  fullscreen: `
    <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 4H4v4" />
      <path d="M16 4h4v4" />
      <path d="M4 16v4h4" />
      <path d="M20 16v4h-4" />
    </svg>
  `,
  legend: `
    <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
    </svg>
  `,
  inspect: `
    <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 5V2" />
      <path d="M12 22v-3" />
      <path d="M5 12H2" />
      <path d="M22 12h-3" />
    </svg>
  `,
  projection: `
    <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  `,
  globe: `
    <svg class="control-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </svg>
  `,
};

const TEMPLATE = `
  <style>
    :host {
      display: block;
      position: relative;
      min-height: 360px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #1d2a44;
      background: #07152f;
      color: #f3f6ff;
      font-family: "Avenir Next", "Segoe UI", sans-serif;
    }

    .stage {
      position: absolute;
      inset: 0;
    }

    .controls {
      position: absolute;
      right: 12px;
      top: 12px;
      display: flex;
      gap: 8px;
      z-index: 10;
    }

    button {
      border: 1px solid #355183;
      background: rgba(10, 23, 50, 0.8);
      color: inherit;
      border-radius: 8px;
      padding: 8px 10px;
      cursor: pointer;
      font-size: 13px;
    }

    .controls button.icon-only {
      width: 34px;
      height: 34px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* BUG15: hidden attribute must win over icon-only display */
    .controls button[hidden],
    .controls select[hidden] {
      display: none !important;
    }

    .control-icon {
      width: 16px;
      height: 16px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .filter-hidden {
      display: none !important;
    }

    select {
      border: 1px solid #355183;
      background: rgba(10, 23, 50, 0.8);
      color: inherit;
      border-radius: 8px;
      padding: 7px 10px;
      cursor: pointer;
      font-size: 13px;
      min-width: 170px;
    }

    .inspect-toggle.active {
      border-color: #f6b73c;
      background: rgba(246, 183, 60, 0.28);
    }

    .search-input {
      border: 1px solid #355183;
      background: rgba(10, 23, 50, 0.8);
      color: inherit;
      border-radius: 8px;
      padding: 7px 10px;
      font-size: 13px;
      min-width: 120px;
      max-width: 200px;
      outline: none;
    }
    .search-input:focus {
      border-color: #5b8dcf;
    }
    .search-input::placeholder {
      color: rgba(200, 215, 240, 0.5);
    }

    .legend {
      position: absolute;
      bottom: 12px;
      left: 12px;
      max-height: 45%;
      overflow: auto;
      width: min(280px, calc(100% - 24px));
      background: rgba(6, 16, 38, 0.85);
      border: 1px solid #2c4169;
      border-radius: 8px;
      padding: 8px;
      z-index: 10;
      display: none;
    }

    .legend.visible {
      display: block;
    }

    .legend-item {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 10px;
      border: none;
      width: 100%;
      text-align: left;
      background: transparent;
      color: inherit;
      padding: 6px;
      border-radius: 6px;
      cursor: pointer;
    }

    .legend-item:hover,
    .legend-item:focus-visible {
      background: rgba(69, 110, 173, 0.3);
      outline: none;
    }

    .legend-symbol {
      --legend-symbol-color: #ff6a00;
      width: 11px;
      height: 11px;
      flex: 0 0 auto;
      background: var(--legend-symbol-color);
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 0 0 1px rgba(10, 15, 28, 0.35);
    }

    .legend-symbol.dot {
      border-radius: 999px;
    }

    .legend-symbol.image {
      border-radius: 2px;
    }

    .legend-symbol.model {
      width: 12px;
      height: 11px;
      clip-path: polygon(50% 0, 0 100%, 100% 100%);
      border-radius: 0;
      border: none;
      box-shadow: none;
    }

    .legend-symbol.text {
      width: 14px;
      height: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--legend-symbol-color);
      box-shadow: none;
      font-weight: 700;
      font-size: 11px;
      line-height: 1;
    }

    .legend-label {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .legend-section-header {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #7b9fd4;
      padding: 8px 6px 4px;
      border-bottom: 1px solid rgba(124, 160, 214, 0.15);
      margin-bottom: 2px;
    }

    .legend-section-header:first-child {
      padding-top: 2px;
    }

    .nav-hud {
      position: absolute;
      right: 12px;
      bottom: 36px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      z-index: 10;
      pointer-events: none;
    }

    .compass {
      width: 34px;
      height: 34px;
      position: relative;
      pointer-events: auto;
      cursor: pointer;
    }

    .compass-arrow {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 2px;
      height: 24px;
      transform: translate(-50%, -50%) rotate(var(--compass-arrow-rotation, 0deg));
      transform-origin: 50% 70%;
      background: linear-gradient(to bottom, #ff5f6d 0%, #ff5f6d 60%, rgba(255, 95, 109, 0.2) 100%);
      box-shadow: 0 0 10px rgba(255, 95, 109, 0.35);
      border-radius: 2px;
    }

    .compass-arrow::before {
      content: '';
      position: absolute;
      top: -6px;
      left: 50%;
      transform: translateX(-50%);
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-bottom: 8px solid #ff5f6d;
    }

    .scale {
      min-width: 126px;
      padding: 7px 8px 6px;
      border-radius: 8px;
      border: 1px solid rgba(75, 107, 163, 0.72);
      background: rgba(7, 18, 42, 0.84);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .scale-bar {
      height: 2px;
      min-width: 18px;
      background: #d9e7ff;
      position: relative;
    }

    .scale-bar::before,
    .scale-bar::after {
      content: '';
      position: absolute;
      top: -4px;
      width: 2px;
      height: 10px;
      background: #d9e7ff;
    }

    .scale-bar::before {
      left: 0;
    }

    .scale-bar::after {
      right: 0;
    }

    .scale-label {
      font-size: 11px;
      color: #cbdcf8;
      letter-spacing: 0.02em;
    }

    .time-filter {
      position: absolute;
      right: 12px;
      top: 50px;
      display: flex;
      gap: 6px;
      align-items: center;
      z-index: 10;
      font-size: 12px;
      color: #cbdcf8;
    }

    .time-filter input[type="date"] {
      border: 1px solid #355183;
      background: rgba(10, 23, 50, 0.8);
      color: inherit;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
    }

    .time-filter input[type="date"]:focus {
      border-color: #5b8dcf;
      outline: none;
    }

    .attribution-label {
      position: absolute;
      right: 12px;
      bottom: 12px;
      z-index: 10;
      font-size: 10px;
      color: rgba(200, 215, 240, 0.7);
      background: rgba(6, 16, 38, 0.6);
      border: 1px solid rgba(75, 107, 163, 0.4);
      border-radius: 12px;
      padding: 3px 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      user-select: none;
      transition: background 0.15s;
      max-width: calc(100% - 24px);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .attribution-label:hover {
      background: rgba(6, 16, 38, 0.85);
      color: #d9e7ff;
    }

    .attribution-icon {
      width: 12px;
      height: 12px;
      fill: currentColor;
      flex-shrink: 0;
    }

    .attribution-panel {
      position: absolute;
      top: 0;
      right: -280px;
      width: 280px;
      height: 100%;
      background: rgba(6, 16, 38, 0.92);
      border-left: 1px solid #2c4169;
      z-index: 20;
      overflow-y: auto;
      padding: 12px;
      transition: right 0.25s ease;
      font-size: 12px;
      color: #cbdcf8;
      box-sizing: border-box;
    }

    .attribution-panel.open {
      right: 0;
    }

    .attribution-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: #cbdcf8;
      font-size: 18px;
      cursor: pointer;
      padding: 2px 6px;
      line-height: 1;
    }

    .attribution-close:hover {
      color: #ffffff;
    }

    .attribution-section {
      margin-bottom: 14px;
    }

    .attribution-section.muted {
      opacity: 0.5;
    }

    .attribution-section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: rgba(200, 215, 240, 0.6);
      margin: 0 0 6px;
    }

    .attribution-entry {
      margin-bottom: 10px;
      padding-left: 0;
    }

    .attribution-name {
      font-weight: 600;
      color: #e8effc;
      margin-bottom: 2px;
    }

    .attribution-desc {
      color: rgba(200, 215, 240, 0.7);
      margin-bottom: 2px;
    }

    .attribution-license {
      color: rgba(200, 215, 240, 0.5);
      font-size: 10px;
      margin-bottom: 2px;
    }

    .attribution-link {
      color: #6ba3d9;
      text-decoration: none;
      font-size: 10px;
      word-break: break-all;
    }

    .attribution-link:hover {
      text-decoration: underline;
      color: #8fc5f0;
    }
  </style>

  <div class="stage" part="stage"></div>
  <div class="controls">
    <input class="search-input" type="search" placeholder="Search markers…" aria-label="Search markers" />
    <select class="marker-filter filter-hidden" aria-label="Filter markers"></select>
    <select class="celestial-select"></select>
    <button class="fullscreen control-button" type="button"></button>
    <button class="legend-toggle control-button" type="button"></button>
    <button class="inspect-toggle control-button" type="button"></button>
    <button class="projection-toggle control-button icon-only" type="button"></button>
  </div>
  <div class="time-filter filter-hidden">
    <span>From</span>
    <input type="date" class="time-from" aria-label="Filter from date" />
    <span>To</span>
    <input type="date" class="time-to" aria-label="Filter to date" />
  </div>
  <div class="legend" aria-live="polite"></div>
  <div class="nav-hud" aria-hidden="true">
    <div class="compass">
      <div class="compass-arrow"></div>
    </div>
    <div class="scale">
      <div class="scale-bar"></div>
      <div class="scale-label">0 km</div>
    </div>
  </div>
`;

function dispatchCustomEvent(target, type, detail) {
  target.dispatchEvent(new CustomEvent(type, {
    bubbles: true,
    composed: true,
    detail,
  }));
}

export class GlobeViewerElement extends HTMLElement {
  static get observedAttributes() {
    return ['language', 'planet', 'theme', 'inspect-mode', 'projection'];
  }

  #controller;
  #root;
  #stage;
  #legend;
  #navHud;
  #compass;
  #scale;
  #compassArrow;
  #scaleBar;
  #scaleLabel;
  #celestialSelect;
  #markerFilterSelect;
  #fullscreenButton;
  #legendButton;
  #inspectButton;
  #projectionButton;
  #viewerUi = resolveViewerUiConfig();
  #celestialPresets = listCelestialPresets();
  #currentScene = null;
  #inspectMode = false;
  #legendVisible = false;
  #drag = {
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
    ts: 0,
    travel: 0,
  };
  #searchInput;
  #searchDebounce = 0;
  #legendItems = new Map();
  #activeSearchIds = null;
  #timeFilterWrap;
  #timeFromInput;
  #timeToInput;
  #legendPeekTimeout = 0;
  #attributionManager = new AttributionManager();
  #attributionDebounce = 0;
  #focusFrame = 0;
  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.innerHTML = TEMPLATE;

    this.#stage = this.#root.querySelector('.stage');
    this.#legend = this.#root.querySelector('.legend');
    this.#navHud = this.#root.querySelector('.nav-hud');
    this.#compass = this.#root.querySelector('.compass');
    this.#scale = this.#root.querySelector('.scale');
    this.#compassArrow = this.#root.querySelector('.compass-arrow');
    this.#scaleBar = this.#root.querySelector('.scale-bar');
    this.#scaleLabel = this.#root.querySelector('.scale-label');
    this.#celestialSelect = this.#root.querySelector('.celestial-select');
    this.#markerFilterSelect = this.#root.querySelector('.marker-filter');
    this.#fullscreenButton = this.#root.querySelector('.fullscreen');
    this.#legendButton = this.#root.querySelector('.legend-toggle');
    this.#inspectButton = this.#root.querySelector('.inspect-toggle');
    this.#projectionButton = this.#root.querySelector('.projection-toggle');
    this.#searchInput = this.#root.querySelector('.search-input');
    this.#timeFilterWrap = this.#root.querySelector('.time-filter');
    this.#timeFromInput = this.#root.querySelector('.time-from');
    this.#timeToInput = this.#root.querySelector('.time-to');

    this.#searchInput.addEventListener('input', () => {
      clearTimeout(this.#searchDebounce);
      this.#searchDebounce = setTimeout(() => this.#onSearch(this.#searchInput.value), 180);
    });

    this.#legendButton.addEventListener('click', () => {
      this.#legendVisible = !this.#legendVisible;
      this.#legend.classList.toggle('visible', this.#legendVisible);
    });

    this.#fullscreenButton.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    this.#inspectButton.addEventListener('click', () => {
      this.setInspectMode(!this.#inspectMode);
      dispatchCustomEvent(this, 'inspectToggle', { enabled: this.#inspectMode });
    });

    this.#projectionButton.addEventListener('click', () => {
      if (!this.#controller) return;
      const current = this.#controller.getProjection();
      const next = current === 'globe' ? 'azimuthalEquidistant' : 'globe';
      this.#controller.setProjection(next);
      this.#updateProjectionButton();
    });

    this.#celestialSelect.addEventListener('change', () => {
      this.setPlanetPreset(this.#celestialSelect.value);
    });

    this.#markerFilterSelect.addEventListener('change', () => {
      this.#applyMarkerFilter(this.#markerFilterSelect.value);
    });

    this.#timeFromInput.addEventListener('change', () => this.#applyTimeFilter());
    this.#timeToInput.addEventListener('change', () => this.#applyTimeFilter());

    this.#compass.addEventListener('click', () => {
      if (this.#controller) {
        this.#controller.flyTo({ lat: 0, lon: 0 }, { zoom: 1 });
        this.#updateNavigationHud();
      }
    });

    this.addEventListener('keydown', (event) => {
      this.#onKeyboard(event);
    });

    this.#stage.addEventListener('pointerdown', (event) => this.#onPointerDown(event));
    this.#stage.addEventListener('pointermove', (event) => this.#onPointerMove(event));
    this.#stage.addEventListener('pointerup', (event) => this.#onPointerUp(event));
    this.#stage.addEventListener('pointercancel', (event) => this.#onPointerUp(event));
    this.#stage.addEventListener('wheel', (event) => this.#onWheel(event), { passive: false });
  }

  connectedCallback() {
    this.tabIndex = this.tabIndex >= 0 ? this.tabIndex : 0;
    this.#controller = new GlobeController({
      container: this.#stage,
      locale: this.getAttribute('language') ?? 'en',
    });

    this.#controller.on('sceneChange', (scene) => {
      this.#currentScene = scene;
      this.#applyViewerUi(scene);
      this.#renderLegend(scene);
      this.#renderMarkerFilter(scene);
      this.#renderTimeFilter(scene);
      this.#syncCelestialSelection(scene.planet?.id);
      this.#updateNavigationHud();
      this.#updateAttribution(scene);
      dispatchCustomEvent(this, 'sceneChange', scene);
    });

    this.#stage.addEventListener('calloutClick', (event) => {
      const detail = event.detail;
      if (detail) {
        dispatchCustomEvent(this, 'inspectSelect', detail);
        if (detail.kind === 'marker') {
          dispatchCustomEvent(this, 'markerClick', detail.entity);
        }
      }
    });

    this.#renderCelestialOptions();
    this.setInspectMode(this.hasAttribute('inspect-mode'));
    const initialProjection = this.getAttribute('projection');
    if (initialProjection && initialProjection !== 'globe') {
      this.#controller.setProjection(initialProjection);
    }
    this.#updateProjectionButton();
    const currentScene = this.#controller.getScene();
    this.#currentScene = currentScene;
    this.#applyViewerUi(currentScene);
    this.#renderLegend(currentScene);
    this.#renderMarkerFilter(currentScene);
    this.#renderTimeFilter(currentScene);
    this.#syncCelestialSelection(currentScene.planet?.id);
    this.#updateNavigationHud();
    this.#attributionManager.attach(this.#root);
    this.#updateAttribution(currentScene);

    const theme = this.getAttribute('theme');
    if (theme === 'light' || theme === 'dark') {
      this.setTheme(theme);
    }

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      this.#controller.resize(rect.width, rect.height);
      this.#updateNavigationHud();
    });

    observer.observe(this);
    this._resizeObserver = observer;
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    this.#stopFocusAnimation();
    this.#attributionManager.dispose();
    this.#controller?.destroy();
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if (!this.#controller) {
      return;
    }

    if (name === 'language') {
      const scene = this.#controller.getScene();
      this.#controller.setScene({ ...scene, locale: newValue || 'en' });
      this.#syncControlLabels();
    }

    if (name === 'planet') {
      this.setPlanetPreset(newValue || 'earth');
    }

    if (name === 'theme') {
      const nextTheme = newValue === 'light' ? 'light' : 'dark';
      this.setTheme(nextTheme);
    }

    if (name === 'inspect-mode') {
      this.setInspectMode(newValue !== null);
    }

    if (name === 'projection') {
      if (this.#controller) {
        const proj = newValue || 'globe';
        this.#controller.setProjection(proj);
        this.#updateProjectionButton();
      }
    }
  }

  #syncControlLabels() {
    const locale = this.getAttribute('language') ?? 'en';
    this.#setControlButtonLabel(
      this.#fullscreenButton,
      this.#controller.t('fullscreen', locale),
      CONTROL_ICONS.fullscreen
    );
    this.#setControlButtonLabel(
      this.#legendButton,
      this.#controller.t('legend', locale),
      CONTROL_ICONS.legend
    );
    this.#setControlButtonLabel(
      this.#inspectButton,
      this.#controller.t('inspect', locale),
      CONTROL_ICONS.inspect
    );
    this.#celestialSelect.title = this.#controller.t('body', locale);
  }

  #setControlButtonLabel(button, label, iconMarkup) {
    if (!button) {
      return;
    }

    button.title = label;
    button.setAttribute('aria-label', label);

    if (this.#viewerUi.controlStyle === VIEWER_CONTROL_STYLE_ICON) {
      button.classList.add('icon-only');
      button.innerHTML = iconMarkup;
      return;
    }

    button.classList.remove('icon-only');
    button.textContent = label;
  }

  #updateProjectionButton() {
    if (!this.#projectionButton || !this.#controller) return;
    const isGlobe = this.#controller.getProjection() === 'globe';
    // Use the same icon-injection approach as #setControlButtonLabel – content
    // is our own static SVG markup from CONTROL_ICONS, not user input.
    const iconSvg = isGlobe ? CONTROL_ICONS.projection : CONTROL_ICONS.globe;
    const label = isGlobe ? 'Switch to map view' : 'Switch to globe view';
    const range = document.createRange();
    range.selectNodeContents(this.#projectionButton);
    range.deleteContents();
    this.#projectionButton.appendChild(range.createContextualFragment(iconSvg));
    this.#projectionButton.title = label;
    this.#projectionButton.setAttribute('aria-label', label);
  }

  #applyViewerUi(scene) {
    this.#viewerUi = resolveViewerUiConfig(scene?.viewerUi);
    const hudVisibility = resolveNavigationHudVisibility(this.#viewerUi);

    this.#markerFilterSelect.classList.add('filter-hidden');
    this.#timeFilterWrap.classList.add('filter-hidden');
    this.#celestialSelect.hidden = !this.#viewerUi.showBodySelector;
    this.#fullscreenButton.hidden = !this.#viewerUi.showFullscreenButton;
    this.#legendButton.hidden = !this.#viewerUi.showLegendButton;
    this.#inspectButton.hidden = !this.#viewerUi.showInspectButton;
    this.#projectionButton.hidden = !this.#viewerUi.showProjectionToggle;

    if (!this.#viewerUi.showLegendButton) {
      this.#legendVisible = false;
      this.#legend.classList.remove('visible');
    }

    this.#compass.hidden = !hudVisibility.showCompass;
    this.#scale.hidden = !hudVisibility.showScale;
    this.#navHud.hidden = !hudVisibility.showNavHud;
    this.#attributionManager.setVisible(this.#viewerUi.showAttribution);

    this.#syncControlLabels();
  }

  #renderCelestialOptions() {
    this.#celestialSelect.innerHTML = '';

    for (const preset of this.#celestialPresets) {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.kind === 'moon'
        ? `${preset.label} (Moon)`
        : preset.label;
      this.#celestialSelect.appendChild(option);
    }
  }

  #syncCelestialSelection(planetId) {
    const id = typeof planetId === 'string' && planetId.length > 0 ? planetId : 'earth';
    if (this.#celestialSelect.value !== id) {
      this.#celestialSelect.value = id;
    }
  }

  #renderMarkerFilter(scene) {
    const filters = scene?.filters ?? [];
    while (this.#markerFilterSelect.firstChild) {
      this.#markerFilterSelect.removeChild(this.#markerFilterSelect.firstChild);
    }

    if (filters.length === 0) {
      this.#markerFilterSelect.classList.add('filter-hidden');
      return;
    }

    const filter = filters[0];
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = `${filter.label}: All`;
    this.#markerFilterSelect.appendChild(allOption);

    for (const opt of filter.options) {
      if (opt.value === 'all') continue;
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      this.#markerFilterSelect.appendChild(el);
    }

    this.#markerFilterSelect.value = 'all';
    const showFilter = this.#viewerUi?.showMarkerFilter !== false;
    if (showFilter) {
      this.#markerFilterSelect.classList.remove('filter-hidden');
    }
  }

  #applyMarkerFilter(value) {
    if (!this.#controller) return;
    const scene = this.#currentScene ?? this.#controller.getScene();
    const filters = scene?.filters ?? [];
    const markers = scene?.markers ?? [];

    if (filters.length === 0 || value === 'all') {
      this.#controller.filterMarkers(null);
      this.#controller.filterCallouts(null);
      this.#updateLegendFilter(null);
      return;
    }

    const filter = filters[0];
    const selected = filter.options.find((o) => o.value === value);
    if (!selected) return;

    const filterCategories = new Set(selected.categories);
    const allFilteredCategories = new Set();
    for (const opt of filter.options) {
      if (opt.value !== 'all') {
        for (const cat of opt.categories) allFilteredCategories.add(cat);
      }
    }

    const matchingIds = markers
      .filter((m) => {
        const cat = m.category ?? 'default';
        if (filterCategories.has(cat)) return true;
        if (!allFilteredCategories.has(cat)) return true;
        return false;
      })
      .map((m) => m.id);

    this.#controller.filterMarkers(matchingIds);
    this.#controller.filterCallouts(matchingIds);
    this.#updateLegendFilter(matchingIds);
  }

  #renderTimeFilter(scene) {
    const tr = scene?.timeRange;
    if (!tr || !tr.min || !tr.max) {
      this.#timeFilterWrap.classList.add('filter-hidden');
      return;
    }
    this.#timeFromInput.min = tr.min;
    this.#timeFromInput.max = tr.max;
    this.#timeFromInput.value = tr.min;
    this.#timeToInput.min = tr.min;
    this.#timeToInput.max = tr.max;
    this.#timeToInput.value = tr.max;
    this.#timeFilterWrap.classList.remove('filter-hidden');
  }

  #applyTimeFilter() {
    if (!this.#controller) return;
    const scene = this.#currentScene ?? this.#controller.getScene();
    const markers = scene?.markers ?? [];
    const fromVal = this.#timeFromInput.value;
    const toVal = this.#timeToInput.value;

    if (!fromVal && !toVal) {
      this.#controller.filterMarkers(null);
      this.#controller.filterCallouts(null);
      return;
    }

    const fromMs = fromVal ? new Date(fromVal).getTime() : -Infinity;
    const toMs = toVal ? new Date(toVal + 'T23:59:59Z').getTime() : Infinity;

    const matchingIds = markers
      .filter((m) => {
        if (!m.timestamp) return true;
        const ms = new Date(m.timestamp).getTime();
        if (!Number.isFinite(ms)) return true;
        return ms >= fromMs && ms <= toMs;
      })
      .map((m) => m.id);

    this.#controller.filterMarkers(matchingIds);
    this.#controller.filterCallouts(matchingIds);
    this.#updateLegendFilter(matchingIds);
  }

  #updateNavigationHud() {
    if (!this.#controller) {
      return;
    }

    const camera = this.#controller.getCameraState?.() ?? {
      centerLon: 0,
      centerLat: 0,
      zoom: 1,
    };

    if (this.#compassArrow) {
      const arrowRotation = computeNorthArrowRotation(camera);
      this.#compassArrow.style.setProperty('--compass-arrow-rotation', `${arrowRotation.toFixed(1)}deg`);
    }

    const scene = this.#currentScene ?? this.#controller.getScene();
    const width = Math.max(1, this.#stage?.clientWidth || this.clientWidth || 800);
    const height = Math.max(1, this.#stage?.clientHeight || this.clientHeight || 500);

    const flatMapKmPerPx = this.#controller.getScaleAtCenter?.();
    let scale;
    if (flatMapKmPerPx != null) {
      const targetPx = 96;
      const targetKm = flatMapKmPerPx * targetPx;
      const km = chooseScaleKilometers(targetKm);
      const px = km / flatMapKmPerPx;
      scale = { kilometers: km, pixels: px, label: `${km} km` };
    } else {
      scale = computeScaleBar({
        width,
        height,
        zoom: camera.zoom,
        planetRadiusRatio: scene?.planet?.radius ?? 1,
        targetPixels: 96,
      });
    }

    if (this.#scaleBar) {
      const pixels = Math.max(18, Math.round(scale.pixels));
      this.#scaleBar.style.width = `${pixels}px`;
    }
    if (this.#scaleLabel) {
      this.#scaleLabel.textContent = scale.label;
    }

    clearTimeout(this.#attributionDebounce);
    this.#attributionDebounce = setTimeout(() => {
      const scene = this.#currentScene ?? this.#controller?.getScene();
      if (scene) this.#updateAttribution(scene);
    }, 200);
  }

  #updateAttribution(scene) {
    if (!this.#viewerUi.showAttribution) {
      this.#attributionManager.setVisible(false);
      return;
    }
    this.#attributionManager.setVisible(true);

    const projectFn = (point) => this.#controller?.projectPointToClient(point) ?? null;
    const canvasRect = this.#controller?.getCanvasRect();
    if (!canvasRect) return;
    this.#attributionManager.update(scene, projectFn, canvasRect);
  }

  #onSearch(query) {
    if (!this.#controller) return;
    const scene = this.#currentScene ?? this.#controller.getScene();
    const markers = scene?.markers ?? [];
    const q = (query ?? '').trim().toLowerCase();

    if (!q) {
      // Reset: show all callouts and legend items
      this.#activeSearchIds = null;
      this.#controller.filterCallouts(null);
      this.#updateLegendFilter(null);
      dispatchCustomEvent(this, 'searchResults', { query: '', matches: [] });
      return;
    }

    const matches = markers.filter((m) => {
      const locale = scene.locale ?? 'en';
      const name = (m.name?.[locale] ?? m.name?.en ?? '').toLowerCase();
      const desc = (m.description?.[locale] ?? m.description?.en ?? '').toLowerCase();
      const id = (m.id ?? '').toLowerCase();
      return name.includes(q) || desc.includes(q) || id.includes(q);
    });

    const matchIds = matches.map((m) => m.id);
    this.#activeSearchIds = matchIds;
    this.#controller.filterCallouts(matchIds);
    this.#updateLegendFilter(matchIds);
    dispatchCustomEvent(this, 'searchResults', { query: q, matches });

    if (matches.length === 1) {
      const marker = matches[0];
      this.#animateFocusTo({ lat: marker.lat, lon: marker.lon }, { durationMs: 700 });
    }
  }

  #updateLegendFilter(matchingIds) {
    if (!matchingIds) {
      // Reset all legend items to full opacity and normal weight
      for (const [, row] of this.#legendItems) {
        row.style.opacity = '1';
        row.querySelector('.legend-label').style.fontWeight = '';
      }
      return;
    }
    const ids = new Set(matchingIds);
    let firstMatch = null;
    for (const [id, row] of this.#legendItems) {
      const match = ids.has(id);
      row.style.opacity = match ? '1' : '0.2';
      row.querySelector('.legend-label').style.fontWeight = match ? '700' : '';
      if (match && !firstMatch) firstMatch = row;
    }
    // Scroll legend to first matching item
    if (firstMatch && this.#legend) {
      firstMatch.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  #peekLegendItem(markerId) {
    if (!this.#activeSearchIds) return;
    const ids = new Set(this.#activeSearchIds);
    if (ids.has(markerId)) return; // already highlighted

    // Temporarily undim this legend item
    const row = this.#legendItems.get(markerId);
    if (row) {
      row.style.opacity = '1';
      row.querySelector('.legend-label').style.fontWeight = '700';
    }

    // Temporarily undim callout
    const peekIds = [...this.#activeSearchIds, markerId];
    this.#controller.filterCallouts(peekIds);

    // Restore after 2 seconds
    clearTimeout(this.#legendPeekTimeout);
    this.#legendPeekTimeout = setTimeout(() => {
      if (this.#activeSearchIds) {
        this.#controller.filterCallouts(this.#activeSearchIds);
        this.#updateLegendFilter(this.#activeSearchIds);
      }
    }, 2000);
  }

  #stopFocusAnimation() {
    if (!this.#focusFrame) {
      return;
    }
    cancelAnimationFrame(this.#focusFrame);
    this.#focusFrame = 0;
  }

  #animateFocusTo(target, options = {}) {
    if (!this.#controller) {
      return;
    }

    const startCamera = this.#controller.getCameraState?.() ?? {
      centerLon: 0,
      centerLat: 0,
      zoom: 1,
    };
    const endCamera = {
      lat: Number(target?.lat ?? 0),
      lon: Number(target?.lon ?? 0),
    };
    const durationMs = Math.max(120, Number(options.durationMs ?? 700));
    const startedAt = performance.now();

    this.#stopFocusAnimation();

    const tick = (now) => {
      const elapsed = Math.max(0, now - startedAt);
      const t = Math.min(1, elapsed / durationMs);
      const next = interpolateCameraState(
        { lat: startCamera.centerLat, lon: startCamera.centerLon },
        endCamera,
        t
      );

      this.#controller.flyTo(
        { lat: next.lat, lon: next.lon },
        { zoom: startCamera.zoom }
      );
      this.#updateNavigationHud();

      if (t >= 1) {
        this.#focusFrame = 0;
        return;
      }
      this.#focusFrame = requestAnimationFrame(tick);
    };

    this.#focusFrame = requestAnimationFrame(tick);
  }

  #renderLegend(scene) {
    const locale = scene.locale;
    const markers = scene.markers ?? [];
    const filters = scene.filters ?? [];

    while (this.#legend.firstChild) {
      this.#legend.removeChild(this.#legend.firstChild);
    }
    this.#legendItems.clear();

    const sections = groupMarkersByFilter(markers, filters, locale);

    for (const section of sections) {
      if (section.label) {
        const header = document.createElement('div');
        header.className = 'legend-section-header';
        header.textContent = section.label;
        this.#legend.appendChild(header);
      }

      for (const marker of section.markers) {
        const row = document.createElement('button');
        row.className = 'legend-item';
        row.type = 'button';

        const symbol = getLegendSymbol(marker);
        const symbolNode = document.createElement('span');
        symbolNode.className = `legend-symbol ${symbol.shape}`;
        symbolNode.style.setProperty('--legend-symbol-color', symbol.color);
        if (symbol.shape === 'text') {
          symbolNode.textContent = 'T';
        }

        const labelNode = document.createElement('span');
        labelNode.className = 'legend-label';
        labelNode.textContent = marker.name?.[locale] ?? marker.name?.en ?? marker.id;

        row.append(symbolNode, labelNode);
        row.addEventListener('click', () => {
          this.#animateFocusTo({ lat: marker.lat, lon: marker.lon }, { durationMs: 800 });
          dispatchCustomEvent(this, 'markerClick', marker);
          this.#peekLegendItem(marker.id);
        });
        this.#legend.appendChild(row);
        this.#legendItems.set(marker.id, row);
      }
    }
  }

  #onKeyboard(event) {
    const delta = 4;
    if (!this.#controller) {
      return;
    }

    const scene = this.#controller.getScene();

    if (event.key === 'Escape' && this.#attributionManager.isPanelOpen()) {
      this.#attributionManager.closePanel();
      return;
    }

    let updated = false;
    let cancelledFocus = false;

    const cancelFocusIfNeeded = () => {
      if (!cancelledFocus) {
        this.#stopFocusAnimation();
        cancelledFocus = true;
      }
    };

    if (event.key === 'ArrowUp') {
      cancelFocusIfNeeded();
      this.#controller.panBy(0, delta);
      dispatchCustomEvent(this, 'keyboardNavigate', { axis: 'lat', amount: delta, scene });
      updated = true;
    }
    if (event.key === 'ArrowDown') {
      cancelFocusIfNeeded();
      this.#controller.panBy(0, -delta);
      dispatchCustomEvent(this, 'keyboardNavigate', { axis: 'lat', amount: -delta, scene });
      updated = true;
    }
    if (event.key === 'ArrowLeft') {
      cancelFocusIfNeeded();
      this.#controller.panBy(-delta, 0);
      dispatchCustomEvent(this, 'keyboardNavigate', { axis: 'lon', amount: -delta, scene });
      updated = true;
    }
    if (event.key === 'ArrowRight') {
      cancelFocusIfNeeded();
      this.#controller.panBy(delta, 0);
      dispatchCustomEvent(this, 'keyboardNavigate', { axis: 'lon', amount: delta, scene });
      updated = true;
    }
    if (event.key === '+' || event.key === '=') {
      cancelFocusIfNeeded();
      this.#controller.zoomBy(0.08);
      dispatchCustomEvent(this, 'keyboardNavigate', { axis: 'zoom', amount: 0.08, scene });
      updated = true;
    }
    if (event.key === '-') {
      cancelFocusIfNeeded();
      this.#controller.zoomBy(-0.08);
      dispatchCustomEvent(this, 'keyboardNavigate', { axis: 'zoom', amount: -0.08, scene });
      updated = true;
    }

    if (updated) {
      this.#updateNavigationHud();
    }
  }

  #onPointerDown(event) {
    event.preventDefault();
    this.#stopFocusAnimation();
    if (typeof this.#controller.startDrag === 'function') {
      this.#controller.startDrag();
    }
    this.#controller.pauseIdleRotation();

    this.#drag.active = true;
    this.#drag.pointerId = event.pointerId;
    this.#drag.x = event.clientX;
    this.#drag.y = event.clientY;
    this.#drag.ts = performance.now();
    this.#drag.travel = 0;

    // Surface grab: find the geographic point under the cursor
    const grabLatLon = this.#controller.screenToLatLon(event.clientX, event.clientY);
    this.#drag.grabLatLon = grabLatLon; // null if off-disk
    this.#drag.wasOffDisk = !grabLatLon;

    // Store zoom for off-disk fallback scaling
    const camState = this.#controller.getCameraState();
    this.#drag.zoom = camState.zoom;

    this.#stage.setPointerCapture?.(event.pointerId);
  }

  #onPointerMove(event) {
    if (!this.#drag.active || this.#drag.pointerId !== event.pointerId || !this.#controller) {
      return;
    }

    const dx = event.clientX - this.#drag.x;
    const dy = event.clientY - this.#drag.y;
    this.#drag.travel += Math.abs(dx) + Math.abs(dy);

    if (this.#drag.grabLatLon) {
      // Surface-grab mode: raycast to find current lat/lon under cursor
      const currentLatLon = this.#controller.screenToLatLon(event.clientX, event.clientY);

      if (currentLatLon) {
        // On-disk: compute geographic delta so grab point tracks cursor
        const deltaLon = this.#drag.grabLatLon.lon - currentLatLon.lon;
        const deltaLat = this.#drag.grabLatLon.lat - currentLatLon.lat;
        this.#controller.panBy(deltaLon, deltaLat);

        // Re-anchor grab point after each panBy to prevent feedback loop.
        // The panBy rotation is an approximation (non-linear projection),
        // so re-anchoring eliminates accumulated error each frame.
        const reanchored = this.#controller.screenToLatLon(event.clientX, event.clientY);
        if (reanchored) {
          this.#drag.grabLatLon = reanchored;
        }
        this.#drag.wasOffDisk = false;
      } else {
        // Off-disk fallback: zoom-scaled screen deltas
        this.#drag.wasOffDisk = true;
        this.#panByScreenDelta(dx, dy);
      }
    } else {
      // Started off-disk: always use screen-delta fallback
      this.#panByScreenDelta(dx, dy);
    }

    this.#drag.x = event.clientX;
    this.#drag.y = event.clientY;
    this.#drag.ts = performance.now();
    this.#updateNavigationHud();
  }

  #panByScreenDelta(dx, dy) {
    const canvas = this.#stage.querySelector('canvas') ?? this.#stage;
    const rect = canvas.getBoundingClientRect();
    const globeScreenRadius = Math.min(rect.width, rect.height) * 0.45 * this.#drag.zoom;
    const coefficient = (180 / Math.PI) / globeScreenRadius;
    this.#controller.panBy(dx * coefficient, -dy * coefficient);
  }

  #onPointerUp(event) {
    if (!this.#drag.active || this.#drag.pointerId !== event.pointerId) {
      return;
    }
    this.#drag.active = false;
    this.#drag.grabLatLon = null;
    this.#drag.wasOffDisk = false;
    this.#stage.releasePointerCapture?.(event.pointerId);
    if (typeof this.#controller.endDrag === 'function') {
      this.#controller.endDrag();
    }
    this.#controller.resumeIdleRotation();

    const isClick = this.#drag.travel < 6;
    if (isClick) {
      const hit = this.inspectAt(event.clientX, event.clientY);
      if (hit || this.#inspectMode) return;
    }
    if (isClick && this.#attributionManager.isPanelOpen()) {
      this.#attributionManager.closePanel();
    }
    // No inertia — globe stops immediately
  }

  #onWheel(event) {
    if (!this.#controller) return;
    event.preventDefault();
    this.#stopFocusAnimation();

    const cursorLatLon = this.#controller.screenToLatLon(event.clientX, event.clientY);
    const oldZoom = this.#controller.getCameraState().zoom;
    const delta = -event.deltaY * 0.0015;
    this.#controller.zoomBy(delta);
    const newZoom = this.#controller.getCameraState().zoom;

    if (cursorLatLon && oldZoom !== newZoom) {
      const factor = 1 - oldZoom / newZoom;
      const state = this.#controller.getCameraState();
      this.#controller.panBy(
        (cursorLatLon.lon - state.centerLon) * factor,
        (cursorLatLon.lat - state.centerLat) * factor
      );
    }

    this.#updateNavigationHud();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  setInspectMode(enabled) {
    const next = Boolean(enabled);
    this.#inspectMode = next;
    this.#inspectButton?.classList.toggle('active', next);

    if (next) {
      if (!this.hasAttribute('inspect-mode')) {
        this.setAttribute('inspect-mode', '');
      }
    } else if (this.hasAttribute('inspect-mode')) {
      this.removeAttribute('inspect-mode');
    }
  }

  getInspectMode() {
    return this.#inspectMode;
  }

  inspectAt(clientX, clientY) {
    const hit = this.#controller?.hitTest(clientX, clientY) ?? null;
    dispatchCustomEvent(this, 'inspectSelect', hit);
    if (hit?.kind === 'marker') {
      dispatchCustomEvent(this, 'markerClick', hit.entity);
    }
    return hit;
  }

  setScene(scene) {
    const result = this.#controller.setScene(scene);
    this.#syncCelestialSelection(result.planet?.id);
    return result;
  }

  setPlanet(config) {
    if (typeof config === 'string') {
      return this.setPlanetPreset(config);
    }
    const result = this.#controller.setPlanet(config);
    this.#syncCelestialSelection(result.planet?.id);
    dispatchCustomEvent(this, 'planetChange', result.planet);
    return result;
  }

  setPlanetPreset(presetId) {
    const nextId = typeof presetId === 'string' && presetId.length > 0
      ? presetId
      : 'earth';
    const result = this.#controller.setPlanet({ id: nextId });
    this.#syncCelestialSelection(result.planet?.id);
    dispatchCustomEvent(this, 'planetChange', result.planet);
    return result;
  }

  getCelestialPresets() {
    return this.#celestialPresets.map((entry) => ({ ...entry }));
  }

  getPlanetPreset() {
    const scene = this.#controller.getScene();
    return getCelestialPreset(scene.planet?.id);
  }

  setTheme(theme) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    const scene = this.#controller.getScene();
    const result = this.#controller.setScene({
      ...scene,
      theme: nextTheme,
    });
    dispatchCustomEvent(this, 'themeChange', result.theme);
    return result;
  }

  getTheme() {
    return this.#controller.getScene().theme;
  }

  setViewerUi(viewerUi = {}) {
    const scene = this.#controller.getScene();
    const result = this.#controller.setScene({
      ...scene,
      viewerUi: mergeViewerUiConfig(scene.viewerUi, viewerUi),
    });
    return { ...result.viewerUi };
  }

  getViewerUi() {
    return resolveViewerUiConfig(this.#controller.getScene().viewerUi);
  }

  setMarkers(markers) {
    return this.#controller.setMarkers(markers);
  }

  setPaths(paths) {
    return this.#controller.setPaths(paths);
  }

  setArcs(arcs) {
    return this.#controller.setArcs(arcs);
  }

  setRegions(regions) {
    return this.#controller.setRegions(regions);
  }

  setAnimations(animations) {
    return this.#controller.setAnimations(animations);
  }

  flyTo(target, options) {
    this.#stopFocusAnimation();
    const durationMs = Number(options?.durationMs ?? 0);
    if (durationMs > 0) {
      this.#animateFocusTo(target, { durationMs });
      return undefined;
    }
    const result = this.#controller.flyTo(target, options);
    this.#updateNavigationHud();
    return result;
  }

  projectPointToClient(point) {
    return this.#controller?.projectPointToClient(point) ?? null;
  }

  exportScene() {
    return this.#controller.getScene();
  }
}

export function registerGlobeViewer() {
  if (!customElements.get('globe-viewer')) {
    customElements.define('globe-viewer', GlobeViewerElement);
  }
}
