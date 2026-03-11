# Web-component 3D Globe - Product Requirements & Implementation Blueprint

## Übersicht
Diese Produktanforderungsdokumentation (PRD) beschreibt ein leichtgewichtiges Web-Bauteil, das eine drehbare 3D-Kugel (Standard: Erde) bereitstellt.

Schwerpunkte:
- Gute Performance in modernen Browsern.
- Responsives Design für Desktop und Mobile.
- Klare API für Einbettung in Webseiten und Frameworks.
- Interaktivität (Rotation, Zoom, Auswahl).
- Mehrsprachigkeit.
- Erweiterbare Datenstrukturen für Marker, Pfade, Regionen und Animationen.
- WYSIWYG-Editor für Content-Ersteller.
- Import/Export von Geodaten.

## Ziele und Kennzahlen
- **Interaktive Kugel**: Sphärische Erde mit texturierter Oberfläche und stabiler Framerate.
- **Vielseitige Marker**: Marker über `lat/lon/elevation`, Visualtypen `dot|image|model`.
- **Datenvisualisierung**: Gebogene Pfade (z. B. Flugrouten), Bögen und extrudierte Regionen.
- **Animations-API**: Zeitabhängige Eigenschaften (Start/Ende, Keyframes).
- **WYSIWYG-Editor**: Browseroberfläche für Erstellen/Bearbeiten/Verwalten inklusive Vorschau.
- **Import/Export**: GIS-Import (GeoJSON/OSM/Shapefile) und Szenenexport (OBJ/USDZ, JSON/GeoJSON).
- **Andere Himmelskörper**: Voreinstellungen plus frei definierbare Kugeln (Radius/Textur/Farbe).

## Zielgruppen und Anwendungsfälle
- **Nachrichten- und Bildungsportale**: Geografische Ereignisse, Klimadaten, Routen.
- **Tourismus- und Event-Plattformen**: Attraktionen, Routen, klickbare Marker mit Medien.
- **Luft- und Raumfahrtunternehmen**: Flug-/Satellitendaten mit zeitlicher Animation.
- **Bildungsprojekte**: Planeten/Monde oder fiktive Himmelskörper für Lernzwecke.

## Funktionale Anforderungen

### Globus-Anzeige
| Anforderung | Beschreibung |
|---|---|
| 3D-Kugel mit Textur | Equirektangulare Textur, optional Bump-/Normal-Mapping. |
| Rotation/Zoom | Maus, Touch, Tastatur inkl. Trägheit/Inertia. |
| Vollbildmodus | Fullscreen-Toggle + ESC-Listener. |
| Responsive Design | Anpassung an Containergröße; Mobile und Desktop. |
| Mehrsprachigkeit | UI-Texte via i18n-System; Markerbeschreibungen mehrsprachig. |
| Andere Planeten | Parametrisierbare Planeten (Radius, Textur, Rotation). |
| Einbettung | Als Web Component in HTML/React/Vue nutzbar. |

### Datenobjekte

#### Marker
- Felder: `id`, `name`, `description`, `lat`, `lon`, `alt`, `visualType`, `assetUri`, `callout`, `movements[]`
- Zweck: Punkt im Raum, optional zeitabhängige Bewegung.

#### Pfad (Path)
- Felder: `id`, `name`, `points[]`, `color`, `strokeWidth`, `dashPattern`, `animationDuration`
- Zweck: Linie über mehrere Punkte, optional animiertes Dash-Verhalten.

#### Bogen (Arc)
- Felder: `id`, `start`, `end`, `maxAltitude`, `color`, `strokeWidth`, `dashPattern`, `animationTime`
- Zweck: Direkte Verbindung zwischen zwei Orten mit Höhe über Oberfläche.

#### Region/Fläche
- Felder: `id`, `name`, `geojson`, `capColor`, `sideColor`, `altitude`
- Zweck: Extrudierte Polygone (Polygon/MultiPolygon).

#### Animation
- Felder: `entityId`, `keyframes[]`, `loop`
- Zweck: Zeitbasierte Veränderung von Position/Rotation/Skalierung.

### Interaktion & UI
- Drehen/Zoomen per Drag/Pinch/Scroll/Tastatur.
- Doppelklick zum Zentrieren auf Marker.
- Klick auf Marker öffnet Callout (Titel, Beschreibung, optional Bild/HTML/Markdown).
- API-Methode zum animierten `flyTo` auf Marker.
- Legende/Key mit filterbarer Marker-Liste; Eintrag zoomt zum Marker.
- Editor-Modus für Marker/Bögen/Pfade/Regionen inkl. Zeitleiste und Mehrsprachigkeit.

### Import/Export
- **GIS-Import**: GeoJSON, Shapefile, OSM-PBF.
- **Modell-Export**: OBJ/USDZ.
- **Daten-Export**: JSON/GeoJSON für alle Entitäten + Animationen.

## Nicht-funktionale Anforderungen
- **Performance**: Zielgröße bis ca. `1,000` Marker + `100` Pfade bei flüssiger Darstellung.
- **Kompatibilität**: Chrome, Firefox, Safari, Edge + mobile Browser.
- **Barrierefreiheit**: Tastatursteuerung und Screenreader-fähige Callouts.
- **Security**: XSS-Schutz durch Sanitization in Callouts.
- **Internationalisierung**: Startsprachen `en`, `de`, `fr`, `it`, später erweiterbar.

## Implementierungs-Blueprint

### Technologieauswahl
- **Rendering**: WebGL mit Three.js; optional Globe.gl/Cesium-Konzepte für bestimmte Layer.
- **Komponente**: Custom Element, z. B. `<globe-viewer>`.
- **State-Management**: Zentraler `SceneStore` für Entitäten + Animationen.
- **Editor**: Separate React- oder Vue-App mit Vorschau.
- **i18n**: JSON-Sprachdateien via i18n-Library.
- **Persistenz**: IndexedDB + Export/Import; später optional REST-API.

### Komponentenarchitektur
- **GlobeRenderer**: Szene, Kamera, Licht, Texturen, Layer-Management, Events.
- **MarkerManager**: Dot/Billboard/3D-Modelle, Bewegungsinterpolation.
- **PathManager + ArcManager**: Kurvenberechnung, Dash-Animation, Linien/Tube-Geometrien.
- **RegionManager**: GeoJSON -> Geometrie, Extrusion, Materialien.
- **LegendComponent**: Filterbare Markerübersicht mit Navigation.
- **EditorApp**: Formulare, Zeitleiste, Import-/Export-Dialoge.

### Datenfluss und API

#### Initialisierung
```html
<globe-viewer id="world" planet="earth" language="de"></globe-viewer>
<script>
  const globe = document.getElementById('world');
  globe.setMarkers([
    {
      id: 'zrh',
      name: 'Zurich',
      lat: 47.3769,
      lon: 8.5417,
      alt: 0.02,
      visualType: 'dot',
      color: '#ff0000'
    }
  ]);

  globe.setArcs([
    {
      id: 'route1',
      start: { lat: 47.3769, lon: 8.5417, alt: 0.02 },
      end: { lat: 40.7128, lon: -74.0060, alt: 0.02 },
      color: '#00aaff'
    }
  ]);
</script>
```

#### Events
- `markerClick`
- `regionHover`
- `animationComplete`

#### Editor-Integration
- Gemeinsame Datenstruktur `projectData`.
- Persistenz via Serialisierung nach JSON/GeoJSON.

## Zeitplan und Meilensteine
- **Phase 1 (4 Wochen)**: Tech-Stack, Web Component, Kugel + Basisinteraktion + Datenmodell.
- **Phase 2 (4 Wochen)**: Bögen/Pfade/Regionen, Animations-API, 3D-Modellmarker.
- **Phase 3 (4 Wochen)**: WYSIWYG-Editor, Zeitleiste, Import/Export, i18n.
- **Phase 4 (2 Wochen)**: Performance-, Accessibility- und End-to-End-Tests; Export-Finalisierung.

## Vorhandene Projekte / Wettbewerbsanalyse
- **Globe.gl**: Starke Datenlayer (Punkte, Bögen, Polygone, Pfade), kein integrierter Editor.
- **MapTiler SDK JS**: 3D-Globus-Projektion + Marker-Layout; Fokus stärker auf Karten-Ökosystem.
- **CesiumJS**: Sehr mächtig für geospatial + Zeitdaten + 3D-Modelle; höhere Komplexität.

## Schlussbemerkung
Dieses PRD definiert eine modulare, performante und erweiterbare 3D-Globus-Komponente inklusive Editor. Die Kombination aus sauberer API, datengetriebener Architektur und klaren Meilensteinen schafft eine umsetzbare Grundlage für Entwicklung und Iteration.

## Referenzen
- `[1][3][5][11]` Creating Entities - Cesium: <https://cesium.com/learn/cesiumjs-learn/cesiumjs-creating-entities/>
- `[2][4][6][7][8][9][10][12][13][14][15][16][17][18][19]` Globe.gl: <https://globe.gl/>
- `[20]` MapTiler SDK JS, Globe Marker Layout: <https://docs.maptiler.com/sdk-js/examples/globe-marker-layout/>
