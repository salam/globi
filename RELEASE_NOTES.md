# Release Notes

## Version 1.0.10 (Sun, Mar 16 07:00)

* New scene graph panel lists all markers, arcs, paths, and regions in a collapsible tree
* Scene graph docks left (sidebar) or right (top of properties panel) — toggle via dock button
* Panel auto-shows briefly when selecting entities on the globe, pin to keep it open
* Click, Ctrl+click, and Shift+click selection with bidirectional sync to the globe
* Eye icon toggles entity visibility — hidden entities are skipped by the renderer
* "Show Hidden Objects" in View menu to see hidden items semi-transparently in studio
* Right-click context menu on entities: Rename, Duplicate, Delete, Toggle Visibility
* Double-click to rename entities inline in the tree
* Drag to reorder entities within groups (changes render order)
* Duplicate now works for arcs, paths, and regions (was markers only)
* Keyboard shortcut: G to toggle the scene graph panel

## Version 1.0.9 (Sun, Mar 16 03:00)

* New "Copy as image" option in right-click context menu — copies a clean globe screenshot to clipboard
* Globes now auto-generate a preview thumbnail when publishing or editing in the community
* Auto-thumbnails capture the globe at 1200×630 with a slight zoom-out for flexible cropping
* Users can reframe and retake the auto-generated thumbnail, or upload a custom one
* New `captureScreenshot()` API on `<globi-viewer>` for programmatic globe image capture
* New `scene-loaded` event fires when the globe is ready for interaction or capture

## Version 1.0.8 (Sat, Mar 15 23:00)

* Fixed scale bar not hiding when disabled in Viewer UI settings
* Fixed data source editor and filter editor not opening when Studio runs as an overlay
* Data sources can now be edited inline in the properties panel — no more separate modal
* Filters can now be edited inline in the properties panel with category checkboxes and auto-generate
* Added "Reset" buttons to each section header in the properties panel to restore default values
* Disabling the Attribution toggle now shows a license warning about data usage rights
* New "Legend Open" option in Viewer UI lets authors show the legend initially open instead of collapsed

## Version 1.0.7 (Sat, Mar 15 19:00)

* Fixed marker placement accuracy — markers now drop exactly where you click instead of shifting southward
* Freehand drawing now shows the line in real-time as you draw, not just after releasing
* Arc tool shows a live arc preview following your cursor after the first click
* Path and Region tools now display dots and lines as you click waypoints/vertices
* Fixed tool previews not appearing during hover (arc/path/region tools now respond between clicks)
* Lat/lon coordinates shown at the bottom of the globe when hovering over the surface
* Arc height and stroke width are now editable in the properties panel
* Path stroke width is now editable in the properties panel
* Drag the orange handle at an arc's apex to adjust its height visually

## Version 1.0.6 (Sat, Mar 15 15:00)

* Globe authors can now delete their own globes from the detail page
* Deleted globes are kept in a recycle bin for 30 days before permanent removal
* Authors can restore deleted globes at any time during the 30-day window
* New "Recycle Bin" page accessible from the user profile
* Permanent delete option for authors who want to remove a globe immediately
* Daily automatic cleanup of expired trashed globes (older than 30 days)

## Version 1.0.5 (Sat, Mar 15 07:15)

* SEO-friendly URLs for community globes (`/community/globe/:id/your-globe-title`)
* Dynamic meta tags (Open Graph, Twitter Card) for rich link previews when sharing globes
* JSON-LD structured data (CreativeWork, FAQ, Breadcrumbs) for search engine rich snippets
* Collapsible scene description with marker locations, data source attributions
* FAQ section on every globe page with microformats support
* Dynamic XML sitemap for all public community globes
* Fallback Open Graph image when no thumbnail is available
* Server-side 301 redirects from bare ID URLs to canonical slug URLs

## Version 1.0.4 (Fri, Mar 14 20:45)

* Profile picture support: users can upload a custom avatar or use their Gravatar
* Explicit choice UI in profile edit — "Upload photo" or "Use Gravatar" buttons
* Avatars displayed in navbar, globe cards, detail pages, and profile pages
* Gravatar integration uses SHA-256 (Web Crypto API, zero dependencies)
* Fallback chain: uploaded photo → Gravatar → initials placeholder
