import { createEmptyScene } from '../scene/schema.js';

const REST_COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca3,region,subregion,latlng,unMember';
const NATURAL_EARTH_CONTINENTS_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson';
const NATURAL_EARTH_MARINE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_marine_polys.geojson';
const NATURAL_EARTH_LAND_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';
const ISS_CURRENT_URL = 'https://api.wheretheiss.at/v1/satellites/25544';
const ISS_POSITIONS_URL = 'https://api.wheretheiss.at/v1/satellites/25544/positions';
const COUNTRIES_GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
const EARTH_LOW_RES_TEXTURE_URL = '/assets/textures/earth/land_ocean_ice_2048.png';

const DS_REST_COUNTRIES = Object.freeze({ id: 'rest-countries', name: 'REST Countries API', shortName: 'RC', url: 'https://restcountries.com/', license: 'Open Source', description: 'Open REST API providing data on 250+ countries — capitals, coordinates, UN/NATO membership, and more' });
const DS_NATURAL_EARTH = Object.freeze({ id: 'natural-earth', name: 'Natural Earth', shortName: 'NE', url: 'https://www.naturalearthdata.com/', license: 'Public Domain', description: 'Free vector and raster map data at 1:10m, 1:50m, and 1:110m scales, built by volunteers and supported by NACIS' });
const DS_WHERETHEISS = Object.freeze({ id: 'wheretheiss', name: 'Where the ISS at?', shortName: 'ISS', url: 'https://wheretheiss.at/', description: 'Real-time ISS position, altitude, and velocity via REST API — operated by Linzig, LLC' });
const DS_GEO_COUNTRIES = Object.freeze({ id: 'geo-countries', name: 'Geo Countries', shortName: 'GC', url: 'https://github.com/datasets/geo-countries', license: 'ODC PDDL', description: 'GeoJSON country boundary polygons derived from Natural Earth via the Datasets project (Open Knowledge Foundation)' });
const DS_OSINT_VESSELS = Object.freeze({ id: 'osint-vessels', name: 'Naval OSINT Reports', shortName: 'OSINT', url: 'https://nosi.org/', description: 'Curated naval positions from open-source intelligence — NOSI, defense press, and public ship-tracking services' });
const DS_AIS_FEEDS = Object.freeze({ id: 'ais-feeds', name: 'AISHub', shortName: 'AIS', url: 'https://www.aishub.net/', license: 'Reciprocal sharing', description: 'Community AIS data exchange — free real-time vessel positions via shared receiver network (69k+ vessels, 1.4k+ stations)' });
const DS_AIS_SAMPLE = Object.freeze({ id: 'ais-sample', name: 'AIS Sample Data', shortName: 'AIS', url: 'https://www.aishub.net/', description: 'Sample vessel positions based on AIS broadcasts — Automatic Identification System data from AISHub community network' });
const DS_DEEPSTATEMAP = Object.freeze({ id: 'deepstatemap', name: 'DeepStateMap', shortName: 'DS', url: 'https://deepstatemap.live/en', description: 'Independent OSINT project visualising the course of hostilities in Ukraine from open sources' });
const DS_NASA = Object.freeze({ id: 'nasa', name: 'NASA', shortName: 'NASA', url: 'https://www.nasa.gov/', license: 'Public Domain', description: 'National Aeronautics and Space Administration — US government space agency providing open access mission data and imagery' });
const DS_ESA = Object.freeze({ id: 'esa', name: 'European Space Agency', shortName: 'ESA', url: 'https://www.esa.int/', license: 'ESA Standard Licence', description: 'European Space Agency — intergovernmental organisation dedicated to the exploration of space' });
const DS_ROSCOSMOS = Object.freeze({ id: 'roscosmos', name: 'Roscosmos', shortName: 'ROSC', url: 'https://www.roscosmos.ru/', description: 'Russian federal space agency responsible for space science and orbital launch programs' });
const DS_CNSA = Object.freeze({ id: 'cnsa', name: 'CNSA', shortName: 'CNSA', url: 'https://www.cnsa.gov.cn/', description: 'China National Space Administration — responsible for the Chinese space program' });
const DS_ISRO = Object.freeze({ id: 'isro', name: 'ISRO', shortName: 'ISRO', url: 'https://www.isro.gov.in/', description: 'Indian Space Research Organisation — India\'s national space agency' });
const DS_JAXA = Object.freeze({ id: 'jaxa', name: 'JAXA', shortName: 'JAXA', url: 'https://www.jaxa.jp/', description: 'Japan Aerospace Exploration Agency — responsible for Japan\'s space program and aviation research' });

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
  MOON_LANDING_SITES: 'moon-landing-sites',
  MARS_LANDING_SITES: 'mars-landing-sites',
  EUROPA_WATER: 'europa-water',
  TITAN_LAKES: 'titan-lakes',
  WIREFRAME_EARTH: 'wireframe-earth',
  GRAYSCALE_EARTH: 'grayscale-earth',
  HANNIBAL_ROUTE: 'hannibal-route',
  INDIANA_JONES: 'indiana-jones-itinerary',
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
  {
    id: EXAMPLE_IDS.MOON_LANDING_SITES,
    label: '8) Moon Landing Sites',
    description: 'All historical Moon landing sites (Apollo, Luna, Chang\'e, Chandrayaan, SLIM) plus planned Artemis missions.',
  },
  {
    id: EXAMPLE_IDS.MARS_LANDING_SITES,
    label: '9) Mars Landing Sites',
    description: 'All Mars landing and impact sites: Viking, Spirit, Opportunity, Curiosity, Perseverance, Zhurong, and more.',
  },
  {
    id: EXAMPLE_IDS.EUROPA_WATER,
    label: '10) Europa Water/Ocean Features',
    description: 'Suspected water and ocean features on Jupiter\'s moon Europa — lineae, chaos terrain, and subsurface ocean indicators.',
  },
  {
    id: EXAMPLE_IDS.TITAN_LAKES,
    label: '11) Titan Methane Lakes',
    description: 'Known methane and ethane lakes and seas on Saturn\'s moon Titan: Kraken Mare, Ligeia Mare, Punga Mare, Ontario Lacus, and more.',
  },
  {
    id: EXAMPLE_IDS.WIREFRAME_EARTH,
    label: '12) Wireframe Earth',
    description: 'Earth showcase using the wireframe-shaded theme with capitals and continents.',
  },
  {
    id: EXAMPLE_IDS.GRAYSCALE_EARTH,
    label: '13) Grayscale Earth',
    description: 'Earth showcase using the grayscale-flat theme with continents.',
  },
  {
    id: EXAMPLE_IDS.HANNIBAL_ROUTE,
    label: '14) Hannibal\'s Route (218 BC)',
    description: 'Hannibal Barca\'s march from Carthage across Iberia, the Pyrenees, Gaul, and the Alps into Italy during the Second Punic War.',
  },
  {
    id: EXAMPLE_IDS.INDIANA_JONES,
    label: '15) Indiana Jones Itinerary',
    description: 'Flight routes from all five Indiana Jones films — animated red arcs across the globe, toggleable by movie.',
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

// BUG14: cache the raw GeoJSON so repeated example loads don't re-download
let _landmassCache = null;
let _landmassCachePromise = null;

async function loadLandmassRegions(fetchImpl, sourceId = '') {
  // Landmass polygons disabled — country borders already provide land outlines.
  return [];
  /* eslint-disable no-unreachable */
  if (!_landmassCache) {
    if (!_landmassCachePromise) {
      _landmassCachePromise = safeFetchJson(fetchImpl, NATURAL_EARTH_LAND_URL).then((raw) => {
        _landmassCache = raw;
        _landmassCachePromise = null;
        return raw;
      });
    }
    await _landmassCachePromise;
  }
  return normalizeLandmassRegions(_landmassCache, sourceId);
}

/** @internal — exposed for tests only */
export function _resetLandmassCache() {
  _landmassCache = null;
  _landmassCachePromise = null;
}

function normalizeIssMarker(current, fetchedAtMs) {
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
    velocityKmh: Number.isFinite(velocityKmh) ? velocityKmh : null,
    fetchedAtMs: fetchedAtMs ?? Date.now(),
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
  const nowMs = typeof options.nowMs === 'number' ? options.nowMs : Date.now();
  const nowUnixSeconds = Math.floor(nowMs / 1000);

  const [current, landmassRegions] = await Promise.all([
    safeFetchJson(fetchImpl, ISS_CURRENT_URL),
    loadLandmassRegions(fetchImpl, 'natural-earth'),
  ]);
  const marker = normalizeIssMarker(current, nowMs);
  if (!marker) {
    throw new Error('ISS API did not return a valid current position');
  }
  marker.sourceId = 'wheretheiss';
  const positions = await fetchIssPositions(fetchImpl, nowUnixSeconds);
  const historicalMarkers = normalizeIssHistoryMarkers(positions, nowUnixSeconds);

  // Build orbit waypoints with timestamps for client-side interpolation
  const orbitWaypoints = positions.map((entry) => ({
    lat: Number(entry.latitude),
    lon: Number(entry.longitude),
    alt: Math.max(0, Number(entry.altitude) / 6371),
    timestampMs: Number(entry.timestamp) * 1000,
  }));
  // Insert current position as a waypoint at fetch time
  orbitWaypoints.push({
    lat: marker.lat, lon: marker.lon, alt: marker.alt, timestampMs: nowMs,
  });
  orbitWaypoints.sort((a, b) => a.timestampMs - b.timestampMs);
  marker.orbitWaypoints = orbitWaypoints;

  // Build past trail path only (no static projected future line)
  const pastPoints = orbitWaypoints
    .filter((wp) => wp.timestampMs <= nowMs)
    .map((wp) => ({ lat: wp.lat, lon: wp.lon, alt: wp.alt }));

  const paths = [];
  if (pastPoints.length >= 2) {
    paths.push({
      id: 'iss-recent-orbit',
      name: toLocalizedText('ISS Recent Orbit'),
      points: pastPoints,
      color: '#f0e442',
      strokeWidth: 1.6,
      sourceId: 'wheretheiss',
    });
  }

  return {
    ...createEmptyScene(locale),
    theme: 'dark',
    planet: buildEarthExamplePlanet(),
    markers: [marker, ...historicalMarkers],
    paths,
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
    dataSources: [DS_GEO_COUNTRIES, DS_NATURAL_EARTH, DS_DEEPSTATEMAP],
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

// ── Moon Landing Sites ───────────────────────────────────────────────────────

const MOON_LANDINGS = Object.freeze([
  // Apollo program (crewed)
  { id: 'apollo-11', name: 'Apollo 11', lat: 0.6744, lon: 23.4731, date: '1969-07-20', agency: 'NASA', type: 'crewed', description: 'First crewed Moon landing — Neil Armstrong & Buzz Aldrin. Sea of Tranquility.' },
  { id: 'apollo-12', name: 'Apollo 12', lat: -3.0128, lon: -23.4219, date: '1969-11-19', agency: 'NASA', type: 'crewed', description: 'Oceanus Procellarum — precision landing near Surveyor 3.' },
  { id: 'apollo-14', name: 'Apollo 14', lat: -3.6453, lon: -17.4714, date: '1971-02-05', agency: 'NASA', type: 'crewed', description: 'Fra Mauro formation — Alan Shepard hit golf balls on the Moon.' },
  { id: 'apollo-15', name: 'Apollo 15', lat: 26.1322, lon: 3.6339, date: '1971-07-30', agency: 'NASA', type: 'crewed', description: 'Hadley-Apennine — first use of the Lunar Roving Vehicle.' },
  { id: 'apollo-16', name: 'Apollo 16', lat: -8.9734, lon: 15.5011, date: '1972-04-21', agency: 'NASA', type: 'crewed', description: 'Descartes Highlands — only landing in the lunar highlands.' },
  { id: 'apollo-17', name: 'Apollo 17', lat: 20.1911, lon: 30.7723, date: '1972-12-11', agency: 'NASA', type: 'crewed', description: 'Taurus-Littrow valley — last crewed Moon landing to date.' },
  // Luna program (robotic, Soviet)
  { id: 'luna-2', name: 'Luna 2', lat: 29.1, lon: 0.0, date: '1959-09-14', agency: 'Roscosmos', type: 'robotic', description: 'First spacecraft to reach the lunar surface (impact).' },
  { id: 'luna-9', name: 'Luna 9', lat: 7.13, lon: -64.37, date: '1966-02-03', agency: 'Roscosmos', type: 'robotic', description: 'First soft landing on the Moon — Oceanus Procellarum.' },
  { id: 'luna-16', name: 'Luna 16', lat: -0.68, lon: 56.30, date: '1970-09-20', agency: 'Roscosmos', type: 'robotic', description: 'First robotic sample return — Sea of Fertility.' },
  { id: 'luna-17', name: 'Luna 17', lat: 38.28, lon: -35.00, date: '1970-11-17', agency: 'Roscosmos', type: 'robotic', description: 'Delivered Lunokhod 1 rover to Sea of Rains.' },
  { id: 'luna-20', name: 'Luna 20', lat: 3.53, lon: 56.55, date: '1972-02-21', agency: 'Roscosmos', type: 'robotic', description: 'Sample return from Apollonius highlands.' },
  { id: 'luna-21', name: 'Luna 21', lat: 25.85, lon: 30.45, date: '1973-01-15', agency: 'Roscosmos', type: 'robotic', description: 'Delivered Lunokhod 2 rover to Le Monnier crater.' },
  { id: 'luna-24', name: 'Luna 24', lat: 12.75, lon: 62.20, date: '1976-08-18', agency: 'Roscosmos', type: 'robotic', description: 'Last Luna mission — sample return from Mare Crisium.' },
  // Chinese missions
  { id: 'change-3', name: 'Chang\'e 3', lat: 44.12, lon: -19.51, date: '2013-12-14', agency: 'CNSA', type: 'robotic', description: 'First Chinese lunar lander — Yutu rover deployed in Sinus Iridum.' },
  { id: 'change-4', name: 'Chang\'e 4', lat: -45.46, lon: 177.60, date: '2019-01-03', agency: 'CNSA', type: 'robotic', description: 'First landing on the lunar far side — Von Karman crater.' },
  { id: 'change-5', name: 'Chang\'e 5', lat: 43.06, lon: -51.92, date: '2020-12-01', agency: 'CNSA', type: 'robotic', description: 'Sample return mission — Mons Rumker, Oceanus Procellarum.' },
  { id: 'change-6', name: 'Chang\'e 6', lat: -41.64, lon: -153.99, date: '2024-06-02', agency: 'CNSA', type: 'robotic', description: 'First sample return from the lunar far side — Apollo basin.' },
  // Indian mission
  { id: 'chandrayaan-3', name: 'Chandrayaan-3', lat: -69.37, lon: 32.35, date: '2023-08-23', agency: 'ISRO', type: 'robotic', description: 'India\'s first successful lunar landing — near the south pole.' },
  // Japanese mission
  { id: 'slim', name: 'SLIM', lat: -13.32, lon: 25.25, date: '2024-01-19', agency: 'JAXA', type: 'robotic', description: 'Smart Lander for Investigating Moon — precision landing in Shioli crater.' },
  // Planned
  { id: 'artemis-iii', name: 'Artemis III (Planned)', lat: -89.0, lon: 0.0, date: 'TBD', agency: 'NASA', type: 'planned', description: 'First crewed Artemis landing — targeting the lunar south pole region.' },
  { id: 'artemis-iv', name: 'Artemis IV (Planned)', lat: -89.5, lon: 45.0, date: 'TBD', agency: 'NASA', type: 'planned', description: 'Planned crewed mission to the lunar south pole with Gateway station support.' },
]);

export async function loadMoonLandingSitesExample(options = {}) {
  const locale = options.locale ?? 'en';

  const markers = MOON_LANDINGS.map((site) => {
    const dateTag = site.date !== 'TBD' ? ` (${site.date})` : ' (Planned)';
    return {
      id: `moon-${site.id}`,
      name: toLocalizedText(`${site.name}${dateTag}`),
      description: toLocalizedText(`${site.description} Agency: ${site.agency}. Type: ${site.type}.`),
      lat: site.lat,
      lon: site.lon,
      alt: 0,
      visualType: 'dot',
      category: site.type,
      color: site.type === 'crewed' ? '#f5d547' : site.type === 'planned' ? '#67c5db' : '#c0c0c0',
      sourceId: site.agency.toLowerCase(),
    };
  });

  return {
    ...createEmptyScene(locale),
    theme: 'dark',
    planet: { id: 'moon' },
    markers,
    paths: [],
    arcs: [],
    regions: [],
    animations: [],
    camera: { lat: 0.6744, lon: 23.4731 },
    filters: [
      {
        id: 'mission-type',
        label: 'Mission Type',
        options: [
          { value: 'all', label: 'All Missions', categories: [] },
          { value: 'crewed', label: 'Crewed', categories: ['crewed'] },
          { value: 'robotic', label: 'Robotic', categories: ['robotic'] },
          { value: 'planned', label: 'Planned', categories: ['planned'] },
        ],
      },
    ],
    dataSources: [DS_NASA, DS_ROSCOSMOS, DS_CNSA, DS_ISRO, DS_JAXA],
  };
}

// ── Mars Landing Sites ───────────────────────────────────────────────────────

const MARS_LANDINGS = Object.freeze([
  // Successful landers and rovers
  { id: 'viking-1', name: 'Viking 1', lat: 22.27, lon: -47.97, date: '1976-07-20', agency: 'NASA', type: 'lander', description: 'First successful Mars lander — Chryse Planitia. Operated for over 6 years.' },
  { id: 'viking-2', name: 'Viking 2', lat: 47.97, lon: 134.26, date: '1976-09-03', agency: 'NASA', type: 'lander', description: 'Utopia Planitia lander — operated for ~3.5 years.' },
  { id: 'pathfinder', name: 'Mars Pathfinder / Sojourner', lat: 19.13, lon: -33.22, date: '1997-07-04', agency: 'NASA', type: 'rover', description: 'First Mars rover (Sojourner) — Ares Vallis. Proved airbag landing concept.' },
  { id: 'spirit', name: 'Spirit (MER-A)', lat: -14.57, lon: 175.47, date: '2004-01-04', agency: 'NASA', type: 'rover', description: 'Gusev Crater — operated 6+ years instead of planned 90 days.' },
  { id: 'opportunity', name: 'Opportunity (MER-B)', lat: -1.95, lon: -5.53, date: '2004-01-25', agency: 'NASA', type: 'rover', description: 'Meridiani Planum — operated 15 years, drove 45 km. Dust storm ended mission in 2018.' },
  { id: 'phoenix', name: 'Phoenix', lat: 68.22, lon: -125.75, date: '2008-05-25', agency: 'NASA', type: 'lander', description: 'Vastitas Borealis (arctic plains) — confirmed water ice in Martian soil.' },
  { id: 'curiosity', name: 'Curiosity (MSL)', lat: -4.59, lon: 137.44, date: '2012-08-06', agency: 'NASA', type: 'rover', description: 'Gale Crater — still active. Discovered ancient lake bed evidence.' },
  { id: 'insight', name: 'InSight', lat: 4.50, lon: 135.62, date: '2018-11-26', agency: 'NASA', type: 'lander', description: 'Elysium Planitia — seismometer detected marsquakes. Mission ended Dec 2022.' },
  { id: 'perseverance', name: 'Perseverance', lat: 18.44, lon: 77.45, date: '2021-02-18', agency: 'NASA', type: 'rover', description: 'Jezero Crater — active. Includes Ingenuity helicopter; caching samples for return.' },
  { id: 'zhurong', name: 'Zhurong (Tianwen-1)', lat: 25.07, lon: 109.93, date: '2021-05-14', agency: 'CNSA', type: 'rover', description: 'Utopia Planitia — China\'s first Mars rover. Entered hibernation May 2022.' },
  // Failed / crash-landed
  { id: 'mars-3', name: 'Mars 3', lat: -45.0, lon: -158.0, date: '1971-12-02', agency: 'Roscosmos', type: 'failed', description: 'First soft landing on Mars — signal lost after ~15 seconds. Ptolemaeus Crater.' },
  { id: 'beagle-2', name: 'Beagle 2', lat: 11.53, lon: 90.43, date: '2003-12-25', agency: 'ESA', type: 'failed', description: 'Isidis Planitia — landed but solar panels failed to fully deploy. Found in 2015 imagery.' },
  { id: 'schiaparelli', name: 'Schiaparelli (EDM)', lat: -2.05, lon: -6.21, date: '2016-10-19', agency: 'ESA', type: 'failed', description: 'Meridiani Planum — premature parachute release caused crash from 3.7 km altitude.' },
]);

export async function loadMarsLandingSitesExample(options = {}) {
  const locale = options.locale ?? 'en';

  const markers = MARS_LANDINGS.map((site) => ({
    id: `mars-${site.id}`,
    name: toLocalizedText(`${site.name} (${site.date})`),
    description: toLocalizedText(`${site.description} Agency: ${site.agency}. Type: ${site.type}.`),
    lat: site.lat,
    lon: site.lon,
    alt: 0,
    visualType: 'dot',
    category: site.type,
    color: site.type === 'rover' ? '#4caf50' : site.type === 'lander' ? '#2196f3' : '#f44336',
    sourceId: site.agency.toLowerCase(),
  }));

  return {
    ...createEmptyScene(locale),
    theme: 'dark',
    planet: { id: 'mars' },
    markers,
    paths: [],
    arcs: [],
    regions: [],
    animations: [],
    camera: { lat: -4.59, lon: 137.44 },
    filters: [
      {
        id: 'mission-type',
        label: 'Mission Type',
        options: [
          { value: 'all', label: 'All Missions', categories: [] },
          { value: 'rover', label: 'Rovers', categories: ['rover'] },
          { value: 'lander', label: 'Landers', categories: ['lander'] },
          { value: 'failed', label: 'Failed / Crash-Landed', categories: ['failed'] },
        ],
      },
    ],
    dataSources: [DS_NASA, DS_ESA, DS_ROSCOSMOS, DS_CNSA],
  };
}

// ── Europa Water/Ocean Features ──────────────────────────────────────────────

const EUROPA_FEATURES = Object.freeze([
  // Lineae (linear crack features indicating tidal flexing and subsurface ocean)
  { id: 'conamara-chaos', name: 'Conamara Chaos', lat: -9.0, lon: 87.0, type: 'chaos', description: 'Disrupted ice terrain — broken ice blocks refrozen in new orientations, indicating liquid water below the surface.' },
  { id: 'thera-macula', name: 'Thera Macula', lat: -47.0, lon: -180.0, type: 'chaos', description: 'Large dark region of chaos terrain — possible site of a subsurface lake relatively close to the surface.' },
  { id: 'murias-chaos', name: 'Murias Chaos', lat: -22.0, lon: -83.0, type: 'chaos', description: 'Disrupted terrain region showing evidence of upwelling from a subsurface ocean.' },
  { id: 'arran-chaos', name: 'Arran Chaos', lat: -26.0, lon: -170.0, type: 'chaos', description: 'Region of broken and rotated ice blocks in the southern hemisphere.' },
  // Lineae
  { id: 'cadmus-linea', name: 'Cadmus Linea', lat: -25.0, lon: -170.0, type: 'linea', description: 'Prominent double-ridge fracture — likely formed by tidal stress from Jupiter\'s gravitational pull.' },
  { id: 'minos-linea', name: 'Minos Linea', lat: -45.0, lon: 162.0, type: 'linea', description: 'Long double-ridge feature crossing the southern hemisphere — evidence of cyclical tidal cracking.' },
  { id: 'astypalaea-linea', name: 'Astypalaea Linea', lat: -75.0, lon: 165.0, type: 'linea', description: 'Strike-slip fault near the south pole — displaced surface features indicate lateral plate motion.' },
  { id: 'agave-linea', name: 'Agave Linea', lat: -42.0, lon: 160.0, type: 'linea', description: 'Dark band feature suggesting material welling up from below the ice shell.' },
  { id: 'libya-linea', name: 'Libya Linea', lat: -56.0, lon: 177.0, type: 'linea', description: 'Large-scale double ridge in the southern hemisphere.' },
  // Key geological indicators
  { id: 'pwyll-crater', name: 'Pwyll Crater', lat: -25.0, lon: 89.0, type: 'crater', description: 'Young impact crater (diameter ~26 km) — bright rays indicate fresh ice excavated from below the surface.' },
  { id: 'tyre-impact', name: 'Tyre Multi-Ring', lat: 34.0, lon: -144.0, type: 'crater', description: 'Multi-ring impact structure — concentric fracture pattern suggests a liquid or slushy layer absorbed the impact energy.' },
  // Plume sites
  { id: 'plume-south-1', name: 'South Polar Plume Region', lat: -65.0, lon: 177.0, type: 'plume', description: 'Region where Hubble Space Telescope detected possible water vapor plumes erupting ~200 km above the surface (2012, 2014 observations).' },
  { id: 'plume-equator-1', name: 'Equatorial Thermal Anomaly', lat: 0.0, lon: 150.0, type: 'plume', description: 'Thermal anomaly detected by Galileo spacecraft — possible localized warming from subsurface ocean interaction.' },
]);

export async function loadEuropaWaterExample(options = {}) {
  const locale = options.locale ?? 'en';

  const markers = EUROPA_FEATURES.map((feature) => {
    const colorMap = { chaos: '#e06040', linea: '#6090d0', crater: '#c0c0c0', plume: '#40c0f0' };
    return {
      id: `europa-${feature.id}`,
      name: toLocalizedText(feature.name),
      description: toLocalizedText(`${feature.description} Feature type: ${feature.type}.`),
      lat: feature.lat,
      lon: feature.lon,
      alt: 0,
      visualType: 'dot',
      category: feature.type,
      color: colorMap[feature.type] ?? '#ffffff',
      sourceId: 'nasa',
    };
  });

  return {
    ...createEmptyScene(locale),
    theme: 'dark',
    planet: { id: 'europa' },
    markers,
    paths: [],
    arcs: [],
    regions: [],
    animations: [],
    camera: { lat: -9.0, lon: 87.0 },
    filters: [
      {
        id: 'feature-type',
        label: 'Feature Type',
        options: [
          { value: 'all', label: 'All Features', categories: [] },
          { value: 'chaos', label: 'Chaos Terrain', categories: ['chaos'] },
          { value: 'linea', label: 'Lineae', categories: ['linea'] },
          { value: 'crater', label: 'Craters', categories: ['crater'] },
          { value: 'plume', label: 'Plume Sites', categories: ['plume'] },
        ],
      },
    ],
    dataSources: [DS_NASA, DS_ESA],
  };
}

// ── Titan Methane Lakes ──────────────────────────────────────────────────────

const TITAN_LAKES = Object.freeze([
  // Major seas (maria)
  { id: 'kraken-mare', name: 'Kraken Mare', lat: 68.0, lon: 50.0, type: 'sea', description: 'Largest known body of liquid on Titan — ~400,000 km² of methane/ethane. Larger than the Caspian Sea.' },
  { id: 'ligeia-mare', name: 'Ligeia Mare', lat: 79.0, lon: 110.0, type: 'sea', description: 'Second largest Titan sea — ~126,000 km². Radar shows nearly pure methane composition.' },
  { id: 'punga-mare', name: 'Punga Mare', lat: 85.1, lon: 20.0, type: 'sea', description: 'Third largest sea on Titan — located near the north pole.' },
  // Large lakes
  { id: 'ontario-lacus', name: 'Ontario Lacus', lat: -72.0, lon: 177.0, type: 'lake', description: 'Largest confirmed lake in the southern hemisphere — roughly the size of Lake Ontario on Earth.' },
  { id: 'jingpo-lacus', name: 'Jingpo Lacus', lat: 73.0, lon: 24.0, type: 'lake', description: 'Large lake near the north pole — roughly 30,000 km².' },
  { id: 'bolsena-lacus', name: 'Bolsena Lacus', lat: 75.7, lon: -10.0, type: 'lake', description: 'Northern lake identified by Cassini radar.' },
  { id: 'mackay-lacus', name: 'Mackay Lacus', lat: 78.3, lon: -97.0, type: 'lake', description: 'Northern lake discovered by Cassini VIMS.' },
  { id: 'sparrow-lacus', name: 'Sparrow Lacus', lat: 84.3, lon: -64.0, type: 'lake', description: 'Small lake near Titan\'s north pole.' },
  // Notable features
  { id: 'vid-flumina', name: 'Vid Flumina', lat: 75.0, lon: 100.0, type: 'channel', description: 'River network flowing into Ligeia Mare — over 400 km long, carved by liquid methane.' },
  { id: 'huygens-site', name: 'Huygens Landing Site', lat: -10.6, lon: -167.7, type: 'landing', description: 'Cassini-Huygens probe landing site (Jan 14, 2005) — first landing in the outer Solar System.' },
]);

export async function loadTitanLakesExample(options = {}) {
  const locale = options.locale ?? 'en';

  const markers = TITAN_LAKES.map((feature) => {
    const colorMap = { sea: '#1a5276', lake: '#2e86c1', channel: '#48c9b0', landing: '#f5d547' };
    return {
      id: `titan-${feature.id}`,
      name: toLocalizedText(feature.name),
      description: toLocalizedText(`${feature.description} Feature type: ${feature.type}.`),
      lat: feature.lat,
      lon: feature.lon,
      alt: 0,
      visualType: 'dot',
      category: feature.type,
      color: colorMap[feature.type] ?? '#ffffff',
      sourceId: feature.type === 'landing' ? 'esa' : 'nasa',
    };
  });

  return {
    ...createEmptyScene(locale),
    theme: 'dark',
    planet: { id: 'titan' },
    markers,
    paths: [],
    arcs: [],
    regions: [],
    animations: [],
    camera: { lat: 68.0, lon: 50.0 },
    filters: [
      {
        id: 'feature-type',
        label: 'Feature Type',
        options: [
          { value: 'all', label: 'All Features', categories: [] },
          { value: 'sea', label: 'Seas (Maria)', categories: ['sea'] },
          { value: 'lake', label: 'Lakes (Lacus)', categories: ['lake'] },
          { value: 'channel', label: 'Channels (Flumina)', categories: ['channel'] },
          { value: 'landing', label: 'Landing Sites', categories: ['landing'] },
        ],
      },
    ],
    dataSources: [DS_NASA, DS_ESA],
  };
}

// ── Wireframe Earth ──────────────────────────────────────────────────────────

export async function loadWireframeEarthExample(options = {}) {
  const scene = await loadAllCapitalsExample(options);
  return {
    ...scene,
    theme: 'wireframe-shaded',
  };
}

// ── Hannibal's Route (218 BC) ────────────────────────────────────────────────

const DS_HANNIBAL = Object.freeze({
  id: 'hannibal-route',
  name: 'Historical Atlas — Hannibal\'s Campaign',
  shortName: 'Hist',
  url: 'https://en.wikipedia.org/wiki/Hannibal%27s_crossing_of_the_Alps',
  description: 'Reconstructed route of Hannibal Barca\'s march from Carthage to Italy (218 BC) based on classical sources (Polybius, Livy)',
});

const HANNIBAL_WAYPOINTS = Object.freeze([
  { id: 'hb-carthage',       name: 'Carthage',            lat: 36.8528, lon: 10.3233, desc: 'Capital of the Carthaginian Empire — Hannibal\'s homeland and starting point of the campaign.' },
  { id: 'hb-carthago-nova',  name: 'Carthago Nova',       lat: 37.5985, lon: -0.9816, desc: 'Modern Cartagena — Carthaginian base in Iberia where the army mustered in spring 218 BC.' },
  { id: 'hb-saguntum',       name: 'Saguntum',            lat: 39.6800, lon: -0.2767, desc: 'Roman-allied city besieged and taken by Hannibal in 219 BC, triggering the Second Punic War.' },
  { id: 'hb-ebro',           name: 'Ebro River Crossing',  lat: 40.7200, lon:  0.8700, desc: 'Crossing the Ebro — the treaty boundary with Rome — marked the point of no return.' },
  { id: 'hb-pyrenees',       name: 'Pyrenees Pass',       lat: 42.4500, lon:  1.5500, desc: 'The army crossed the Pyrenees through the eastern passes into Gaul, losing some Iberian troops to desertion.' },
  { id: 'hb-narbonne',       name: 'Narbo (Narbonne)',    lat: 43.1845, lon:  3.0035, desc: 'Key stop in southern Gaul. Hannibal negotiated safe passage through local Celtic tribes.' },
  { id: 'hb-rhone',          name: 'Rhône Crossing',       lat: 43.8400, lon:  4.3600, desc: 'Major river crossing near modern Avignon. Elephants were ferried across on large rafts.' },
  { id: 'hb-alps-approach',  name: 'Alps Approach',       lat: 44.9200, lon:  5.7200, desc: 'Ascending the Drôme valley toward the high Alpine passes. Hostile mountain tribes harassed the column.' },
  { id: 'hb-alps-pass',      name: 'Alpine Pass',         lat: 45.0600, lon:  6.5900, desc: 'Most likely the Col de la Traversette or Col du Clapier — the highest and most perilous segment of the march.' },
  { id: 'hb-turin',          name: 'Taurini (Turin)',      lat: 45.0703, lon:  7.6869, desc: 'First major settlement in the Po Valley. Hannibal stormed the Taurini town to supply his exhausted troops.' },
  { id: 'hb-trebia',         name: 'Battle of the Trebia', lat: 44.9600, lon:  9.6000, desc: 'December 218 BC — first major pitched battle in Italy. Hannibal ambushed and routed the Roman legions.' },
  { id: 'hb-trasimene',      name: 'Lake Trasimene',      lat: 43.1000, lon: 12.1000, desc: 'June 217 BC — Hannibal\'s ambush at the lake destroyed a Roman army; the largest ambush in military history.' },
  { id: 'hb-cannae',         name: 'Battle of Cannae',    lat: 41.3053, lon: 16.1325, desc: 'August 216 BC — Hannibal\'s double envelopment annihilated eight Roman legions. Considered the perfect tactical battle.' },
]);

export async function loadHannibalRouteExample(options = {}) {
  const locale = options.locale ?? 'en';

  const markers = HANNIBAL_WAYPOINTS.map((wp, i) => ({
    id: wp.id,
    name: toLocalizedText(wp.name),
    description: toLocalizedText(wp.desc),
    lat: wp.lat,
    lon: wp.lon,
    alt: 0,
    category: i === 0 ? 'origin' : i === HANNIBAL_WAYPOINTS.length - 1 ? 'battle' : 'waypoint',
    sourceId: 'hannibal-route',
  }));

  const pathPoints = HANNIBAL_WAYPOINTS.map((wp) => ({
    lat: wp.lat,
    lon: wp.lon,
    alt: 0,
  }));

  return {
    ...createEmptyScene(locale),
    theme: 'grayscale-shaded',
    planet: buildEarthExamplePlanet(),
    markers,
    paths: [
      {
        id: 'hannibal-march',
        name: toLocalizedText('Hannibal\'s March (218 BC)'),
        points: pathPoints,
        color: '#8b0000',
        strokeWidth: 2,
        sourceId: 'hannibal-route',
      },
    ],
    arcs: [],
    regions: [],
    animations: [],
    camera: { lat: 42.0, lon: 5.0 },
    dataSources: [DS_HANNIBAL],
  };
}

// ── Indiana Jones Itinerary ───────────────────────────────────────────────────

const DS_INDIANA_JONES = Object.freeze({
  id: 'indiana-jones',
  name: 'Indiana Jones Film Series',
  shortName: 'Indy',
  url: 'https://en.wikipedia.org/wiki/Indiana_Jones',
  description: 'Flight itineraries reconstructed from the Indiana Jones film series (1981–2023)',
});

const INDY_MOVIES = Object.freeze([
  {
    key: 'raiders',
    label: 'Raiders of the Lost Ark',
    year: 1981,
    category: 'indy-raiders',
    cities: [
      { id: 'marshall-college', name: 'Marshall College, CT', lat: 41.31, lon: -72.92 },
      { id: 'nepal',            name: 'Nepal',                lat: 27.70, lon: 85.32 },
      { id: 'cairo',            name: 'Cairo',                lat: 30.04, lon: 31.24 },
      { id: 'tanis',            name: 'Tanis',                lat: 30.97, lon: 32.05 },
      { id: 'washington-dc',    name: 'Washington D.C.',      lat: 38.91, lon: -77.04 },
    ],
  },
  {
    key: 'temple',
    label: 'Temple of Doom',
    year: 1984,
    category: 'indy-temple',
    cities: [
      { id: 'shanghai',      name: 'Shanghai',       lat: 31.23, lon: 121.47 },
      { id: 'nang-tao',      name: 'Nang Tao',       lat: 28.60, lon: 83.93 },
      { id: 'pankot-palace', name: 'Pankot Palace',   lat: 24.80, lon: 80.95 },
    ],
  },
  {
    key: 'crusade',
    label: 'The Last Crusade',
    year: 1989,
    category: 'indy-crusade',
    cities: [
      { id: 'utah',        name: 'Utah',         lat: 38.73, lon: -109.59 },
      { id: 'venice',      name: 'Venice',        lat: 45.44, lon: 12.34 },
      { id: 'salzburg',    name: 'Salzburg',      lat: 47.80, lon: 13.04 },
      { id: 'berlin',      name: 'Berlin',        lat: 52.52, lon: 13.41 },
      { id: 'iskenderun',  name: 'Iskenderun',    lat: 36.59, lon: 36.17 },
    ],
  },
  {
    key: 'crystal',
    label: 'Kingdom of the Crystal Skull',
    year: 2008,
    category: 'indy-crystal',
    cities: [
      { id: 'nevada',    name: 'Nevada',       lat: 37.24, lon: -115.81 },
      { id: 'new-haven', name: 'New Haven, CT', lat: 41.31, lon: -72.92 },
      { id: 'nazca',     name: 'Nazca, Peru',   lat: -14.74, lon: -75.13 },
      { id: 'akator',    name: 'Akator',        lat: -3.47, lon: -62.21 },
    ],
  },
  {
    key: 'dial',
    label: 'Dial of Destiny',
    year: 2023,
    category: 'indy-dial',
    cities: [
      { id: 'new-york',       name: 'New York City',  lat: 40.71, lon: -74.01 },
      { id: 'tangier',        name: 'Tangier',         lat: 35.76, lon: -5.83 },
      { id: 'sicily',         name: 'Sicily',          lat: 37.08, lon: 15.29 },
      { id: 'athens',         name: 'Athens',          lat: 37.97, lon: 23.73 },
      { id: 'syracuse-ancient', name: 'Syracuse',      lat: 37.08, lon: 15.29 },
    ],
  },
]);

export async function loadIndianaJonesItinerary(options = {}) {
  const locale = options.locale ?? 'en';

  const markers = [];
  const arcs = [];
  const seenIds = new Set();
  const ARC_DURATION = 2000; // ms per arc segment
  let arcIndex = 0;

  for (const movie of INDY_MOVIES) {
    for (let i = 0; i < movie.cities.length; i++) {
      const city = movie.cities[i];
      const markerId = `indy-${movie.key}-${city.id}`;
      if (!seenIds.has(markerId)) {
        seenIds.add(markerId);
        markers.push({
          id: markerId,
          name: toLocalizedText(city.name),
          description: toLocalizedText(`${movie.label} (${movie.year})`),
          lat: city.lat,
          lon: city.lon,
          alt: 0,
          visualType: 'dot',
          category: movie.category,
          color: '#cc0000',
          calloutMode: 'always',
          sourceId: 'indiana-jones',
        });
      }

      if (i < movie.cities.length - 1) {
        const from = city;
        const to = movie.cities[i + 1];
        arcs.push({
          id: `indy-${movie.key}-leg-${i}`,
          name: toLocalizedText(`${from.name} → ${to.name}`),
          start: { lat: from.lat, lon: from.lon, alt: 0 },
          end: { lat: to.lat, lon: to.lon, alt: 0 },
          maxAltitude: 0.15,
          color: '#cc0000',
          strokeWidth: 4,
          animationTime: ARC_DURATION,
          animationDelay: arcIndex * ARC_DURATION,
          category: movie.category,
          sourceId: 'indiana-jones',
        });
        arcIndex++;
      }
    }
  }

  return {
    ...createEmptyScene(locale),
    projection: 'equirectangular',
    theme: 'satellite',
    planet: buildEarthExamplePlanet(),
    markers,
    paths: [],
    arcs,
    regions: [],
    animations: [],
    camera: { lat: 30.0, lon: 20.0 },
    filters: [
      {
        id: 'movie',
        label: 'Movie',
        options: [
          { value: 'all', label: 'All Movies', categories: [] },
          { value: 'raiders', label: 'Raiders of the Lost Ark', categories: ['indy-raiders'] },
          { value: 'temple', label: 'Temple of Doom', categories: ['indy-temple'] },
          { value: 'crusade', label: 'The Last Crusade', categories: ['indy-crusade'] },
          { value: 'crystal', label: 'Kingdom of the Crystal Skull', categories: ['indy-crystal'] },
          { value: 'dial', label: 'Dial of Destiny', categories: ['indy-dial'] },
        ],
      },
    ],
    dataSources: [DS_INDIANA_JONES],
  };
}

// ── Grayscale Earth ──────────────────────────────────────────────────────────

export async function loadGrayscaleEarthExample(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? 'en';
  const scene = await loadContinentsAndSeasExample({ fetchImpl, locale });
  return {
    ...scene,
    theme: 'grayscale-flat',
  };
}

export async function loadExampleScene(id, options = {}) {
  let scene;
  if (id === EXAMPLE_IDS.NONE) {
    const locale = options.locale ?? 'en';
    scene = createEmptyScene(locale);
  } else if (id === EXAMPLE_IDS.ALL_CAPITALS) {
    scene = await loadAllCapitalsExample(options);
  } else if (id === EXAMPLE_IDS.CONTINENTS_AND_SEAS) {
    scene = await loadContinentsAndSeasExample(options);
  } else if (id === EXAMPLE_IDS.ISS_REALTIME) {
    scene = await loadIssRealtimeExample(options);
  } else if (id === EXAMPLE_IDS.UKRAINE_CONFLICT) {
    scene = await loadUkraineConflictOpenSourceExample(options);
  } else if (id === EXAMPLE_IDS.CARRIERS_TRACKING) {
    scene = await loadCarriersOpenSourceExample(options);
  } else if (id === EXAMPLE_IDS.VESSEL_TRACKING) {
    scene = await loadVesselTrackingExample(options);
  } else if (id === EXAMPLE_IDS.CIVIL_SHIPPING) {
    scene = await loadCivilShippingExample(options);
  } else if (id === EXAMPLE_IDS.MOON_LANDING_SITES) {
    scene = await loadMoonLandingSitesExample(options);
  } else if (id === EXAMPLE_IDS.MARS_LANDING_SITES) {
    scene = await loadMarsLandingSitesExample(options);
  } else if (id === EXAMPLE_IDS.EUROPA_WATER) {
    scene = await loadEuropaWaterExample(options);
  } else if (id === EXAMPLE_IDS.TITAN_LAKES) {
    scene = await loadTitanLakesExample(options);
  } else if (id === EXAMPLE_IDS.WIREFRAME_EARTH) {
    scene = await loadWireframeEarthExample(options);
  } else if (id === EXAMPLE_IDS.GRAYSCALE_EARTH) {
    scene = await loadGrayscaleEarthExample(options);
  } else if (id === EXAMPLE_IDS.HANNIBAL_ROUTE) {
    scene = await loadHannibalRouteExample(options);
  } else if (id === EXAMPLE_IDS.INDIANA_JONES) {
    scene = await loadIndianaJonesItinerary(options);
  } else {
    throw new Error(`Unknown example id: ${id}`);
  }
  return { ...scene, viewerUi: { ...scene.viewerUi, showThemeToggle: true } };
}
