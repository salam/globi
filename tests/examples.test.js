import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EXAMPLE_IDS,
  listExampleDefinitions,
  loadAllCapitalsExample,
  loadContinentsAndSeasExample,
  loadIssRealtimeExample,
  loadExampleScene,
  loadUkraineConflictOpenSourceExample,
  loadCarriersOpenSourceExample,
} from '../src/examples/loaders.js';

const NATURAL_EARTH_LAND_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';

function createLandGeoJsonStub() {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Test Mainland' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[-10, 0], [10, 0], [10, 12], [-10, 0]]],
        },
      },
      {
        type: 'Feature',
        properties: { name: 'Test Island Group' },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [[[20, -5], [26, -5], [26, 2], [20, -5]]],
          ],
        },
      },
    ],
  };
}

function withLandRoute(routes) {
  return {
    [NATURAL_EARTH_LAND_URL]: createLandGeoJsonStub(),
    ...routes,
  };
}

function createFetchStub(routes) {
  return async function fetchStub(url) {
    const resolvedKey = Object.keys(routes).find((key) => {
      if (key === url) {
        return true;
      }
      return decodeURIComponent(key) === decodeURIComponent(url);
    });

    if (!resolvedKey) {
      return {
        ok: false,
        status: 404,
        async text() {
          return 'not found';
        },
        async json() {
          return {};
        },
      };
    }

    return {
      ok: true,
      status: 200,
      async text() {
        return '';
      },
      async json() {
        return routes[resolvedKey];
      },
    };
  };
}

test('listExampleDefinitions exposes 5 loadable examples', () => {
  const examples = listExampleDefinitions();

  assert.equal(examples.length, 5);
  assert.deepEqual(
    examples.map((entry) => entry.id),
    [
      EXAMPLE_IDS.ALL_CAPITALS,
      EXAMPLE_IDS.CONTINENTS_AND_SEAS,
      EXAMPLE_IDS.ISS_REALTIME,
      EXAMPLE_IDS.UKRAINE_CONFLICT,
      EXAMPLE_IDS.CARRIERS_TRACKING,
    ]
  );
  const carrierExample = examples.find((entry) => entry.id === EXAMPLE_IDS.CARRIERS_TRACKING);
  assert.equal(carrierExample?.label, '5) Aircraft Carriers (Open Sources)');
});

test('loadAllCapitalsExample maps capitals to marker entities', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng': [
      {
        name: { common: 'Switzerland' },
        capital: ['Bern'],
        capitalInfo: { latlng: [46.948, 7.4474] },
        cca3: 'CHE',
      },
      {
        name: { common: 'NoCapitalLand' },
        cca3: 'NCL',
      },
    ],
  }));

  const scene = await loadAllCapitalsExample({ fetchImpl, locale: 'en' });

  assert.equal(scene.planet.id, 'earth');
  assert.equal(scene.planet.lightingMode, 'sun');
  assert.equal(scene.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(scene.markers.length, 1);
  assert.equal(scene.regions.length, 2);
  assert.ok(scene.regions.every((region) => region.id.startsWith('landmass-')));
  assert.equal(scene.markers[0].id, 'cap-che');
  assert.equal(scene.markers[0].name.en, 'Bern');
});

test('loadIssRealtimeExample builds ISS marker and orbit path from API responses', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://api.wheretheiss.at/v1/satellites/25544': {
      latitude: 12.5,
      longitude: 89.1,
      altitude: 420,
      velocity: 27600,
    },
    'https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=9997300,9997900,9998500,9999100,9999700,10000300,10000900,10001500,10002100,10002700&units=kilometers': [
      { timestamp: 9997300, latitude: 1, longitude: 2, altitude: 410 },
      { timestamp: 9997900, latitude: 3, longitude: 4, altitude: 412 },
      { timestamp: 9998500, latitude: 5, longitude: 6, altitude: 414 },
    ],
  }));

  const scene = await loadIssRealtimeExample({
    fetchImpl,
    nowMs: 10000000 * 1000,
  });

  const currentMarker = scene.markers.find((entry) => entry.id === 'iss-current');
  const historyMarkers = scene.markers.filter((entry) => entry.category === 'iss-history');

  assert.equal(Boolean(currentMarker), true);
  assert.equal(historyMarkers.length, 3);
  assert.ok(historyMarkers.every((entry) => entry.visualType === 'dot'));
  assert.ok(historyMarkers.every((entry) => entry.id.startsWith('iss-history-')));
  assert.ok(historyMarkers.every((entry) => entry.callout.includes('Time:')));
  assert.ok(historyMarkers.every((entry) => entry.description.en.includes('ISS position at')));
  assert.equal(scene.paths.length, 1);
  assert.equal(scene.paths[0].points.length, 3);
  assert.equal(scene.paths[0].id, 'iss-recent-orbit');
  assert.equal(scene.regions.length, 2);
  assert.equal(scene.planet.textureUri.includes('nasa.gov'), true);
});

test('loadContinentsAndSeasExample maps continent and sea features into regions and labels', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson': {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { featurecla: 'Continent', name: 'Test Continent' },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]],
          },
        },
      ],
    },
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_marine_polys.geojson': {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { featurecla: 'Sea', name: 'Test Sea' },
          geometry: {
            type: 'Polygon',
            coordinates: [[[20, 0], [30, 0], [30, 10], [20, 0]]],
          },
        },
      ],
    },
  }));

  const scene = await loadContinentsAndSeasExample({ fetchImpl });

  assert.equal(scene.regions.length, 3);
  assert.ok(scene.regions.some((entry) => entry.id === 'landmass-1-test-mainland'));
  assert.ok(scene.markers.some((entry) => entry.id === 'label-test-continent'));
  assert.ok(scene.markers.some((entry) => entry.id === 'sea-label-test-sea'));
  assert.equal(scene.planet.textureUri.includes('nasa.gov'), true);
});

test('loadUkraineConflictOpenSourceExample returns non-tactical advisory scene', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson': {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { 'ISO3166-1-Alpha-3': 'UKR' },
          geometry: {
            type: 'Polygon',
            coordinates: [[[30, 50], [31, 50], [31, 51], [30, 50]]],
          },
        },
      ],
    },
  }));

  const scene = await loadUkraineConflictOpenSourceExample({ fetchImpl });

  assert.equal(scene.regions.length, 3);
  assert.ok(scene.markers.some((entry) => entry.id === 'ukr-advisory'));
  assert.equal(scene.planet.textureUri.includes('nasa.gov'), true);
});

test('loadCarriersOpenSourceExample returns advisory + source-backed carrier markers', async () => {
  const fetchImpl = createFetchStub(withLandRoute({}));
  const scene = await loadCarriersOpenSourceExample({
    fetchImpl,
    nowMs: Date.UTC(2026, 2, 1, 12, 0, 0),
  });

  const advisory = scene.markers.find((entry) => entry.id === 'carrier-advisory');
  assert.ok(advisory);
  assert.ok(advisory.description.en.includes('https://www.marinevesseltraffic.com/navy-ships/US%20Aircraft%20Carriers%20Location%20Tracker'));
  assert.ok(advisory.description.en.includes('http://www.gonavy.jp/CVLocation.html'));
  assert.ok(advisory.description.en.includes('https://www.cruisingearth.com/military-ship-tracker/aircraft-carriers/'));
  assert.ok(advisory.description.en.includes('https://www.vesselfinder.com/'));
  assert.ok(advisory.description.en.includes('https://www.marinetraffic.com/en/ais/home/centerx:-12.0/centery:25.0/zoom:4'));
  assert.ok(scene.markers.some((entry) => entry.id === 'carrier-cvn68'));
  assert.ok(scene.markers.some((entry) => entry.id === 'carrier-cvn78'));
  const carrierCvn71 = scene.markers.find((entry) => entry.id === 'carrier-cvn71');
  assert.ok(carrierCvn71);
  assert.equal(carrierCvn71.lat, 32.9);
  assert.equal(carrierCvn71.lon, -120.2);
  assert.ok(carrierCvn71.description.en.includes('Last AIS region: North America West Coast'));
  assert.ok(carrierCvn71.description.en.includes('Source page: https://www.vesselfinder.com/vessels/details/366984000'));
  assert.ok(scene.markers.length >= 11);
  assert.equal(scene.paths.length, 0);
  assert.equal(scene.regions.length, 2);
  assert.equal(scene.planet.textureUri.includes('nasa.gov'), true);
});

test('loadExampleScene routes ids to matching loaders', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng': [],
    'https://api.wheretheiss.at/v1/satellites/25544': {
      latitude: 10,
      longitude: 20,
      altitude: 420,
      velocity: 27500,
    },
    'https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=9997300,9997900,9998500,9999100,9999700,10000300,10000900,10001500,10002100,10002700&units=kilometers': [
      { timestamp: 9997300, latitude: 1, longitude: 2, altitude: 410 },
      { timestamp: 9997900, latitude: 3, longitude: 4, altitude: 412 },
      { timestamp: 9998500, latitude: 5, longitude: 6, altitude: 414 },
    ],
    'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson': {
      type: 'FeatureCollection',
      features: [],
    },
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson': {
      type: 'FeatureCollection',
      features: [],
    },
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_marine_polys.geojson': {
      type: 'FeatureCollection',
      features: [],
    },
  }));

  const options = {
    fetchImpl,
    nowMs: 10000000 * 1000,
  };
  const capitals = await loadExampleScene(EXAMPLE_IDS.ALL_CAPITALS, options);
  const continents = await loadExampleScene(EXAMPLE_IDS.CONTINENTS_AND_SEAS, options);
  const iss = await loadExampleScene(EXAMPLE_IDS.ISS_REALTIME, options);
  const ukraine = await loadExampleScene(EXAMPLE_IDS.UKRAINE_CONFLICT, options);
  const carriers = await loadExampleScene(EXAMPLE_IDS.CARRIERS_TRACKING, options);

  assert.equal(Array.isArray(capitals.markers), true);
  assert.equal(Array.isArray(continents.markers), true);
  assert.equal(Array.isArray(iss.markers), true);
  assert.equal(Array.isArray(ukraine.markers), true);
  assert.equal(Array.isArray(carriers.markers), true);
  assert.ok(capitals.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.ok(continents.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.ok(iss.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.ok(ukraine.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.ok(carriers.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.equal(capitals.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(continents.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(iss.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(ukraine.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(carriers.planet.textureUri.includes('nasa.gov'), true);
});
