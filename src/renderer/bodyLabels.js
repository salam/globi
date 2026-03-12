/**
 * Body-specific geographic/geological labels for each celestial body.
 * Each entry has: text, lat, lon, heading (degrees), style ('feature' or 'region').
 *
 * Coordinates are planetocentric latitude/longitude.
 */

const BODY_LABELS = {
  earth: [
    { text: 'AFRICA',        lat: 0,   lon: 22,   heading: 0,   style: 'region' },
    { text: 'ASIA',          lat: 45,  lon: 90,   heading: 0,   style: 'region' },
    { text: 'EUROPE',        lat: 52,  lon: 15,   heading: 0,   style: 'region' },
    { text: 'NORTH AMERICA', lat: 45,  lon: -100, heading: 0,   style: 'region' },
    { text: 'SOUTH AMERICA', lat: -15, lon: -58,  heading: -20, style: 'region' },
    { text: 'OCEANIA',       lat: -25, lon: 135,  heading: 0,   style: 'region' },
    { text: 'ANTARCTICA',    lat: -82, lon: 0,    heading: 0,   style: 'region' },
    { text: 'Pacific Ocean',  lat: 0,   lon: -160, heading: -10, style: 'ocean' },
    { text: 'Atlantic Ocean', lat: 15,  lon: -35,  heading: -60, style: 'ocean' },
    { text: 'Indian Ocean',   lat: -20, lon: 75,   heading: -30, style: 'ocean' },
    { text: 'Arctic Ocean',   lat: 80,  lon: 0,    heading: 0,   style: 'ocean' },
    { text: 'Southern Ocean',  lat: -65, lon: 0,    heading: 0,   style: 'ocean' },
  ],

  mercury: [
    { text: 'Caloris Basin',     lat: 30,  lon: -165, heading: 0,  style: 'feature' },
    { text: 'Rachmaninoff',      lat: 28,  lon: 58,   heading: 0,  style: 'feature' },
    { text: 'Rembrandt Basin',   lat: -33, lon: 88,   heading: 0,  style: 'feature' },
    { text: 'Beethoven',         lat: -20, lon: -124, heading: 0,  style: 'feature' },
    { text: 'Tolstoj',           lat: -16, lon: -164, heading: 0,  style: 'feature' },
    { text: 'Degas',             lat: 37,  lon: -127, heading: 0,  style: 'feature' },
    { text: 'Kuiper',            lat: -11, lon: -31,  heading: 0,  style: 'feature' },
    { text: 'Northern Plains',   lat: 70,  lon: 0,    heading: 0,  style: 'region' },
  ],

  venus: [
    { text: 'Aphrodite Terra',  lat: -6,  lon: 105,  heading: 0,  style: 'region' },
    { text: 'Ishtar Terra',     lat: 68,  lon: 5,    heading: 0,  style: 'region' },
    { text: 'Maxwell Montes',   lat: 65,  lon: 3,    heading: 0,  style: 'feature' },
    { text: 'Maat Mons',        lat: 1,   lon: -165, heading: 0,  style: 'feature' },
    { text: 'Lakshmi Planum',   lat: 69,  lon: -20,  heading: 0,  style: 'feature' },
    { text: 'Artemis Corona',   lat: -35, lon: 135,  heading: 0,  style: 'feature' },
    { text: 'Beta Regio',       lat: 25,  lon: -77,  heading: 0,  style: 'region' },
    { text: 'Alpha Regio',      lat: -25, lon: -4,   heading: 0,  style: 'region' },
  ],

  mars: [
    { text: 'Olympus Mons',     lat: 18,  lon: -134, heading: 0,  style: 'feature' },
    { text: 'Valles Marineris',  lat: -14, lon: -70,  heading: -5, style: 'feature' },
    { text: 'Hellas Planitia',   lat: -42, lon: 70,   heading: 0,  style: 'region' },
    { text: 'Tharsis Bulge',     lat: 0,   lon: -112, heading: 0,  style: 'region' },
    { text: 'Elysium Mons',     lat: 25,  lon: 147,  heading: 0,  style: 'feature' },
    { text: 'Syrtis Major',     lat: 8,   lon: 70,   heading: 0,  style: 'region' },
    { text: 'Acidalia Planitia', lat: 47,  lon: -30,  heading: 0,  style: 'region' },
    { text: 'Utopia Planitia',   lat: 50,  lon: 110,  heading: 0,  style: 'region' },
    { text: 'Argyre Basin',     lat: -50, lon: -43,  heading: 0,  style: 'feature' },
    { text: 'Polar Ice Cap',    lat: 85,  lon: 0,    heading: 0,  style: 'feature' },
  ],

  jupiter: [
    { text: 'Great Red Spot',   lat: -23, lon: -10,  heading: 0,  style: 'feature' },
    { text: 'North Equatorial Belt', lat: 17,  lon: 0,    heading: 0,  style: 'region' },
    { text: 'South Equatorial Belt', lat: -17, lon: 0,    heading: 0,  style: 'region' },
    { text: 'North Polar Region',    lat: 70,  lon: 0,    heading: 0,  style: 'region' },
    { text: 'South Polar Region',    lat: -70, lon: 0,    heading: 0,  style: 'region' },
    { text: 'Equatorial Zone',       lat: 0,   lon: 90,   heading: 0,  style: 'region' },
    { text: 'Oval BA',          lat: -33, lon: 50,   heading: 0,  style: 'feature' },
  ],

  saturn: [
    { text: 'North Polar Hexagon', lat: 78,  lon: 0,    heading: 0,  style: 'feature' },
    { text: 'Storm Alley',         lat: -35, lon: 0,    heading: 0,  style: 'region' },
    { text: 'Equatorial Band',     lat: 0,   lon: 90,   heading: 0,  style: 'region' },
    { text: 'North Temperate Belt', lat: 40,  lon: -90,  heading: 0,  style: 'region' },
    { text: 'South Polar Vortex',  lat: -85, lon: 0,    heading: 0,  style: 'feature' },
  ],

  uranus: [
    { text: 'North Polar Region', lat: 80,  lon: 0,    heading: 0,  style: 'region' },
    { text: 'South Polar Region', lat: -80, lon: 0,    heading: 0,  style: 'region' },
    { text: 'Equatorial Band',    lat: 0,   lon: 90,   heading: 0,  style: 'region' },
    { text: 'Dark Spot',          lat: -30, lon: -45,  heading: 0,  style: 'feature' },
  ],

  neptune: [
    { text: 'Great Dark Spot',   lat: -20, lon: -30,  heading: 0,  style: 'feature' },
    { text: 'Small Dark Spot',   lat: -55, lon: 30,   heading: 0,  style: 'feature' },
    { text: 'Scooter',           lat: -42, lon: 60,   heading: 0,  style: 'feature' },
    { text: 'South Polar Region', lat: -80, lon: 0,    heading: 0,  style: 'region' },
    { text: 'Equatorial Band',    lat: 0,   lon: 90,   heading: 0,  style: 'region' },
  ],

  moon: [
    { text: 'Sea of Tranquility', lat: 9,   lon: 31,   heading: 0,  style: 'ocean' },
    { text: 'Sea of Serenity',    lat: 28,  lon: 18,   heading: 0,  style: 'ocean' },
    { text: 'Ocean of Storms',    lat: 18,  lon: -57,  heading: 0,  style: 'ocean' },
    { text: 'Sea of Crises',      lat: 17,  lon: 59,   heading: 0,  style: 'ocean' },
    { text: 'Tycho',              lat: -43, lon: -11,  heading: 0,  style: 'feature' },
    { text: 'Copernicus',         lat: 10,  lon: -20,  heading: 0,  style: 'feature' },
    { text: 'Aristarchus',        lat: 24,  lon: -47,  heading: 0,  style: 'feature' },
    { text: 'Mare Imbrium',       lat: 33,  lon: -16,  heading: 0,  style: 'ocean' },
    { text: 'South Pole-Aitken',  lat: -53, lon: 170,  heading: 0,  style: 'feature' },
  ],

  io: [
    { text: 'Loki Patera',    lat: 13,  lon: -310, heading: 0,  style: 'feature' },
    { text: 'Pele',           lat: -18, lon: -256, heading: 0,  style: 'feature' },
    { text: 'Tvashtar Paterae', lat: 63, lon: -122, heading: 0,  style: 'feature' },
    { text: 'Prometheus',     lat: -2,  lon: -154, heading: 0,  style: 'feature' },
    { text: 'Boosaule Montes', lat: -5, lon: -270, heading: 0,  style: 'feature' },
  ],

  europa: [
    { text: 'Conamara Chaos', lat: -10, lon: -90,  heading: 0,  style: 'feature' },
    { text: 'Pwyll Crater',   lat: -25, lon: -90,  heading: 0,  style: 'feature' },
    { text: 'Thera Macula',   lat: -48, lon: -180, heading: 0,  style: 'feature' },
    { text: 'Tyre Impact',    lat: 34,  lon: -144, heading: 0,  style: 'feature' },
  ],

  ganymede: [
    { text: 'Galileo Regio',  lat: 35,  lon: -135, heading: 0,  style: 'region' },
    { text: 'Nicholson Regio', lat: -14, lon: -0,   heading: 0,  style: 'region' },
    { text: 'Uruk Sulcus',    lat: 0,   lon: -160, heading: 0,  style: 'feature' },
    { text: 'Tros Crater',    lat: 11,  lon: -30,  heading: 0,  style: 'feature' },
  ],

  titan: [
    { text: 'Kraken Mare',   lat: 68,  lon: -50,  heading: 0,  style: 'ocean' },
    { text: 'Ligeia Mare',   lat: 79,  lon: -110, heading: 0,  style: 'ocean' },
    { text: 'Shangri-La',    lat: -10, lon: -160, heading: 0,  style: 'region' },
    { text: 'Xanadu',        lat: -10, lon: -100, heading: 0,  style: 'region' },
    { text: 'Menrva Crater', lat: 20,  lon: -87,  heading: 0,  style: 'feature' },
  ],
};

/**
 * Get labels for a specific celestial body.
 * Returns Earth labels as default fallback.
 * @param {string} bodyId
 * @returns {Array<{text: string, lat: number, lon: number, heading: number, style: string}>}
 */
export function getBodyLabels(bodyId) {
  return BODY_LABELS[bodyId] || BODY_LABELS.earth;
}

/**
 * List all body IDs that have label data.
 * @returns {string[]}
 */
export function getBodyIdsWithLabels() {
  return Object.keys(BODY_LABELS);
}
