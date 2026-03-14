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
    const el = this._studioEl || document.querySelector('.studio');
    if (el) el.classList.add('preview');
    this._onEnter();
  }

  exit() {
    if (!this._active) return;
    this._active = false;
    const el = this._studioEl || document.querySelector('.studio');
    if (el) el.classList.remove('preview');
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
