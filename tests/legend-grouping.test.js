import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupMarkersByFilter } from '../src/components/legendGrouping.js';

function mkMarker(id, name, category = 'default') {
  return { id, name: { en: name }, category };
}

describe('groupMarkersByFilter', () => {
  it('returns a single flat section sorted alphabetically when no filters', () => {
    const markers = [
      mkMarker('m3', 'Charlie'),
      mkMarker('m1', 'Alpha'),
      mkMarker('m2', 'Bravo'),
    ];
    const result = groupMarkersByFilter(markers, [], 'en');

    assert.equal(result.length, 1);
    assert.equal(result[0].label, null);
    assert.deepStrictEqual(
      result[0].markers.map((m) => m.id),
      ['m1', 'm2', 'm3'],
    );
  });

  it('groups markers by filter option categories', () => {
    const markers = [
      mkMarker('m1', 'Berlin', 'capital-un-nato'),
      mkMarker('m2', 'Bern', 'capital-un'),
      mkMarker('m3', 'Reykjavik', 'capital-nato'),
      mkMarker('m4', 'Testville', 'capital'),
    ];
    const filters = [{
      id: 'membership',
      label: 'Membership',
      options: [
        { value: 'all', label: 'All Capitals', categories: [] },
        { value: 'un', label: 'UN Members', categories: ['capital-un', 'capital-un-nato'] },
        { value: 'nato', label: 'NATO Members', categories: ['capital-nato', 'capital-un-nato'] },
      ],
    }];

    const result = groupMarkersByFilter(markers, filters, 'en');

    // UN section: Berlin (capital-un-nato) and Bern (capital-un)
    assert.equal(result[0].label, 'UN Members');
    assert.deepStrictEqual(
      result[0].markers.map((m) => m.id),
      ['m1', 'm2'],
    );

    // NATO section: Reykjavik (capital-nato). Berlin already assigned to UN.
    assert.equal(result[1].label, 'NATO Members');
    assert.deepStrictEqual(
      result[1].markers.map((m) => m.id),
      ['m3'],
    );

    // Other section: Testville (capital — no matching filter option)
    assert.equal(result[2].label, 'Other');
    assert.deepStrictEqual(
      result[2].markers.map((m) => m.id),
      ['m4'],
    );
  });

  it('sorts markers alphabetically within each section', () => {
    const markers = [
      mkMarker('m1', 'Zurich', 'capital-un'),
      mkMarker('m2', 'Athens', 'capital-un'),
      mkMarker('m3', 'Madrid', 'capital-un'),
    ];
    const filters = [{
      id: 'f',
      label: 'F',
      options: [
        { value: 'all', label: 'All', categories: [] },
        { value: 'un', label: 'UN', categories: ['capital-un'] },
      ],
    }];

    const result = groupMarkersByFilter(markers, filters, 'en');
    assert.deepStrictEqual(
      result[0].markers.map((m) => m.name.en),
      ['Athens', 'Madrid', 'Zurich'],
    );
  });

  it('omits "Other" section when all markers match a filter option', () => {
    const markers = [
      mkMarker('m1', 'Berlin', 'capital-un'),
      mkMarker('m2', 'Paris', 'capital-un'),
    ];
    const filters = [{
      id: 'f',
      label: 'F',
      options: [
        { value: 'all', label: 'All', categories: [] },
        { value: 'un', label: 'UN', categories: ['capital-un'] },
      ],
    }];

    const result = groupMarkersByFilter(markers, filters, 'en');
    assert.equal(result.length, 1);
    assert.equal(result[0].label, 'UN');
  });

  it('handles empty markers gracefully', () => {
    const result = groupMarkersByFilter([], [], 'en');
    assert.equal(result.length, 1);
    assert.equal(result[0].markers.length, 0);
  });

  it('uses locale for alphabetical sorting', () => {
    const markers = [
      mkMarker('m1', 'Zürich', 'a'),
      mkMarker('m2', 'Aarau', 'a'),
      { id: 'm3', name: { en: 'Berlin', de: 'Berlin' }, category: 'a' },
      { id: 'm4', name: { en: 'Aachen', de: 'Aachen' }, category: 'a' },
    ];

    const result = groupMarkersByFilter(markers, [], 'en');
    assert.equal(result[0].markers[0].id, 'm4'); // Aachen
    assert.equal(result[0].markers[1].id, 'm2'); // Aarau
  });

  it('does not mutate the original markers array', () => {
    const markers = [
      mkMarker('m2', 'Bravo'),
      mkMarker('m1', 'Alpha'),
    ];
    const original = [...markers];
    groupMarkersByFilter(markers, [], 'en');
    assert.deepStrictEqual(markers, original);
  });
});
