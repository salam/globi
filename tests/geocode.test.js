import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NOMINATIM_SEARCH_ENDPOINT,
  buildNominatimSearchUrl,
  normalizeNominatimResult,
  geocodePlaceName,
  createMarkerFromGeocode,
} from '../src/io/geocode.js';

test('buildNominatimSearchUrl encodes query and options', () => {
  const url = buildNominatimSearchUrl('Zurich, Switzerland', {
    limit: 3,
    language: 'de',
    countryCodes: ['ch'],
  });

  assert.equal(url.origin + url.pathname, NOMINATIM_SEARCH_ENDPOINT);
  assert.equal(url.searchParams.get('format'), 'jsonv2');
  assert.equal(url.searchParams.get('q'), 'Zurich, Switzerland');
  assert.equal(url.searchParams.get('limit'), '3');
  assert.equal(url.searchParams.get('accept-language'), 'de');
  assert.equal(url.searchParams.get('countrycodes'), 'ch');
});

test('normalizeNominatimResult parses coordinates and display text', () => {
  const normalized = normalizeNominatimResult({
    place_id: 123,
    lat: '47.3769',
    lon: '8.5417',
    display_name: 'Zurich, Switzerland',
    class: 'boundary',
    type: 'administrative',
  });

  assert.equal(normalized.id, '123');
  assert.equal(normalized.lat, 47.3769);
  assert.equal(normalized.lon, 8.5417);
  assert.equal(normalized.displayName, 'Zurich, Switzerland');
});

test('geocodePlaceName returns normalized result entries', async () => {
  const fetchCalls = [];
  const fakeFetch = async (url) => {
    fetchCalls.push(String(url));
    return {
      ok: true,
      async json() {
        return [
          {
            place_id: 456,
            lat: '40.7128',
            lon: '-74.0060',
            display_name: 'New York, USA',
            class: 'place',
            type: 'city',
          },
        ];
      },
    };
  };

  const results = await geocodePlaceName('New York', { fetchImpl: fakeFetch });

  assert.equal(fetchCalls.length, 1);
  assert.equal(results.length, 1);
  assert.equal(results[0].displayName, 'New York, USA');
  assert.equal(results[0].lat, 40.7128);
});

test('createMarkerFromGeocode creates marker payload for scene', () => {
  const marker = createMarkerFromGeocode(
    {
      id: '999',
      lat: 51.5072,
      lon: -0.1276,
      displayName: 'London, Greater London, England, United Kingdom',
      type: 'city',
      class: 'place',
    },
    {
      locale: 'en',
      idPrefix: 'geo',
      color: '#ff0000',
    }
  );

  assert.equal(marker.id.startsWith('geo-999'), true);
  assert.equal(marker.lat, 51.5072);
  assert.equal(marker.lon, -0.1276);
  assert.equal(marker.name.en, 'London');
  assert.equal(marker.color, '#ff0000');
});
