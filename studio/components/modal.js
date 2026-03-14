/**
 * showModal -- displays a dark-themed modal dialog.
 * Returns a close() function.
 */
export function showModal(title, contentEl) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const card = document.createElement('div');
  card.className = 'modal-card';

  const header = document.createElement('div');
  header.className = 'modal-header';

  const titleEl = document.createElement('span');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', close);
  header.appendChild(closeBtn);

  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'modal-body';
  body.appendChild(contentEl);
  card.appendChild(body);

  overlay.appendChild(card);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKeydown);

  function close() {
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  }

  document.body.appendChild(overlay);
  return close;
}
