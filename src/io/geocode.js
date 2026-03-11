export const NOMINATIM_SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function cleanString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function buildNominatimSearchUrl(query, options = {}) {
  const endpoint = options.endpoint ?? NOMINATIM_SEARCH_ENDPOINT;
  const url = new URL(endpoint);

  const normalizedQuery = String(query ?? '').trim();
  const limit = Math.max(1, Math.min(50, Number(options.limit ?? 5)));

  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('q', normalizedQuery);

  if (options.language) {
    url.searchParams.set('accept-language', String(options.language));
  }

  if (Array.isArray(options.countryCodes) && options.countryCodes.length > 0) {
    url.searchParams.set('countrycodes', options.countryCodes.join(','));
  }

  if (options.dedupe === false) {
    url.searchParams.set('dedupe', '0');
  }

  return url;
}

export function normalizeNominatimResult(item = {}) {
  const lat = toFiniteNumber(item.lat);
  const lon = toFiniteNumber(item.lon);

  return {
    id: String(item.place_id ?? ''),
    lat,
    lon,
    displayName: cleanString(item.display_name),
    class: cleanString(item.class),
    type: cleanString(item.type),
    importance: toFiniteNumber(item.importance),
    raw: item,
  };
}

export async function geocodePlaceName(query, options = {}) {
  const normalizedQuery = String(query ?? '').trim();
  if (!normalizedQuery) {
    return [];
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('Fetch API is unavailable for geocoding');
  }

  const url = buildNominatimSearchUrl(normalizedQuery, options);
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed (${response.status})`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map(normalizeNominatimResult)
    .filter((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lon));
}

function inferShortLabel(displayName, fallback = 'Location') {
  const firstPart = String(displayName ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)[0];

  return firstPart || fallback;
}

export function createMarkerFromGeocode(result, options = {}) {
  const locale = options.locale ?? 'en';
  const idPrefix = options.idPrefix ?? 'geo';
  const shortName = inferShortLabel(result.displayName, result.id || 'Location');
  const slug = slugify(shortName);
  const idCore = String(result.id ?? Date.now());
  const markerId = slug ? `${idPrefix}-${idCore}-${slug}` : `${idPrefix}-${idCore}`;

  return {
    id: markerId,
    name: {
      [locale]: shortName,
      en: shortName,
    },
    description: {
      [locale]: result.displayName,
      en: result.displayName,
    },
    lat: Number(result.lat),
    lon: Number(result.lon),
    alt: Number(options.alt ?? 0),
    visualType: options.visualType ?? 'dot',
    color: options.color ?? '#ff6a00',
    callout: result.displayName,
    category: options.category ?? 'geocode',
    source: 'nominatim',
    sourceType: result.type ?? '',
    sourceClass: result.class ?? '',
  };
}
