import { showModal } from './modal.js';

/**
 * FilterEditor — modal dialog for creating and editing scene filters.
 *
 * A filter has: { id, label, options: [{ value, label, categories: [] }] }
 * Categories are derived from markers' `category` field.
 */
export class FilterEditor {
  constructor({ getScene, onChange }) {
    this._getScene = getScene;
    this._onChange = onChange;
  }

  open() {
    const scene = this._getScene();
    const filter = (scene.filters && scene.filters[0]) || { id: 'filter-1', label: 'Category', options: [] };
    const allCategories = this._collectCategories(scene);

    const content = document.createElement('div');
    content.className = 'filter-editor';

    // Filter label
    const labelRow = this._makeRow('Filter Label');
    const labelInput = document.createElement('input');
    labelInput.className = 'field-input';
    labelInput.type = 'text';
    labelInput.value = filter.label;
    labelInput.addEventListener('change', () => { filter.label = labelInput.value; });
    labelRow.appendChild(labelInput);
    content.appendChild(labelRow);

    // Discovered categories hint
    if (allCategories.length > 0) {
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size: 11px; color: #667; margin: 8px 0 4px;';
      hint.textContent = `Available categories: ${allCategories.join(', ')}`;
      content.appendChild(hint);
    } else {
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size: 11px; color: #667; margin: 8px 0 4px;';
      hint.textContent = 'No categories found. Set "Category" on markers first.';
      content.appendChild(hint);
    }

    // Options list
    const optionsHeader = document.createElement('div');
    optionsHeader.style.cssText = 'font-weight: 600; margin: 16px 0 8px; color: #ddd;';
    optionsHeader.textContent = 'Filter Options';
    content.appendChild(optionsHeader);

    const optionsList = document.createElement('div');
    optionsList.className = 'filter-options-list';
    content.appendChild(optionsList);

    const renderOptions = () => {
      while (optionsList.firstChild) optionsList.removeChild(optionsList.firstChild);
      for (let i = 0; i < filter.options.length; i++) {
        optionsList.appendChild(this._renderOption(filter, i, allCategories, renderOptions));
      }
    };
    renderOptions();

    // Add option button
    const addBtn = document.createElement('button');
    addBtn.className = 'preview-btn';
    addBtn.style.cssText = 'margin-top: 8px; font-size: 11px; padding: 4px 12px;';
    addBtn.textContent = '+ Add Option';
    addBtn.addEventListener('click', () => {
      const idx = filter.options.length + 1;
      filter.options.push({ value: `option-${idx}`, label: `Option ${idx}`, categories: [] });
      renderOptions();
    });
    content.appendChild(addBtn);

    // Auto-generate button
    if (allCategories.length > 0) {
      const autoBtn = document.createElement('button');
      autoBtn.className = 'preview-btn';
      autoBtn.style.cssText = 'margin-top: 8px; margin-left: 8px; font-size: 11px; padding: 4px 12px;';
      autoBtn.textContent = '\u2728 Auto-generate from categories';
      autoBtn.addEventListener('click', () => {
        filter.options = allCategories.map(cat => ({
          value: cat.toLowerCase().replace(/\s+/g, '-'),
          label: cat,
          categories: [cat],
        }));
        renderOptions();
      });
      content.appendChild(autoBtn);
    }

    // Save / Cancel buttons
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; border-top: 1px solid #2a2a4a; padding-top: 12px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'preview-btn';
    cancelBtn.style.cssText = 'font-size: 12px; padding: 5px 16px;';
    cancelBtn.textContent = 'Cancel';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'preview-btn';
    saveBtn.style.cssText = 'font-size: 12px; padding: 5px 16px; background: #3a5a9a; color: #fff;';
    saveBtn.textContent = 'Save';

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    content.appendChild(actions);

    const close = showModal('Edit Filters', content);

    cancelBtn.addEventListener('click', () => close());
    saveBtn.addEventListener('click', () => {
      // Remove empty options
      filter.options = filter.options.filter(o => o.label.trim());
      this._onChange([filter]);
      close();
    });
  }

  _renderOption(filter, index, allCategories, rerender) {
    const opt = filter.options[index];
    const card = document.createElement('div');
    card.style.cssText = 'background: #12122a; border: 1px solid #2a2a4a; border-radius: 6px; padding: 10px; margin-bottom: 8px;';

    // Top row: label + delete
    const topRow = document.createElement('div');
    topRow.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 6px;';

    const labelInput = document.createElement('input');
    labelInput.className = 'field-input';
    labelInput.type = 'text';
    labelInput.value = opt.label;
    labelInput.placeholder = 'Option label';
    labelInput.style.flex = '1';
    labelInput.addEventListener('change', () => {
      opt.label = labelInput.value;
      if (!opt.value || opt.value.startsWith('option-')) {
        opt.value = labelInput.value.toLowerCase().replace(/\s+/g, '-');
      }
    });
    topRow.appendChild(labelInput);

    const delBtn = document.createElement('button');
    delBtn.className = 'preview-btn';
    delBtn.style.cssText = 'font-size: 11px; padding: 2px 8px; color: #f66;';
    delBtn.textContent = '\u00d7';
    delBtn.title = 'Remove option';
    delBtn.addEventListener('click', () => {
      filter.options.splice(index, 1);
      rerender();
    });
    topRow.appendChild(delBtn);
    card.appendChild(topRow);

    // Categories: checkboxes for discovered categories
    if (allCategories.length > 0) {
      const catLabel = document.createElement('div');
      catLabel.style.cssText = 'font-size: 11px; color: #888; margin-bottom: 4px;';
      catLabel.textContent = 'Categories:';
      card.appendChild(catLabel);

      const catGrid = document.createElement('div');
      catGrid.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px 12px;';
      for (const cat of allCategories) {
        const catItem = document.createElement('label');
        catItem.style.cssText = 'display: flex; align-items: center; gap: 4px; font-size: 11px; color: #aaa; cursor: pointer;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = opt.categories.includes(cat);
        cb.addEventListener('change', () => {
          if (cb.checked) {
            if (!opt.categories.includes(cat)) opt.categories.push(cat);
          } else {
            opt.categories = opt.categories.filter(c => c !== cat);
          }
        });
        catItem.appendChild(cb);
        catItem.appendChild(document.createTextNode(cat));
        catGrid.appendChild(catItem);
      }
      card.appendChild(catGrid);
    } else {
      // Manual categories input
      const catLabel = document.createElement('div');
      catLabel.style.cssText = 'font-size: 11px; color: #888; margin-bottom: 4px;';
      catLabel.textContent = 'Categories (comma-separated):';
      card.appendChild(catLabel);

      const catInput = document.createElement('input');
      catInput.className = 'field-input';
      catInput.type = 'text';
      catInput.value = opt.categories.join(', ');
      catInput.placeholder = 'e.g. city, capital';
      catInput.addEventListener('change', () => {
        opt.categories = catInput.value.split(',').map(s => s.trim()).filter(Boolean);
      });
      card.appendChild(catInput);
    }

    return card;
  }

  _makeRow(label) {
    const row = document.createElement('div');
    row.className = 'field';
    const lbl = document.createElement('label');
    lbl.className = 'field-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    return row;
  }

  _collectCategories(scene) {
    const cats = new Set();
    for (const m of scene.markers || []) {
      if (m.category) cats.add(m.category);
    }
    return [...cats].sort();
  }
}
