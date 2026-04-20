# Globi — TEASER for The Vibe VC

**Oneliner.** A drop-in `<globi-viewer>` web component that turns a JSON scene into an interactive 3D globe — built for content creators, educators, and newsrooms.

**Creator.** Matthias
**Repo.** https://github.com/salam/globi
**Live.** https://globi.world/ · editor at https://globi.world/editor/
**License.** MIT · **Stack.** Web Components + WebGL (Three.js) + esbuild, zero runtime framework.

## What it is

One HTML tag renders a fully interactive globe:

```html
<script type="module" src="https://unpkg.com/globi-viewer/dist/globi.min.js"></script>
<globi-viewer style="width:100%;height:500px"></globi-viewer>
```

Feed it a JSON scene with markers, paths, arcs, regions, animations, and dynamic data sources — it renders, it's accessible, it exports to GeoJSON / OBJ / USDZ.

## Why now

Static maps don't hold modern attention and Mapbox-style stacks are too heavy for a newsroom embed or a classroom page. Globi lands in the gap: one `<script>`, one tag, one JSON scene — a creator-shaped primitive for the geopolitical / space / climate content wave.

## What's shipped (evidence, not adjectives)

- **v1.0.10** live on npm/unpkg · releases roughly every few days (see `RELEASE_NOTES.md`).
- **13 celestial bodies** with NASA/ESA textures, per-body atmosphere, axial tilt, ring systems.
- **5 visual themes**, **3 flat-map projections**, keyframe animation engine.
- **WYSIWYG Studio editor** with scene graph, inline property editing, drag-to-reorder, context menus, keyboard shortcuts.
- **Dynamic data sources** with attribution, real-time feeds (ISS live position, AIS vessel tracking, capital cities, OSINT naval data).
- **AI agent API** + `<globi-viewer>` DOM methods (`loadScene`, `captureScreenshot`, `setStudioOptions`).
- **Full a11y**: keyboard navigation, screen-reader labels, reduced-motion respect.
- **Exports**: GeoJSON, OBJ, USDZ, PNG thumbnails (auto 1200×630 for OG cards).
- **Community site** (`globi.world/community`) with SEO-ready publishing.

Recent commits (last ~15): scene graph panel (dock left/right, drag reorder, context menu, inline rename, visibility toggle, G shortcut), studio options proxy, renderer skips invisible entities.

## Example scenes already live

All World Capitals (190+), Continents & Seas, ISS Real-Time, Naval Vessels (OSINT), Vessel Tracking (multi-source AIS), Civil Shipping across 9 straits — each a standalone HTML page, linkable and embeddable.

## Traction signals to connect

- **Repo access**: `mcp-only` for now (Vibe VC MCP can pull diffs + commit cadence on request).
- **Analytics**: not wired yet — intentionally deferred until embeds grow.
- **Billing**: pre-revenue, MIT-licensed — monetization path is likely hosted Studio + managed embeds for news/edu orgs, not the library itself.

## How it's built

AI-assisted / "vibe-coded": specs → tests → implementation, tracked in `FEATURES.md`, `BUGFIXES.md`, and per-release `RELEASE_NOTES.md`. Atomic commits, `npm run check` (lint + tests) gate before merge, Playwright for on-device checks.

## Ask

Signal interest via the Vibe VC dossier. Happy to grant read-only repo access, share the MCP workspace, or walk through the Studio live.
