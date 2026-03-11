import { resolveViewerUiConfig } from '../scene/viewerUi.js';

function readControlSnapshot(control) {
  if (!control || typeof control !== 'object') {
    return '';
  }

  if (control.type === 'checkbox' || control.type === 'radio') {
    return control.checked ? '1' : '0';
  }

  return String(control.value ?? '');
}

export function resolveNavigationHudVisibility(viewerUi = {}) {
  const resolved = resolveViewerUiConfig(viewerUi);
  const showCompass = Boolean(resolved.showCompass);
  const showScale = Boolean(resolved.showScale);

  return {
    showCompass,
    showScale,
    showNavHud: showCompass || showScale,
  };
}

export function bindControlEvents(control, onValueChange) {
  if (!control || typeof control.addEventListener !== 'function' || typeof onValueChange !== 'function') {
    return () => {};
  }

  let lastSnapshot = readControlSnapshot(control);

  const notifyIfChanged = () => {
    const nextSnapshot = readControlSnapshot(control);
    if (nextSnapshot === lastSnapshot) {
      return;
    }
    lastSnapshot = nextSnapshot;
    onValueChange(nextSnapshot);
  };

  control.addEventListener('input', notifyIfChanged);
  control.addEventListener('change', notifyIfChanged);

  return () => {
    if (typeof control.removeEventListener !== 'function') {
      return;
    }
    control.removeEventListener('input', notifyIfChanged);
    control.removeEventListener('change', notifyIfChanged);
  };
}
