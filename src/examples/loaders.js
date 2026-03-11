import { createEmptyScene } from '../scene/schema.js';

const REST_COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng';
const NATURAL_EARTH_CONTINENTS_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson';
const NATURAL_EARTH_MARINE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_marine_polys.geojson';
const NATURAL_EARTH_LAND_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';
const ISS_CURRENT_URL = 'https://api.wheretheiss.at/v1/satellites/25544';
const ISS_POSITIONS_URL = 'https://api.wheretheiss.at/v1/satellites/25544/positions';
const COUNTRIES_GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
const EARTH_LOW_RES_TEXTURE_URL = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png';
const CARRIER_SOURCE_URLS = Object.freeze([
  'https://www.marinevesseltraffic.com/navy-ships/US%20Aircraft%20Carriers%20Location%20Tracker',
  'http://www.gonavy.jp/CVLocation.html',
  'https://www.cruisingearth.com/military-ship-tracker/aircraft-carriers/',
  'https://www.vesselfinder.com/',
  'https://www.marinetraffic.com/en/ais/home/centerx:-12.0/centery:25.0/zoom:4',
]);
const CARRIER_REGION_ANCHORS = Object.freeze({
  'North America West Coast': { lat: 32.9, lon: -120.2 },
  'US East Coast': { lat: 36.2, lon: -73.8 },
  'East Asia': { lat: 34.0, lon: 133.0 },
  'South East Asia': { lat: 11.5, lon: 114.5 },
  'West Africa': { lat: 25.0, lon: -12.0 },
});

const CARRIER_AIS_SNAPSHOT = Object.freeze([
  {
    id: 'cvn68',
    name: 'USS Nimitz (CVN-68)',
    mmsi: '303981000',
    aisRegion: 'North America West Coast',
    positionReceived: '46 days ago',
    speedKnots: null,
    lastPort: 'Indian Island, United States (USA)',
    sourcePage: 'https://www.vesselfinder.com/vessels/details/303981000',
  },
  {
    id: 'cvn69',
    name: 'USS Dwight D. Eisenhower (CVN-69)',
    mmsi: '368892000',
    aisRegion: 'US East Coast',
    positionReceived: '299 days ago',
    speedKnots: null,
    sourcePage: 'https://www.vesselfinder.com/vessels/details/368892000',
  },
  {
    id: 'cvn70',
    name: 'USS Carl Vinson (CVN-70)',
    mmsi: '369970409',
    aisRegion: 'South East Asia',
    positionReceived: '365 days ago',
    speedKnots: 4.9,
    sourcePage: 'https://www.vesselfinder.com/vessels/details/369970409',
  },
  {
    id: 'cvn71',
    name: 'USS Theodore Roosevelt (CVN-71)',
    mmsi: '366984000',
    aisRegion: 'North America West Coast',
    positionReceived: '0 min ago',
    speedKnots: 19.3,
    lastPort: 'San Diego, United States (USA)',
    sourcePage: 'https://www.vesselfinder.com/vessels/details/366984000',
  },
  {
    id: 'cvn72',
    name: 'USS Abraham Lincoln (CVN-72)',
    mmsi: '369970406',
    aisRegion: 'South East Asia',
    positionReceived: '42 days ago',
    speedKnots: 15.7,
    lastPort: 'Apra, Guam',
    sourcePage: 'https://www.vesselfinder.com/vessels/details/369970406',
  },
  {
    id: 'cvn73',
    name: 'USS George Washington (CVN-73)',
    mmsi: '368913000',
    aisRegion: 'East Asia',
    positionReceived: '123 days ago',
    speedKnots: 3.2,
    sourcePage: 'https://www.vesselfinder.com/vessels/details/368913000',
  },
  {
    id: 'cvn75',
    name: 'USS Harry S. Truman (CVN-75)',
    mmsi: '368800000',
    aisRegion: 'US East Coast',
    positionReceived: '73 days ago',
    speedKnots: null,
    lastPort: 'Norfolk, United States (USA)',
    sourcePage: 'https://www.vesselfinder.com/vessels/details/368800000',
  },
  {
    id: 'cvn76',
    name: 'USS Ronald Reagan (CVN-76)',
    mmsi: '369970410',
    aisRegion: 'North America West Coast',
    positionReceived: '320 days ago',
    speedKnots: null,
    sourcePage: 'https://www.vesselfinder.com/vessels/details/369970410',
  },
  {
    id: 'cvn77',
    name: 'USS George H. W. Bush (CVN-77)',
    mmsi: '369970663',
    aisRegion: 'US East Coast',
    positionReceived: '9 days ago',
    speedKnots: 13.6,
    lastPort: 'Norfolk, United States (USA)',
    sourcePage: 'https://www.vesselfinder.com/vessels/details/369970663',
  },
  {
    id: 'cvn78',
    name: 'USS Gerald R. Ford (CVN-78)',
    mmsi: '338803000',
    aisRegion: 'West Africa',
    positionReceived: '9 days ago',
    speedKnots: 19.4,
    sourcePage: 'https://www.vesselfinder.com/vessels/details/338803000',
  },
]);

export const EXAMPLE_IDS = Object.freeze({
  ALL_CAPITALS: 'all-capitals',
  CONTINENTS_AND_SEAS: 'continents-and-seas',
  ISS_REALTIME: 'iss-realtime',
  UKRAINE_CONFLICT: 'ukraine-conflict-open-source',
  CARRIERS_TRACKING: 'carriers-realtime',
});

const EXAMPLE_DEFINITIONS = Object.freeze([
  {
    id: EXAMPLE_IDS.ALL_CAPITALS,
    label: '1) All Capitals',
    description: 'Loads world capital markers from REST Countries.',
  },
  {
    id: EXAMPLE_IDS.CONTINENTS_AND_SEAS,
    label: '2) Continents + Seas',
    description: 'Loads continent and sea boundaries plus label markers from Natural Earth.',
  },
  {
    id: EXAMPLE_IDS.ISS_REALTIME,
    label: '3) ISS Real-Time Position + Orbit',
    description: 'Loads current ISS position and recent orbital path from wheretheiss.at.',
  },
  {
    id: EXAMPLE_IDS.UKRAINE_CONFLICT,
    label: '4) Ukraine Conflict (Open Sources)',
    description: 'Loads open-source Ukraine context layer with non-tactical status messaging.',
  },
  {
    id: EXAMPLE_IDS.CARRIERS_TRACKING,
    label: '5) Aircraft Carriers (Open Sources)',
    description: 'Loads open-source aircraft-carrier AIS snapshot markers from public tracking references.',
  },
]);

function safeFetchJson(fetchImpl, url) {
  return fetchImpl(url).then(async (response) => {
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status} from ${url}${body ? `: ${body.slice(0, 160)}` : ''}`);
    }
    return response.json();
  });
}

function toLocalizedText(value) {
  if (typeof value === 'string') {
    return { en: value };
  }
  return { en: '' };
}

function normalizeCapitalMarker(country = {}, index = 0) {
  const capitalName = Array.isArray(country.capital) ? country.capital[0] : '';
  const capitalLatLng = Array.isArray(country.capitalInfo?.latlng)
    ? country.capitalInfo.latlng
    : Array.isArray(country.latlng)
      ? country.latlng
      : [];

  if (typeof capitalName !== 'string' || capitalName.length === 0 || capitalLatLng.length < 2) {
    return null;
  }

  const lat = Number(capitalLatLng[0]);
  const lon = Number(capitalLatLng[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const countryName = country.name?.common ?? country.cca3 ?? `Country ${index + 1}`;
  return {
    id: `cap-${String(country.cca3 ?? index).toLowerCase()}`,
    name: toLocalizedText(capitalName),
    description: toLocalizedText(`${countryName} capital`),
    lat,
    lon,
    alt: 0,
    visualType: 'dot',
    category: 'capital',
  };
}

function getPolygonRing(geometry) {
  if (!geometry || typeof geometry !== 'object') {
    return null;
  }
  if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates?.[0])) {
    return geometry.coordinates[0];
  }
  if (
    geometry.type === 'MultiPolygon'
    && Array.isArray(geometry.coordinates?.[0]?.[0])
  ) {
    return geometry.coordinates[0][0];
  }
  return null;
}

function getGeometryCenter(geometry) {
  const ring = getPolygonRing(geometry);
  if (!ring || ring.length === 0) {
    return null;
  }

  let sumLon = 0;
  let sumLat = 0;
  let count = 0;
  for (const coordinate of ring) {
    if (!Array.isArray(coordinate) || coordinate.length < 2) {
      continue;
    }
    const lon = Number(coordinate[0]);
    const lat = Number(coordinate[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    sumLon += lon;
    sumLat += lat;
    count += 1;
  }

  if (count === 0) {
    return null;
  }
  return {
    lat: sumLat / count,
    lon: sumLon / count,
  };
}

function normalizeFeatureName(feature = {}, fallback) {
  const props = feature.properties ?? {};
  const name = props.name ?? props.NAME ?? props.name_en ?? props.NAME_EN ?? fallback;
  return typeof name === 'string' && name.length > 0 ? name : fallback;
}

function hasPolygonGeometry(geometry) {
  return geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon';
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildEarthExamplePlanet() {
  return {
    id: 'earth',
    lightingMode: 'sun',
    textureUri: EARTH_LOW_RES_TEXTURE_URL,
  };
}

function normalizeLandmassRegions(rawLandGeojson) {
  const features = Array.isArray(rawLandGeojson?.features) ? rawLandGeojson.features : [];

  return features
    .map((feature, index) => {
      if (!hasPolygonGeometry(feature?.geometry)) {
        return null;
      }

      const name = normalizeFeatureName(feature, `Landmass ${index + 1}`);
      const key = slug(name) || `shape-${index + 1}`;

      return {
        id: `landmass-${index + 1}-${key}`,
        name: toLocalizedText(name),
        geojson: feature.geometry,
        capColor: 'rgba(72, 124, 88, 0.28)',
        sideColor: '#3f7550',
        altitude: 0.001,
      };
    })
    .filter(Boolean);
}

async function loadLandmassRegions(fetchImpl) {
  const landRaw = await safeFetchJson(fetchImpl, NATURAL_EARTH_LAND_URL);
  return normalizeLandmassRegions(landRaw);
}

function normalizeIssMarker(current) {
  const lat = Number(current?.latitude);
  const lon = Number(current?.longitude);
  const altKm = Number(current?.altitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  const velocityKmh = Number(current?.velocity);
  return {
    id: 'iss-current',
    name: toLocalizedText('International Space Station'),
    description: toLocalizedText(
      `Live position${Number.isFinite(velocityKmh) ? `, velocity ${Math.round(velocityKmh)} km/h` : ''}`
    ),
    lat,
    lon,
    alt: Number.isFinite(altKm) ? Math.max(0, altKm / 6371) : 0.06,
    visualType: 'dot',
    category: 'iss',
    color: '#f5d547',
    pulse: true,
  };
}

function formatIsoTimestampFromUnixSeconds(value) {
  const unixSeconds = Number(value);
  if (!Number.isFinite(unixSeconds)) {
    return '';
  }
  const date = new Date(unixSeconds * 1000);
  const timestamp = date.toISOString();
  return typeof timestamp === 'string' ? timestamp : '';
}

function normalizeIssHistoryMarkers(positions = [], nowUnixSeconds) {
  return positions
    .filter((entry) => Number(entry?.timestamp) < nowUnixSeconds)
    .map((entry, index) => {
      const lat = Number(entry?.latitude);
      const lon = Number(entry?.longitude);
      const altKm = Number(entry?.altitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      const timestampIso = formatIsoTimestampFromUnixSeconds(entry?.timestamp);
      const fallbackTitle = `ISS History ${index + 1}`;
      return {
        id: `iss-history-${Number(entry.timestamp)}`,
        name: toLocalizedText(timestampIso ? `ISS ${timestampIso.slice(11, 16)} UTC` : fallbackTitle),
        description: toLocalizedText(
          timestampIso
            ? `ISS position at ${timestampIso}`
            : 'ISS historical position sample'
        ),
        callout: timestampIso ? `Time: ${timestampIso}` : 'Time: unknown',
        lat,
        lon,
        alt: Number.isFinite(altKm) ? Math.max(0, altKm / 6371) : 0.05,
        visualType: 'dot',
        category: 'iss-history',
        color: '#f6c85f',
      };
    })
    .filter(Boolean);
}

function uniqueSortedPositions(positions = []) {
  const seen = new Set();
  return positions
    .filter((entry) => {
      const timestamp = Number(entry?.timestamp);
      const lat = Number(entry?.latitude);
      const lon = Number(entry?.longitude);
      if (!Number.isFinite(timestamp) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return false;
      }
      if (seen.has(timestamp)) {
        return false;
      }
      seen.add(timestamp);
      return true;
    })
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}

async function fetchIssPositions(fetchImpl, nowUnixSeconds) {
  const timestamps = [];
  for (let offsetMinutes = -45; offsetMinutes <= 45; offsetMinutes += 10) {
    timestamps.push(nowUnixSeconds + offsetMinutes * 60);
  }

  const query = new URLSearchParams({
    timestamps: timestamps.join(','),
    units: 'kilometers',
  });

  try {
    const positions = await safeFetchJson(fetchImpl, `${ISS_POSITIONS_URL}?${query.toString()}`);
    return uniqueSortedPositions(Array.isArray(positions) ? positions : []);
  } catch {
    const fallback = [];
    for (let offsetMinutes = -90; offsetMinutes <= 0; offsetMinutes += 10) {
      fallback.push(nowUnixSeconds + offsetMinutes * 60);
    }
    const fallbackQuery = new URLSearchParams({
      timestamps: fallback.join(','),
      units: 'kilometers',
    });
    const positions = await safeFetchJson(fetchImpl, `${ISS_POSITIONS_URL}?${fallbackQuery.toString()}`);
    return uniqueSortedPositions(Array.isArray(positions) ? positions : []);
  }
}

function createAdvisoryMarker({ id, title, body, lat, lon, source }) {
  return {
    id,
    name: toLocalizedText(title),
    description: toLocalizedText(`${body}${source ? ` Source: ${source}` : ''}`),
    lat,
    lon,
    alt: 0,
    visualType: 'dot',
    category: 'advisory',
    color: '#ffb347',
  };
}

function resolveCarrierPosition(entry) {
  const anchor = CARRIER_REGION_ANCHORS[entry.aisRegion];
  if (anchor) {
    return anchor;
  }
  return { lat: 0, lon: 0 };
}

function createCarrierSnapshotMarker(entry, sourceLinksText) {
  const position = resolveCarrierPosition(entry);
  const speedText = Number.isFinite(entry.speedKnots)
    ? `Last reported speed: ${entry.speedKnots.toFixed(1)} kn`
    : 'Last reported speed: not available in public feed';
  const portText = entry.lastPort
    ? `Last AIS port call: ${entry.lastPort}`
    : 'Last AIS port call: not listed';

  return {
    id: `carrier-${entry.id}`,
    name: toLocalizedText(entry.name),
    description: toLocalizedText(
      [
        `Last AIS region: ${entry.aisRegion}`,
        `Position freshness: ${entry.positionReceived}`,
        speedText,
        portText,
        `MMSI: ${entry.mmsi}`,
        `Source page: ${entry.sourcePage}`,
        `Sources: ${sourceLinksText}`,
      ].join('. ')
    ),
    lat: position.lat,
    lon: position.lon,
    alt: 0,
    visualType: 'dot',
    category: 'carrier-ais-snapshot',
    color: '#f2994a',
  };
}

export function listExampleDefinitions() {
  return EXAMPLE_DEFINITIONS.map((entry) => ({ ...entry }));
}

export async function loadAllCapitalsExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const [countries, landmassRegions] = await Promise.all([
    safeFetchJson(fetchImpl, REST_COUNTRIES_URL),
    loadLandmassRegions(fetchImpl),
  ]);

  const markers = (Array.isArray(countries) ? countries : [])
    .map(normalizeCapitalMarker)
    .filter(Boolean);

  return {
    ...createEmptyScene(locale),
    theme: 'light',
    planet: buildEarthExamplePlanet(),
    markers,
    paths: [],
    arcs: [],
    regions: landmassRegions,
    animations: [],
  };
}

export async function loadContinentsAndSeasExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const [continentsRaw, marineRaw, landmassRegions] = await Promise.all([
    safeFetchJson(fetchImpl, NATURAL_EARTH_CONTINENTS_URL),
    safeFetchJson(fetchImpl, NATURAL_EARTH_MARINE_URL),
    loadLandmassRegions(fetchImpl),
  ]);

  const continentFeatures = (continentsRaw?.features ?? []).filter((feature) => {
    const featureClass = String(feature?.properties?.featurecla ?? '').toLowerCase();
    return featureClass.includes('continent');
  });

  const seaFeatures = (marineRaw?.features ?? []).filter((feature) => {
    const featureClass = String(feature?.properties?.featurecla ?? '').toLowerCase();
    return ['sea', 'ocean', 'gulf', 'bay'].some((word) => featureClass.includes(word));
  }).slice(0, 48);

  const regions = [...landmassRegions];
  const markers = [];

  for (const feature of continentFeatures) {
    const name = normalizeFeatureName(feature, 'Continent');
    const center = getGeometryCenter(feature.geometry);
    if (center) {
      markers.push({
        id: `label-${slug(name)}`,
        name: toLocalizedText(name),
        description: toLocalizedText('Continent label'),
        lat: center.lat,
        lon: center.lon,
        alt: 0.001,
        visualType: 'dot',
        color: '#8fd1ff',
        category: 'continent-label',
      });
    }
  }

  for (const feature of seaFeatures) {
    const name = normalizeFeatureName(feature, 'Sea');
    regions.push({
      id: `sea-${slug(name)}`,
      name: toLocalizedText(name),
      geojson: feature.geometry,
      capColor: 'rgba(40, 98, 130, 0.22)',
      sideColor: '#2f7ea4',
      altitude: 0,
    });
    const center = getGeometryCenter(feature.geometry);
    if (center) {
      markers.push({
        id: `sea-label-${slug(name)}`,
        name: toLocalizedText(name),
        description: toLocalizedText('Sea label'),
        lat: center.lat,
        lon: center.lon,
        alt: 0,
        visualType: 'dot',
        color: '#67c5db',
        category: 'sea-label',
      });
    }
  }

  return {
    ...createEmptyScene(locale),
    theme: 'light',
    planet: buildEarthExamplePlanet(),
    markers,
    regions,
    paths: [],
    arcs: [],
    animations: [],
  };
}

export async function loadIssRealtimeExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const nowUnixSeconds = Math.floor((typeof options.nowMs === 'number' ? options.nowMs : Date.now()) / 1000);

  const [current, landmassRegions] = await Promise.all([
    safeFetchJson(fetchImpl, ISS_CURRENT_URL),
    loadLandmassRegions(fetchImpl),
  ]);
  const marker = normalizeIssMarker(current);
  if (!marker) {
    throw new Error('ISS API did not return a valid current position');
  }
  const positions = await fetchIssPositions(fetchImpl, nowUnixSeconds);
  const historicalMarkers = normalizeIssHistoryMarkers(positions, nowUnixSeconds);
  const pastOrCurrentPositions = positions.filter((entry) => Number(entry?.timestamp) <= nowUnixSeconds);
  const orbitPositions = pastOrCurrentPositions.length >= 2 ? pastOrCurrentPositions : positions;
  const pathPoints = orbitPositions.map((entry) => ({
    lat: Number(entry.latitude),
    lon: Number(entry.longitude),
    alt: Math.max(0, Number(entry.altitude) / 6371),
  }));
  // Append current live position so the path reaches the ISS marker (BUG6)
  if (pathPoints.length >= 1) {
    pathPoints.push({ lat: marker.lat, lon: marker.lon, alt: marker.alt });
  }

  return {
    ...createEmptyScene(locale),
    theme: 'dark',
    planet: buildEarthExamplePlanet(),
    markers: [marker, ...historicalMarkers],
    paths: pathPoints.length >= 2
      ? [{
        id: 'iss-recent-orbit',
        name: toLocalizedText('ISS Recent Orbit'),
        points: pathPoints,
        color: '#f0e442',
        strokeWidth: 1.6,
      }]
      : [],
    arcs: [],
    regions: landmassRegions,
    animations: [],
  };
}

export async function loadUkraineConflictOpenSourceExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const [countries, landmassRegions] = await Promise.all([
    safeFetchJson(fetchImpl, COUNTRIES_GEOJSON_URL),
    loadLandmassRegions(fetchImpl),
  ]);
  const ukraineFeature = (countries?.features ?? []).find((feature) => (
    feature?.properties?.['ISO3166-1-Alpha-3'] === 'UKR'
  ));

  return {
    ...createEmptyScene(locale),
    theme: 'dark',
    planet: buildEarthExamplePlanet(),
    regions: [
      ...landmassRegions,
      ...(ukraineFeature ? [{
        id: 'ukraine-boundary',
        name: toLocalizedText('Ukraine'),
        geojson: ukraineFeature.geometry,
        capColor: 'rgba(66, 135, 245, 0.18)',
        sideColor: '#5f95ff',
        altitude: 0.004,
      }] : []),
    ],
    markers: [
      createAdvisoryMarker({
        id: 'ukr-advisory',
        title: 'Ukraine Conflict Open-Source Layer',
        body: 'This preset intentionally avoids real-time tactical unit tracking. It is suitable for broad situational context only.',
        lat: 50.4501,
        lon: 30.5234,
        source: 'Open-source map layers and public country boundaries',
      }),
      createAdvisoryMarker({
        id: 'ukr-source',
        title: 'Suggested Source',
        body: 'For broad conflict mapping context, check openly published and delayed OSINT map products.',
        lat: 48.3794,
        lon: 31.1656,
        source: 'DeepStateMap / public OSINT mapping projects',
      }),
    ],
    paths: [],
    arcs: [],
    animations: [],
  };
}

export async function loadCarriersOpenSourceExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const nowIso = new Date(typeof options.nowMs === 'number' ? options.nowMs : Date.now()).toISOString();
  const landmassRegions = await loadLandmassRegions(fetchImpl);
  const sourceLinksText = CARRIER_SOURCE_URLS.join(' | ');

  return {
    ...createEmptyScene(locale),
    theme: 'dark',
    planet: buildEarthExamplePlanet(),
    markers: [
      createAdvisoryMarker({
        id: 'carrier-advisory',
        title: 'Aircraft Carrier Tracking Open-Source Layer',
        body: 'Source-backed aircraft-carrier AIS snapshot from public trackers. Coordinates represent last known AIS region anchors (not homeports) and can be delayed.',
        lat: 20.0,
        lon: 0.0,
        source: `Status as of ${nowIso}. Sources: ${sourceLinksText}`,
      }),
      ...CARRIER_AIS_SNAPSHOT.map((entry) => createCarrierSnapshotMarker(entry, sourceLinksText)),
    ],
    paths: [],
    arcs: [],
    regions: landmassRegions,
    animations: [],
  };
}

export async function loadExampleScene(id, options = {}) {
  if (id === EXAMPLE_IDS.ALL_CAPITALS) {
    return loadAllCapitalsExample(options);
  }
  if (id === EXAMPLE_IDS.CONTINENTS_AND_SEAS) {
    return loadContinentsAndSeasExample(options);
  }
  if (id === EXAMPLE_IDS.ISS_REALTIME) {
    return loadIssRealtimeExample(options);
  }
  if (id === EXAMPLE_IDS.UKRAINE_CONFLICT) {
    return loadUkraineConflictOpenSourceExample(options);
  }
  if (id === EXAMPLE_IDS.CARRIERS_TRACKING) {
    return loadCarriersOpenSourceExample(options);
  }
  throw new Error(`Unknown example id: ${id}`);
}
