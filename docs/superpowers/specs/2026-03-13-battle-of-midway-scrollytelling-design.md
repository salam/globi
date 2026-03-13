# Battle of Midway — Scrollytelling Example

**Date**: 2026-03-13
**Type**: Standalone HTML example with external text widget

## Summary

A self-contained scrollytelling page that narrates the Battle of Midway (June 4–7, 1942) using a sticky `<globi-viewer>` paired with scrolling narrative text panels. The globe updates (markers, paths, arcs, camera) as the reader scrolls through 25 chronological steps. This demonstrates Globi's ability to be controlled by external UI — a text widget outside the viewer drives the visualization.

## Layout

- **Two-column**: Globe (60%, sticky, left) + narrative panels (40%, scrolling, right)
- **Title bar**: Fixed top — battle name, date range, link to examples index
- **Footer**: Numbered bibliography
- **Responsive**: <768px — globe collapses to ~40vh sticky at top, full-width narrative below

## Scroll Mechanics

- `IntersectionObserver` with `threshold: 0.5` watches each `<section data-step="N">`
- On intersection: update markers/paths/arcs via viewer API, `flyTo()` for camera
- Active card gets a subtle left-border accent
- Zero external dependencies (no Scrollama, no GSAP)

## Visual Style

### Globe
- Theme: `grayscale-shaded` (desaturated atlas, white background)

### Text Panels (Aged Paper)
- Slightly yellowed background (`#f5f0e1`), serif font
- Faded borders, subtle shadow
- Timestamp header per card
- Superscript citation numbers linking to bibliography

### Marker Colors
| Entity | Color | Notes |
|--------|-------|-------|
| US carriers | `#2563eb` | Blue dots with callouts |
| Japanese carriers | `#dc2626` | Red dots with callouts |
| Midway Island | `#16a34a` | Green, fixed throughout |
| Aircraft groups | `#f59e0b` | Amber, transient per step |
| Submarines | `#6b7280` | Gray dots |
| Sunk ships | `#9ca3af` | Light gray, no pulse |

### Paths & Arcs
- Fleet movement: solid, faction color, strokeWidth 1.5
- Air strikes: dashed (`[3,1]`), amber, `animationTime: 2000`
- Submarine tracks: gray dashed

### Camera
- Wide Pacific (zoom ~1.5) for strategic overview
- Tight on Kidō Butai (zoom ~4) for tactical moments
- Pearl Harbor close-up (zoom ~5) for codebreaker step

### Cumulative State
- Ships persist after appearing; sunk ships turn gray
- Paths accumulate within phase, clear between phases
- Arcs (air strikes) are per-step only

## Narrative Steps (25)

### Phase 1 — Strategic Prelude (May 1942)
1. Codebreakers at Station HYPO — Pearl Harbor
2. Yamamoto's Plan — Hashirajima anchorage
3. Nagumo's Kidō Butai sorties — 4 carriers depart
4. The Aleutian Diversion — northern force splits
5. Nimitz deploys Task Forces — TF-16, TF-17 to Point Luck

### Phase 2 — Opening Moves (June 3)
6. PBY Catalina spots invasion fleet
7. B-17 high-altitude bombing — no hits
8. Night torpedo attack by PBYs

### Phase 3 — Nagumo Strikes Midway (June 4, 04:30–07:00)
9. First wave launches (108 aircraft)
10. Midway scrambles defense
11. Tomonaga: "second strike needed" — rearming begins

### Phase 4 — American Strikes Miss (June 4, 07:00–09:20)
12. Midway-based strikes fail — massive losses
13. USS Nautilus stalks the fleet
14. Nagumo's fateful decision — reverses rearming

### Phase 5 — "The Five Minutes" (June 4, 09:20–10:25)
15. Torpedo squadrons attack — VT-8 destroyed
16. Dive bombers follow Arashi's wake
17. 10:22 — Three carriers ablaze

### Phase 6 — Hiryū Fights Back (June 4, 10:30–17:00)
18. Hiryū strikes Yorktown — dive bombers
19. Yorktown hit, damage control restores power
20. Second strike — torpedo bombers
21. Enterprise SBDs find Hiryū — fourth carrier ablaze

### Phase 7 — Aftermath (June 4–7)
22. Sinking of the four carriers
23. Yamamoto's retreat, Mikuma sunk
24. Yorktown's end — I-168 torpedo
25. The turning point — final overview

## Data Sources (dataSources array)
1. Parshall & Tully, *Shattered Sword* (2005)
2. Symonds, *The Battle of Midway* (2011)
3. Lundstrom, *The First Team* (1984)
4. ONI Combat Narrative: Battle of Midway (1943)
5. *Senshi Sōsho* Vol. 43, via Zimm translation excerpts
6. Cressman, *A Glorious Page in Our History* (1990)

## File Structure
- `examples/battle-of-midway.html` — single self-contained page
- Entry added to `examples/index.html` gallery

## Technical Notes
- No build step required — uses importmap like all other examples
- All step data defined inline in a JS `STEPS` array
- Uses `viewer.setMarkers()`, `viewer.setPaths()`, `viewer.setArcs()`, `viewer.flyTo()`
- Scene `dataSources` populated for viewer's built-in attribution panel
