/**
 * StudioOverlay -- injects Globi Studio as a full-page overlay.
 * Reparents an existing <globi-viewer> into the overlay viewport,
 * injects the Studio CSS, and dynamically imports app.js to boot the UI.
 */
export class StudioOverlay {
  constructor(viewerEl, { studioBase = '/studio/' } = {}) {
    this._viewer = viewerEl;
    this._studioBase = studioBase;
    this._originalParent = null;
    this._originalNextSibling = null;
    this._overlayEl = null;
    this._styleLink = null;
    this._isDirty = false;
  }

  get isDirty() { return this._isDirty; }
  set isDirty(v) { this._isDirty = !!v; }

  async open() {
    if (this._overlayEl) return;

    // Remember original DOM position
    this._originalParent = this._viewer.parentElement;
    this._originalNextSibling = this._viewer.nextSibling;

    // Inject Studio CSS if not already present
    if (!document.querySelector('link[href*="studio/styles.css"], link[href*="styles.css"][data-studio]')) {
      this._styleLink = document.createElement('link');
      this._styleLink.rel = 'stylesheet';
      this._styleLink.href = this._studioBase + 'styles.css';
      this._styleLink.dataset.studio = '';
      document.head.appendChild(this._styleLink);
    }

    // Build overlay DOM using safe DOM methods
    this._overlayEl = document.createElement('div');
    this._overlayEl.className = 'studio-overlay';

    // ID + class match studio/index.html so app.js can bootstrap
    const studio = document.createElement('div');
    studio.id = 'studio';
    studio.className = 'studio';

    const menuBar = document.createElement('div');
    menuBar.id = 'menu-bar';
    menuBar.className = 'menu-bar';
    studio.appendChild(menuBar);

    const main = document.createElement('div');
    main.className = 'main';

    const toolStrip = document.createElement('div');
    toolStrip.id = 'tool-strip';
    toolStrip.className = 'tool-strip';
    main.appendChild(toolStrip);

    const viewport = document.createElement('div');
    viewport.id = 'viewport';
    viewport.className = 'viewport';
    main.appendChild(viewport);

    const properties = document.createElement('div');
    properties.id = 'properties';
    properties.className = 'properties';
    main.appendChild(properties);

    studio.appendChild(main);

    const timeline = document.createElement('div');
    timeline.id = 'timeline';
    timeline.className = 'timeline';
    studio.appendChild(timeline);

    this._overlayEl.appendChild(studio);

    // Ensure viewer has id="viewer" for app.js getElementById('viewer')
    if (!this._viewer.id) this._viewer.id = 'viewer';

    // Reparent viewer into viewport
    viewport.appendChild(this._viewer);

    document.body.appendChild(this._overlayEl);

    // Global ref for closeStudio action in app.js
    window.__studioOverlay = this;

    // Boot Studio app
    try {
      await import(this._studioBase + 'app.js');
    } catch (err) {
      console.warn('Studio app boot failed:', err.message);
    }
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

    // Remove injected CSS
    if (this._styleLink) {
      this._styleLink.remove();
      this._styleLink = null;
    }

    this._overlayEl.remove();
    this._overlayEl = null;
    window.__studioOverlay = null;
  }
}
