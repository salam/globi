const TOOLS = [
  { tool: 'select', icon: '\u238B', tooltip: 'Select (V)' },
  null,
  { tool: 'marker', icon: '\u25C9', tooltip: 'Add Marker (M)' },
  { tool: 'arc',    icon: '\u2312', tooltip: 'Add Arc (A)' },
  { tool: 'path',   icon: '\u223F', tooltip: 'Add Path (L)' },
  { tool: 'region', icon: '\u2B21', tooltip: 'Add Region (Shift+R)' },
  null,
  { tool: 'draw',   icon: '\u270E', tooltip: 'Freehand Draw (D)' },
];

export class ToolStrip {
  constructor(container, { onToolChange }) {
    this._container = container;
    this._onToolChange = onToolChange;
    this._buttons = {};
    this._render();
  }

  _clearContainer() {
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }
  }

  _render() {
    this._clearContainer();

    for (const entry of TOOLS) {
      if (entry === null) {
        const divider = document.createElement('div');
        divider.className = 'tool-divider';
        this._container.appendChild(divider);
        continue;
      }

      const { tool, icon, tooltip } = entry;

      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.dataset.tool = tool;
      btn.title = tooltip;

      const iconSpan = document.createElement('span');
      iconSpan.textContent = icon;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'tool-label';
      labelSpan.textContent = tooltip;

      btn.appendChild(iconSpan);
      btn.appendChild(labelSpan);

      btn.addEventListener('click', () => {
        this._onToolChange(tool);
      });

      this._container.appendChild(btn);
      this._buttons[tool] = btn;
    }

    const spacer = document.createElement('div');
    spacer.className = 'tool-spacer';
    spacer.style.flex = '1';
    this._container.appendChild(spacer);
  }

  setActive(toolName) {
    for (const btn of Object.values(this._buttons)) {
      btn.classList.remove('active');
    }
    if (this._buttons[toolName]) {
      this._buttons[toolName].classList.add('active');
    }
  }
}
