# Indiana Jones Flight Itinerary Example

## Overview

A showcase example depicting Indiana Jones' travel routes across all five movies, rendered as thick red animated arcs on the globe — evoking the iconic map-travel sequences from the films. Each movie is a toggleable filter group.

## Visual Style

- **Arc color:** `#cc0000` (deep red)
- **Stroke width:** `4`
- **Max altitude:** `0.15` (curved flight-path arcs)
- **Animation time:** `2000ms` per leg
- **Marker style:** red dots (`visualType: 'dot'`, `color: '#cc0000'`) with always-visible callout labels
- **Theme:** `satellite` (dark background makes red lines pop)
- **Projection:** `equirectangular` (flat map — classic adventure-map feel)

## Route Data

### Raiders of the Lost Ark (1981) — category: `indy-raiders`

| # | City | Lat | Lon |
|---|------|-----|-----|
| 1 | Marshall College, CT | 41.31 | -72.92 |
| 2 | Nepal (Kathmandu) | 27.70 | 85.32 |
| 3 | Cairo | 30.04 | 31.24 |
| 4 | Tanis, Egypt | 30.97 | 32.05 |
| 5 | Washington D.C. | 38.91 | -77.04 |

Arcs: 1→2, 2→3, 3→4, 4→5

### Temple of Doom (1984) — category: `indy-temple`

| # | City | Lat | Lon |
|---|------|-----|-----|
| 1 | Shanghai | 31.23 | 121.47 |
| 2 | Nang Tao (Himalayas) | 28.60 | 83.93 |
| 3 | Pankot Palace, India | 24.80 | 80.95 |

Arcs: 1→2, 2→3

### The Last Crusade (1989) — category: `indy-crusade`

| # | City | Lat | Lon |
|---|------|-----|-----|
| 1 | Arches, Utah | 38.73 | -109.59 |
| 2 | Venice | 45.44 | 12.34 |
| 3 | Salzburg | 47.80 | 13.04 |
| 4 | Berlin | 52.52 | 13.41 |
| 5 | Iskenderun (Hatay) | 36.59 | 36.17 |

Arcs: 1→2, 2→3, 3→4, 4→5

### Kingdom of the Crystal Skull (2008) — category: `indy-crystal`

| # | City | Lat | Lon |
|---|------|-----|-----|
| 1 | Nevada (Area 51) | 37.24 | -115.81 |
| 2 | New Haven, CT | 41.31 | -72.92 |
| 3 | Nazca, Peru | -14.74 | -75.13 |
| 4 | Akator (Amazon) | -3.47 | -62.21 |

Arcs: 1→2, 2→3, 3→4

### Dial of Destiny (2023) — category: `indy-dial`

| # | City | Lat | Lon |
|---|------|-----|-----|
| 1 | New York City | 40.71 | -74.01 |
| 2 | Tangier, Morocco | 35.76 | -5.83 |
| 3 | Syracuse, Sicily | 37.08 | 15.29 |
| 4 | Athens | 37.97 | 23.73 |
| 5 | Syracuse (time travel) | 37.08 | 15.29 |

Arcs: 1→2, 2→3, 3→4, 4→5

## Filter Group

Single filter group `"movie"`:

```javascript
{
  id: 'movie',
  label: 'Movie',
  options: [
    { value: 'all',     label: 'All Movies',                categories: [] },
    { value: 'raiders', label: 'Raiders of the Lost Ark',   categories: ['indy-raiders'] },
    { value: 'temple',  label: 'Temple of Doom',            categories: ['indy-temple'] },
    { value: 'crusade', label: 'The Last Crusade',          categories: ['indy-crusade'] },
    { value: 'crystal', label: 'Kingdom of the Crystal Skull', categories: ['indy-crystal'] },
    { value: 'dial',    label: 'Dial of Destiny',           categories: ['indy-dial'] }
  ]
}
```

## Scene Configuration

```javascript
{
  version: 1,
  locale: 'en',
  theme: 'satellite',
  projection: 'equirectangular',
  markers: [...],   // all city markers
  arcs: [...],      // all flight-leg arcs
  filters: [movieFilter],
  dataSources: [{
    id: 'indiana-jones',
    label: 'Indiana Jones Film Series',
    url: 'https://en.wikipedia.org/wiki/Indiana_Jones'
  }]
}
```

## Implementation Location

- New function `loadIndianaJonesItinerary()` in `src/examples/loaders.js`
- Registered in the example list with label "Indiana Jones Itinerary"
- Unit tests in `tests/examples.test.js`

## Arc Construction Pattern

For each movie, iterate consecutive city pairs and produce:

```javascript
{
  id: `indy-${movieKey}-leg-${i}`,
  name: { en: `${cityA} → ${cityB}` },
  start: { lat, lon, alt: 0 },
  end: { lat, lon, alt: 0 },
  maxAltitude: 0.15,
  color: '#cc0000',
  strokeWidth: 4,
  animationTime: 2000,
  sourceId: 'indiana-jones'
}
```

Markers share the same `category` as their movie for filtering.
