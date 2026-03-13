/**
 * ContextMenu — contextual right-click menu for the Globi viewer.
 *
 * Renders a positioned <div role="menu"> inside the shadow DOM.
 * Supports mouse (contextmenu event), keyboard (Shift+F10, Menu key),
 * and touch (500ms long-press) triggers.
 */

const LONG_PRESS_MS = 500;

/**
 * Build the list of menu items based on what's under the cursor.
 * Pure function — used by tests and by the DOM renderer.
 */
export function buildMenuItems({ entityAtPoint, latLon }) {
  const items = [];

  // Context-specific items
  if (entityAtPoint?.type === 'marker') {
    items.push({ label: 'Inspect marker', action: 'inspectMarker', data: entityAtPoint.entity });
    items.push({ label: 'Copy marker info', action: 'copyMarkerInfo', data: entityAtPoint.entity });
    items.push({ label: 'Fly to marker', action: 'flyToMarker', data: entityAtPoint.entity });
    items.push({ type: 'separator', label: '' });
  } else if (entityAtPoint?.type === 'region') {
    items.push({ label: 'Inspect region', action: 'inspectRegion', data: entityAtPoint.entity });
    items.push({ label: 'Copy region info', action: 'copyRegionInfo', data: entityAtPoint.entity });
    items.push({ type: 'separator', label: '' });
  } else {
    // Empty surface
    items.push({ label: 'Drop marker here', action: 'dropMarker', data: latLon });
    items.push({ label: 'Fly to center', action: 'flyToCenter', data: latLon });
    items.push({ type: 'separator', label: '' });
  }

  // Export submenus
  const exportFormats = [
    { label: 'GeoJSON', format: 'geojson' },
    { label: 'JSON', format: 'json' },
    { label: 'OBJ', format: 'obj' },
    { label: 'USDZ', format: 'usdz', disabled: true, hint: 'Coming soon' },
  ];
  items.push({
    label: 'Export visible',
    action: 'exportSubmenu',
    submenu: exportFormats.map((f) => ({
      label: f.label,
      action: 'export',
      data: { format: f.format, scope: 'visible' },
      disabled: f.disabled ?? false,
      hint: f.hint,
    })),
  });
  items.push({
    label: 'Export full scene',
    action: 'exportSubmenu',
    submenu: exportFormats.map((f) => ({
      label: f.label,
      action: 'export',
      data: { format: f.format, scope: 'full' },
      disabled: f.disabled ?? false,
      hint: f.hint,
    })),
  });
  items.push({ type: 'separator', label: '' });

  // Description
  items.push({
    label: 'Copy description',
    action: 'descriptionSubmenu',
    submenu: [
      { label: 'Brief', action: 'copyDescription', data: { level: 'brief' } },
      { label: 'Detailed', action: 'copyDescription', data: { level: 'detailed' } },
    ],
  });
  items.push({ label: 'Copy LLMs.txt', action: 'copyLlmsTxt' });
  items.push({ label: 'Copy coordinates', action: 'copyCoordinates', data: latLon });

  return items;
}

/**
 * ContextMenu manages the DOM rendering and lifecycle of the menu.
 */
export class ContextMenu {
  #shadowRoot;
  #stage;
  #viewStateQuery;
  #controller;
  #menuEl = null;
  #onAction;
  #longPressTimer = null;
  #longPressPos = null;

  constructor({ shadowRoot, stage, viewStateQuery, controller, onAction }) {
    this.#shadowRoot = shadowRoot;
    this.#stage = stage;
    this.#viewStateQuery = viewStateQuery;
    this.#controller = controller;
    this.#onAction = onAction;

    this.#stage.addEventListener('contextmenu', (e) => this.#onContextMenu(e));
    this.#stage.addEventListener('touchstart', (e) => this.#onTouchStart(e), { passive: true });
    this.#stage.addEventListener('touchmove', () => this.#cancelLongPress());
    this.#stage.addEventListener('touchend', () => this.#cancelLongPress());
    this.#stage.addEventListener('touchcancel', () => this.#cancelLongPress());
  }

  #onContextMenu(event) {
    event.preventDefault();
    const latLon = this.#controller?.screenToLatLon(event.clientX, event.clientY) ?? { lat: 0, lon: 0 };
    const entityAtPoint = this.#viewStateQuery.getEntityAtPoint(event.clientX, event.clientY);
    this.#show(event.clientX, event.clientY, { entityAtPoint, latLon });
  }

  #onTouchStart(event) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    this.#longPressPos = { x: touch.clientX, y: touch.clientY };
    this.#longPressTimer = setTimeout(() => {
      const latLon = this.#controller?.screenToLatLon(this.#longPressPos.x, this.#longPressPos.y) ?? { lat: 0, lon: 0 };
      const entityAtPoint = this.#viewStateQuery.getEntityAtPoint(this.#longPressPos.x, this.#longPressPos.y);
      this.#show(this.#longPressPos.x, this.#longPressPos.y, { entityAtPoint, latLon });
    }, LONG_PRESS_MS);
  }

  #cancelLongPress() {
    if (this.#longPressTimer) {
      clearTimeout(this.#longPressTimer);
      this.#longPressTimer = null;
    }
  }

  #show(x, y, context) {
    this.close();
    const items = buildMenuItems(context);
    this.#menuEl = this.#renderMenu(items, x, y);
    this.#shadowRoot.appendChild(this.#menuEl);

    // Focus first item
    const firstBtn = this.#menuEl.querySelector('button:not([disabled])');
    if (firstBtn) firstBtn.focus();

    // Close handlers — use composedPath() to see through Shadow DOM boundaries
    const closeOnClick = (e) => {
      const path = e.composedPath();
      if (this.#menuEl && !path.includes(this.#menuEl)) this.close();
    };
    const closeOnKey = (e) => {
      if (e.key === 'Escape') this.close();
    };
    const closeOnScroll = () => this.close();
    document.addEventListener('pointerdown', closeOnClick);
    document.addEventListener('keydown', closeOnKey);
    window.addEventListener('scroll', closeOnScroll, { once: true });
    this._cleanup = () => {
      document.removeEventListener('pointerdown', closeOnClick);
      document.removeEventListener('keydown', closeOnKey);
      window.removeEventListener('scroll', closeOnScroll);
    };
  }

  close() {
    if (this.#menuEl) {
      this.#menuEl.remove();
      this.#menuEl = null;
    }
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
    this.#cancelLongPress();
  }

  #renderMenu(items, x, y) {
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    menu.className = 'globi-context-menu';
    Object.assign(menu.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: '10000',
      background: 'rgba(10, 23, 50, 0.95)',
      border: '1px solid #355183',
      borderRadius: '8px',
      padding: '4px 0',
      minWidth: '180px',
      fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
      fontSize: '13px',
      color: '#f3f6ff',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    });

    for (const item of items) {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:#355183;margin:4px 0;';
        menu.appendChild(sep);
        continue;
      }
      const btn = document.createElement('button');
      btn.setAttribute('role', 'menuitem');
      btn.textContent = item.label;
      if (item.disabled) {
        btn.disabled = true;
        btn.title = item.hint ?? '';
      }
      Object.assign(btn.style, {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '6px 16px',
        background: 'transparent',
        color: item.disabled ? '#667' : '#f3f6ff',
        border: 'none',
        cursor: item.disabled ? 'default' : 'pointer',
        fontSize: '13px',
        fontFamily: 'inherit',
      });
      if (!item.disabled) {
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(53, 81, 131, 0.5)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
      }

      if (item.submenu) {
        btn.textContent = `${item.label} \u25b8`;
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', 'false');
        const sub = this.#renderSubmenu(item.submenu);
        btn.addEventListener('mouseenter', () => {
          sub.style.display = 'block';
          btn.setAttribute('aria-expanded', 'true');
        });
        btn.addEventListener('mouseleave', (e) => {
          if (!sub.contains(e.relatedTarget)) {
            sub.style.display = 'none';
            btn.setAttribute('aria-expanded', 'false');
          }
        });
        sub.addEventListener('mouseleave', (e) => {
          if (!btn.contains(e.relatedTarget)) {
            sub.style.display = 'none';
            btn.setAttribute('aria-expanded', 'false');
          }
        });
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.appendChild(btn);
        wrapper.appendChild(sub);
        menu.appendChild(wrapper);
      } else {
        btn.addEventListener('click', () => {
          this.#onAction(item.action, item.data);
          this.close();
        });
        menu.appendChild(btn);
      }
    }

    // Keyboard navigation within menu
    menu.addEventListener('keydown', (e) => {
      const btns = [...menu.querySelectorAll('button:not([disabled])')];
      const idx = btns.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && idx < btns.length - 1) {
        e.preventDefault();
        btns[idx + 1].focus();
      } else if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        btns[idx - 1].focus();
      }
    });

    return menu;
  }

  #renderSubmenu(items) {
    const sub = document.createElement('div');
    sub.setAttribute('role', 'menu');
    Object.assign(sub.style, {
      display: 'none',
      position: 'absolute',
      left: '100%',
      top: '0',
      background: 'rgba(10, 23, 50, 0.95)',
      border: '1px solid #355183',
      borderRadius: '8px',
      padding: '4px 0',
      minWidth: '140px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    });
    for (const item of items) {
      const btn = document.createElement('button');
      btn.setAttribute('role', 'menuitem');
      btn.textContent = item.disabled ? `${item.label} (${item.hint})` : item.label;
      if (item.disabled) btn.disabled = true;
      Object.assign(btn.style, {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '6px 16px',
        background: 'transparent',
        color: item.disabled ? '#667' : '#f3f6ff',
        border: 'none',
        cursor: item.disabled ? 'default' : 'pointer',
        fontSize: '13px',
        fontFamily: 'inherit',
      });
      if (!item.disabled) {
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(53, 81, 131, 0.5)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
        btn.addEventListener('click', () => {
          this.#onAction(item.action, item.data);
          this.close();
        });
      }
      sub.appendChild(btn);
    }
    return sub;
  }

  destroy() {
    this.close();
  }
}
