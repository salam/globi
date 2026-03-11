export function localizeText(value, locale, fallbackLocale = 'en') {
  if (typeof value === 'string') {
    return value;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }
  if (typeof value[locale] === 'string') {
    return value[locale];
  }
  if (typeof value[fallbackLocale] === 'string') {
    return value[fallbackLocale];
  }
  const first = Object.values(value).find((entry) => typeof entry === 'string');
  return first ?? '';
}

export function createTranslator(dictionaries = {}, options = {}) {
  const defaultLocale = options.defaultLocale ?? 'en';

  return function translate(key, locale = defaultLocale) {
    const localeDictionary = dictionaries[locale] ?? {};
    if (Object.hasOwn(localeDictionary, key)) {
      return localeDictionary[key];
    }
    const fallbackDictionary = dictionaries[defaultLocale] ?? {};
    if (Object.hasOwn(fallbackDictionary, key)) {
      return fallbackDictionary[key];
    }
    return key;
  };
}
