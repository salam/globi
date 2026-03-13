# Globi Homepage (globi.world) — Design Spec

**Date:** 2026-03-13
**Status:** Approved
**Target audience:** Data journalists, educators, content creators

---

## 1. Overview

A single-page marketing homepage for Globi, hosted at `https://globi.world`. The page convinces data journalists and educators to adopt Globi by showing three live interactive embedded examples, highlighting key advantages (open-source, accessible, no build step, visual editor), comparing against alternatives, and answering common questions.

## 2. Visual Design

### Theme
- **Warm neutral** — off-white backgrounds, warm grays, subtle cream tones (editorial/newspaper feel)
- Background: `#f8f6f1` (warm off-white)
- Text: `#2c2a25` (warm dark)
- Muted text: `#6b6860`
- Dividers/borders: `#e5e0d8`
- Accent (links, CTAs): `#3b5998` (muted blue, professional)

### Typography
- **Headings:** `"Sora", sans-serif` (Google Fonts) — weight 600-700
- **Decorative/accents:** `"PT Serif", serif` (Google Fonts) — italic for captions, pull quotes
- **Body:** `-apple-system, system-ui, Helvetica, Arial, "Segoe UI", Roboto, sans-serif`
- Scale: Hero H1 ~48-56px, Section H2 ~32px, Card labels ~12px small-caps, Body 16px/1.6

### Layout
- Max content width: 1120px centered
- Generous vertical spacing between sections (80-120px)
- Responsive: single-column below 768px
- Follows Claudine-style structure: top bar → hero → content sections → footer

## 3. Page Structure

### 3.1 Top Bar
- Fixed/sticky minimal bar, warm off-white background
- **Left:** GitHub icon (SVG) + link to `https://github.com/salam/globi`, heart icon + link to `https://github.com/sponsors/salam`
- **Right:** Language toggle dropdown — EN / DE / FR / ES / IT / ZH / AR with flag emojis
- No heavy branding — the logo is just the word "globi" in Sora bold

### 3.2 Hero Section
- Large Sora heading: "Interactive globes for journalism and education"
- Subtitle in PT Serif italic: "Drop a single HTML tag into any page. Feed it a JSON scene. Get a fully interactive globe with markers, paths, and real-time data."
- Two CTA buttons:
  - Primary: "Try the Editor →" (links to editor)
  - Secondary/outline: "View on GitHub" (links to repo)
- No globe in hero — the three live examples below serve as the visual hook

### 3.3 Three Live Example Cards

Each card is full viewport width (with padding), ~500-600px tall, separated by 80px vertical spacing. Each has a small-caps category label, a live `<globi-viewer>` instance, and a caption.

#### Card 1: Hormuz — Geopolitical Intelligence
- **Background:** White (`#ffffff`), thin 1px border (`#e5e0d8`), newspaper embed feel
- **Label:** "GEOPOLITICAL INTELLIGENCE" in small caps, muted color
- **Viewer config:**
  - Theme: `wireframe-shaded`
  - Planet: Earth
  - Projection: globe
  - Camera: focused on Strait of Hormuz (~26.5°N, 56.5°E), zoomed to regional level
  - Markers: USS Eisenhower carrier (dot marker, navy color)
  - Paths: carrier trail showing recent movement through the strait
  - Viewer UI: minimal — no legend, no search, compass only
- **Caption:** PT Serif italic, small — "USS Eisenhower carrier strike group, Strait of Hormuz — data via open-source intelligence"

#### Card 2: Midway — Historical Storytelling
- **Background:** Sepia (`#f5f0e1`), slightly rounded corners (8px)
- **Label:** "HISTORICAL STORYTELLING" in small caps
- **Layout:** Two-column — 60% sticky globe (left), 40% scrolling narrative (right)
- **Viewer config:**
  - Theme: `grayscale-shaded`
  - Camera: Pacific theater, focused on Midway Island
  - Markers: US carriers (blue #2563eb), Japanese carriers (red #dc2626), Midway Island (green #16a34a)
  - Paths: Fleet approach routes
  - Viewer UI: minimal
- **Narrative blocks (only two):**
  1. "Dawn, June 4, 1942" — Fleet positioning, Japanese carriers northwest of Midway, US carriers lying in ambush to the northeast
  2. "The Fatal Five Minutes" — SBD Dauntless dive-bombers strike three Japanese carriers simultaneously, turning the tide of the Pacific War
- **Interaction:** Scrolling the narrative triggers `flyTo()` and marker updates on the globe
- **Responsive:** Below 768px, globe collapses to ~40vh at top, narrative scrolls below

#### Card 3: ISS — Real-Time Data
- **Background:** Charcoal (`#1a1a1a`), light text (`#f0ede6`)
- **Label:** "REAL-TIME DATA" in small caps, light color
- **Viewer config:**
  - Theme: `photo`
  - Projection: `flat-equirectangular`
  - Camera: zoomed to current ISS position
  - Markers: ISS position marker with yellow color (`#facc15`), `pulse: true`
  - Paths: orbital trail (recent past orbit)
  - Viewer UI: minimal
- **Overlay:** Small semi-transparent info box showing lat, lon, altitude, velocity — updating in real-time
- **Data source:** Fetch ISS position from `https://api.wheretheiss.at/v1/satellites/25544` or similar open API, poll every 5 seconds
- **Caption:** "International Space Station — live position via open API"

### 3.4 Key Advantages
- 4-column grid (2x2 on mobile), each card with an icon, heading, and 1-2 sentence description
- **Open Source** — "MIT licensed. Use it commercially, modify it, embed it anywhere. No vendor lock-in."
- **Accessible** — "Full keyboard navigation, screen reader support, color-blind-safe palette. Built for everyone."
- **No Build Step** — "One HTML tag. One JSON scene. Works in any page — no bundler, no framework, no config."
- **Visual Editor** — "Non-technical creators use the WYSIWYG editor. Export JSON, embed anywhere."

### 3.5 Feature Highlights
- Compact two-column or three-column grid of feature pills/badges
- Items: 13 celestial bodies, 5 visual themes, 3 flat-map projections, real-time data binding, JSON scene format, AI agent API (28 commands), i18n (7 languages), data attribution tracking, callout clustering, great-circle arcs, GeoJSON regions, scrollytelling support

### 3.6 Comparison Table
- Responsive table, horizontally scrollable on mobile
- Warm styling with alternating row shading

| Feature | Globi | Google Earth | Cesium | OpenGlobus | Mapbox Globe | D3-geo |
|---|---|---|---|---|---|---|
| License | MIT | Proprietary | Apache 2.0 (viewer) | MIT | Proprietary | BSD |
| Embed complexity | 1 HTML tag | iframe/API key | npm + config | npm + config | API key + token | Code required |
| Accessibility | Full (keyboard, SR, color-blind) | Partial | Minimal | Minimal | Partial | Manual |
| Offline capable | Yes | No | Partial | Yes | No | Yes |
| Scrollytelling | Built-in | No | Manual | No | Manual | Manual |
| Visual editor | Built-in | Separate (Studio) | Sandcastle | No | Studio (paid) | No |
| Bundle size | ~180KB + Three.js | N/A (hosted) | ~3MB | ~500KB | ~800KB | ~30KB |
| Celestial bodies | 13 | Earth only | Earth + Moon | Earth only | Earth only | Earth (2D) |
| Real-time data | Built-in | Limited | Yes | Manual | Yes | Manual |

### 3.7 FAQ
Accordion-style expandable questions. Warm styling, smooth expand/collapse animation.

1. **Do I need to code?** — No. Use the visual editor to create scenes, export JSON, and embed with a single HTML tag. Content creators need zero programming knowledge.
2. **Can I use it commercially?** — Yes. Globi is MIT licensed — free for commercial and non-commercial use with no restrictions.
3. **How does it compare to Google Earth?** — Google Earth is proprietary and requires API keys. Globi is open-source, embeds with one tag, has built-in accessibility, scrollytelling, and works offline.
4. **Does it work on mobile?** — Yes. Touch navigation, responsive layout, and progressive texture loading ensure smooth performance on phones and tablets.
5. **Can I show real-time data?** — Yes. Bind live data sources (APIs, AIS feeds, satellite positions) to markers with automatic position updates.
6. **Is it accessible?** — Fully. Keyboard-first interaction, screen reader descriptions via aria-live, color-blind-safe palette, and selectable callout text.
7. **What data formats does it support?** — JSON scenes (native), GeoJSON import/export, OBJ mesh export. Markers, paths, arcs, and regions all configurable via JSON.
8. **Can I use it for historical storytelling?** — Yes. Scrollytelling support lets you pair a scrolling narrative with camera transitions and marker animations — no external libraries needed.
9. **How do I embed it?** — Add `<script type="module" src="globi.js"></script>` and `<globi-viewer scene="scene.json"></globi-viewer>` to any HTML page.
10. **Can AI agents interact with it?** — Yes. Globi exposes a 28-command agent API via `window.globi`, plus DOM data attributes and an `llms.txt` endpoint for machine discovery.

### 3.8 Footer
- Warm dark background (`#2c2a25`), light text
- Left: "Globi — MIT License — Made for journalists, educators, and storytellers"
- Center: Links to GitHub, Sponsor, Editor, Documentation
- Right: "For AI agents:" with links to `llms.txt` and `skill.md`
- Bottom line: copyright notice

## 4. Language Toggle

### Implementation
- All translatable text stored in a JS object keyed by locale: `{ en: {...}, de: {...}, fr: {...}, es: {...}, it: {...}, zh: {...}, ar: {...} }`
- Dropdown toggles `lang` attribute on `<html>` and swaps all `[data-i18n]` elements
- Persists selection in `localStorage`
- Arabic (`ar`) sets `dir="rtl"` on `<html>`
- Viewer captions and FAQ content are all translated

### Supported Languages
- EN (English) — default
- DE (German)
- FR (French)
- ES (Spanish)
- IT (Italian)
- ZH (Chinese Simplified)
- AR (Arabic)

## 5. Agent Files

### llms.txt (at /llms.txt)
Machine-readable project description following the llms.txt convention:
- Project name, description, URL
- Key capabilities list
- API/embed usage instructions
- Link to schema documentation
- Link to examples

### skill.md (at /skill.md)
Agent interaction guide:
- How to create a Globi scene programmatically
- Schema reference summary
- Available agent API commands
- Common tasks (add marker, fly to location, switch theme, export)

## 6. Technical Implementation

### File Structure
```
globi.world/
├── index.html          # Single-page homepage
├── styles.css          # All styles
├── app.js              # Language toggle, lazy-load viewers, ISS polling, FAQ accordion, scrollytelling
├── llms.txt            # Machine-readable project description
└── skill.md            # Agent interaction guide
```

### Dependencies
- Google Fonts: Sora (400, 600, 700), PT Serif (400, 400i)
- Globi viewer: loaded from relative path `../src/index.js` (or CDN in production)
- No other external dependencies

### Performance
- Viewers lazy-loaded via IntersectionObserver — only initialize when scrolled into view
- ISS polling starts only when Card 3 is visible
- Images optimized, fonts preloaded
- Total page weight target: <500KB excluding Globi bundle and textures

### Responsive Breakpoints
- Desktop: >1024px — full layout
- Tablet: 768-1024px — two-column grids become single, example cards stack
- Mobile: <768px — single column, Midway card switches to stacked globe-over-narrative
