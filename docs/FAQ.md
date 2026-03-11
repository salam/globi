# FAQ

## Where do the planet textures come from?

Surface textures for Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and the Moon come from [Solar System Scope](https://www.solarsystemscope.com/textures/) under the CC-BY 4.0 license. Textures for Io, Europa, Ganymede, and Titan come from NASA/JPL mission data (public domain). Full attribution is in `assets/textures/CREDITS.md`.

## Is this only for Earth?
No. Earth is the default, and you can toggle built-in presets for all 8 planets plus 5 popular moons (`moon`, `io`, `europa`, `ganymede`, `titan`). You can still set custom planet values manually.

## Do I need React or Vue?
No. The main viewer is a Web Component (`<globe-viewer>`), so plain HTML works.

## Can I add my own marker icons?
Yes. Use marker `visualType: "image"` and set `assetUri`.

## Can markers be plain text on the globe?
Yes. Use marker `visualType: "text"` and set the marker `name`. The label is rendered directly on the globe.

## Can I add moving objects?
Yes. Use animations with keyframes and `loop: true/false`.

## Is keyboard control supported?
Yes. Arrow keys move the view, and `+` / `-` zoom.

## Is there a compass and distance scale?
Yes. The bottom-right HUD includes an arrow-only compass that points north, plus a zoom-based scale bar in kilometers.

## Does the globe rotate by itself when idle?
Yes. When idle, the globe rotates slowly using the selected planet/moon preset rotation direction and speed.

## Can I edit objects directly by clicking them?
Yes. Enable inspect mode, click an object on the globe, and edit it directly in the inline inspect panel. The panel opens near the selected object, and marker edits stay visually anchored to the marker position while moving the camera.

## Does legend selection jump or animate?
Legend marker selection animates camera rotation/pan to the target marker instead of jumping instantly.

## Can I place markers by typing place names?
Yes. The editor includes OSM Nominatim lookup. Search for a prose place name and drop a pin from the result list.

## Are there prebuilt example scenes I can load?
Yes. The editor ships with one-click examples for capitals, continents+seas, ISS position/orbit, and open-source context presets for Ukraine conflict and aircraft carrier references. Each example includes full landmass shapes and a low-resolution NASA Earth texture. The ISS example also includes timestamped dot markers for recent historical positions.

## How are marker colors chosen if I do not set one?
For `dot` markers, colors are auto-assigned from a 10-color color-blind-safe palette. After 10, the system uses shade variants of those colors.

## Can I use the sun position as the globe light source?
Yes. In the editor, enable `Use sun position for sphere lighting`. This switches from the fixed light to sun-position-based lighting (`planet.lightingMode: "sun"`).

## Why do the Ukraine and carrier examples avoid live tactical positions?
Those presets intentionally stay non-tactical and context-oriented. Public military telemetry is often restricted, delayed, or unreliable, and the examples are designed for general visualization rather than operational tracking.

## Which sources are used for the aircraft carriers example?
The aircraft carrier snapshot uses publicly accessible references from MarineVesselTraffic, GoNavy, CruisingEarth, VesselFinder, and MarineTraffic. Marker coordinates use AIS-region anchors (not homeports), and source links are embedded in the example advisory marker.

## Is fullscreen supported?
Yes. Use the fullscreen button on the globe UI.

## Can I choose which viewer controls are shown, and use icons instead of text?
Yes. In the editor, open `Viewer UI` and toggle each control (body selector, fullscreen, legend, inspect, compass, km scale). You can also switch button labels between `Text` and `Icons`. Changes are applied immediately in the viewer preview. In JSON this is stored in `viewerUi`.

## Can I import GeoJSON?
Yes. Import/export GeoJSON is included.

## Can I import OSM PBF and Shapefiles directly?
Not yet. Those adapters are declared, but parser integration is pending.

## Is USDZ export production-ready?
Not yet. A placeholder export contract exists for future integration.

## Is user HTML safe in callouts?
The runtime sanitizes callout HTML to reduce XSS risk.
