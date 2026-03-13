/**
 * ViewDescriber — generates human-readable descriptions of the current globe view
 * for screen readers and accessibility purposes.
 *
 * Two levels:
 * - 'brief': single paragraph, ~50 words
 * - 'detailed': structured narrative, ~150-200 words
 */

function resolveName(name, locale = 'en') {
  if (typeof name === 'string') return name;
  if (name && typeof name === 'object') return name[locale] ?? name.en ?? Object.values(name)[0] ?? '';
  return '';
}

function zoomLabel(zoom) {
  if (zoom >= 2.5) return 'close';
  if (zoom >= 1.2) return 'moderate';
  return 'far';
}

function compassDirection(lat, lon) {
  const parts = [];
  if (lat > 15) parts.push('north');
  else if (lat < -15) parts.push('south');
  if (lon > 15) parts.push('east');
  else if (lon < -15) parts.push('west');
  return parts.length > 0 ? parts.join('-') : 'equatorial center';
}

function formatCoord(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(1)}°${latDir}, ${Math.abs(lon).toFixed(1)}°${lonDir}`;
}

function projectionLabel(projection) {
  if (projection === 'globe') return 'Globe';
  if (projection === 'azimuthalEquidistant') return 'Flat map (azimuthal equidistant)';
  if (projection === 'orthographic') return 'Flat map (orthographic)';
  if (projection === 'equirectangular') return 'Flat map (equirectangular)';
  return projection;
}

export function describeView(scene, viewStateQuery, level = 'brief') {
  const angle = viewStateQuery.getViewAngle() ?? { lat: 0, lon: 0, zoom: 1 };
  const visible = viewStateQuery.getVisibleEntities(scene);
  const locale = scene.locale ?? 'en';
  const bodyName = (scene.planet?.id ?? 'earth').charAt(0).toUpperCase() + (scene.planet?.id ?? 'earth').slice(1);
  const proj = projectionLabel(scene.projection ?? 'globe');

  if (level === 'detailed') {
    return describeDetailed(scene, visible, angle, bodyName, proj, locale);
  }
  return describeBrief(scene, visible, angle, bodyName, proj, locale);
}

function describeBrief(scene, visible, angle, bodyName, proj, locale) {
  const markerNames = visible.markers.map((m) => resolveName(m.name, locale)).filter(Boolean);
  const markerList = markerNames.length > 0 ? markerNames.join(', ') : 'none';
  const direction = compassDirection(angle.lat, angle.lon);
  const zoom = zoomLabel(angle.zoom);

  const parts = [
    `${proj} showing ${bodyName}.`,
    `${visible.markers.length} marker${visible.markers.length !== 1 ? 's' : ''} visible: ${markerList}.`,
  ];
  if (visible.arcs.length > 0) {
    parts.push(`${visible.arcs.length} arc${visible.arcs.length !== 1 ? 's' : ''}.`);
  }
  if (visible.paths.length > 0) {
    parts.push(`${visible.paths.length} path${visible.paths.length !== 1 ? 's' : ''}.`);
  }
  if (visible.regions.length > 0) {
    parts.push(`${visible.regions.length} region${visible.regions.length !== 1 ? 's' : ''}.`);
  }
  parts.push(`Viewing ${direction}, ${zoom} zoom.`);
  return parts.join(' ');
}

function describeDetailed(scene, visible, angle, bodyName, proj, locale) {
  const totalMarkers = scene.markers?.length ?? 0;
  const direction = compassDirection(angle.lat, angle.lon);
  const zoom = zoomLabel(angle.zoom);

  const lines = [];
  lines.push(`Interactive ${proj.toLowerCase()} showing ${bodyName}, viewed from the ${direction} at ${zoom} zoom (${angle.zoom.toFixed(1)}×).`);

  // Markers
  if (visible.markers.length > 0) {
    const countLabel = totalMarkers > visible.markers.length
      ? `${visible.markers.length} of ${totalMarkers}`
      : `${visible.markers.length}`;
    lines.push(`${countLabel} marker${visible.markers.length !== 1 ? 's' : ''} visible:`);
    for (const m of visible.markers) {
      const name = resolveName(m.name, locale);
      const coord = formatCoord(m.lat, m.lon);
      const cat = m.category && m.category !== 'default' ? `, ${m.category}` : '';
      lines.push(`  ${name} (${coord}${cat})`);
    }
  } else {
    lines.push('No markers visible.');
  }

  // Arcs
  if (visible.arcs.length > 0) {
    lines.push(`${visible.arcs.length} arc${visible.arcs.length !== 1 ? 's' : ''}:`);
    for (const a of visible.arcs) {
      const name = resolveName(a.name, locale);
      lines.push(`  ${name}`);
    }
  }

  // Paths
  if (visible.paths.length > 0) {
    lines.push(`${visible.paths.length} path${visible.paths.length !== 1 ? 's' : ''}.`);
  }

  // Regions
  if (visible.regions.length > 0) {
    lines.push(`${visible.regions.length} region${visible.regions.length !== 1 ? 's' : ''}:`);
    for (const r of visible.regions) {
      lines.push(`  ${resolveName(r.name, locale)}`);
    }
  }

  return lines.join('\n');
}
