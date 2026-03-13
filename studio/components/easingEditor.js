/**
 * EasingEditor — popup component for choosing an easing curve preset.
 * Each preset button carries a data-easing attribute.
 */

const PRESETS = [
  { name: 'linear', label: 'Linear' },
  { name: 'ease-in', label: 'Ease In' },
  { name: 'ease-out', label: 'Ease Out' },
  { name: 'ease-in-out', label: 'Ease In-Out' },
  { name: 'bounce', label: 'Bounce' },
  { name: 'elastic', label: 'Elastic' },
];

export class EasingEditor {
  constructor(container, { onSelect } = {}) {
    this._container = container;
    this._onSelect = onSelect ?? (() => {});
    this._popup = null;
  }

  show() {
    if (this._popup) return;

    const popup = document.createElement('div');
    popup.className = 'easing-editor-popup';

    const title = document.createElement('div');
    title.className = 'easing-editor-title';
    title.textContent = 'Select Easing';
    popup.appendChild(title);

    const presetList = document.createElement('div');
    presetList.className = 'easing-preset-list';

    for (const preset of PRESETS) {
      const btn = document.createElement('button');
      btn.className = 'easing-preset-btn';
      btn.dataset.easing = preset.name;
      btn.title = preset.label;

      const label = document.createElement('span');
      label.className = 'easing-preset-label';
      label.textContent = preset.label;
      btn.appendChild(label);

      btn.addEventListener('click', () => {
        this._onSelect(preset.name);
        this.hide();
      });

      presetList.appendChild(btn);
    }

    popup.appendChild(presetList);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'easing-close-btn';
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', () => this.hide());
    popup.appendChild(closeBtn);

    this._container.appendChild(popup);
    this._popup = popup;
  }

  hide() {
    if (this._popup) {
      this._container.removeChild(this._popup);
      this._popup = null;
    }
  }

  toggle() {
    if (this._popup) {
      this.hide();
    } else {
      this.show();
    }
  }

  get isVisible() {
    return this._popup !== null;
  }
}
