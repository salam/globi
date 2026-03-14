/**
 * LLMs.txt formatter — produces a compact, structured plain-text representation
 * of the current Globi view state for LLM consumption.
 *
 * Uses key=value and |-delimited fields for trivial parsing by any LLM.
 */

function formatCoord(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(1)}°${latDir} ${Math.abs(lon).toFixed(1)}°${lonDir}`;
}

function resolveName(name, locale = 'en') {
  if (typeof name === 'string') return name;
  if (name && typeof name === 'object') return name[locale] ?? name.en ?? Object.values(name)[0] ?? '';
  return '';
}

function resolveDescription(marker, locale = 'en') {
  const desc = resolveName(marker.description, locale);
  if (desc) return desc;
  const label = resolveName(marker.calloutLabel, locale);
  return label || '';
}

function formatBounds(bounds) {
  if (!bounds) return '';
  const n = `${Math.abs(bounds.north).toFixed(0)}°${bounds.north >= 0 ? 'N' : 'S'}`;
  const s = `${Math.abs(bounds.south).toFixed(0)}°${bounds.south >= 0 ? 'N' : 'S'}`;
  const e = `${Math.abs(bounds.east).toFixed(0)}°${bounds.east >= 0 ? 'E' : 'W'}`;
  const w = `${Math.abs(bounds.west).toFixed(0)}°${bounds.west >= 0 ? 'E' : 'W'}`;
  return `${s}–${n}, ${w}–${e}`;
}

export function formatLlmsTxt(scene, viewStateQuery) {
  const lines = [];
  const angle = viewStateQuery.getViewAngle();
  const bounds = viewStateQuery.getViewportBounds();
  const visible = viewStateQuery.getVisibleEntities(scene);
  const locale = scene.locale ?? 'en';

  // Header
  lines.push('# Globi View State');
  lines.push(`body: ${scene.planet?.id ?? 'earth'}`);
  lines.push(`projection: ${scene.projection ?? 'globe'}`);
  lines.push(`theme: ${scene.theme ?? 'photo'}`);
  if (angle) {
    lines.push(`view: lat=${angle.lat} lon=${angle.lon} zoom=${angle.zoom}`);
  }
  if (bounds) {
    lines.push(`viewport: ${formatBounds(bounds)}`);
  }
  lines.push('');

  // Markers
  const totalMarkers = scene.markers?.length ?? 0;
  const visibleMarkers = visible.markers;
  const markerCountLabel = totalMarkers > 0 && visibleMarkers.length < totalMarkers
    ? `${visibleMarkers.length} of ${totalMarkers}`
    : `${visibleMarkers.length}`;
  lines.push(`# Visible Markers (${markerCountLabel})`);
  for (const m of visibleMarkers) {
    const name = resolveName(m.name, locale);
    const coord = formatCoord(m.lat, m.lon);
    const desc = resolveDescription(m, locale);
    const parts = [name, coord, m.category ?? '', m.visualType ?? '', `callout=${m.calloutMode ?? 'always'}`, desc];
    lines.push(`- ${parts.join(' | ')}`);
  }
  lines.push('');

  // Arcs
  const totalArcs = scene.arcs?.length ?? 0;
  const visibleArcs = visible.arcs;
  const arcCountLabel = totalArcs > 0 && visibleArcs.length < totalArcs
    ? `${visibleArcs.length} of ${totalArcs}`
    : `${visibleArcs.length}`;
  lines.push(`# Visible Arcs (${arcCountLabel})`);
  for (const a of visibleArcs) {
    const name = resolveName(a.name, locale);
    const parts = [name, `color=${a.color ?? ''}`, `altitude=${a.maxAltitude ?? 0}`];
    if (a.animationTime) parts.push('animated');
    lines.push(`- ${parts.join(' | ')}`);
  }
  lines.push('');

  // Paths
  const totalPaths = scene.paths?.length ?? 0;
  const visiblePaths = visible.paths;
  const pathCountLabel = totalPaths > 0 && visiblePaths.length < totalPaths
    ? `${visiblePaths.length} of ${totalPaths}`
    : `${visiblePaths.length}`;
  lines.push(`# Visible Paths (${pathCountLabel})`);
  for (const p of visiblePaths) {
    const name = resolveName(p.name, locale);
    lines.push(`- ${name} | ${(p.points?.length ?? 0)} points | color=${p.color ?? ''}`);
  }
  lines.push('');

  // Regions
  const totalRegions = scene.regions?.length ?? 0;
  const visibleRegions = visible.regions;
  const regionCountLabel = totalRegions > 0 && visibleRegions.length < totalRegions
    ? `${visibleRegions.length} of ${totalRegions}`
    : `${visibleRegions.length}`;
  lines.push(`# Visible Regions (${regionCountLabel})`);
  for (const r of visibleRegions) {
    const name = resolveName(r.name, locale);
    lines.push(`- ${name} | cap=${r.capColor ?? ''} | altitude=${r.altitude ?? 0}`);
  }
  lines.push('');

  // Active filters
  const filters = scene.filters ?? [];
  if (filters.length > 0) {
    lines.push('# Filters Active');
    for (const f of filters) {
      lines.push(`- ${f.label ?? f.id}: ${(f.options ?? []).length} options`);
    }
    lines.push('');
  }

  // Available actions
  lines.push('# Available Actions');
  lines.push('flyTo(lat, lon, zoom) | setTheme(name) | addMarker({...}) | toggleLegend() | setProjection(name) | rotate(dLat, dLon) | zoom(level) | describe(level) | export(format, scope)');

  return lines.join('\n');
}
