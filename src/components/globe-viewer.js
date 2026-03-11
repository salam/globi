import { GlobeController } from '../controller/globeController.js';
import { getCelestialPreset, listCelestialPresets } from '../scene/celestial.js';
import { mergeViewerUiConfig, resolveViewerUiConfig, VIEWER_CONTROL_STYLE_ICON } from '../scene/viewerUi.js';
import { interpolateCameraState } from './cameraTween.js';

import { getLegendSymbol } from './legendSymbol.js';
import { computeNorthArrowRotation, computeScaleBar } from './navigationHud.js';
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
      <circle cx="11" cy="11" r="5.5" />
      <path d="M15.2 15.2L20 20" />
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

    .nav-hud {
      position: absolute;
      right: 12px;
      bottom: 12px;
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
  </style>

  <div class="stage" part="stage"></div>
  <div class="controls">
    <select class="celestial-select"></select>
    <button class="fullscreen control-button" type="button"></button>
    <button class="legend-toggle control-button" type="button"></button>
    <button class="inspect-toggle control-button" type="button"></button>
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
    return ['language', 'planet', 'theme', 'inspect-mode'];
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
  #fullscreenButton;
  #legendButton;
  #inspectButton;
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
    vx: 0,
    vy: 0,
    ts: 0,
    travel: 0,
  };
  #inertiaFrame = 0;
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
    this.#fullscreenButton = this.#root.querySelector('.fullscreen');
    this.#legendButton = this.#root.querySelector('.legend-toggle');
    this.#inspectButton = this.#root.querySelector('.inspect-toggle');

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

    this.#celestialSelect.addEventListener('change', () => {
      this.setPlanetPreset(this.#celestialSelect.value);
    });

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
      this.#syncCelestialSelection(scene.planet?.id);
      this.#updateNavigationHud();
      dispatchCustomEvent(this, 'sceneChange', scene);
    });

    this.#renderCelestialOptions();
    this.setInspectMode(this.hasAttribute('inspect-mode'));
    const currentScene = this.#controller.getScene();
    this.#currentScene = currentScene;
    this.#applyViewerUi(currentScene);
    this.#renderLegend(currentScene);
    this.#syncCelestialSelection(currentScene.planet?.id);
    this.#updateNavigationHud();

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
    if (this.#inertiaFrame) {
      cancelAnimationFrame(this.#inertiaFrame);
      this.#inertiaFrame = 0;
    }
    this.#stopFocusAnimation();
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

  #applyViewerUi(scene) {
    this.#viewerUi = resolveViewerUiConfig(scene?.viewerUi);
    const hudVisibility = resolveNavigationHudVisibility(this.#viewerUi);

    this.#celestialSelect.hidden = !this.#viewerUi.showBodySelector;
    this.#fullscreenButton.hidden = !this.#viewerUi.showFullscreenButton;
    this.#legendButton.hidden = !this.#viewerUi.showLegendButton;
    this.#inspectButton.hidden = !this.#viewerUi.showInspectButton;

    if (!this.#viewerUi.showLegendButton) {
      this.#legendVisible = false;
      this.#legend.classList.remove('visible');
    }

    this.#compass.hidden = !hudVisibility.showCompass;
    this.#scale.hidden = !hudVisibility.showScale;
    this.#navHud.hidden = !hudVisibility.showNavHud;

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
    const scale = computeScaleBar({
      width,
      height,
      zoom: camera.zoom,
      planetRadiusRatio: scene?.planet?.radius ?? 1,
      targetPixels: 96,
    });

    if (this.#scaleBar) {
      const pixels = Math.max(18, Math.round(scale.pixels));
      this.#scaleBar.style.width = `${pixels}px`;
    }
    if (this.#scaleLabel) {
      this.#scaleLabel.textContent = scale.label;
    }
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

    this.#legend.innerHTML = '';
    for (const marker of markers) {
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
      });
      this.#legend.appendChild(row);
    }
  }

  #onKeyboard(event) {
    const delta = 4;
    if (!this.#controller) {
      return;
    }

    const scene = this.#controller.getScene();
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
    this.#drag.active = true;
    this.#drag.pointerId = event.pointerId;
    this.#drag.x = event.clientX;
    this.#drag.y = event.clientY;
    this.#drag.vx = 0;
    this.#drag.vy = 0;
    this.#drag.ts = performance.now();
    this.#drag.travel = 0;
    if (this.#inertiaFrame) {
      cancelAnimationFrame(this.#inertiaFrame);
      this.#inertiaFrame = 0;
    }
    this.#stage.setPointerCapture?.(event.pointerId);
  }

  #onPointerMove(event) {
    if (!this.#drag.active || this.#drag.pointerId !== event.pointerId || !this.#controller) {
      return;
    }

    const now = performance.now();
    const dt = Math.max(1, now - this.#drag.ts);
    const dx = event.clientX - this.#drag.x;
    const dy = event.clientY - this.#drag.y;
    this.#drag.travel += Math.abs(dx) + Math.abs(dy);

    this.#drag.vx = dx / dt;
    this.#drag.vy = dy / dt;
    this.#drag.x = event.clientX;
    this.#drag.y = event.clientY;
    this.#drag.ts = now;

    this.#controller.panBy(dx * 0.18, -dy * 0.18);
    this.#updateNavigationHud();
  }

  #onPointerUp(event) {
    if (!this.#drag.active || this.#drag.pointerId !== event.pointerId) {
      return;
    }
    this.#drag.active = false;
    this.#stage.releasePointerCapture?.(event.pointerId);
    const isClick = this.#drag.travel < 6;
    if (isClick && this.#inspectMode) {
      this.inspectAt(event.clientX, event.clientY);
      return;
    }
    if (!isClick) {
      this.#startInertia();
    }
  }

  #startInertia() {
    if (!this.#controller) {
      return;
    }

    let vx = this.#drag.vx;
    let vy = this.#drag.vy;
    const friction = 0.94;

    const tick = () => {
      vx *= friction;
      vy *= friction;

      if (Math.abs(vx) < 0.005 && Math.abs(vy) < 0.005) {
        this.#inertiaFrame = 0;
        return;
      }

      this.#controller.panBy(vx * 7, -vy * 7);
      this.#updateNavigationHud();
      this.#inertiaFrame = requestAnimationFrame(tick);
    };

    this.#inertiaFrame = requestAnimationFrame(tick);
  }

  #onWheel(event) {
    if (!this.#controller) {
      return;
    }
    event.preventDefault();
    this.#stopFocusAnimation();
    const delta = -event.deltaY * 0.0015;
    this.#controller.zoomBy(delta);
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
