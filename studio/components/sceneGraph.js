// studio/components/sceneGraph.js

const ENTITY_GROUPS = [
  { key: 'markers', label: 'Markers', icon: '\u25C9', entityType: 'marker' },
  { key: 'arcs', label: 'Arcs', icon: '\u2312', entityType: 'arc' },
  { key: 'paths', label: 'Paths', icon: '\u223F', entityType: 'path' },
  { key: 'regions', label: 'Regions', icon: '\u2B21', entityType: 'region' },
];

function getEntityColor(entity, group) {
  if (group.key === 'regions') return entity.capColor || '#4caf50';
  return entity.color || '#ccc';
}

function getEntityName(entity, locale) {
  if (!entity.name) return entity.id;
  if (typeof entity.name === 'string') return entity.name;
  return entity.name[locale] || entity.name.en || entity.id;
}

export class SceneGraph {
  constructor(container, callbacks = {}) {
    this._container = container;
    this._cb = callbacks;
    this._scene = null;
    this._selectedIds = new Set();
    this._collapsed = new Set();
    this._autoHideTimer = null;
    this._isVisible = false;
    this._pinned = false;
    this._hovered = false;
    this._dock = 'left';
    this._root = document.createElement('div');
    this._root.className = 'sg-root';
    this._container.appendChild(this._root);
  }

  render(scene, selectedIds) {
    this._scene = scene;
    this._selectedIds = new Set(selectedIds);
    this._rebuild();
  }

  _rebuild() {
    const scene = this._scene;
    if (!scene) return;
    const locale = scene.locale || 'en';

    while (this._root.firstChild) this._root.removeChild(this._root.firstChild);

    // Header
    const header = document.createElement('div');
    header.className = 'sg-header';

    const title = document.createElement('span');
    title.textContent = 'Scene';
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'sg-header-actions';

    const pinBtn = document.createElement('button');
    pinBtn.className = 'sg-header-btn';
    pinBtn.textContent = '\uD83D\uDCCC'; // pin emoji
    pinBtn.title = 'Pin panel';
    pinBtn.addEventListener('click', () => this._cb.onTogglePin?.());
    actions.appendChild(pinBtn);

    const dockBtn = document.createElement('button');
    dockBtn.className = 'sg-header-btn';
    dockBtn.textContent = this._dock === 'left' ? '\u21E5' : '\u21E4';
    dockBtn.title = this._dock === 'left' ? 'Dock right' : 'Dock left';
    dockBtn.addEventListener('click', () => this._cb.onToggleDock?.());
    actions.appendChild(dockBtn);

    header.appendChild(actions);
    this._root.appendChild(header);

    // Tree
    const tree = document.createElement('div');
    tree.className = 'sg-tree';

    for (const group of ENTITY_GROUPS) {
      const entities = scene[group.key] || [];
      const isCollapsed = this._collapsed.has(group.key);

      const groupEl = document.createElement('div');
      groupEl.dataset.group = group.key;

      // Group header
      const gh = document.createElement('div');
      gh.className = 'sg-group-header';

      const chevron = document.createElement('span');
      chevron.className = 'sg-group-chevron' + (isCollapsed ? ' collapsed' : '');
      chevron.textContent = '\u25BE';
      gh.appendChild(chevron);

      const icon = document.createElement('span');
      icon.className = 'sg-group-icon';
      icon.textContent = group.icon;
      gh.appendChild(icon);

      const label = document.createElement('span');
      label.textContent = group.label;
      gh.appendChild(label);

      const count = document.createElement('span');
      count.className = 'sg-group-count';
      count.textContent = `(${entities.length})`;
      gh.appendChild(count);

      // Group visibility eye
      const groupEye = document.createElement('span');
      groupEye.className = 'sg-group-eye';
      const allHidden = entities.length > 0 && entities.every(e => e.visible === false);
      groupEye.textContent = allHidden ? '\u{1F6AB}' : '\u{1F441}';
      groupEye.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const makeVisible = allHidden;
        for (const entity of entities) {
          this._cb.onVisibilityChange?.(group.key, entity.id, makeVisible);
        }
      });
      gh.appendChild(groupEye);

      gh.addEventListener('click', () => {
        if (isCollapsed) {
          this._collapsed.delete(group.key);
          chevron.classList.remove('collapsed');
        } else {
          this._collapsed.add(group.key);
          chevron.classList.add('collapsed');
        }
        // Update item visibility without full rebuild to keep header reference stable
        const groupDiv = gh.parentElement;
        if (groupDiv) {
          const items = groupDiv.querySelectorAll('.sg-item');
          for (const item of items) {
            item.style.display = this._collapsed.has(group.key) ? 'none' : '';
          }
          // If expanding, re-render items if none exist yet
          if (!this._collapsed.has(group.key) && items.length === 0) {
            const currentLocale = this._scene?.locale || 'en';
            const currentEntities = this._scene?.[group.key] || [];
            for (let i = 0; i < currentEntities.length; i++) {
              const item = this._createEntityItem(currentEntities[i], group, currentLocale, i);
              groupDiv.appendChild(item);
            }
          }
        }
      });

      gh.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        this._showGroupContextMenu(ev, group, entities);
      });

      groupEl.appendChild(gh);

      if (!isCollapsed) {
        for (let i = 0; i < entities.length; i++) {
          const entity = entities[i];
          const item = this._createEntityItem(entity, group, locale, i);
          groupEl.appendChild(item);
        }
      }

      tree.appendChild(groupEl);
    }

    this._root.appendChild(tree);
  }

  _createEntityItem(entity, group, locale, index) {
    const item = document.createElement('div');
    item.className = 'sg-item';
    item.dataset.id = entity.id;
    item.dataset.entityType = group.entityType;
    item.dataset.index = index;

    if (this._selectedIds.has(entity.id)) item.classList.add('selected');
    if (entity.visible === false) item.classList.add('hidden-entity');

    // Draggable
    item.draggable = true;
    item.addEventListener('dragstart', (ev) => this._onDragStart(ev, group.key, index));
    item.addEventListener('dragover', (ev) => this._onDragOver(ev));
    item.addEventListener('dragleave', (ev) => this._onDragLeave(ev));
    item.addEventListener('drop', (ev) => this._onDrop(ev, group.key));
    item.addEventListener('dragend', () => this._clearDropIndicators());

    // Icon
    const iconEl = document.createElement('span');
    iconEl.className = 'sg-item-icon';
    iconEl.textContent = group.icon;
    iconEl.style.color = getEntityColor(entity, group);
    item.appendChild(iconEl);

    // Name
    const nameEl = document.createElement('span');
    nameEl.className = 'sg-item-name';
    nameEl.textContent = getEntityName(entity, locale);
    item.appendChild(nameEl);

    // Eye toggle
    const eye = document.createElement('span');
    eye.className = 'sg-item-eye';
    if (entity.visible === false) {
      eye.classList.add('off', 'force-show');
      eye.textContent = '\u{1F6AB}';
    } else {
      eye.textContent = '\u{1F441}';
    }
    eye.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const newVisible = entity.visible === false;
      this._cb.onVisibilityChange?.(group.key, entity.id, newVisible);
    });
    item.appendChild(eye);

    // Click to select
    item.addEventListener('click', (ev) => {
      if (ev.target === eye) return;
      this._handleItemClick(ev, entity.id, group.key);
    });

    // Double-click to rename
    item.addEventListener('dblclick', (ev) => {
      if (ev.target === eye) return;
      this._startRename(nameEl, entity, group, locale);
    });

    // Context menu
    item.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      this._showItemContextMenu(ev, entity, group);
    });

    return item;
  }

  _handleItemClick(ev, id, groupKey) {
    if (ev.ctrlKey || ev.metaKey) {
      const ids = new Set(this._selectedIds);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      this._cb.onSelect?.([...ids]);
    } else if (ev.shiftKey && this._selectedIds.size > 0) {
      const entities = this._scene[groupKey] || [];
      const entityIds = entities.map(e => e.id);
      const lastSelected = [...this._selectedIds].pop();
      const lastIdx = entityIds.indexOf(lastSelected);
      const curIdx = entityIds.indexOf(id);
      if (lastIdx >= 0 && curIdx >= 0) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        const rangeIds = entityIds.slice(start, end + 1);
        this._cb.onSelect?.([...new Set([...this._selectedIds, ...rangeIds])]);
      } else {
        this._cb.onSelect?.([id]);
      }
    } else {
      this._cb.onSelect?.([id]);
    }
  }

  _startRename(nameEl, entity, group, locale) {
    const input = document.createElement('input');
    input.className = 'sg-item-rename';
    input.value = getEntityName(entity, locale);
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const finish = (save) => {
      if (save && input.value.trim()) {
        this._cb.onRename?.(group.entityType, entity.id, input.value.trim());
      }
      input.replaceWith(nameEl);
    };

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
      if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  // Drag & Drop
  _onDragStart(ev, groupKey, index) {
    ev.dataTransfer.setData('text/plain', JSON.stringify({ groupKey, index }));
    ev.dataTransfer.effectAllowed = 'move';
  }

  _onDragOver(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    const item = ev.target.closest('.sg-item');
    if (item) item.style.borderTop = '2px solid #7a7aff';
  }

  _onDragLeave(ev) {
    const item = ev.target.closest('.sg-item');
    if (item) item.style.borderTop = '';
  }

  _onDrop(ev, targetGroupKey) {
    ev.preventDefault();
    this._clearDropIndicators();
    try {
      const data = JSON.parse(ev.dataTransfer.getData('text/plain'));
      if (data.groupKey !== targetGroupKey) return;
      const targetItem = ev.target.closest('.sg-item');
      if (!targetItem) return;
      const toIndex = parseInt(targetItem.dataset.index, 10);
      if (data.index !== toIndex) {
        this._cb.onReorder?.(data.groupKey, data.index, toIndex);
      }
    } catch (e) { /* ignore */ }
  }

  _clearDropIndicators() {
    const items = this._root.querySelectorAll('.sg-item');
    for (const item of items) item.style.borderTop = '';
  }

  // Context Menus
  _showItemContextMenu(ev, entity, group) {
    this._closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'sg-context-menu';
    menu.style.left = ev.clientX + 'px';
    menu.style.top = ev.clientY + 'px';

    const items = [
      { label: 'Rename', action: () => {
        const nameEl = this._root.querySelector(`[data-id="${entity.id}"] .sg-item-name`);
        if (nameEl) this._startRename(nameEl, entity, group, this._scene?.locale || 'en');
      }},
      { label: 'Duplicate', action: () => this._cb.onDuplicate?.([entity.id]) },
      { label: 'Delete', action: () => this._cb.onDelete?.([entity.id]) },
      { divider: true },
      { label: entity.visible === false ? 'Show' : 'Hide',
        action: () => this._cb.onVisibilityChange?.(group.key, entity.id, entity.visible === false) },
    ];

    if (this._selectedIds.size > 1 && this._selectedIds.has(entity.id)) {
      items[1].label = `Duplicate ${this._selectedIds.size} items`;
      items[1].action = () => this._cb.onDuplicate?.([...this._selectedIds]);
      items[2].label = `Delete ${this._selectedIds.size} items`;
      items[2].action = () => this._cb.onDelete?.([...this._selectedIds]);
    }

    for (const item of items) {
      if (item.divider) {
        const d = document.createElement('div');
        d.className = 'sg-context-divider';
        menu.appendChild(d);
      } else {
        const el = document.createElement('div');
        el.className = 'sg-context-item';
        el.textContent = item.label;
        el.addEventListener('click', () => {
          item.action();
          this._closeContextMenu();
        });
        menu.appendChild(el);
      }
    }

    document.body.appendChild(menu);
    this._contextMenu = menu;

    const closeOnClick = (e) => {
      if (!menu.contains(e.target)) {
        this._closeContextMenu();
        document.removeEventListener('click', closeOnClick);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOnClick), 0);
  }

  _showGroupContextMenu(ev, group, entities) {
    this._closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'sg-context-menu';
    menu.style.left = ev.clientX + 'px';
    menu.style.top = ev.clientY + 'px';

    const items = [
      { label: 'Select All', action: () => {
        const ids = entities.map(e => e.id);
        this._cb.onSelect?.(ids);
      }},
      { label: 'Show All', action: () => {
        for (const e of entities) this._cb.onVisibilityChange?.(group.key, e.id, true);
      }},
      { label: 'Hide All', action: () => {
        for (const e of entities) this._cb.onVisibilityChange?.(group.key, e.id, false);
      }},
    ];

    for (const item of items) {
      const el = document.createElement('div');
      el.className = 'sg-context-item';
      el.textContent = item.label;
      el.addEventListener('click', () => {
        item.action();
        this._closeContextMenu();
      });
      menu.appendChild(el);
    }

    document.body.appendChild(menu);
    this._contextMenu = menu;

    const closeOnClick = (e) => {
      if (!menu.contains(e.target)) {
        this._closeContextMenu();
        document.removeEventListener('click', closeOnClick);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOnClick), 0);
  }

  _closeContextMenu() {
    if (this._contextMenu) {
      this._contextMenu.remove();
      this._contextMenu = null;
    }
  }

  // Auto-show / hide
  show() {
    this._isVisible = true;
    this._container.classList.add('open');
    clearTimeout(this._autoHideTimer);
  }

  hide() {
    this._isVisible = false;
    this._container.classList.remove('open');
  }

  autoShow(durationMs = 2000) {
    this.show();
    clearTimeout(this._autoHideTimer);
    this._autoHideTimer = setTimeout(() => {
      if (!this._pinned && !this._hovered) this.hide();
    }, durationMs);
  }

  setDock(position) {
    this._dock = position;
    this._rebuild();
  }

  moveTo(newContainer) {
    newContainer.appendChild(this._root);
  }

  getRoot() {
    return this._root;
  }

  setHovered(hovered) {
    this._hovered = hovered;
  }

  setPinned(pinned) {
    this._pinned = pinned;
    if (pinned) this.show();
  }

  createResizeHandle() {
    const handle = document.createElement('div');
    handle.className = 'sg-resize-handle';
    let startY = 0;
    let startHeight = 0;
    const onMove = (e) => {
      const delta = e.clientY - startY;
      const newHeight = Math.max(80, startHeight + delta);
      this._root.style.height = newHeight + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = this._root.getBoundingClientRect().height;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    return handle;
  }

  destroy() {
    this._closeContextMenu();
    clearTimeout(this._autoHideTimer);
    this._root.remove();
  }
}
