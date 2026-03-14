/**
 * StudioOverlay -- injects Globi Studio as a full-page overlay.
 * Reparents an existing <globi-viewer> into the overlay viewport,
 * then dynamically imports and boots the Studio app.
 */
export class StudioOverlay {
  constructor(viewerEl) {
    this._viewer = viewerEl;
    this._originalParent = null;
    this._originalNextSibling = null;
    this._overlayEl = null;
    this._isDirty = false;
  }

  get isDirty() { return this._isDirty; }
  set isDirty(v) { this._isDirty = !!v; }

  open() {
    if (this._overlayEl) return;

    // Remember original DOM position
    this._originalParent = this._viewer.parentElement;
    this._originalNextSibling = this._viewer.nextSibling;

    // Build overlay DOM using safe DOM methods
    this._overlayEl = document.createElement('div');
    this._overlayEl.className = 'studio-overlay';

    // .studio class matches styles.css (.studio selector, line 5)
    const studio = document.createElement('div');
    studio.className = 'studio';

    const menuBar = document.createElement('div');
    menuBar.id = 'studio-menu-bar';
    menuBar.className = 'menu-bar';
    studio.appendChild(menuBar);

    const main = document.createElement('div');
    main.className = 'main';

    const toolStrip = document.createElement('div');
    toolStrip.id = 'studio-tool-strip';
    toolStrip.className = 'tool-strip';
    main.appendChild(toolStrip);

    const viewport = document.createElement('div');
    viewport.id = 'studio-viewport';
    viewport.className = 'viewport';
    main.appendChild(viewport);

    const properties = document.createElement('div');
    properties.id = 'studio-properties';
    properties.className = 'properties';
    main.appendChild(properties);

    studio.appendChild(main);

    const timeline = document.createElement('div');
    timeline.id = 'studio-timeline';
    timeline.className = 'timeline';
    studio.appendChild(timeline);

    this._overlayEl.appendChild(studio);

    // Reparent viewer into viewport
    viewport.appendChild(this._viewer);

    document.body.appendChild(this._overlayEl);

    // Global ref for closeStudio action in app.js
    window.__studioOverlay = this;
  }

  close() {
    if (!this._overlayEl) return;

    if (this._isDirty && typeof confirm === 'function' && !confirm('You have unsaved changes. Close Studio?')) {
      return;
    }

    // Restore viewer to original DOM position
    if (this._originalParent) {
      if (this._originalNextSibling) {
        this._originalParent.insertBefore(this._viewer, this._originalNextSibling);
      } else {
        this._originalParent.appendChild(this._viewer);
      }
    }

    this._overlayEl.remove();
    this._overlayEl = null;
    window.__studioOverlay = null;
  }
}
