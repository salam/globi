import { importGeoJSONToScene } from './geojson.js';

export function importGeoJSON(textOrObject, options = {}) {
  return importGeoJSONToScene(textOrObject, options);
}

export function importOsmPbf(_bytes, _options = {}) {
  throw new Error('OSM PBF import requires a dedicated parser integration. Use GeoJSON export from OSM as current workaround.');
}

export function importShapefile(_bytes, _options = {}) {
  throw new Error('Shapefile import requires a dedicated parser integration. Convert shapefiles to GeoJSON before importing.');
}
