import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslator, localizeText } from '../src/i18n/index.js';
import { sanitizeHtml } from '../src/security/sanitize.js';

test('translator resolves locale and fallback text', () => {
  const t = createTranslator(
    {
      en: { hello: 'Hello' },
      de: { hello: 'Hallo' },
    },
    { defaultLocale: 'en' }
  );

  assert.equal(t('hello', 'de'), 'Hallo');
  assert.equal(t('hello', 'fr'), 'Hello');
});

test('localizeText handles string and per-locale object', () => {
  assert.equal(localizeText('A', 'de'), 'A');
  assert.equal(localizeText({ en: 'English', de: 'Deutsch' }, 'de'), 'Deutsch');
  assert.equal(localizeText({ en: 'English' }, 'fr'), 'English');
});

test('sanitizeHtml strips scripts, event handlers and javascript urls', () => {
  const dirty = '<img src="x" onerror="alert(1)"><a href="javascript:alert(1)">x</a><script>alert(1)</script>';
  const clean = sanitizeHtml(dirty);

  assert.equal(clean.includes('onerror'), false);
  assert.equal(clean.includes('<script>'), false);
  assert.equal(clean.includes('javascript:'), false);
});
