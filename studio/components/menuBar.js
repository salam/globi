const MENU_STRUCTURE = [
  {
    label: 'File',
    items: [
      { label: 'New Scene', action: 'newScene' },
      { label: 'New from Clipboard', action: 'newFromClipboard' },
      { label: 'New from File...', action: 'newFromFile' },
      { divider: true },
      { label: 'Save as File', action: 'saveAsFile' },
      { label: 'Export JSON', action: 'exportJSON' },
      { label: 'Export GeoJSON', action: 'exportGeoJSON' },
      { label: 'Export OBJ', action: 'exportOBJ' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', action: 'undo', shortcut: 'Ctrl+Z' },
      { label: 'Redo', action: 'redo', shortcut: 'Ctrl+Shift+Z' },
      { divider: true },
      { label: 'Delete Selected', action: 'deleteSelected', shortcut: 'Del' },
      { label: 'Duplicate', action: 'duplicate', shortcut: 'Ctrl+D' },
      { label: 'Select All', action: 'selectAll', shortcut: 'Ctrl+A' },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Toggle Properties Panel', action: 'toggleProperties', shortcut: 'P' },
      { label: 'Toggle Timeline', action: 'toggleTimeline', shortcut: 'T' },
      { label: 'Toggle HUD', action: 'toggleHud', shortcut: 'H' },
      { divider: true },
      { label: 'Zoom to Fit', action: 'zoomToFit', shortcut: 'F' },
      { label: 'Reset Camera', action: 'resetCamera', shortcut: 'R' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Custom ChatGPT \u2197', action: 'openChatGPT' },
      { label: 'Claude Cowork \u2197', action: 'openClaude' },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Documentation \u2197', action: 'openDocs' },
      { label: 'Keyboard Shortcuts', action: 'showShortcuts', shortcut: '?' },
      { label: 'About Globi Studio', action: 'showAbout' },
    ],
  },
];

export class MenuBar {
  constructor(container, { onAction }) {
    this._container = container;
    this._onAction = onAction;
    this._render();
  }

  _render() {
    // Clear container safely
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }

    // Logo
    const logo = document.createElement('div');
    logo.className = 'menu-logo';
    logo.textContent = 'GLOBI STUDIO';
    this._container.appendChild(logo);

    // Menu items
    for (const menu of MENU_STRUCTURE) {
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';

      const label = document.createElement('span');
      label.className = 'menu-label';
      label.textContent = menu.label;
      menuItem.appendChild(label);

      const dropdown = document.createElement('div');
      dropdown.className = 'menu-dropdown';

      for (const item of menu.items) {
        if (item.divider) {
          const divider = document.createElement('div');
          divider.className = 'menu-divider';
          dropdown.appendChild(divider);
        } else {
          const dropdownItem = document.createElement('div');
          dropdownItem.className = 'dropdown-item';
          dropdownItem.dataset.action = item.action;

          const itemLabel = document.createElement('span');
          itemLabel.textContent = item.label;
          dropdownItem.appendChild(itemLabel);

          if (item.shortcut) {
            const shortcut = document.createElement('span');
            shortcut.className = 'dropdown-shortcut';
            shortcut.textContent = item.shortcut;
            dropdownItem.appendChild(shortcut);
          }

          dropdownItem.addEventListener('click', () => {
            this._onAction(item.action);
          });

          dropdown.appendChild(dropdownItem);
        }
      }

      menuItem.appendChild(dropdown);
      this._container.appendChild(menuItem);
    }

    // Spacer
    const spacer = document.createElement('div');
    spacer.className = 'menu-spacer';
    spacer.style.flex = '1';
    this._container.appendChild(spacer);

    // Preview button
    const previewBtn = document.createElement('button');
    previewBtn.className = 'preview-btn';
    previewBtn.textContent = '\u25B6 Preview';
    previewBtn.addEventListener('click', () => {
      this._onAction('togglePreview');
    });
    this._container.appendChild(previewBtn);
  }
}
