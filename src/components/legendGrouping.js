/**
 * Groups markers into legend sections based on scene filters.
 *
 * When a scene defines filters, markers are grouped by filter option and
 * sorted alphabetically within each section.  Markers that don't match
 * any filter option are placed in a trailing "Other" section.
 *
 * When no filters are present the full marker list is returned as a single
 * flat section sorted alphabetically.
 *
 * @param {Array} markers  – normalised marker objects
 * @param {Array} filters  – scene.filters (may be empty)
 * @param {string} locale  – current locale for name resolution
 * @returns {Array<{label: string|null, markers: Array}>}
 */
export function groupMarkersByFilter(markers = [], filters = [], locale = 'en') {
  const resolvedName = (m) => m.name?.[locale] ?? m.name?.en ?? m.id ?? '';
  const byName = (a, b) => resolvedName(a).localeCompare(resolvedName(b));

  if (!filters.length) {
    return [{ label: null, markers: [...markers].sort(byName) }];
  }

  const filter = filters[0];
  const options = filter.options.filter((o) => o.value !== 'all');

  // Build a lookup: category → first option that contains it
  const assigned = new Set();
  const sections = [];

  for (const opt of options) {
    const cats = new Set(opt.categories);
    const sectionMarkers = markers.filter((m) => {
      if (assigned.has(m.id)) return false;
      return cats.has(m.category);
    });
    for (const m of sectionMarkers) assigned.add(m.id);
    sections.push({ label: opt.label, markers: sectionMarkers.sort(byName) });
  }

  // Remaining markers not assigned to any filter option
  const remaining = markers.filter((m) => !assigned.has(m.id));
  if (remaining.length > 0) {
    sections.push({ label: 'Other', markers: remaining.sort(byName) });
  }

  return sections;
}
