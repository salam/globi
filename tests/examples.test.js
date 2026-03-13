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
  loadMoonLandingSitesExample,
  loadMarsLandingSitesExample,
  loadEuropaWaterExample,
  loadTitanLakesExample,
  loadWireframeEarthExample,
  loadGrayscaleEarthExample,
  loadHannibalRouteExample,
  loadIndianaJonesItinerary,
  _resetLandmassCache,
} from '../src/examples/loaders.js';

// BUG14: reset landmass cache before each test so stub fetch is always called
test.beforeEach(() => { _resetLandmassCache(); });

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

  assert.equal(examples.length, 16);
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
      EXAMPLE_IDS.MOON_LANDING_SITES,
      EXAMPLE_IDS.MARS_LANDING_SITES,
      EXAMPLE_IDS.EUROPA_WATER,
      EXAMPLE_IDS.TITAN_LAKES,
      EXAMPLE_IDS.WIREFRAME_EARTH,
      EXAMPLE_IDS.GRAYSCALE_EARTH,
      EXAMPLE_IDS.HANNIBAL_ROUTE,
      EXAMPLE_IDS.INDIANA_JONES,
    ]
  );
  const carrierExample = examples.find((entry) => entry.id === EXAMPLE_IDS.CARRIERS_TRACKING);
  assert.equal(carrierExample?.label, '5) Naval Vessels (OSINT)');
  const vesselExample = examples.find((entry) => entry.id === EXAMPLE_IDS.VESSEL_TRACKING);
  assert.equal(vesselExample?.label, '6) Vessel Tracking (Multi-Source)');
  const civilExample = examples.find((entry) => entry.id === EXAMPLE_IDS.CIVIL_SHIPPING);
  assert.equal(civilExample?.label, '7) Civil Shipping (Global Straits)');
  const moonExample = examples.find((entry) => entry.id === EXAMPLE_IDS.MOON_LANDING_SITES);
  assert.equal(moonExample?.label, '8) Moon Landing Sites');
  const marsExample = examples.find((entry) => entry.id === EXAMPLE_IDS.MARS_LANDING_SITES);
  assert.equal(marsExample?.label, '9) Mars Landing Sites');
  const europaExample = examples.find((entry) => entry.id === EXAMPLE_IDS.EUROPA_WATER);
  assert.equal(europaExample?.label, '10) Europa Water/Ocean Features');
  const titanExample = examples.find((entry) => entry.id === EXAMPLE_IDS.TITAN_LAKES);
  assert.equal(titanExample?.label, '11) Titan Methane Lakes');
  const wireframeExample = examples.find((entry) => entry.id === EXAMPLE_IDS.WIREFRAME_EARTH);
  assert.equal(wireframeExample?.label, '12) Wireframe Earth');
  const grayscaleExample = examples.find((entry) => entry.id === EXAMPLE_IDS.GRAYSCALE_EARTH);
  assert.equal(grayscaleExample?.label, '13) Grayscale Earth');
  const indyExample = examples.find((entry) => entry.id === EXAMPLE_IDS.INDIANA_JONES);
  assert.equal(indyExample?.label, '15) Indiana Jones Itinerary');
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
  assert.equal(scene.planet.textureUri.includes('land_ocean_ice'), true);
  assert.equal(scene.markers.length, 4);
  assert.equal(scene.regions.length, 0);

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
  assert.ok(currentMarker.velocityKmh > 0, 'ISS marker stores velocity');
  assert.equal(currentMarker.fetchedAtMs, 10000000 * 1000, 'ISS marker stores fetch time');
  assert.ok(Array.isArray(currentMarker.orbitWaypoints), 'ISS marker has orbit waypoints');
  assert.ok(currentMarker.orbitWaypoints.length >= 2, 'orbit waypoints have at least 2 entries');
  assert.ok(currentMarker.orbitWaypoints.every((wp) => typeof wp.timestampMs === 'number'));
  assert.equal(historyMarkers.length, 3);
  assert.ok(historyMarkers.every((entry) => entry.visualType === 'dot'));
  assert.ok(historyMarkers.every((entry) => entry.id.startsWith('iss-history-')));
  assert.ok(historyMarkers.every((entry) => entry.callout.includes('Time:')));
  assert.ok(historyMarkers.every((entry) => entry.description.en.includes('ISS position at')));

  // Orbit is split into past (solid) and no future (all timestamps <= now in stub)
  const pastPath = scene.paths.find((p) => p.id === 'iss-recent-orbit');
  assert.ok(pastPath, 'Past orbit path exists');
  assert.ok(!pastPath.dashPattern, 'Past orbit path has no dash pattern');

  assert.equal(scene.regions.length, 0);
  assert.equal(scene.planet.textureUri.includes('land_ocean_ice'), true);
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

  assert.equal(scene.regions.length, 1);
  assert.ok(scene.markers.some((entry) => entry.id === 'label-test-continent'));
  assert.ok(scene.markers.some((entry) => entry.id === 'sea-label-test-sea'));
  assert.equal(scene.planet.textureUri.includes('land_ocean_ice'), true);
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

  assert.equal(scene.regions.length, 1);
  assert.ok(scene.markers.some((entry) => entry.id === 'ukr-advisory'));
  assert.equal(scene.planet.textureUri.includes('land_ocean_ice'), true);
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
  assert.equal(scene.regions.length, 0);
  assert.equal(scene.planet.textureUri.includes('land_ocean_ice'), true);

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
  assert.equal(scene.regions.length, 0);
  assert.equal(scene.planet.textureUri.includes('land_ocean_ice'), true);
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
  assert.equal(scene.regions.length, 0);
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
});

test('loadContinentsAndSeasExample includes dataSources with natural-earth', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson': { type: 'FeatureCollection', features: [] },
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_marine_polys.geojson': { type: 'FeatureCollection', features: [] },
  }));
  const scene = await loadContinentsAndSeasExample({ fetchImpl });

  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
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
  const moon = await loadExampleScene(EXAMPLE_IDS.MOON_LANDING_SITES, options);
  const mars = await loadExampleScene(EXAMPLE_IDS.MARS_LANDING_SITES, options);
  const europa = await loadExampleScene(EXAMPLE_IDS.EUROPA_WATER, options);
  const titan = await loadExampleScene(EXAMPLE_IDS.TITAN_LAKES, options);
  const wireframe = await loadExampleScene(EXAMPLE_IDS.WIREFRAME_EARTH, options);
  const grayscale = await loadExampleScene(EXAMPLE_IDS.GRAYSCALE_EARTH, options);
  const indy = await loadExampleScene(EXAMPLE_IDS.INDIANA_JONES, options);

  assert.equal(Array.isArray(capitals.markers), true);
  assert.equal(Array.isArray(continents.markers), true);
  assert.equal(Array.isArray(iss.markers), true);
  assert.equal(Array.isArray(ukraine.markers), true);
  assert.equal(Array.isArray(carriers.markers), true);
  assert.equal(Array.isArray(vessels.markers), true);
  assert.equal(Array.isArray(civil.markers), true);
  assert.equal(Array.isArray(moon.markers), true);
  assert.equal(Array.isArray(mars.markers), true);
  assert.equal(Array.isArray(europa.markers), true);
  assert.equal(Array.isArray(titan.markers), true);
  assert.equal(Array.isArray(wireframe.markers), true);
  assert.equal(Array.isArray(grayscale.markers), true);
  assert.equal(Array.isArray(indy.markers), true);
  assert.equal(capitals.planet.textureUri.includes('land_ocean_ice'), true);
  assert.equal(continents.planet.textureUri.includes('land_ocean_ice'), true);
  assert.equal(iss.planet.textureUri.includes('land_ocean_ice'), true);
  assert.equal(ukraine.planet.textureUri.includes('land_ocean_ice'), true);
  assert.equal(carriers.planet.textureUri.includes('land_ocean_ice'), true);
  assert.equal(vessels.planet.textureUri.includes('land_ocean_ice'), true);
  assert.equal(civil.planet.textureUri.includes('land_ocean_ice'), true);
  assert.equal(moon.planet.id, 'moon');
  assert.equal(mars.planet.id, 'mars');
  assert.equal(europa.planet.id, 'europa');
  assert.equal(titan.planet.id, 'titan');
  assert.equal(wireframe.theme, 'wireframe-shaded');
  assert.equal(grayscale.theme, 'grayscale-flat');
  assert.equal(indy.projection, 'equirectangular');
  assert.ok(indy.arcs.length > 0);
});

// ── Moon Landing Sites ───────────────────────────────────────────────────────

test('loadMoonLandingSitesExample returns markers for all Moon landing sites', async () => {
  const scene = await loadMoonLandingSitesExample({ locale: 'en' });

  assert.equal(scene.planet.id, 'moon');
  assert.equal(scene.theme, 'dark');
  assert.ok(scene.markers.length >= 20, 'should have at least 20 landing sites');

  // Apollo 11 present
  const apollo11 = scene.markers.find((m) => m.id === 'moon-apollo-11');
  assert.ok(apollo11);
  assert.ok(apollo11.name.en.includes('Apollo 11'));
  assert.ok(apollo11.name.en.includes('1969'));
  assert.equal(apollo11.category, 'crewed');
  assert.equal(apollo11.color, '#f5d547');

  // Robotic missions
  const luna9 = scene.markers.find((m) => m.id === 'moon-luna-9');
  assert.ok(luna9);
  assert.equal(luna9.category, 'robotic');
  assert.equal(luna9.color, '#c0c0c0');

  // Chang'e 4 (far side)
  const change4 = scene.markers.find((m) => m.id === 'moon-change-4');
  assert.ok(change4);
  assert.ok(change4.description.en.includes('CNSA'));

  // Chandrayaan-3
  const chandrayaan = scene.markers.find((m) => m.id === 'moon-chandrayaan-3');
  assert.ok(chandrayaan);
  assert.ok(chandrayaan.description.en.includes('ISRO'));

  // SLIM
  const slim = scene.markers.find((m) => m.id === 'moon-slim');
  assert.ok(slim);
  assert.ok(slim.description.en.includes('JAXA'));

  // Planned missions
  const artemis = scene.markers.find((m) => m.id === 'moon-artemis-iii');
  assert.ok(artemis);
  assert.equal(artemis.category, 'planned');
  assert.equal(artemis.color, '#67c5db');

  // Filters
  assert.equal(scene.filters.length, 1);
  assert.equal(scene.filters[0].id, 'mission-type');
  assert.ok(scene.filters[0].options.some((o) => o.value === 'crewed'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'robotic'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'planned'));

  // Data sources
  assert.ok(scene.dataSources.some((ds) => ds.id === 'nasa'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'roscosmos'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'cnsa'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'isro'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'jaxa'));

  // No textureUri — planet preset handles it
  assert.equal(scene.planet.textureUri, undefined);
});

// ── Mars Landing Sites ───────────────────────────────────────────────────────

test('loadMarsLandingSitesExample returns markers for all Mars landing sites', async () => {
  const scene = await loadMarsLandingSitesExample({ locale: 'en' });

  assert.equal(scene.planet.id, 'mars');
  assert.equal(scene.theme, 'dark');
  assert.ok(scene.markers.length >= 13, 'should have at least 13 Mars sites');

  // Curiosity
  const curiosity = scene.markers.find((m) => m.id === 'mars-curiosity');
  assert.ok(curiosity);
  assert.equal(curiosity.category, 'rover');
  assert.ok(curiosity.description.en.includes('Gale Crater'));

  // Viking 1 lander
  const viking1 = scene.markers.find((m) => m.id === 'mars-viking-1');
  assert.ok(viking1);
  assert.equal(viking1.category, 'lander');

  // Failed mission
  const beagle = scene.markers.find((m) => m.id === 'mars-beagle-2');
  assert.ok(beagle);
  assert.equal(beagle.category, 'failed');
  assert.ok(beagle.description.en.includes('ESA'));

  // Zhurong
  const zhurong = scene.markers.find((m) => m.id === 'mars-zhurong');
  assert.ok(zhurong);
  assert.ok(zhurong.description.en.includes('CNSA'));

  // Filters
  assert.equal(scene.filters.length, 1);
  assert.ok(scene.filters[0].options.some((o) => o.value === 'rover'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'lander'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'failed'));

  assert.ok(scene.dataSources.some((ds) => ds.id === 'nasa'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'esa'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'roscosmos'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'cnsa'));
});

// ── Europa Water Features ────────────────────────────────────────────────────

test('loadEuropaWaterExample returns markers for Europa geological features', async () => {
  const scene = await loadEuropaWaterExample({ locale: 'en' });

  assert.equal(scene.planet.id, 'europa');
  assert.equal(scene.theme, 'dark');
  assert.ok(scene.markers.length >= 10, 'should have at least 10 Europa features');

  // Chaos terrain
  const conamara = scene.markers.find((m) => m.id === 'europa-conamara-chaos');
  assert.ok(conamara);
  assert.equal(conamara.category, 'chaos');

  // Lineae
  const cadmus = scene.markers.find((m) => m.id === 'europa-cadmus-linea');
  assert.ok(cadmus);
  assert.equal(cadmus.category, 'linea');

  // Craters
  const pwyll = scene.markers.find((m) => m.id === 'europa-pwyll-crater');
  assert.ok(pwyll);
  assert.equal(pwyll.category, 'crater');

  // Plumes
  const plume = scene.markers.find((m) => m.id === 'europa-plume-south-1');
  assert.ok(plume);
  assert.equal(plume.category, 'plume');

  // Filters
  assert.equal(scene.filters.length, 1);
  assert.equal(scene.filters[0].id, 'feature-type');
  assert.ok(scene.filters[0].options.some((o) => o.value === 'chaos'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'linea'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'plume'));

  assert.ok(scene.dataSources.some((ds) => ds.id === 'nasa'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'esa'));
});

// ── Titan Lakes ──────────────────────────────────────────────────────────────

test('loadTitanLakesExample returns markers for Titan methane lakes and seas', async () => {
  const scene = await loadTitanLakesExample({ locale: 'en' });

  assert.equal(scene.planet.id, 'titan');
  assert.equal(scene.theme, 'dark');
  assert.ok(scene.markers.length >= 9, 'should have at least 9 Titan features');

  // Kraken Mare (largest)
  const kraken = scene.markers.find((m) => m.id === 'titan-kraken-mare');
  assert.ok(kraken);
  assert.equal(kraken.category, 'sea');
  assert.ok(kraken.description.en.includes('methane'));

  // Ontario Lacus (southern hemisphere)
  const ontario = scene.markers.find((m) => m.id === 'titan-ontario-lacus');
  assert.ok(ontario);
  assert.equal(ontario.category, 'lake');

  // Vid Flumina (channel)
  const vid = scene.markers.find((m) => m.id === 'titan-vid-flumina');
  assert.ok(vid);
  assert.equal(vid.category, 'channel');

  // Huygens landing site
  const huygens = scene.markers.find((m) => m.id === 'titan-huygens-site');
  assert.ok(huygens);
  assert.equal(huygens.category, 'landing');
  assert.equal(huygens.sourceId, 'esa');

  // Filters
  assert.equal(scene.filters.length, 1);
  assert.equal(scene.filters[0].id, 'feature-type');
  assert.ok(scene.filters[0].options.some((o) => o.value === 'sea'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'lake'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'channel'));

  assert.ok(scene.dataSources.some((ds) => ds.id === 'nasa'));
  assert.ok(scene.dataSources.some((ds) => ds.id === 'esa'));
});

// ── Wireframe Earth ──────────────────────────────────────────────────────────

test('loadWireframeEarthExample returns capitals scene with wireframe-shaded theme', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng,unMember': [
      { name: { common: 'Test' }, capital: ['Testville'], capitalInfo: { latlng: [10, 20] }, cca3: 'TST', unMember: false },
    ],
  }));
  const scene = await loadWireframeEarthExample({ fetchImpl });

  assert.equal(scene.theme, 'wireframe-shaded');
  assert.equal(scene.planet.id, 'earth');
  assert.ok(scene.markers.length >= 1);
  assert.ok(scene.dataSources.some((ds) => ds.id === 'rest-countries'));
});

// ── Grayscale Earth ──────────────────────────────────────────────────────────

test('loadGrayscaleEarthExample returns continents scene with grayscale-flat theme', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson': { type: 'FeatureCollection', features: [] },
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_marine_polys.geojson': { type: 'FeatureCollection', features: [] },
  }));
  const scene = await loadGrayscaleEarthExample({ fetchImpl });

  assert.equal(scene.theme, 'grayscale-flat');
  assert.equal(scene.planet.id, 'earth');
  assert.ok(scene.dataSources.some((ds) => ds.id === 'natural-earth'));
});

// ── loadExampleScene routes new example IDs ──────────────────────────────────

test('loadExampleScene routes Moon landing sites', async () => {
  const scene = await loadExampleScene(EXAMPLE_IDS.MOON_LANDING_SITES);
  assert.equal(scene.planet.id, 'moon');
  assert.ok(scene.markers.length > 0);
});

test('loadExampleScene routes Mars landing sites', async () => {
  const scene = await loadExampleScene(EXAMPLE_IDS.MARS_LANDING_SITES);
  assert.equal(scene.planet.id, 'mars');
  assert.ok(scene.markers.length > 0);
});

test('loadExampleScene routes Europa water features', async () => {
  const scene = await loadExampleScene(EXAMPLE_IDS.EUROPA_WATER);
  assert.equal(scene.planet.id, 'europa');
  assert.ok(scene.markers.length > 0);
});

test('loadExampleScene routes Titan lakes', async () => {
  const scene = await loadExampleScene(EXAMPLE_IDS.TITAN_LAKES);
  assert.equal(scene.planet.id, 'titan');
  assert.ok(scene.markers.length > 0);
});

// BUG23: all planetary example marker longitudes must be within [-180, 180]
test('planetary examples have all marker longitudes within [-180, 180]', async () => {
  const examples = [
    { loader: loadMarsLandingSitesExample, name: 'Mars' },
    { loader: loadEuropaWaterExample, name: 'Europa' },
    { loader: loadTitanLakesExample, name: 'Titan' },
  ];
  for (const { loader, name } of examples) {
    const scene = await loader({ locale: 'en' });
    for (const marker of scene.markers) {
      assert.ok(
        marker.lon >= -180 && marker.lon <= 180,
        `${name} marker ${marker.id} lon=${marker.lon} out of [-180, 180]`,
      );
    }
    if (scene.camera) {
      assert.ok(
        scene.camera.lon >= -180 && scene.camera.lon <= 180,
        `${name} camera lon=${scene.camera.lon} out of [-180, 180]`,
      );
    }
  }
});

test('loadExampleScene routes Wireframe Earth', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng,unMember': [],
  }));
  const scene = await loadExampleScene(EXAMPLE_IDS.WIREFRAME_EARTH, { fetchImpl });
  assert.equal(scene.theme, 'wireframe-shaded');
});

test('loadExampleScene routes Grayscale Earth', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson': { type: 'FeatureCollection', features: [] },
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_marine_polys.geojson': { type: 'FeatureCollection', features: [] },
  }));
  const scene = await loadExampleScene(EXAMPLE_IDS.GRAYSCALE_EARTH, { fetchImpl });
  assert.equal(scene.theme, 'grayscale-flat');
});

// ── Hannibal's Route ─────────────────────────────────────────────────────────

test('loadHannibalRouteExample returns grayscale-shaded scene with markers and path', async () => {
  const scene = await loadHannibalRouteExample();

  assert.equal(scene.theme, 'grayscale-shaded');
  assert.equal(scene.planet.id, 'earth');
  assert.ok(scene.markers.length >= 10, 'should have at least 10 waypoint markers');
  assert.ok(scene.paths.length === 1, 'should have exactly one route path');
  assert.equal(scene.paths[0].id, 'hannibal-march');
  assert.ok(scene.paths[0].points.length >= 10, 'route path should have at least 10 points');
  assert.equal(scene.paths[0].color, '#8b0000');
  assert.ok(scene.dataSources.some((ds) => ds.id === 'hannibal-route'));
  assert.equal(scene.camera.lat, 42.0);
  assert.equal(scene.camera.lon, 5.0);
});

test('loadHannibalRouteExample markers include Carthage and Cannae', async () => {
  const scene = await loadHannibalRouteExample();
  const ids = scene.markers.map((m) => m.id);
  assert.ok(ids.includes('hb-carthage'), 'should include Carthage');
  assert.ok(ids.includes('hb-cannae'), 'should include Cannae');
});

test('loadExampleScene routes Hannibal route', async () => {
  const scene = await loadExampleScene(EXAMPLE_IDS.HANNIBAL_ROUTE);
  assert.equal(scene.theme, 'grayscale-shaded');
  assert.ok(scene.markers.length > 0);
  assert.ok(scene.paths.length === 1);
});

// ── Indiana Jones Itinerary ───────────────────────────────────────────────────

test('loadIndianaJonesItinerary returns flat map scene with arcs and movie filters', async () => {
  const scene = await loadIndianaJonesItinerary({ locale: 'en' });

  assert.equal(scene.projection, 'equirectangular');
  assert.equal(scene.theme, 'satellite');
  assert.equal(scene.planet.id, 'earth');

  // 5 movies with cities: 5 + 3 + 5 + 4 + 5 = 22 markers
  assert.ok(scene.markers.length >= 20, `should have at least 20 city markers, got ${scene.markers.length}`);

  // Arcs: 4 + 2 + 4 + 3 + 4 = 17 arcs
  assert.ok(scene.arcs.length >= 15, `should have at least 15 arcs, got ${scene.arcs.length}`);

  // All arcs use the thick red style
  for (const arc of scene.arcs) {
    assert.equal(arc.color, '#cc0000', `arc ${arc.id} should be red`);
    assert.equal(arc.strokeWidth, 4, `arc ${arc.id} should have strokeWidth 4`);
    assert.equal(arc.maxAltitude, 0.15, `arc ${arc.id} should have maxAltitude 0.15`);
    assert.equal(arc.animationTime, 2000, `arc ${arc.id} should animate over 2000ms`);
    assert.equal(arc.sourceId, 'indiana-jones');
  }

  // All markers are red dots with always-visible callouts
  for (const marker of scene.markers) {
    assert.equal(marker.color, '#cc0000');
    assert.equal(marker.visualType, 'dot');
    assert.equal(marker.calloutMode, 'always');
    assert.equal(marker.sourceId, 'indiana-jones');
  }

  // Movie filter with 6 options (all + 5 movies)
  assert.equal(scene.filters.length, 1);
  assert.equal(scene.filters[0].id, 'movie');
  assert.equal(scene.filters[0].options.length, 6);
  assert.ok(scene.filters[0].options.some((o) => o.value === 'all'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'raiders'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'temple'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'crusade'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'crystal'));
  assert.ok(scene.filters[0].options.some((o) => o.value === 'dial'));

  // Data source
  assert.ok(scene.dataSources.some((ds) => ds.id === 'indiana-jones'));
});

test('loadIndianaJonesItinerary markers include key cities from each movie', async () => {
  const scene = await loadIndianaJonesItinerary();
  const ids = scene.markers.map((m) => m.id);

  // Raiders
  assert.ok(ids.includes('indy-raiders-marshall-college'), 'should include Marshall College');
  assert.ok(ids.includes('indy-raiders-cairo'), 'should include Cairo');

  // Temple of Doom
  assert.ok(ids.includes('indy-temple-shanghai'), 'should include Shanghai');
  assert.ok(ids.includes('indy-temple-pankot-palace'), 'should include Pankot Palace');

  // Last Crusade
  assert.ok(ids.includes('indy-crusade-venice'), 'should include Venice');
  assert.ok(ids.includes('indy-crusade-berlin'), 'should include Berlin');

  // Crystal Skull
  assert.ok(ids.includes('indy-crystal-nevada'), 'should include Nevada');
  assert.ok(ids.includes('indy-crystal-nazca'), 'should include Nazca');

  // Dial of Destiny
  assert.ok(ids.includes('indy-dial-new-york'), 'should include New York');
  assert.ok(ids.includes('indy-dial-athens'), 'should include Athens');
});

test('loadIndianaJonesItinerary arcs connect consecutive cities per movie', async () => {
  const scene = await loadIndianaJonesItinerary();

  // Raiders: Marshall College → Nepal (first leg)
  const raidersLeg0 = scene.arcs.find((a) => a.id === 'indy-raiders-leg-0');
  assert.ok(raidersLeg0, 'Raiders first leg should exist');
  assert.equal(raidersLeg0.name.en, 'Marshall College, CT → Nepal');

  // Temple of Doom: Shanghai → Nang Tao
  const templeLeg0 = scene.arcs.find((a) => a.id === 'indy-temple-leg-0');
  assert.ok(templeLeg0);
  assert.equal(templeLeg0.name.en, 'Shanghai → Nang Tao');

  // Last Crusade: last leg Berlin → Iskenderun
  const crusadeLeg3 = scene.arcs.find((a) => a.id === 'indy-crusade-leg-3');
  assert.ok(crusadeLeg3);
  assert.equal(crusadeLeg3.name.en, 'Berlin → Iskenderun');
});

test('loadIndianaJonesItinerary movie categories are assigned correctly', async () => {
  const scene = await loadIndianaJonesItinerary();

  const raidersMarkers = scene.markers.filter((m) => m.category === 'indy-raiders');
  assert.equal(raidersMarkers.length, 5);

  const templeMarkers = scene.markers.filter((m) => m.category === 'indy-temple');
  assert.equal(templeMarkers.length, 3);

  const crusadeMarkers = scene.markers.filter((m) => m.category === 'indy-crusade');
  assert.equal(crusadeMarkers.length, 5);

  const crystalMarkers = scene.markers.filter((m) => m.category === 'indy-crystal');
  assert.equal(crystalMarkers.length, 4);

  const dialMarkers = scene.markers.filter((m) => m.category === 'indy-dial');
  assert.equal(dialMarkers.length, 5);
});

test('loadExampleScene routes Indiana Jones itinerary', async () => {
  const scene = await loadExampleScene(EXAMPLE_IDS.INDIANA_JONES);
  assert.equal(scene.projection, 'equirectangular');
  assert.ok(scene.markers.length > 0);
  assert.ok(scene.arcs.length > 0);
});

// BUG14: landmass loading disabled — verify no fetch is made
test('BUG14: loadLandmassRegions does not fetch when disabled', async () => {
  const fetchImpl = createFetchStub(withLandRoute({
    'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng,unMember': [],
  }));

  let landCallCount = 0;
  const trackingFetch = async (url) => {
    if (url === NATURAL_EARTH_LAND_URL) landCallCount++;
    return fetchImpl(url);
  };

  _resetLandmassCache();
  await loadAllCapitalsExample({ fetchImpl: trackingFetch });

  assert.equal(landCallCount, 0, 'landmass GeoJSON should not be fetched');
});
