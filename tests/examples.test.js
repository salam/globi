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
  loadVesselTrackingExample,
  loadCivilShippingExample,
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

test('listExampleDefinitions exposes loadable examples', () => {
  const examples = listExampleDefinitions();

  assert.equal(examples.length, 8);
  assert.deepEqual(
    examples.map((entry) => entry.id),
    [
      EXAMPLE_IDS.NONE,
      EXAMPLE_IDS.ALL_CAPITALS,
      EXAMPLE_IDS.CONTINENTS_AND_SEAS,
      EXAMPLE_IDS.ISS_REALTIME,
      EXAMPLE_IDS.UKRAINE_CONFLICT,
      EXAMPLE_IDS.CARRIERS_TRACKING,
      EXAMPLE_IDS.VESSEL_TRACKING,
      EXAMPLE_IDS.CIVIL_SHIPPING,
    ]
  );
  const carrierExample = examples.find((entry) => entry.id === EXAMPLE_IDS.CARRIERS_TRACKING);
  assert.equal(carrierExample?.label, '5) Naval Vessels (OSINT)');
  const vesselExample = examples.find((entry) => entry.id === EXAMPLE_IDS.VESSEL_TRACKING);
  assert.equal(vesselExample?.label, '6) Vessel Tracking (Multi-Source)');
  const civilExample = examples.find((entry) => entry.id === EXAMPLE_IDS.CIVIL_SHIPPING);
  assert.equal(civilExample?.label, '7) Civil Shipping (Global Straits)');
});

test('loadAllCapitalsExample maps capitals to marker entities with membership filters', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng,unMember': [
      {
        name: { common: 'Switzerland' },
        capital: ['Bern'],
        capitalInfo: { latlng: [46.948, 7.4474] },
        cca3: 'CHE',
        unMember: true,
      },
      {
        name: { common: 'Testland' },
        capital: ['Testville'],
        capitalInfo: { latlng: [10.0, 20.0] },
        cca3: 'TST',
        unMember: false,
      },
      {
        name: { common: 'NoCapitalLand' },
        cca3: 'NCL',
      },
      {
        name: { common: 'Germany' },
        capital: ['Berlin'],
        capitalInfo: { latlng: [52.52, 13.405] },
        cca3: 'DEU',
        unMember: true,
      },
      {
        name: { common: 'Iceland' },
        capital: ['Reykjavik'],
        capitalInfo: { latlng: [64.15, -21.95] },
        cca3: 'ISL',
        unMember: false,
      },
    ],
  }));

  const scene = await loadAllCapitalsExample({ fetchImpl, locale: 'en' });

  assert.equal(scene.planet.id, 'earth');
  assert.equal(scene.planet.lightingMode, 'sun');
  assert.equal(scene.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(scene.markers.length, 4);
  assert.equal(scene.regions.length, 2);
  assert.ok(scene.regions.every((region) => region.id.startsWith('landmass-')));

  // Bern: UN member, not NATO
  const bern = scene.markers.find((m) => m.id === 'cap-che');
  assert.equal(bern.name.en, 'Bern');
  assert.equal(bern.category, 'capital-un');
  assert.ok(bern.description.en.includes('UN member'));
  assert.ok(!bern.description.en.includes('NATO'));

  // Berlin: both UN and NATO
  const berlin = scene.markers.find((m) => m.id === 'cap-deu');
  assert.equal(berlin.category, 'capital-un-nato');
  assert.ok(berlin.description.en.includes('UN member'));
  assert.ok(berlin.description.en.includes('NATO member'));

  // Reykjavik: NATO only (Iceland is NATO but not UN in our stub)
  const reykjavik = scene.markers.find((m) => m.id === 'cap-isl');
  assert.equal(reykjavik.category, 'capital-nato');
  assert.ok(reykjavik.description.en.includes('NATO member'));

  // Testville: neither UN nor NATO
  const tst = scene.markers.find((m) => m.id === 'cap-tst');
  assert.equal(tst.category, 'capital');

  // Scene includes membership filter with UN + NATO options
  assert.equal(scene.filters.length, 1);
  assert.equal(scene.filters[0].id, 'membership');
  assert.equal(scene.filters[0].options.length, 3);
  assert.ok(scene.filters[0].options.some((o) => o.value === 'un'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'nato'));
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
  assert.equal(currentMarker.pulse, true, 'ISS current marker should have pulse enabled');
  assert.equal(historyMarkers.length, 3);
  assert.ok(historyMarkers.every((entry) => entry.visualType === 'dot'));
  assert.ok(historyMarkers.every((entry) => entry.id.startsWith('iss-history-')));
  assert.ok(historyMarkers.every((entry) => entry.callout.includes('Time:')));
  assert.ok(historyMarkers.every((entry) => entry.description.en.includes('ISS position at')));
  // BUG6: orbit path must include the current live position as the final point
  assert.equal(scene.paths.length, 1);
  assert.equal(scene.paths[0].points.length, 4); // 3 history + 1 current
  assert.equal(scene.paths[0].id, 'iss-recent-orbit');
  const lastPoint = scene.paths[0].points[scene.paths[0].points.length - 1];
  assert.equal(lastPoint.lat, currentMarker.lat);
  assert.equal(lastPoint.lon, currentMarker.lon);
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

test('loadCarriersOpenSourceExample returns OSINT vessel markers with timestamps and trails', async () => {
  const stubVessels = [
    {
      id: 'us-cvn78-ford',
      name: 'USS Gerald R. Ford (CVN-78)',
      nation: 'US',
      type: 'carrier',
      lat: 20.5,
      lon: 38.2,
      timestamp: '2026-03-09T00:00:00Z',
      status: 'deployed',
      source: 'osint',
      confidence: 'approximate',
      mmsi: '338803000',
      trail: [
        { lat: 36.9, lon: -76.3, timestamp: '2025-06-24T00:00:00Z', source: 'osint' },
        { lat: 35.9, lon: 14.5, timestamp: '2026-02-01T00:00:00Z', source: 'osint' },
      ],
    },
    {
      id: 'fr-r91-cdg',
      name: 'Charles de Gaulle (R91)',
      nation: 'FR',
      type: 'carrier',
      lat: 35.2,
      lon: 24.9,
      timestamp: '2026-03-09T00:00:00Z',
      status: 'deployed',
      source: 'osint',
      confidence: 'approximate',
      mmsi: '',
      trail: [],
    },
  ];

  const fetchImpl = createFetchStub(withLandRoute({
    '/data/vessels-osint.json': stubVessels,
  }));
  const scene = await loadCarriersOpenSourceExample({ fetchImpl });

  const advisory = scene.markers.find((entry) => entry.id === 'carrier-advisory');
  assert.ok(advisory);
  assert.ok(advisory.description.en.includes('OSINT'));

  // Ford marker with timestamp in name
  const ford = scene.markers.find((m) => m.id === 'vessel-us-cvn78-ford');
  assert.ok(ford);
  assert.equal(ford.name.en, 'USS Gerald R. Ford (CVN-78) [Mar 9, 2026]');
  assert.equal(ford.color, '#1f3d73');
  assert.equal(ford.lat, 20.5);
  assert.equal(ford.lon, 38.2);

  // CdG marker with timestamp in name
  const cdg = scene.markers.find((m) => m.id === 'vessel-fr-r91-cdg');
  assert.ok(cdg);
  assert.equal(cdg.name.en, 'Charles de Gaulle (R91) [Mar 9, 2026]');
  assert.equal(cdg.color, '#002395');

  // Ford has a trail (2 trail + current = 3 points), CdG has none
  assert.equal(scene.paths.length, 1);
  assert.equal(scene.paths[0].id, 'trail-us-cvn78-ford');
  assert.equal(scene.paths[0].points.length, 3);

  assert.equal(scene.markers.length, 3); // advisory + 2 vessels
  assert.equal(scene.regions.length, 2);
  assert.equal(scene.planet.textureUri.includes('nasa.gov'), true);

  // Scene includes nation filter
  assert.equal(scene.filters.length, 1);
  assert.equal(scene.filters[0].id, 'nation');
  assert.ok(scene.filters[0].options.some((o) => o.value === 'us'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'fr'));

  // Vessel markers carry timestamp
  assert.equal(ford.timestamp, '2026-03-09T00:00:00Z');

  // timeRange computed from vessel + trail timestamps
  assert.ok(scene.timeRange);
  assert.equal(scene.timeRange.min, '2025-06-24');
  assert.equal(scene.timeRange.max, '2026-03-09');
});

test('loadVesselTrackingExample creates markers and trail paths from vessel data', async () => {
  const stubVessels = [
    {
      id: 'us-cvn78-ford',
      name: 'USS Gerald R. Ford (CVN-78)',
      nation: 'US',
      type: 'carrier',
      lat: 20.5,
      lon: 38.2,
      timestamp: '2026-03-09T00:00:00Z',
      status: 'deployed',
      source: 'osint',
      confidence: 'approximate',
      mmsi: '338803000',
      trail: [
        { lat: 36.9, lon: -76.3, timestamp: '2025-06-24T00:00:00Z', source: 'osint' },
        { lat: 35.9, lon: 14.5, timestamp: '2026-02-01T00:00:00Z', source: 'osint' },
      ],
    },
    {
      id: 'ru-kuznetsov',
      name: 'Admiral Kuznetsov',
      nation: 'RU',
      type: 'carrier',
      lat: 68.97,
      lon: 33.08,
      timestamp: '2026-03-09T00:00:00Z',
      status: 'decommissioned',
      source: 'osint',
      confidence: 'approximate',
      mmsi: '',
      trail: [],
    },
  ];

  const fetchImpl = createFetchStub(withLandRoute({
    '/data/vessels.json': stubVessels,
  }));

  const scene = await loadVesselTrackingExample({ fetchImpl });

  // Advisory marker + 2 vessel markers
  assert.equal(scene.markers.length, 3);
  assert.ok(scene.markers.some((m) => m.id === 'vessel-advisory'));
  assert.ok(scene.markers.some((m) => m.id === 'vessel-us-cvn78-ford'));
  assert.ok(scene.markers.some((m) => m.id === 'vessel-ru-kuznetsov'));

  // Ford should have a trail path (2 trail + current = 3 points)
  assert.equal(scene.paths.length, 1);
  assert.equal(scene.paths[0].id, 'trail-us-cvn78-ford');
  assert.equal(scene.paths[0].points.length, 3);

  // Kuznetsov has no trail, so no path for it
  assert.ok(!scene.paths.some((p) => p.id === 'trail-ru-kuznetsov'));

  // Ford marker color should be US navy blue
  const fordMarker = scene.markers.find((m) => m.id === 'vessel-us-cvn78-ford');
  assert.equal(fordMarker.color, '#1f3d73');

  // Kuznetsov marker color should be Russian red
  const kuznetsovMarker = scene.markers.find((m) => m.id === 'vessel-ru-kuznetsov');
  assert.equal(kuznetsovMarker.color, '#d52b1e');

  // Vessel Tracking includes nation filter
  assert.equal(scene.filters.length, 1);
  assert.equal(scene.filters[0].id, 'nation');
  assert.ok(scene.filters[0].options.some((o) => o.value === 'us'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'ru'));

  // Vessel markers carry timestamp
  assert.equal(fordMarker.timestamp, '2026-03-09T00:00:00Z');
  assert.equal(kuznetsovMarker.timestamp, '2026-03-09T00:00:00Z');

  // timeRange computed from all vessel + trail timestamps
  assert.ok(scene.timeRange);
  assert.equal(scene.timeRange.min, '2025-06-24');
  assert.equal(scene.timeRange.max, '2026-03-09');

  assert.equal(scene.theme, 'dark');
  assert.equal(scene.regions.length, 2);
  assert.equal(scene.planet.textureUri.includes('nasa.gov'), true);
});

test('loadCivilShippingExample creates markers for vessels in shipping straits', async () => {
  const stubCivil = [
    {
      id: 'civil-malacca-01',
      name: 'Ever Fortune',
      type: 'container',
      lat: 1.35,
      lon: 103.65,
      timestamp: '2026-03-12T06:00:00Z',
      status: 'transit',
      source: 'sample',
      strait: 'malacca',
      flag: 'PA',
      mmsi: '351456000',
    },
    {
      id: 'civil-hormuz-01',
      name: 'Gulf Harmony',
      type: 'vlcc',
      lat: 26.55,
      lon: 56.25,
      timestamp: '2026-03-12T07:00:00Z',
      status: 'transit',
      source: 'sample',
      strait: 'hormuz',
      flag: 'MH',
      mmsi: '538004700',
    },
  ];

  const fetchImpl = createFetchStub(withLandRoute({
    '/data/vessels-civil-sample.json': stubCivil,
  }));

  const scene = await loadCivilShippingExample({ fetchImpl });

  // Advisory + 2 vessels + 9 strait labels
  assert.ok(scene.markers.some((m) => m.id === 'civil-advisory'));
  assert.ok(scene.markers.some((m) => m.id === 'civil-civil-malacca-01'));
  assert.ok(scene.markers.some((m) => m.id === 'civil-civil-hormuz-01'));

  // Strait labels present
  assert.ok(scene.markers.some((m) => m.id === 'strait-label-malacca'));
  assert.ok(scene.markers.some((m) => m.id === 'strait-label-hormuz'));
  assert.ok(scene.markers.some((m) => m.id === 'strait-label-suez'));
  assert.ok(scene.markers.some((m) => m.id === 'strait-label-panama'));

  // Vessel marker has timestamp in name
  const fortune = scene.markers.find((m) => m.id === 'civil-civil-malacca-01');
  assert.equal(fortune.name.en, 'Ever Fortune [Mar 12, 2026]');
  assert.equal(fortune.color, '#2563eb'); // container blue

  // VLCC gets darker tanker color
  const harmony = scene.markers.find((m) => m.id === 'civil-civil-hormuz-01');
  assert.equal(harmony.color, '#92400e');

  // Malacca strait label describes 1 tracked vessel
  const malaccaLabel = scene.markers.find((m) => m.id === 'strait-label-malacca');
  assert.ok(malaccaLabel.description.en.includes('1 vessel'));

  // Civil shipping includes strait filter
  assert.equal(scene.filters.length, 1);
  assert.equal(scene.filters[0].id, 'strait');
  assert.ok(scene.filters[0].options.some((o) => o.value === 'malacca'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'hormuz'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'all'));

  assert.equal(scene.theme, 'dark');
  assert.equal(scene.regions.length, 2);
  assert.equal(scene.paths.length, 0);
});

test('loadExampleScene with NONE returns an empty scene', async () => {
  const scene = await loadExampleScene(EXAMPLE_IDS.NONE, { locale: 'de' });

  assert.equal(scene.locale, 'de');
  assert.equal(scene.markers.length, 0);
  assert.equal(scene.paths.length, 0);
  assert.equal(scene.arcs.length, 0);
  assert.equal(scene.regions.length, 0);
  assert.equal(scene.animations.length, 0);
  assert.equal(scene.planet.id, 'earth');
});

test('listExampleDefinitions includes Unload All as first entry', () => {
  const examples = listExampleDefinitions();
  const first = examples[0];
  assert.equal(first.id, EXAMPLE_IDS.NONE);
  assert.equal(first.label, '— Unload All —');
});

test('loadAllCapitalsExample includes dataSources and sourceId on entities', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng,unMember': [
      { name: { common: 'Test' }, capital: ['Testville'], capitalInfo: { latlng: [10, 20] }, cca3: 'TST', unMember: false },
    ],
  }));
  const scene = await loadAllCapitalsExample({ fetchImpl });

  assert.ok(Array.isArray(scene.dataSources));
  assert.ok(scene.dataSources.length >= 2);
  assert.ok(scene.dataSources.some((ds) => ds.id === 'rest-countries'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));

  const marker = scene.markers.find((m) => m.id === 'cap-tst');
  assert.equal(marker.sourceId, 'rest-countries');

  const landmass = scene.regions.find((r) => r.id.startsWith('landmass-'));
  assert.equal(landmass.sourceId, 'natural-earth');
});

test('loadContinentsAndSeasExample includes dataSources with natural-earth', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson': { type: 'FeatureCollection', features: [] },
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_marine_polys.geojson': { type: 'FeatureCollection', features: [] },
  }));
  const scene = await loadContinentsAndSeasExample({ fetchImpl });

  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
  assert.ok(scene.regions.every((r) => r.sourceId === 'natural-earth'));
});

test('loadIssRealtimeExample includes dataSources for ISS and Natural Earth', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://api.wheretheiss.at/v1/satellites/25544': { latitude: 12.5, longitude: 89.1, altitude: 420, velocity: 27600 },
    'https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=9997300,9997900,9998500,9999100,9999700,10000300,10000900,10001500,10002100,10002700&units=kilometers': [
      { timestamp: 9997300, latitude: 1, longitude: 2, altitude: 410 },
    ],
  }));
  const scene = await loadIssRealtimeExample({ fetchImpl, nowMs: 10000000 * 1000 });

  assert.ok(scene.dataSources.some((ds) => ds.id === 'wheretheiss'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));

  const issMarker = scene.markers.find((m) => m.id === 'iss-current');
  assert.equal(issMarker.sourceId, 'wheretheiss');
});

test('loadCarriersOpenSourceExample includes dataSources', async () => {
  const fetchImpl = createFetchStub(withLandRoute({ '/data/vessels-osint.json': [] }));
  const scene = await loadCarriersOpenSourceExample({ fetchImpl });
  assert.ok(scene.dataSources.some((ds) => ds.id === 'osint-vessels'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
});

test('loadVesselTrackingExample includes dataSources', async () => {
  const fetchImpl = createFetchStub(withLandRoute({ '/data/vessels.json': [] }));
  const scene = await loadVesselTrackingExample({ fetchImpl });
  assert.ok(scene.dataSources.some((ds) => ds.id === 'osint-vessels'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'ais-feeds'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
});

test('loadCivilShippingExample includes dataSources', async () => {
  const fetchImpl = createFetchStub(withLandRoute({ '/data/vessels-civil-sample.json': [] }));
  const scene = await loadCivilShippingExample({ fetchImpl });
  assert.ok(scene.dataSources.some((ds) => ds.id === 'ais-sample'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
});

test('loadUkraineConflictOpenSourceExample includes dataSources', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson': { type: 'FeatureCollection', features: [] },
  }));
  const scene = await loadUkraineConflictOpenSourceExample({ fetchImpl });
  assert.ok(scene.dataSources.some((ds) => ds.id === 'geo-countries'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
});

test('loadExampleScene routes ids to matching loaders', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng,unMember': [],
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
    '/data/vessels.json': [],
    '/data/vessels-osint.json': [],
    '/data/vessels-civil-sample.json': [],
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
  const vessels = await loadExampleScene(EXAMPLE_IDS.VESSEL_TRACKING, options);
  const civil = await loadExampleScene(EXAMPLE_IDS.CIVIL_SHIPPING, options);

  assert.equal(Array.isArray(capitals.markers), true);
  assert.equal(Array.isArray(continents.markers), true);
  assert.equal(Array.isArray(iss.markers), true);
  assert.equal(Array.isArray(ukraine.markers), true);
  assert.equal(Array.isArray(carriers.markers), true);
  assert.equal(Array.isArray(vessels.markers), true);
  assert.equal(Array.isArray(civil.markers), true);
  assert.ok(capitals.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.ok(continents.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.ok(iss.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.ok(ukraine.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.ok(carriers.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.ok(vessels.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.ok(civil.regions.some((entry) => entry.id.startsWith('landmass-')));
  assert.equal(capitals.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(continents.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(iss.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(ukraine.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(carriers.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(vessels.planet.textureUri.includes('nasa.gov'), true);
  assert.equal(civil.planet.textureUri.includes('nasa.gov'), true);
});
