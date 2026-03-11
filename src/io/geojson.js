import { createEmptyScene, normalizeScene, validateScene } from '../scene/schema.js';

function featureForMarker(marker) {
  return {
    type: 'Feature',
    properties: {
      id: marker.id,
      featureType: 'marker',
      name: marker.name,
      description: marker.description,
      visualType: marker.visualType,
      category: marker.category,
    },
    geometry: {
      type: 'Point',
      coordinates: [marker.lon, marker.lat, marker.alt ?? 0],
    },
  };
}

function featureForPath(path) {
  return {
    type: 'Feature',
    properties: {
      id: path.id,
      featureType: 'path',
      name: path.name,
      color: path.color,
      strokeWidth: path.strokeWidth,
    },
    geometry: {
      type: 'LineString',
      coordinates: path.points.map((point) => [point.lon, point.lat, point.alt ?? 0]),
    },
  };
}

function featureForArc(arc) {
  return {
    type: 'Feature',
    properties: {
      id: arc.id,
      featureType: 'arc',
      name: arc.name,
      color: arc.color,
      maxAltitude: arc.maxAltitude,
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [arc.start.lon, arc.start.lat, arc.start.alt ?? 0],
        [arc.end.lon, arc.end.lat, arc.end.alt ?? 0],
      ],
    },
  };
}

function featureForRegion(region) {
  return {
    type: 'Feature',
    properties: {
      id: region.id,
      featureType: 'region',
      name: region.name,
      capColor: region.capColor,
      sideColor: region.sideColor,
      altitude: region.altitude,
    },
    geometry: region.geojson,
  };
}

function parseLocalizedName(properties) {
  const name = properties?.name;
  if (typeof name === 'string') {
    return { en: name };
  }
  if (name && typeof name === 'object' && !Array.isArray(name)) {
    return name;
  }
  return {};
}

export function exportSceneToGeoJSON(sceneInput) {
  const scene = normalizeScene(sceneInput);
  const result = validateScene(scene);
  if (!result.valid) {
    throw new Error(`Cannot export invalid scene: ${result.errors.join('; ')}`);
  }

  const features = [];
  for (const marker of scene.markers) {
    features.push(featureForMarker(marker));
  }
  for (const path of scene.paths) {
    features.push(featureForPath(path));
  }
  for (const arc of scene.arcs) {
    features.push(featureForArc(arc));
  }
  for (const region of scene.regions) {
    features.push(featureForRegion(region));
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function importGeoJSONToScene(geojsonInput, options = {}) {
  const scene = createEmptyScene(options.locale ?? 'en');
  const geojson = typeof geojsonInput === 'string' ? JSON.parse(geojsonInput) : geojsonInput;

  if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error('GeoJSON must be a FeatureCollection');
  }

  for (const feature of geojson.features) {
    const type = feature?.geometry?.type;
    const properties = feature?.properties ?? {};

    if (type === 'Point') {
      const [lon, lat, alt = 0] = feature.geometry.coordinates;
      scene.markers.push({
        id: String(properties.id ?? `marker-${scene.markers.length + 1}`),
        name: parseLocalizedName(properties),
        description: {},
        lat,
        lon,
        alt,
        visualType: properties.visualType ?? 'dot',
      });
      continue;
    }

    if (type === 'LineString') {
      const coords = feature.geometry.coordinates ?? [];
      const points = coords.map(([lon, lat, alt = 0]) => ({ lat, lon, alt }));
      const featureType = properties.featureType;

      if (featureType === 'arc' && points.length >= 2) {
        scene.arcs.push({
          id: String(properties.id ?? `arc-${scene.arcs.length + 1}`),
          name: parseLocalizedName(properties),
          start: points[0],
          end: points[points.length - 1],
          maxAltitude: Number(properties.maxAltitude ?? 0),
        });
      } else if (points.length >= 2) {
        scene.paths.push({
          id: String(properties.id ?? `path-${scene.paths.length + 1}`),
          name: parseLocalizedName(properties),
          points,
          color: properties.color ?? '#00aaff',
          strokeWidth: Number(properties.strokeWidth ?? 1),
        });
      }
      continue;
    }

    if (type === 'Polygon' || type === 'MultiPolygon') {
      scene.regions.push({
        id: String(properties.id ?? `region-${scene.regions.length + 1}`),
        name: parseLocalizedName(properties),
        geojson: feature.geometry,
        capColor: properties.capColor ?? '#4caf50',
        sideColor: properties.sideColor ?? '#2e7d32',
        altitude: Number(properties.altitude ?? 0),
      });
    }
  }

  const result = validateScene(scene);
  if (!result.valid) {
    throw new Error(`Imported GeoJSON is incompatible: ${result.errors.join('; ')}`);
  }

  return scene;
}
