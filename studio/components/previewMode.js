/**
 * PreviewMode — toggles a "preview" CSS class on the studio element
 * and notifies callers via onEnter / onExit callbacks.
 */
export class PreviewMode {
  constructor({ studioEl, onEnter, onExit } = {}) {
    this._studioEl = studioEl;
    this._onEnter = onEnter ?? (() => {});
    this._onExit = onExit ?? (() => {});
    this._active = false;
  }

  enter() {
    if (this._active) return;
    this._active = true;
    this._studioEl.classList.add('preview');
    this._onEnter();
  }

  exit() {
    if (!this._active) return;
    this._active = false;
    this._studioEl.classList.remove('preview');
    this._onExit();
  }

  toggle() {
    if (this._active) {
      this.exit();
    } else {
      this.enter();
    }
  }

  get isActive() {
    return this._active;
  }
}
