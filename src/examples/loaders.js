import { createEmptyScene } from '../scene/schema.js';

const REST_COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng,unMember';
const NATURAL_EARTH_CONTINENTS_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson';
const NATURAL_EARTH_MARINE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_marine_polys.geojson';
const NATURAL_EARTH_LAND_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';
const ISS_CURRENT_URL = 'https://api.wheretheiss.at/v1/satellites/25544';
const ISS_POSITIONS_URL = 'https://api.wheretheiss.at/v1/satellites/25544/positions';
const COUNTRIES_GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
const EARTH_LOW_RES_TEXTURE_URL = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png';

const DS_REST_COUNTRIES = Object.freeze({ id: 'rest-countries', name: 'REST Countries API', shortName: 'RC', url: 'https://restcountries.com/', description: 'Open API for country data including capitals and memberships' });
const DS_NATURAL_EARTH = Object.freeze({ id: 'natural-earth', name: 'Natural Earth', shortName: 'NE', url: 'https://www.naturalearthdata.com/', license: 'Public Domain', description: 'Public domain map dataset for cartography' });
const DS_WHERETHEISS = Object.freeze({ id: 'wheretheiss', name: 'Where the ISS at?', shortName: 'ISS', url: 'https://wheretheiss.at/', description: 'Real-time ISS position and orbital data' });
const DS_GEO_COUNTRIES = Object.freeze({ id: 'geo-countries', name: 'Geo Countries', shortName: 'GC', url: 'https://github.com/datasets/geo-countries', license: 'ODC PDDL', description: 'Country boundary polygons' });
const DS_OSINT_VESSELS = Object.freeze({ id: 'osint-vessels', name: 'Curated OSINT Reports', shortName: 'OSINT', url: '#', description: 'Curated open-source intelligence reports' });
const DS_AIS_FEEDS = Object.freeze({ id: 'ais-feeds', name: 'AIS Feeds', shortName: 'AIS', url: '#', description: 'Automatic Identification System vessel feeds' });
const DS_AIS_SAMPLE = Object.freeze({ id: 'ais-sample', name: 'AIS Sample Data', shortName: 'AIS', url: '#', description: 'Sample AIS vessel data' });

const NATION_COLORS = Object.freeze({
  US: '#1f3d73',
  FR: '#002395',
  GB: '#003078',
  RU: '#d52b1e',
  CN: '#de2910',
});

const NATO_MEMBERS = Object.freeze(new Set([
  'ALB', 'BEL', 'BGR', 'CAN', 'HRV', 'CZE', 'DNK', 'EST', 'FIN', 'FRA',
  'DEU', 'GRC', 'HUN', 'ISL', 'ITA', 'LVA', 'LTU', 'LUX', 'MNE', 'NLD',
  'MKD', 'NOR', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE', 'TUR',
  'GBR', 'USA',
]));

const STATUS_LABELS = Object.freeze({
  deployed: 'Deployed',
  port: 'In Port',
  maintenance: 'In Maintenance',
  decommissioned: 'Decommissioned',
});
const SHORT_MONTHS = Object.freeze(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']);

function formatShortDate(isoString) {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return `${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export const EXAMPLE_IDS = Object.freeze({
  NONE: 'none',
  ALL_CAPITALS: 'all-capitals',
  CONTINENTS_AND_SEAS: 'continents-and-seas',
  ISS_REALTIME: 'iss-realtime',
  UKRAINE_CONFLICT: 'ukraine-conflict-open-source',
  CARRIERS_TRACKING: 'carriers-realtime',
  VESSEL_TRACKING: 'vessel-tracking',
  CIVIL_SHIPPING: 'civil-shipping',
});

const EXAMPLE_DEFINITIONS = Object.freeze([
  {
    id: EXAMPLE_IDS.NONE,
    label: '— Unload All —',
    description: 'Clears the current example and resets to an empty scene.',
  },
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
    label: '5) Naval Vessels (OSINT)',
    description: 'Loads curated OSINT naval vessel positions with nation-colored markers and trail paths.',
  },
  {
    id: EXAMPLE_IDS.VESSEL_TRACKING,
    label: '6) Vessel Tracking (Multi-Source)',
    description: 'Loads aggregated vessel positions from OSINT + AIS sources with trail paths.',
  },
  {
    id: EXAMPLE_IDS.CIVIL_SHIPPING,
    label: '7) Civil Shipping (Global Straits)',
    description: 'Tracks civil vessels in major shipping straits: Malacca, Hormuz, Suez, Panama, Gibraltar, and more.',
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

function normalizeCapitalMarker(country = {}, index = 0, sourceId = '') {
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
  const cca3 = typeof country.cca3 === 'string' ? country.cca3 : '';
  const isUn = country.unMember === true;
  const isNato = NATO_MEMBERS.has(cca3);

  let category = 'capital';
  const tags = [];
  if (isUn && isNato) { category = 'capital-un-nato'; tags.push('UN member', 'NATO member'); }
  else if (isUn) { category = 'capital-un'; tags.push('UN member'); }
  else if (isNato) { category = 'capital-nato'; tags.push('NATO member'); }

  const tagSuffix = tags.length > 0 ? ` (${tags.join(', ')})` : '';
  return {
    id: `cap-${String(country.cca3 ?? index).toLowerCase()}`,
    name: toLocalizedText(capitalName),
    description: toLocalizedText(`${countryName} capital${tagSuffix}`),
    lat,
    lon,
    alt: 0,
    visualType: 'dot',
    category,
    sourceId,
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

function normalizeLandmassRegions(rawLandGeojson, sourceId = '') {
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
        sourceId,
      };
    })
    .filter(Boolean);
}

async function loadLandmassRegions(fetchImpl, sourceId = '') {
  const landRaw = await safeFetchJson(fetchImpl, NATURAL_EARTH_LAND_URL);
  return normalizeLandmassRegions(landRaw, sourceId);
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
        sourceId: 'wheretheiss',
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

function createAdvisoryMarker({ id, title, body, lat, lon, source, sourceId = '' }) {
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
    sourceId,
  };
}


function createVesselMarker(vessel, sourceId = '') {
  const nation = vessel.nation ?? '??';
  const color = NATION_COLORS[nation] ?? '#999999';
  const statusLabel = STATUS_LABELS[vessel.status] ?? vessel.status;
  const ts = vessel.timestamp ? new Date(vessel.timestamp).toISOString() : 'unknown';
  const confidenceTag = vessel.confidence === 'exact' ? 'AIS exact' : 'OSINT approximate';
  const trailCount = Array.isArray(vessel.trail) ? vessel.trail.length : 0;

  return {
    id: `vessel-${vessel.id}`,
    name: toLocalizedText(
      vessel.timestamp
        ? `${vessel.name} [${formatShortDate(vessel.timestamp)}]`
        : vessel.name
    ),
    description: toLocalizedText(
      [
        `Nation: ${nation}`,
        `Type: ${vessel.type}`,
        `Status: ${statusLabel}`,
        `Last seen: ${ts}`,
        `Position confidence: ${confidenceTag}`,
        vessel.mmsi ? `MMSI: ${vessel.mmsi}` : null,
        `Source: ${vessel.source}`,
        trailCount > 0 ? `Trail: ${trailCount} previous positions` : null,
      ].filter(Boolean).join('. ')
    ),
    lat: vessel.lat,
    lon: vessel.lon,
    alt: 0,
    visualType: 'dot',
    category: `vessel-${nation.toLowerCase()}`,
    color,
    timestamp: vessel.timestamp ?? null,
    sourceId,
  };
}

function createVesselTrailPath(vessel, sourceId = '') {
  const trail = Array.isArray(vessel.trail) ? vessel.trail : [];
  if (trail.length === 0) {
    return null;
  }

  const trailSorted = [...trail].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const points = trailSorted.map((entry) => ({
    lat: entry.lat,
    lon: entry.lon,
    alt: 0,
  }));
  points.push({ lat: vessel.lat, lon: vessel.lon, alt: 0 });

  if (points.length < 2) {
    return null;
  }

  const nation = vessel.nation ?? '??';
  const color = NATION_COLORS[nation] ?? '#999999';
  return {
    id: `trail-${vessel.id}`,
    name: toLocalizedText(`${vessel.name} trail`),
    points,
    color,
    strokeWidth: 1.2,
    dashPattern: [4, 2],
    sourceId,
  };
}

export async function loadVesselTrackingExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const vesselsUrl = options.vesselsUrl ?? '/data/vessels.json';

  const [vesselsRaw, landmassRegions] = await Promise.all([
    safeFetchJson(fetchImpl, vesselsUrl),
    loadLandmassRegions(fetchImpl, 'natural-earth'),
  ]);

  const vessels = Array.isArray(vesselsRaw) ? vesselsRaw : [];
  const markers = vessels.map((v) => createVesselMarker(v, v.source === 'ais' ? 'ais-feeds' : 'osint-vessels'));
  const paths = vessels.map((v) => createVesselTrailPath(v, v.source === 'ais' ? 'ais-feeds' : 'osint-vessels')).filter(Boolean);

  const deployedCount = vessels.filter((v) => v.status === 'deployed').length;
  const nationSet = new Set(vessels.map((v) => v.nation));

  markers.unshift({
    id: 'vessel-advisory',
    name: toLocalizedText('Vessel Tracking (Multi-Source)'),
    description: toLocalizedText(
      `${vessels.length} vessels from ${nationSet.size} nations. `
      + `${deployedCount} deployed. `
      + 'Positions aggregated from OSINT reports and AIS feeds. '
      + 'Trail paths show historical movement where known.'
    ),
    lat: 20.0,
    lon: 0.0,
    alt: 0,
    visualType: 'dot',
    category: 'advisory',
    color: '#ffb347',
    sourceId: 'osint-vessels',
  });

  const nationFilterOptions = [
    { value: 'all', label: 'All Navies', categories: [] },
    { value: 'us', label: 'US Navy', categories: ['vessel-us'] },
    { value: 'fr', label: 'Marine Nationale', categories: ['vessel-fr'] },
    { value: 'gb', label: 'Royal Navy', categories: ['vessel-gb'] },
    { value: 'ru', label: 'Russian Navy', categories: ['vessel-ru'] },
    { value: 'cn', label: 'PLA Navy', categories: ['vessel-cn'] },
  ];

  const allTimestamps = vessels
    .flatMap((v) => [v.timestamp, ...(Array.isArray(v.trail) ? v.trail.map((t) => t.timestamp) : [])])
    .filter(Boolean)
    .map((ts) => new Date(ts).getTime())
    .filter(Number.isFinite);
  const timeRange = allTimestamps.length > 0
    ? { min: new Date(Math.min(...allTimestamps)).toISOString().slice(0, 10), max: new Date(Math.max(...allTimestamps)).toISOString().slice(0, 10) }
    : null;

  return {
    ...createEmptyScene(locale),
    theme: 'dark',
    planet: buildEarthExamplePlanet(),
    markers,
    paths,
    arcs: [],
    regions: landmassRegions,
    animations: [],
    camera: markers.length > 1
      ? { lat: markers[1].lat, lon: markers[1].lon }
      : undefined,
    filters: [
      {
        id: 'nation',
        label: 'Navy',
        options: nationFilterOptions,
      },
    ],
    ...(timeRange ? { timeRange } : {}),
    dataSources: [DS_OSINT_VESSELS, DS_AIS_FEEDS, DS_NATURAL_EARTH],
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
    loadLandmassRegions(fetchImpl, 'natural-earth'),
  ]);

  const markers = (Array.isArray(countries) ? countries : [])
    .map((c, i) => normalizeCapitalMarker(c, i, 'rest-countries'))
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
    camera: markers.length > 0
      ? { lat: markers[0].lat, lon: markers[0].lon }
      : undefined,
    filters: [
      {
        id: 'membership',
        label: 'Membership',
        options: [
          { value: 'all', label: 'All Capitals', categories: [] },
          { value: 'un', label: 'UN Members', categories: ['capital-un', 'capital-un-nato'] },
          { value: 'nato', label: 'NATO Members', categories: ['capital-nato', 'capital-un-nato'] },
        ],
      },
    ],
    dataSources: [DS_REST_COUNTRIES, DS_NATURAL_EARTH],
  };
}

export async function loadContinentsAndSeasExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const [continentsRaw, marineRaw, landmassRegions] = await Promise.all([
    safeFetchJson(fetchImpl, NATURAL_EARTH_CONTINENTS_URL),
    safeFetchJson(fetchImpl, NATURAL_EARTH_MARINE_URL),
    loadLandmassRegions(fetchImpl, 'natural-earth'),
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
        sourceId: 'natural-earth',
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
      sourceId: 'natural-earth',
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
        sourceId: 'natural-earth',
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
    camera: markers.length > 0
      ? { lat: markers[0].lat, lon: markers[0].lon }
      : undefined,
    dataSources: [DS_NATURAL_EARTH],
  };
}

export async function loadIssRealtimeExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const nowUnixSeconds = Math.floor((typeof options.nowMs === 'number' ? options.nowMs : Date.now()) / 1000);

  const [current, landmassRegions] = await Promise.all([
    safeFetchJson(fetchImpl, ISS_CURRENT_URL),
    loadLandmassRegions(fetchImpl, 'natural-earth'),
  ]);
  const marker = normalizeIssMarker(current);
  if (!marker) {
    throw new Error('ISS API did not return a valid current position');
  }
  marker.sourceId = 'wheretheiss';
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
        sourceId: 'wheretheiss',
      }]
      : [],
    arcs: [],
    regions: landmassRegions,
    animations: [],
    camera: { lat: marker.lat, lon: marker.lon },
    dataSources: [DS_WHERETHEISS, DS_NATURAL_EARTH],
  };
}

export async function loadUkraineConflictOpenSourceExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const [countries, landmassRegions] = await Promise.all([
    safeFetchJson(fetchImpl, COUNTRIES_GEOJSON_URL),
    loadLandmassRegions(fetchImpl, 'natural-earth'),
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
        sourceId: 'geo-countries',
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
        sourceId: 'geo-countries',
      }),
      createAdvisoryMarker({
        id: 'ukr-source',
        title: 'Suggested Source',
        body: 'For broad conflict mapping context, check openly published and delayed OSINT map products.',
        lat: 48.3794,
        lon: 31.1656,
        source: 'DeepStateMap / public OSINT mapping projects',
        sourceId: 'geo-countries',
      }),
    ],
    paths: [],
    arcs: [],
    animations: [],
    camera: { lat: 50.4501, lon: 30.5234 },
    dataSources: [DS_GEO_COUNTRIES, DS_NATURAL_EARTH],
  };
}

export async function loadCarriersOpenSourceExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const vesselsUrl = options.vesselsUrl ?? '/data/vessels-osint.json';

  const [vesselsRaw, landmassRegions] = await Promise.all([
    safeFetchJson(fetchImpl, vesselsUrl),
    loadLandmassRegions(fetchImpl, 'natural-earth'),
  ]);

  const vessels = Array.isArray(vesselsRaw) ? vesselsRaw : [];
  const markers = vessels.map((v) => createVesselMarker(v, 'osint-vessels'));
  const paths = vessels.map((v) => createVesselTrailPath(v, 'osint-vessels')).filter(Boolean);

  const deployedCount = vessels.filter((v) => v.status === 'deployed').length;
  const nationSet = new Set(vessels.map((v) => v.nation));

  markers.unshift(createAdvisoryMarker({
    id: 'carrier-advisory',
    title: 'Naval Vessel Tracking (OSINT)',
    body: `${vessels.length} vessels from ${nationSet.size} nations. `
      + `${deployedCount} deployed. `
      + 'Positions from curated OSINT reports. '
      + 'Trail paths show historical movement where known.',
    lat: 20.0,
    lon: 0.0,
    source: 'Curated open-source intelligence reports',
    sourceId: 'osint-vessels',
  }));

  const nationFilterOptions = [
    { value: 'all', label: 'All Navies', categories: [] },
    { value: 'us', label: 'US Navy', categories: ['vessel-us'] },
    { value: 'fr', label: 'Marine Nationale', categories: ['vessel-fr'] },
    { value: 'gb', label: 'Royal Navy', categories: ['vessel-gb'] },
    { value: 'ru', label: 'Russian Navy', categories: ['vessel-ru'] },
    { value: 'cn', label: 'PLA Navy', categories: ['vessel-cn'] },
  ];

  const allTimestamps = vessels
    .flatMap((v) => [v.timestamp, ...(Array.isArray(v.trail) ? v.trail.map((t) => t.timestamp) : [])])
    .filter(Boolean)
    .map((ts) => new Date(ts).getTime())
    .filter(Number.isFinite);
  const timeRange = allTimestamps.length > 0
    ? { min: new Date(Math.min(...allTimestamps)).toISOString().slice(0, 10), max: new Date(Math.max(...allTimestamps)).toISOString().slice(0, 10) }
    : null;

  return {
    ...createEmptyScene(locale),
    theme: 'dark',
    planet: buildEarthExamplePlanet(),
    markers,
    paths,
    arcs: [],
    regions: landmassRegions,
    animations: [],
    camera: markers.length > 1
      ? { lat: markers[1].lat, lon: markers[1].lon }
      : undefined,
    filters: [
      {
        id: 'nation',
        label: 'Navy',
        options: nationFilterOptions,
      },
    ],
    ...(timeRange ? { timeRange } : {}),
    dataSources: [DS_OSINT_VESSELS, DS_NATURAL_EARTH],
  };
}

const SHIPPING_STRAITS = Object.freeze([
  { id: 'malacca', name: 'Strait of Malacca', lat: 2.0, lon: 102.5 },
  { id: 'hormuz', name: 'Strait of Hormuz', lat: 26.5, lon: 56.3 },
  { id: 'suez', name: 'Suez Canal', lat: 30.5, lon: 32.3 },
  { id: 'panama', name: 'Panama Canal', lat: 9.1, lon: -79.7 },
  { id: 'gibraltar', name: 'Strait of Gibraltar', lat: 35.95, lon: -5.5 },
  { id: 'english-channel', name: 'English Channel', lat: 50.8, lon: 1.2 },
  { id: 'bab-el-mandeb', name: 'Bab el-Mandeb', lat: 12.5, lon: 43.3 },
  { id: 'bosphorus', name: 'Bosphorus Strait', lat: 41.1, lon: 29.05 },
  { id: 'lombok', name: 'Lombok Strait', lat: -8.5, lon: 115.7 },
]);

const CIVIL_TYPE_COLORS = Object.freeze({
  container: '#2563eb',
  tanker: '#b45309',
  vlcc: '#92400e',
  'bulk-carrier': '#6b7280',
  'lng-carrier': '#0891b2',
  ferry: '#7c3aed',
});

function createCivilVesselMarker(vessel, sourceId = '') {
  const color = CIVIL_TYPE_COLORS[vessel.type] ?? '#4b5563';
  const dateTag = vessel.timestamp ? ` [${formatShortDate(vessel.timestamp)}]` : '';
  const strait = SHIPPING_STRAITS.find((s) => s.id === vessel.strait);
  const straitLabel = strait ? strait.name : vessel.strait ?? 'unknown';

  return {
    id: `civil-${vessel.id}`,
    name: toLocalizedText(`${vessel.name}${dateTag}`),
    description: toLocalizedText(
      [
        `Type: ${vessel.type}`,
        `Flag: ${vessel.flag ?? 'unknown'}`,
        `Strait: ${straitLabel}`,
        vessel.mmsi ? `MMSI: ${vessel.mmsi}` : null,
        `Source: ${vessel.source}`,
      ].filter(Boolean).join('. ')
    ),
    lat: vessel.lat,
    lon: vessel.lon,
    alt: 0,
    visualType: 'dot',
    category: `strait-${vessel.strait ?? 'other'}`,
    color,
    timestamp: vessel.timestamp ?? null,
    sourceId,
  };
}

export async function loadCivilShippingExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const civilUrl = options.civilUrl ?? '/data/vessels-civil-sample.json';

  const [vesselsRaw, landmassRegions] = await Promise.all([
    safeFetchJson(fetchImpl, civilUrl),
    loadLandmassRegions(fetchImpl, 'natural-earth'),
  ]);

  const vessels = Array.isArray(vesselsRaw) ? vesselsRaw : [];
  const markers = vessels.map((v) => createCivilVesselMarker(v, 'ais-sample'));

  const straitCounts = {};
  for (const v of vessels) {
    const key = v.strait ?? 'other';
    straitCounts[key] = (straitCounts[key] ?? 0) + 1;
  }

  for (const strait of SHIPPING_STRAITS) {
    const count = straitCounts[strait.id] ?? 0;
    markers.push({
      id: `strait-label-${strait.id}`,
      name: toLocalizedText(strait.name),
      description: toLocalizedText(
        `Major shipping chokepoint. ${count} vessel${count !== 1 ? 's' : ''} currently tracked in this area.`
      ),
      lat: strait.lat,
      lon: strait.lon,
      alt: 0,
      visualType: 'text',
      category: 'strait-label',
      color: '#f59e0b',
      sourceId: 'ais-sample',
    });
  }

  markers.unshift(createAdvisoryMarker({
    id: 'civil-advisory',
    title: 'Civil Shipping (Global Straits)',
    body: `${vessels.length} civil vessels tracked across ${Object.keys(straitCounts).length} major shipping straits. `
      + 'Zoom in to individual straits to see vessel positions. '
      + 'Sample data shown; connect AISHub API for live tracking.',
    lat: 20.0,
    lon: 30.0,
    source: 'Sample data / AISHub API',
    sourceId: 'ais-sample',
  }));

  const straitFilterOptions = [
    { value: 'all', label: 'All Straits', categories: [] },
    ...SHIPPING_STRAITS.map((s) => ({
      value: s.id,
      label: s.name,
      categories: [`strait-${s.id}`],
    })),
  ];

  return {
    ...createEmptyScene(locale),
    theme: 'dark',
    planet: buildEarthExamplePlanet(),
    markers,
    paths: [],
    arcs: [],
    regions: landmassRegions,
    animations: [],
    camera: markers.length > 1
      ? { lat: markers[1].lat, lon: markers[1].lon }
      : undefined,
    filters: [
      {
        id: 'strait',
        label: 'Strait',
        options: straitFilterOptions,
      },
    ],
    dataSources: [DS_AIS_SAMPLE, DS_NATURAL_EARTH],
  };
}

export async function loadExampleScene(id, options = {}) {
  if (id === EXAMPLE_IDS.NONE) {
    const locale = options.locale ?? 'en';
    return createEmptyScene(locale);
  }
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
  if (id === EXAMPLE_IDS.VESSEL_TRACKING) {
    return loadVesselTrackingExample(options);
  }
  if (id === EXAMPLE_IDS.CIVIL_SHIPPING) {
    return loadCivilShippingExample(options);
  }
  throw new Error(`Unknown example id: ${id}`);
}
