import { registerGlobiViewer } from '../src/components/globi-viewer.js';
import { loadIssRealtimeExample } from '../src/examples/loaders.js';

/* ─────────────────────────────────────────────
   i18n — all translatable strings
   ───────────────────────────────────────────── */
const T = {
  en: {
    'page.title': '\ud83c\udf0d Globi \u2014 Interactive Globes for Journalism and Education',
    'hero.title': 'Globi \u2014 Interactive globes for journalism and education',
    'hero.subtitle': 'Drop a single HTML tag into any page. Feed it a JSON scene. Get a fully interactive globe with markers, paths, and real-time data.',
    'hero.cta_editor': 'Try the Editor',
    'hero.cta_github': 'View on GitHub',
    'hero.install': 'Or install via npm: <code>npm install globi-viewer</code>',
    'ex1.label': 'Geopolitical Intelligence',
    'ex1.caption': 'USS Eisenhower carrier strike group, Strait of Hormuz — data via open-source intelligence',
    'ex2.label': 'Historical Storytelling',
    'ex2.step1.title': 'The Fleets Converge',
    'ex2.step1.text': 'Admiral Nagumo\u2019s Kid\u014d Butai \u2014 four fleet carriers \u2014 approaches Midway from the northwest. Unknown to the Japanese, Admiral Spruance\u2019s Task Force 16 and Fletcher\u2019s Task Force 17 lie in ambush northeast of the atoll, forewarned by codebreakers at Station HYPO.',
    'ex2.step2.title': 'The Fatal Five Minutes',
    'ex2.step2.text': 'SBD Dauntless dive-bombers from Enterprise and Yorktown plunge through broken clouds. In five minutes, three Japanese carriers \u2014 Akagi, Kaga, and S\u014dry\u016b \u2014 are ablaze. The tide of the Pacific War turns in a single, devastating strike.',
    'ex3.label': 'Real-Time Data',
    'ex3.caption': 'International Space Station \u2014 live position via open API',
    'adv.oss.title': 'Open Source',
    'adv.oss.text': 'MIT licensed. Use it commercially, modify it, embed it anywhere. No API keys, no vendor lock-in, no tracking.',
    'adv.a11y.title': 'Accessible',
    'adv.a11y.text': 'Full keyboard navigation, screen reader support, color-blind-safe palette. Built for everyone, not just mouse users.',
    'adv.embed.title': 'No Build Step',
    'adv.embed.text': 'One HTML tag. One JSON scene. Works in any page \u2014 no bundler, no framework, no configuration required.',
    'adv.editor.title': 'Visual Editor',
    'adv.editor.text': 'Non-technical creators use the WYSIWYG editor to build scenes. Point, click, export JSON, embed anywhere.',
    'features.title': 'Everything you need to tell stories with geography',
    'feat.bodies': '13 celestial bodies',
    'feat.themes': '5 visual themes',
    'feat.projections': '3 flat-map projections',
    'feat.realtime': 'Real-time data binding',
    'feat.json': 'JSON scene format',
    'feat.agent': 'AI agent API',
    'feat.i18n': '7 languages',
    'feat.attribution': 'Data attribution',
    'feat.clustering': 'Callout clustering',
    'feat.arcs': 'Great-circle arcs',
    'feat.geojson': 'GeoJSON regions',
    'feat.scrolly': 'Scrollytelling',
    'feat.keyboard': 'Keyboard-first',
    'feat.sr': 'Screen reader',
    'feat.export': 'JSON + GeoJSON export',
    'cmp.title': 'How Globi compares',
    'cmp.feature': 'Feature',
    'cmp.license': 'License',
    'cmp.embed': 'Embed complexity',
    'cmp.accessibility': 'Accessibility',
    'cmp.offline': 'Offline capable',
    'cmp.scrolly': 'Scrollytelling',
    'cmp.editor_col': 'Visual editor',
    'cmp.bodies': 'Celestial bodies',
    'cmp.realtime': 'Real-time data',
    'cmp.one_tag': '1 HTML tag',
    'cmp.iframe': 'iframe + API key',
    'cmp.npm': 'npm + config',
    'cmp.api_key': 'API key + token',
    'cmp.code': 'Code required',
    'cmp.full': 'Full',
    'cmp.partial': 'Partial',
    'cmp.minimal': 'Minimal',
    'cmp.manual': 'Manual',
    'cmp.yes': 'Yes',
    'cmp.no': 'No',
    'cmp.builtin': 'Built-in',
    'cmp.limited': 'Limited',
    'cmp.earth_only': 'Earth only',
    'cmp.earth_moon': 'Earth + Moon',
    'cmp.earth_2d': 'Earth (2D)',
    'cmp.studio': 'Studio (separate)',
    'cmp.studio_paid': 'Studio (paid)',
    'faq.title': 'Frequently asked questions',
    'faq.q1': 'Do I need to code?',
    'faq.a1': 'No. Use the visual editor to create scenes, export JSON, and embed with a single HTML tag. Content creators need zero programming knowledge.',
    'faq.q2': 'Can I use it commercially?',
    'faq.a2': 'Yes. Globi is MIT licensed \u2014 free for commercial and non-commercial use with no restrictions.',
    'faq.q3': 'How does it compare to Google Earth?',
    'faq.a3': 'Google Earth is proprietary and requires API keys. Globi is open-source, embeds with one tag, has built-in accessibility, scrollytelling, and works offline.',
    'faq.q4': 'Does it work on mobile?',
    'faq.a4': 'Yes. Touch navigation, responsive layout, and progressive texture loading ensure smooth performance on phones and tablets.',
    'faq.q5': 'Can I show real-time data?',
    'faq.a5': 'Yes. Bind live data sources \u2014 satellite positions, vessel feeds, conflict maps \u2014 to markers with automatic position updates.',
    'faq.q6': 'Is it accessible?',
    'faq.a6': 'Fully. Keyboard-first interaction, screen reader descriptions via aria-live, color-blind-safe palette, and real HTML callout text you can select and copy.',
    'faq.q7': 'What data formats does it support?',
    'faq.a7': 'JSON scenes (native format), GeoJSON import and export, OBJ mesh export. Markers, paths, arcs, and regions are all configurable via JSON.',
    'faq.q8': 'Can I use it for historical storytelling?',
    'faq.a8': 'Yes. Scrollytelling support lets you pair a scrolling narrative with camera fly-to transitions and marker animations \u2014 no external libraries needed.',
    'faq.q9': 'How do I embed it?',
    'faq.a9': 'Load from CDN with <script src="https://unpkg.com/globi-viewer/dist/globi.min.js"></script>, or install via npm: npm install globi-viewer. Then place <globi-viewer scene="scene.json"></globi-viewer> in your HTML.',
    'faq.q10': 'Can AI agents interact with it?',
    'faq.a10': 'Yes. Globi exposes a 28-command agent API via window.globi, plus DOM data attributes and an llms.txt endpoint for machine discovery.',
    'faq.q11': 'How much does it cost?',
    'faq.a11': 'Globi is completely free and open-source. If you use it and would like to give something back, consider donating through GitHub Sponsors.',
    'footer.tagline': 'MIT License \u2014 Made for journalists, educators, and storytellers.',
    'footer.links': 'Links',
    'footer.sponsor': 'Sponsor',
    'footer.editor': 'Editor',
    'footer.examples': 'Examples',
    'footer.agents': 'For AI agents',
    'footer.agents_note': 'Machine-readable project description and agent interaction guide.',
    'newsletter.title': 'Stay in the Loop',
    'newsletter.subtitle': 'Get updates on new features, examples, and globe wisdom. No spam, unsubscribe anytime.',
    'newsletter.button': 'Subscribe',
  },
  de: {
    'page.title': '\ud83c\udf0d Globi \u2014 Interaktive Globen f\u00fcr Journalismus und Bildung',
    'hero.title': 'Globi \u2014 Interaktive Globen f\u00fcr Journalismus und Bildung',
    'hero.subtitle': 'Ein einziges HTML-Tag in jede Seite einf\u00fcgen. Eine JSON-Szene laden. Einen voll interaktiven Globus mit Markern, Pfaden und Echtzeitdaten erhalten.',
    'hero.cta_editor': 'Editor ausprobieren',
    'hero.cta_github': 'Auf GitHub ansehen',
    'hero.install': 'Oder per npm installieren: <code>npm install globi-viewer</code>',
    'ex1.label': 'Geopolitische Aufkl\u00e4rung',
    'ex1.caption': 'USS Eisenhower Tr\u00e4gerkampfgruppe, Stra\u00dfe von Hormus \u2014 Beispieldaten',
    'ex2.label': 'Historisches Erz\u00e4hlen',
    'ex2.step1.title': 'Die Flotten n\u00e4hern sich',
    'ex2.step1.text': 'Admiral Nagumos Kid\u014d Butai \u2014 vier Flottentr\u00e4ger \u2014 n\u00e4hert sich Midway von Nordwesten. Den Japanern unbekannt lauern Admiral Spruances Task Force 16 und Fletchers Task Force 17 nord\u00f6stlich des Atolls, gewarnt von Codeknackern der Station HYPO.',
    'ex2.step2.title': 'Die entscheidenden f\u00fcnf Minuten',
    'ex2.step2.text': 'SBD Dauntless-Sturzkampfbomber von Enterprise und Yorktown sto\u00dfen durch aufgebrochene Wolken. In f\u00fcnf Minuten stehen drei japanische Tr\u00e4ger \u2014 Akagi, Kaga und S\u014dry\u016b \u2014 in Flammen.',
    'ex3.label': 'Echtzeitdaten',
    'ex3.caption': 'Internationale Raumstation \u2014 Live-Position via offener API',
    'adv.oss.title': 'Open Source',
    'adv.oss.text': 'MIT-lizenziert. Kommerziell nutzbar, modifizierbar, \u00fcberall einbettbar. Keine API-Schl\u00fcssel, kein Vendor Lock-in.',
    'adv.a11y.title': 'Barrierefrei',
    'adv.a11y.text': 'Volle Tastaturnavigation, Screenreader-Unterst\u00fctzung, farbenblindensichere Palette. F\u00fcr alle gebaut.',
    'adv.embed.title': 'Kein Build-Schritt',
    'adv.embed.text': 'Ein HTML-Tag. Eine JSON-Szene. Funktioniert in jeder Seite \u2014 kein Bundler, kein Framework, keine Konfiguration.',
    'adv.editor.title': 'Visueller Editor',
    'adv.editor.text': 'Nicht-technische Ersteller nutzen den WYSIWYG-Editor. Klicken, JSON exportieren, \u00fcberall einbetten.',
    'features.title': 'Alles, was Sie brauchen, um Geschichten mit Geografie zu erz\u00e4hlen',
    'cmp.title': 'Wie Globi im Vergleich abschneidet',
    'faq.title': 'H\u00e4ufig gestellte Fragen',
    'faq.q1': 'Muss ich programmieren?',
    'faq.a1': 'Nein. Nutzen Sie den visuellen Editor, exportieren Sie JSON und betten Sie es mit einem einzigen HTML-Tag ein.',
    'faq.q2': 'Darf ich es kommerziell nutzen?',
    'faq.a2': 'Ja. Globi ist MIT-lizenziert \u2014 frei f\u00fcr kommerzielle und nicht-kommerzielle Nutzung.',
    'faq.q3': 'Wie unterscheidet es sich von Google Earth?',
    'faq.a3': 'Google Earth ist propriet\u00e4r und erfordert API-Schl\u00fcssel. Globi ist Open-Source, l\u00e4sst sich mit einem Tag einbetten, bietet integrierte Barrierefreiheit, Scrollytelling und funktioniert offline.',
    'faq.q4': 'Funktioniert es auf Mobilger\u00e4ten?',
    'faq.a4': 'Ja. Touch-Navigation, responsives Layout und progressives Textur-Laden sorgen f\u00fcr fl\u00fcssige Leistung auf Handys und Tablets.',
    'faq.q5': 'Kann ich Echtzeitdaten anzeigen?',
    'faq.a5': 'Ja. Binden Sie Live-Datenquellen \u2014 Satellitenpositionen, Schiffsbewegungen, Konfliktdaten \u2014 an Marker mit automatischer Positionsaktualisierung.',
    'faq.q6': 'Ist es barrierefrei?',
    'faq.a6': 'Vollst\u00e4ndig. Tastaturgesteuerte Interaktion, Screenreader-Beschreibungen via aria-live, farbenblindensichere Palette und echte HTML-Callout-Texte zum Markieren und Kopieren.',
    'faq.q7': 'Welche Datenformate werden unterst\u00fctzt?',
    'faq.a7': 'JSON-Szenen (natives Format), GeoJSON-Import und -Export, OBJ-Mesh-Export. Marker, Pfade, B\u00f6gen und Regionen sind alle per JSON konfigurierbar.',
    'faq.q8': 'Kann ich es f\u00fcr historisches Erz\u00e4hlen nutzen?',
    'faq.a8': 'Ja. Scrollytelling-Unterst\u00fctzung erm\u00f6glicht es, eine scrollbare Erz\u00e4hlung mit Kamera-\u00dcberfl\u00fcgen und Marker-Animationen zu verbinden \u2014 ohne externe Bibliotheken.',
    'faq.q9': 'Wie bette ich es ein?',
    'faq.a9': 'Per CDN laden mit <script src="https://unpkg.com/globi-viewer/dist/globi.min.js"></script>, oder per npm installieren: npm install globi-viewer. Dann <globi-viewer scene="scene.json"></globi-viewer> in Ihr HTML einf\u00fcgen.',
    'faq.q10': 'K\u00f6nnen KI-Agenten damit interagieren?',
    'faq.a10': 'Ja. Globi bietet eine 28-Befehle-Agenten-API \u00fcber window.globi, plus DOM-Datenattribute und einen llms.txt-Endpunkt f\u00fcr maschinelle Erkennung.',
    'faq.q11': 'Was kostet es?',
    'faq.a11': 'Globi ist komplett kostenlos und Open-Source. Wenn Sie es nutzen und etwas zur\u00fcckgeben m\u00f6chten, erw\u00e4gen Sie eine Spende \u00fcber GitHub Sponsors.',
    'footer.tagline': 'MIT-Lizenz \u2014 F\u00fcr Journalisten, P\u00e4dagogen und Geschichtenerz\u00e4hler.',
    'footer.links': 'Links',
    'footer.sponsor': 'Sponsoren',
    'footer.editor': 'Editor',
    'footer.examples': 'Beispiele',
    'footer.agents': 'F\u00fcr KI-Agenten',
    'footer.agents_note': 'Maschinenlesbare Projektbeschreibung und Agenten-Interaktionsleitfaden.',
    'newsletter.title': 'Bleib auf dem Laufenden',
    'newsletter.subtitle': 'Erhalte Updates zu neuen Features, Beispielen und Globus-Wissen. Kein Spam, jederzeit abbestellbar.',
    'newsletter.button': 'Abonnieren',
  },
  fr: {
    'page.title': '\ud83c\udf0d Globi \u2014 Globes interactifs pour le journalisme et l\u2019\u00e9ducation',
    'hero.title': 'Globi \u2014 Globes interactifs pour le journalisme et l\u2019\u00e9ducation',
    'hero.subtitle': 'Ins\u00e9rez une seule balise HTML dans n\u2019importe quelle page. Chargez une sc\u00e8ne JSON. Obtenez un globe enti\u00e8rement interactif avec marqueurs, chemins et donn\u00e9es en temps r\u00e9el.',
    'hero.cta_editor': 'Essayer l\u2019\u00e9diteur',
    'hero.cta_github': 'Voir sur GitHub',
    'hero.install': 'Ou installer via npm\u00a0: <code>npm install globi-viewer</code>',
    'ex1.label': 'Renseignement g\u00e9opolitique',
    'ex1.caption': 'Groupe a\u00e9ronaval USS Eisenhower, D\u00e9troit d\u2019Ormuz \u2014 donn\u00e9es de sources ouvertes',
    'ex2.label': 'R\u00e9cit historique',
    'ex2.step1.title': 'Les flottes convergent',
    'ex2.step1.text': 'Le Kid\u014d Butai de l\u2019amiral Nagumo \u2014 quatre porte-avions \u2014 approche Midway par le nord-ouest. Les Japonais ignorent que les Task Forces 16 et 17 de Spruance et Fletcher les attendent au nord-est de l\u2019atoll.',
    'ex2.step2.title': 'Les cinq minutes fatales',
    'ex2.step2.text': 'Les bombardiers en piqu\u00e9 SBD Dauntless plongent \u00e0 travers les nuages. En cinq minutes, trois porte-avions japonais sont en flammes. Le cours de la guerre du Pacifique bascule.',
    'ex3.label': 'Donn\u00e9es en temps r\u00e9el',
    'ex3.caption': 'Station spatiale internationale \u2014 position en direct via API ouverte',
    'features.title': 'Tout ce qu\u2019il faut pour raconter des histoires avec la g\u00e9ographie',
    'cmp.title': 'Comment Globi se compare',
    'faq.title': 'Questions fr\u00e9quentes',
    'faq.q1': 'Faut-il savoir coder\u00a0?',
    'faq.a1': 'Non. Utilisez l\u2019\u00e9diteur visuel pour cr\u00e9er des sc\u00e8nes, exporter du JSON et int\u00e9grer avec une seule balise HTML. Aucune connaissance en programmation n\u2019est n\u00e9cessaire.',
    'faq.q2': 'Puis-je l\u2019utiliser \u00e0 des fins commerciales\u00a0?',
    'faq.a2': 'Oui. Globi est sous licence MIT \u2014 libre pour un usage commercial et non commercial, sans restriction.',
    'faq.q3': 'Comment se compare-t-il \u00e0 Google Earth\u00a0?',
    'faq.a3': 'Google Earth est propri\u00e9taire et n\u00e9cessite des cl\u00e9s API. Globi est open-source, s\u2019int\u00e8gre avec une balise, offre l\u2019accessibilit\u00e9 int\u00e9gr\u00e9e, le scrollytelling et fonctionne hors ligne.',
    'faq.q4': 'Fonctionne-t-il sur mobile\u00a0?',
    'faq.a4': 'Oui. Navigation tactile, mise en page responsive et chargement progressif des textures assurent des performances fluides sur t\u00e9l\u00e9phones et tablettes.',
    'faq.q5': 'Peut-on afficher des donn\u00e9es en temps r\u00e9el\u00a0?',
    'faq.a5': 'Oui. Connectez des sources de donn\u00e9es en direct \u2014 positions satellites, flux maritimes, cartes de conflits \u2014 aux marqueurs avec mise \u00e0 jour automatique.',
    'faq.q6': 'Est-il accessible\u00a0?',
    'faq.a6': 'Enti\u00e8rement. Interaction au clavier, descriptions pour lecteurs d\u2019\u00e9cran via aria-live, palette adapt\u00e9e aux daltoniens et textes HTML s\u00e9lectionnables et copiables.',
    'faq.q7': 'Quels formats de donn\u00e9es sont support\u00e9s\u00a0?',
    'faq.a7': 'Sc\u00e8nes JSON (format natif), import et export GeoJSON, export de maillage OBJ. Marqueurs, chemins, arcs et r\u00e9gions sont tous configurables en JSON.',
    'faq.q8': 'Peut-on l\u2019utiliser pour la narration historique\u00a0?',
    'faq.a8': 'Oui. Le scrollytelling permet d\u2019associer un r\u00e9cit d\u00e9filant \u00e0 des transitions cam\u00e9ra et des animations de marqueurs \u2014 sans biblioth\u00e8que externe.',
    'faq.q9': 'Comment l\u2019int\u00e9grer\u00a0?',
    'faq.a9': 'Chargez via CDN avec <script src="https://unpkg.com/globi-viewer/dist/globi.min.js"></script>, ou installez via npm\u00a0: npm install globi-viewer. Puis placez <globi-viewer scene="scene.json"></globi-viewer> dans votre HTML.',
    'faq.q10': 'Les agents IA peuvent-ils interagir avec\u00a0?',
    'faq.a10': 'Oui. Globi expose une API de 28 commandes via window.globi, plus des attributs DOM et un endpoint llms.txt pour la d\u00e9couverte automatique.',
    'faq.q11': 'Combien \u00e7a co\u00fbte\u00a0?',
    'faq.a11': 'Globi est enti\u00e8rement gratuit et open-source. Si vous l\u2019utilisez et souhaitez contribuer en retour, pensez \u00e0 faire un don via GitHub Sponsors.',
    'footer.tagline': 'Licence MIT \u2014 Con\u00e7u pour les journalistes, \u00e9ducateurs et conteurs.',
    'footer.links': 'Liens',
    'footer.sponsor': 'Sponsoriser',
    'footer.editor': '\u00c9diteur',
    'footer.examples': 'Exemples',
    'footer.agents': 'Pour les agents IA',
    'footer.agents_note': 'Description machine du projet et guide d\u2019interaction pour agents.',
    'newsletter.title': 'Restez inform\u00e9',
    'newsletter.subtitle': 'Recevez les mises \u00e0 jour sur les nouvelles fonctionnalit\u00e9s, exemples et astuces. Pas de spam, d\u00e9sinscription \u00e0 tout moment.',
    'newsletter.button': 'S\u2019abonner',
  },
  es: {
    'page.title': '\ud83c\udf0d Globi \u2014 Globos interactivos para periodismo y educaci\u00f3n',
    'hero.title': 'Globi \u2014 Globos interactivos para periodismo y educaci\u00f3n',
    'hero.subtitle': 'Inserta una sola etiqueta HTML en cualquier p\u00e1gina. Carga una escena JSON. Obt\u00e9n un globo interactivo con marcadores, rutas y datos en tiempo real.',
    'hero.cta_editor': 'Probar el editor',
    'hero.cta_github': 'Ver en GitHub',
    'hero.install': 'O instalar con npm: <code>npm install globi-viewer</code>',
    'ex1.label': 'Inteligencia geopol\u00edtica',
    'ex1.caption': 'Grupo de combate del USS Eisenhower, Estrecho de Ormuz \u2014 datos de fuentes abiertas',
    'ex2.label': 'Narrativa hist\u00f3rica',
    'ex2.step1.title': 'Las flotas convergen',
    'ex2.step1.text': 'El Kid\u014d Butai del almirante Nagumo \u2014 cuatro portaaviones \u2014 se aproxima a Midway desde el noroeste. Los japoneses desconocen que las fuerzas de Spruance y Fletcher aguardan al noreste del atol\u00f3n.',
    'ex2.step2.title': 'Los cinco minutos fatales',
    'ex2.step2.text': 'Los bombarderos SBD Dauntless se lanzan en picada entre las nubes. En cinco minutos, tres portaaviones japoneses arden. El rumbo de la guerra del Pac\u00edfico cambia para siempre.',
    'ex3.label': 'Datos en tiempo real',
    'ex3.caption': 'Estaci\u00f3n Espacial Internacional \u2014 posici\u00f3n en vivo v\u00eda API abierta',
    'features.title': 'Todo lo que necesitas para contar historias con geograf\u00eda',
    'cmp.title': 'C\u00f3mo se compara Globi',
    'faq.title': 'Preguntas frecuentes',
    'faq.q1': '\u00bfNecesito saber programar?',
    'faq.a1': 'No. Usa el editor visual para crear escenas, exportar JSON e incrustar con una sola etiqueta HTML. No se necesitan conocimientos de programaci\u00f3n.',
    'faq.q2': '\u00bfPuedo usarlo comercialmente?',
    'faq.a2': 'S\u00ed. Globi tiene licencia MIT \u2014 libre para uso comercial y no comercial sin restricciones.',
    'faq.q3': '\u00bfC\u00f3mo se compara con Google Earth?',
    'faq.a3': 'Google Earth es propietario y requiere claves API. Globi es open-source, se incrusta con una etiqueta, tiene accesibilidad integrada, scrollytelling y funciona sin conexi\u00f3n.',
    'faq.q4': '\u00bfFunciona en m\u00f3viles?',
    'faq.a4': 'S\u00ed. Navegaci\u00f3n t\u00e1ctil, dise\u00f1o responsive y carga progresiva de texturas aseguran un rendimiento fluido en tel\u00e9fonos y tabletas.',
    'faq.q5': '\u00bfPuedo mostrar datos en tiempo real?',
    'faq.a5': 'S\u00ed. Conecta fuentes de datos en vivo \u2014 posiciones de sat\u00e9lites, rutas mar\u00edtimas, mapas de conflictos \u2014 a marcadores con actualizaci\u00f3n autom\u00e1tica.',
    'faq.q6': '\u00bfEs accesible?',
    'faq.a6': 'Completamente. Interacci\u00f3n por teclado, descripciones para lectores de pantalla via aria-live, paleta adaptada a daltonismo y textos HTML seleccionables y copiables.',
    'faq.q7': '\u00bfQu\u00e9 formatos de datos soporta?',
    'faq.a7': 'Escenas JSON (formato nativo), importaci\u00f3n y exportaci\u00f3n GeoJSON, exportaci\u00f3n de malla OBJ. Marcadores, rutas, arcos y regiones son configurables v\u00eda JSON.',
    'faq.q8': '\u00bfPuedo usarlo para narrativa hist\u00f3rica?',
    'faq.a8': 'S\u00ed. El scrollytelling permite combinar una narrativa con transiciones de c\u00e1mara y animaciones de marcadores \u2014 sin bibliotecas externas.',
    'faq.q9': '\u00bfC\u00f3mo lo incrusto?',
    'faq.a9': 'Carga desde CDN con <script src="https://unpkg.com/globi-viewer/dist/globi.min.js"></script>, o instala con npm: npm install globi-viewer. Luego coloca <globi-viewer scene="scene.json"></globi-viewer> en tu HTML.',
    'faq.q10': '\u00bfPueden los agentes IA interactuar con \u00e9l?',
    'faq.a10': 'S\u00ed. Globi expone una API de 28 comandos v\u00eda window.globi, m\u00e1s atributos DOM y un endpoint llms.txt para descubrimiento autom\u00e1tico.',
    'faq.q11': '\u00bfCu\u00e1nto cuesta?',
    'faq.a11': 'Globi es completamente gratuito y open-source. Si lo usas y quieres contribuir, considera donar a trav\u00e9s de GitHub Sponsors.',
    'footer.tagline': 'Licencia MIT \u2014 Hecho para periodistas, educadores y narradores.',
    'footer.links': 'Enlaces',
    'footer.sponsor': 'Patrocinar',
    'footer.editor': 'Editor',
    'footer.examples': 'Ejemplos',
    'footer.agents': 'Para agentes IA',
    'footer.agents_note': 'Descripci\u00f3n del proyecto legible por m\u00e1quinas y gu\u00eda de interacci\u00f3n para agentes.',
    'newsletter.title': 'Mantente al d\u00eda',
    'newsletter.subtitle': 'Recibe actualizaciones sobre nuevas funciones, ejemplos y sabidur\u00eda del globo. Sin spam, cancela cuando quieras.',
    'newsletter.button': 'Suscribirse',
  },
  it: {
    'page.title': '\ud83c\udf0d Globi \u2014 Globi interattivi per giornalismo e istruzione',
    'hero.title': 'Globi \u2014 Globi interattivi per giornalismo e istruzione',
    'hero.subtitle': 'Inserisci un solo tag HTML in qualsiasi pagina. Carica una scena JSON. Ottieni un globo interattivo con marcatori, percorsi e dati in tempo reale.',
    'hero.cta_editor': 'Prova l\u2019editor',
    'hero.cta_github': 'Vedi su GitHub',
    'hero.install': 'O installa tramite npm: <code>npm install globi-viewer</code>',
    'ex1.label': 'Intelligence geopolitica',
    'ex1.caption': 'Gruppo da battaglia USS Eisenhower, Stretto di Hormuz \u2014 dati da fonti aperte',
    'ex2.label': 'Narrazione storica',
    'ex3.label': 'Dati in tempo reale',
    'features.title': 'Tutto il necessario per raccontare storie con la geografia',
    'cmp.title': 'Come si confronta Globi',
    'faq.title': 'Domande frequenti',
    'faq.q1': 'Devo saper programmare?',
    'faq.a1': 'No. Usa l\u2019editor visuale per creare scene, esportare JSON e integrare con un solo tag HTML. Non servono conoscenze di programmazione.',
    'faq.q2': 'Posso usarlo a fini commerciali?',
    'faq.a2': 'S\u00ec. Globi \u00e8 sotto licenza MIT \u2014 libero per uso commerciale e non commerciale senza restrizioni.',
    'faq.q3': 'Come si confronta con Google Earth?',
    'faq.a3': 'Google Earth \u00e8 proprietario e richiede chiavi API. Globi \u00e8 open-source, si integra con un tag, offre accessibilit\u00e0 integrata, scrollytelling e funziona offline.',
    'faq.q4': 'Funziona su dispositivi mobili?',
    'faq.a4': 'S\u00ec. Navigazione touch, layout responsivo e caricamento progressivo delle texture garantiscono prestazioni fluide su telefoni e tablet.',
    'faq.q5': 'Posso mostrare dati in tempo reale?',
    'faq.a5': 'S\u00ec. Collega fonti dati live \u2014 posizioni satellitari, rotte navali, mappe di conflitti \u2014 ai marcatori con aggiornamento automatico della posizione.',
    'faq.q6': '\u00c8 accessibile?',
    'faq.a6': 'Completamente. Interazione da tastiera, descrizioni per screen reader via aria-live, palette adatta ai daltonici e testi HTML selezionabili e copiabili.',
    'faq.q7': 'Quali formati dati supporta?',
    'faq.a7': 'Scene JSON (formato nativo), importazione ed esportazione GeoJSON, esportazione mesh OBJ. Marcatori, percorsi, archi e regioni sono tutti configurabili via JSON.',
    'faq.q8': 'Posso usarlo per la narrazione storica?',
    'faq.a8': 'S\u00ec. Lo scrollytelling permette di abbinare un racconto scorrevole a transizioni di camera e animazioni dei marcatori \u2014 senza librerie esterne.',
    'faq.q9': 'Come lo integro?',
    'faq.a9': 'Carica da CDN con <script src="https://unpkg.com/globi-viewer/dist/globi.min.js"></script>, oppure installa via npm: npm install globi-viewer. Poi inserisci <globi-viewer scene="scene.json"></globi-viewer> nel tuo HTML.',
    'faq.q10': 'Gli agenti IA possono interagire con esso?',
    'faq.a10': 'S\u00ec. Globi espone un\u2019API con 28 comandi via window.globi, pi\u00f9 attributi DOM e un endpoint llms.txt per il rilevamento automatico.',
    'faq.q11': 'Quanto costa?',
    'faq.a11': 'Globi \u00e8 completamente gratuito e open-source. Se lo usi e vuoi contribuire, considera una donazione tramite GitHub Sponsors.',
    'footer.tagline': 'Licenza MIT \u2014 Per giornalisti, educatori e narratori.',
    'footer.links': 'Link',
    'footer.sponsor': 'Sponsorizza',
    'footer.editor': 'Editor',
    'footer.examples': 'Esempi',
    'footer.agents': 'Per agenti IA',
    'newsletter.title': 'Resta aggiornato',
    'newsletter.subtitle': 'Ricevi aggiornamenti su nuove funzionalit\u00e0, esempi e consigli sul globo. Niente spam, cancella quando vuoi.',
    'newsletter.button': 'Iscriviti',
  },
  zh: {
    'page.title': '\ud83c\udf0d Globi \u2014 \u7528\u4e8e\u65b0\u95fb\u4e0e\u6559\u80b2\u7684\u4ea4\u4e92\u5f0f\u5730\u7403\u4eea',
    'hero.title': 'Globi \u2014 \u7528\u4e8e\u65b0\u95fb\u4e0e\u6559\u80b2\u7684\u4ea4\u4e92\u5f0f\u5730\u7403\u4eea',
    'hero.subtitle': '\u5728\u4efb\u4f55\u9875\u9762\u4e2d\u63d2\u5165\u4e00\u4e2a HTML \u6807\u7b7e\u3002\u52a0\u8f7d\u4e00\u4e2a JSON \u573a\u666f\u3002\u83b7\u5f97\u5e26\u6709\u6807\u8bb0\u3001\u8def\u5f84\u548c\u5b9e\u65f6\u6570\u636e\u7684\u5b8c\u5168\u4ea4\u4e92\u5f0f\u5730\u7403\u3002',
    'hero.cta_editor': '\u8bd5\u7528\u7f16\u8f91\u5668',
    'hero.cta_github': '\u5728 GitHub \u4e0a\u67e5\u770b',
    'hero.install': '\u6216\u901a\u8fc7 npm \u5b89\u88c5\uff1a<code>npm install globi-viewer</code>',
    'ex1.label': '\u5730\u7f18\u653f\u6cbb\u60c5\u62a5',
    'ex2.label': '\u5386\u53f2\u53d9\u4e8b',
    'ex3.label': '\u5b9e\u65f6\u6570\u636e',
    'features.title': '\u7528\u5730\u7406\u8bb2\u8ff0\u6545\u4e8b\u6240\u9700\u7684\u4e00\u5207',
    'cmp.title': 'Globi \u5bf9\u6bd4',
    'faq.title': '\u5e38\u89c1\u95ee\u9898',
    'faq.q1': '\u9700\u8981\u7f16\u7a0b\u5417\uff1f',
    'faq.a1': '\u4e0d\u9700\u8981\u3002\u4f7f\u7528\u53ef\u89c6\u5316\u7f16\u8f91\u5668\u521b\u5efa\u573a\u666f\uff0c\u5bfc\u51fa JSON\uff0c\u7528\u4e00\u4e2a HTML \u6807\u7b7e\u5d4c\u5165\u3002\u5185\u5bb9\u521b\u4f5c\u8005\u65e0\u9700\u4efb\u4f55\u7f16\u7a0b\u77e5\u8bc6\u3002',
    'faq.q2': '\u53ef\u4ee5\u7528\u4e8e\u5546\u4e1a\u7528\u9014\u5417\uff1f',
    'faq.a2': '\u53ef\u4ee5\u3002Globi \u91c7\u7528 MIT \u8bb8\u53ef\u8bc1 \u2014 \u514d\u8d39\u7528\u4e8e\u5546\u4e1a\u548c\u975e\u5546\u4e1a\u7528\u9014\uff0c\u65e0\u4efb\u4f55\u9650\u5236\u3002',
    'faq.q3': '\u4e0e Google Earth \u76f8\u6bd4\u5982\u4f55\uff1f',
    'faq.a3': 'Google Earth \u662f\u4e13\u6709\u8f6f\u4ef6\uff0c\u9700\u8981 API \u5bc6\u94a5\u3002Globi \u662f\u5f00\u6e90\u7684\uff0c\u7528\u4e00\u4e2a\u6807\u7b7e\u5373\u53ef\u5d4c\u5165\uff0c\u5185\u7f6e\u65e0\u969c\u788d\u652f\u6301\u3001\u6eda\u52a8\u53d9\u4e8b\uff0c\u5e76\u53ef\u79bb\u7ebf\u4f7f\u7528\u3002',
    'faq.q4': '\u652f\u6301\u79fb\u52a8\u8bbe\u5907\u5417\uff1f',
    'faq.a4': '\u652f\u6301\u3002\u89e6\u5c4f\u5bfc\u822a\u3001\u54cd\u5e94\u5f0f\u5e03\u5c40\u548c\u6e10\u8fdb\u5f0f\u7eb9\u7406\u52a0\u8f7d\u786e\u4fdd\u5728\u624b\u673a\u548c\u5e73\u677f\u7535\u8111\u4e0a\u6d41\u7545\u8fd0\u884c\u3002',
    'faq.q5': '\u53ef\u4ee5\u663e\u793a\u5b9e\u65f6\u6570\u636e\u5417\uff1f',
    'faq.a5': '\u53ef\u4ee5\u3002\u5c06\u5b9e\u65f6\u6570\u636e\u6e90 \u2014 \u536b\u661f\u4f4d\u7f6e\u3001\u8239\u8236\u52a8\u6001\u3001\u51b2\u7a81\u5730\u56fe \u2014 \u7ed1\u5b9a\u5230\u6807\u8bb0\uff0c\u81ea\u52a8\u66f4\u65b0\u4f4d\u7f6e\u3002',
    'faq.q6': '\u662f\u5426\u65e0\u969c\u788d\uff1f',
    'faq.a6': '\u5b8c\u5168\u65e0\u969c\u788d\u3002\u952e\u76d8\u4ea4\u4e92\u3001\u901a\u8fc7 aria-live \u652f\u6301\u5c4f\u5e55\u9605\u8bfb\u5668\u3001\u8272\u76f2\u53cb\u597d\u8c03\u8272\u677f\uff0c\u4ee5\u53ca\u53ef\u9009\u62e9\u548c\u590d\u5236\u7684\u771f\u5b9e HTML \u6807\u6ce8\u6587\u5b57\u3002',
    'faq.q7': '\u652f\u6301\u54ea\u4e9b\u6570\u636e\u683c\u5f0f\uff1f',
    'faq.a7': 'JSON \u573a\u666f\uff08\u539f\u751f\u683c\u5f0f\uff09\u3001GeoJSON \u5bfc\u5165\u5bfc\u51fa\u3001OBJ \u7f51\u683c\u5bfc\u51fa\u3002\u6807\u8bb0\u3001\u8def\u5f84\u3001\u5f27\u7ebf\u548c\u533a\u57df\u5747\u53ef\u901a\u8fc7 JSON \u914d\u7f6e\u3002',
    'faq.q8': '\u53ef\u4ee5\u7528\u4e8e\u5386\u53f2\u53d9\u4e8b\u5417\uff1f',
    'faq.a8': '\u53ef\u4ee5\u3002\u6eda\u52a8\u53d9\u4e8b\u652f\u6301\u53ef\u5c06\u6eda\u52a8\u53d9\u4e8b\u4e0e\u955c\u5934\u98de\u884c\u8fc7\u6e21\u548c\u6807\u8bb0\u52a8\u753b\u914d\u5bf9 \u2014 \u65e0\u9700\u5916\u90e8\u5e93\u3002',
    'faq.q9': '\u5982\u4f55\u5d4c\u5165\uff1f',
    'faq.a9': '\u901a\u8fc7 CDN \u52a0\u8f7d\uff1a<script src="https://unpkg.com/globi-viewer/dist/globi.min.js"></script>\uff0c\u6216\u901a\u8fc7 npm \u5b89\u88c5\uff1anpm install globi-viewer\u3002\u7136\u540e\u5728 HTML \u4e2d\u653e\u7f6e <globi-viewer scene="scene.json"></globi-viewer>\u3002',
    'faq.q10': 'AI \u4ee3\u7406\u53ef\u4ee5\u4e0e\u5176\u4ea4\u4e92\u5417\uff1f',
    'faq.a10': '\u53ef\u4ee5\u3002Globi \u901a\u8fc7 window.globi \u63d0\u4f9b 28 \u6761\u547d\u4ee4\u7684\u4ee3\u7406 API\uff0c\u8fd8\u6709 DOM \u6570\u636e\u5c5e\u6027\u548c llms.txt \u7aef\u70b9\u7528\u4e8e\u673a\u5668\u53d1\u73b0\u3002',
    'faq.q11': '\u8d39\u7528\u662f\u591a\u5c11\uff1f',
    'faq.a11': 'Globi \u5b8c\u5168\u514d\u8d39\u4e14\u5f00\u6e90\u3002\u5982\u679c\u60a8\u4f7f\u7528\u5b83\u5e76\u5e0c\u671b\u56de\u998b\uff0c\u8bf7\u8003\u8651\u901a\u8fc7 GitHub Sponsors \u6350\u8d60\u3002',
    'footer.tagline': 'MIT \u8bb8\u53ef\u8bc1 \u2014 \u4e3a\u8bb0\u8005\u3001\u6559\u80b2\u8005\u548c\u53d9\u4e8b\u8005\u800c\u5efa\u3002',
    'footer.links': '\u94fe\u63a5',
    'footer.sponsor': '\u8d5e\u52a9',
    'footer.editor': '\u7f16\u8f91\u5668',
    'footer.examples': '\u793a\u4f8b',
    'footer.agents': '\u9762\u5411 AI \u4ee3\u7406',
    'newsletter.title': '\u4fdd\u6301\u5173\u6ce8',
    'newsletter.subtitle': '\u83b7\u53d6\u65b0\u529f\u80fd\u3001\u793a\u4f8b\u548c\u5730\u7403\u4eea\u667a\u6167\u7684\u66f4\u65b0\u3002\u65e0\u5783\u573e\u90ae\u4ef6\uff0c\u968f\u65f6\u53d6\u6d88\u8ba2\u9605\u3002',
    'newsletter.button': '\u8ba2\u9605',
  },
  ar: {
    'page.title': '\ud83c\udf0d Globi \u2014 \u0643\u0631\u0627\u062a \u0623\u0631\u0636\u064a\u0629 \u062a\u0641\u0627\u0639\u0644\u064a\u0629 \u0644\u0644\u0635\u062d\u0627\u0641\u0629 \u0648\u0627\u0644\u062a\u0639\u0644\u064a\u0645',
    'hero.title': 'Globi \u2014 \u0643\u0631\u0627\u062a \u0623\u0631\u0636\u064a\u0629 \u062a\u0641\u0627\u0639\u0644\u064a\u0629 \u0644\u0644\u0635\u062d\u0627\u0641\u0629 \u0648\u0627\u0644\u062a\u0639\u0644\u064a\u0645',
    'hero.subtitle': '\u0623\u062f\u0631\u062c \u0639\u0644\u0627\u0645\u0629 HTML \u0648\u0627\u062d\u062f\u0629 \u0641\u064a \u0623\u064a \u0635\u0641\u062d\u0629. \u062d\u0645\u0651\u0644 \u0645\u0634\u0647\u062f JSON. \u0627\u062d\u0635\u0644 \u0639\u0644\u0649 \u0643\u0631\u0629 \u0623\u0631\u0636\u064a\u0629 \u062a\u0641\u0627\u0639\u0644\u064a\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644.',
    'hero.cta_editor': '\u062c\u0631\u0651\u0628 \u0627\u0644\u0645\u062d\u0631\u0631',
    'hero.cta_github': '\u0639\u0631\u0636 \u0639\u0644\u0649 GitHub',
    'hero.install': '\u0623\u0648 \u062b\u0628\u0651\u062a \u0639\u0628\u0631 npm: <code>npm install globi-viewer</code>',
    'ex1.label': '\u0627\u0633\u062a\u062e\u0628\u0627\u0631\u0627\u062a \u062c\u064a\u0648\u0633\u064a\u0627\u0633\u064a\u0629',
    'ex2.label': '\u0633\u0631\u062f \u062a\u0627\u0631\u064a\u062e\u064a',
    'ex3.label': '\u0628\u064a\u0627\u0646\u0627\u062a \u0641\u0648\u0631\u064a\u0629',
    'features.title': '\u0643\u0644 \u0645\u0627 \u062a\u062d\u062a\u0627\u062c\u0647 \u0644\u0631\u0648\u0627\u064a\u0629 \u0627\u0644\u0642\u0635\u0635 \u0628\u0627\u0644\u062c\u063a\u0631\u0627\u0641\u064a\u0627',
    'cmp.title': '\u0645\u0642\u0627\u0631\u0646\u0629 Globi',
    'faq.title': '\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629',
    'faq.q1': '\u0647\u0644 \u0623\u062d\u062a\u0627\u062c \u0625\u0644\u0649 \u0627\u0644\u0628\u0631\u0645\u062c\u0629\u061f',
    'faq.a1': '\u0644\u0627. \u0627\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0645\u062d\u0631\u0631 \u0627\u0644\u0645\u0631\u0626\u064a \u0644\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0634\u0627\u0647\u062f\u060c \u062a\u0635\u062f\u064a\u0631 JSON\u060c \u0648\u062a\u0636\u0645\u064a\u0646\u0647 \u0628\u0639\u0644\u0627\u0645\u0629 HTML \u0648\u0627\u062d\u062f\u0629. \u0644\u0627 \u064a\u062d\u062a\u0627\u062c \u0635\u0627\u0646\u0639\u0648 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0625\u0644\u0649 \u0623\u064a \u0645\u0639\u0631\u0641\u0629 \u0628\u0631\u0645\u062c\u064a\u0629.',
    'faq.q2': '\u0647\u0644 \u064a\u0645\u0643\u0646\u0646\u064a \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0647 \u062a\u062c\u0627\u0631\u064a\u064b\u0627\u061f',
    'faq.a2': '\u0646\u0639\u0645. Globi \u0645\u0631\u062e\u0635 \u0628\u0645\u0648\u062c\u0628 MIT \u2014 \u0645\u062c\u0627\u0646\u064a \u0644\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u062a\u062c\u0627\u0631\u064a \u0648\u063a\u064a\u0631 \u0627\u0644\u062a\u062c\u0627\u0631\u064a \u062f\u0648\u0646 \u0623\u064a \u0642\u064a\u0648\u062f.',
    'faq.q3': '\u0643\u064a\u0641 \u064a\u0642\u0627\u0631\u0646 \u0628\u0640 Google Earth\u061f',
    'faq.a3': 'Google Earth \u0645\u0644\u0643\u064a\u0629 \u062e\u0627\u0635\u0629 \u0648\u064a\u062a\u0637\u0644\u0628 \u0645\u0641\u0627\u062a\u064a\u062d API. Globi \u0645\u0641\u062a\u0648\u062d \u0627\u0644\u0645\u0635\u062f\u0631\u060c \u064a\u064f\u0636\u0645\u0651\u0646 \u0628\u0639\u0644\u0627\u0645\u0629 \u0648\u0627\u062d\u062f\u0629\u060c \u064a\u062a\u0636\u0645\u0646 \u0625\u0645\u0643\u0627\u0646\u064a\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u0648\u0627\u0644\u0633\u0631\u062f \u0627\u0644\u062a\u0645\u0631\u064a\u0631\u064a \u0648\u064a\u0639\u0645\u0644 \u0628\u062f\u0648\u0646 \u0627\u062a\u0635\u0627\u0644.',
    'faq.q4': '\u0647\u0644 \u064a\u0639\u0645\u0644 \u0639\u0644\u0649 \u0627\u0644\u0647\u0648\u0627\u062a\u0641\u061f',
    'faq.a4': '\u0646\u0639\u0645. \u0627\u0644\u062a\u0646\u0642\u0644 \u0628\u0627\u0644\u0644\u0645\u0633\u060c \u0627\u0644\u062a\u0635\u0645\u064a\u0645 \u0627\u0644\u0645\u062a\u062c\u0627\u0648\u0628 \u0648\u0627\u0644\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u062f\u0631\u064a\u062c\u064a \u0644\u0644\u062e\u0631\u0627\u0626\u0637 \u064a\u0636\u0645\u0646 \u0623\u062f\u0627\u0621\u064b \u0633\u0644\u0633\u064b\u0627 \u0639\u0644\u0649 \u0627\u0644\u0647\u0648\u0627\u062a\u0641 \u0648\u0627\u0644\u0623\u062c\u0647\u0632\u0629 \u0627\u0644\u0644\u0648\u062d\u064a\u0629.',
    'faq.q5': '\u0647\u0644 \u064a\u0645\u0643\u0646\u0646\u064a \u0639\u0631\u0636 \u0628\u064a\u0627\u0646\u0627\u062a \u0641\u0648\u0631\u064a\u0629\u061f',
    'faq.a5': '\u0646\u0639\u0645. \u0627\u0631\u0628\u0637 \u0645\u0635\u0627\u062f\u0631 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u064a\u0629 \u2014 \u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u0623\u0642\u0645\u0627\u0631 \u0627\u0644\u0635\u0646\u0627\u0639\u064a\u0629\u060c \u062d\u0631\u0643\u0629 \u0627\u0644\u0633\u0641\u0646\u060c \u062e\u0631\u0627\u0626\u0637 \u0627\u0644\u0646\u0632\u0627\u0639\u0627\u062a \u2014 \u0628\u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062a \u0645\u0639 \u062a\u062d\u062f\u064a\u062b \u062a\u0644\u0642\u0627\u0626\u064a.',
    'faq.q6': '\u0647\u0644 \u0647\u0648 \u0645\u062a\u0627\u062d \u0644\u0644\u062c\u0645\u064a\u0639\u061f',
    'faq.a6': '\u0628\u0627\u0644\u0643\u0627\u0645\u0644. \u062a\u0641\u0627\u0639\u0644 \u0628\u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0641\u0627\u062a\u064a\u062d\u060c \u0648\u0635\u0641 \u0644\u0642\u0627\u0631\u0626\u0627\u062a \u0627\u0644\u0634\u0627\u0634\u0629 \u0639\u0628\u0631 aria-live\u060c \u0644\u0648\u062d\u0629 \u0623\u0644\u0648\u0627\u0646 \u0645\u0644\u0627\u0626\u0645\u0629 \u0644\u0639\u0645\u0649 \u0627\u0644\u0623\u0644\u0648\u0627\u0646\u060c \u0648\u0646\u0635\u0648\u0635 HTML \u062d\u0642\u064a\u0642\u064a\u0629 \u064a\u0645\u0643\u0646 \u062a\u062d\u062f\u064a\u062f\u0647\u0627 \u0648\u0646\u0633\u062e\u0647\u0627.',
    'faq.q7': '\u0645\u0627 \u0647\u064a \u0635\u064a\u063a \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062f\u0639\u0648\u0645\u0629\u061f',
    'faq.a7': '\u0645\u0634\u0627\u0647\u062f JSON (\u0627\u0644\u062a\u0646\u0633\u064a\u0642 \u0627\u0644\u0623\u0635\u0644\u064a)\u060c \u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0648\u062a\u0635\u062f\u064a\u0631 GeoJSON\u060c \u062a\u0635\u062f\u064a\u0631 \u0634\u0628\u0643\u0629 OBJ. \u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062a \u0648\u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062a \u0648\u0627\u0644\u0623\u0642\u0648\u0627\u0633 \u0648\u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u062a\u0643\u0648\u064a\u0646 \u0639\u0628\u0631 JSON.',
    'faq.q8': '\u0647\u0644 \u064a\u0645\u0643\u0646 \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0647 \u0644\u0644\u0633\u0631\u062f \u0627\u0644\u062a\u0627\u0631\u064a\u062e\u064a\u061f',
    'faq.a8': '\u0646\u0639\u0645. \u062f\u0639\u0645 \u0627\u0644\u0633\u0631\u062f \u0627\u0644\u062a\u0645\u0631\u064a\u0631\u064a \u064a\u062a\u064a\u062d \u0631\u0628\u0637 \u0633\u0631\u062f \u0642\u0627\u0628\u0644 \u0644\u0644\u062a\u0645\u0631\u064a\u0631 \u0628\u0627\u0646\u062a\u0642\u0627\u0644\u0627\u062a \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627 \u0648\u0631\u0633\u0648\u0645 \u0627\u0644\u0639\u0644\u0627\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u062d\u0631\u0643\u0629 \u2014 \u062f\u0648\u0646 \u0645\u0643\u062a\u0628\u0627\u062a \u062e\u0627\u0631\u062c\u064a\u0629.',
    'faq.q9': '\u0643\u064a\u0641 \u0623\u0636\u0645\u0651\u0646\u0647\u061f',
    'faq.a9': '\u062d\u0645\u0651\u0644 \u0639\u0628\u0631 CDN \u0628\u0640 <script src="https://unpkg.com/globi-viewer/dist/globi.min.js"></script>\u060c \u0623\u0648 \u062b\u0628\u0651\u062a \u0639\u0628\u0631 npm: npm install globi-viewer. \u062b\u0645 \u0636\u0639 <globi-viewer scene="scene.json"></globi-viewer> \u0641\u064a HTML.',
    'faq.q10': '\u0647\u0644 \u064a\u0645\u0643\u0646 \u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0627\u0644\u062a\u0641\u0627\u0639\u0644 \u0645\u0639\u0647\u061f',
    'faq.a10': '\u0646\u0639\u0645. \u064a\u0648\u0641\u0631 Globi \u0648\u0627\u062c\u0647\u0629 \u0628\u0631\u0645\u062c\u0629 \u062a\u0637\u0628\u064a\u0642\u0627\u062a \u0645\u0646 28 \u0623\u0645\u0631\u064b\u0627 \u0639\u0628\u0631 window.globi\u060c \u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0633\u0645\u0627\u062a DOM \u0648\u0646\u0642\u0637\u0629 \u0646\u0647\u0627\u064a\u0629 llms.txt \u0644\u0644\u0627\u0643\u062a\u0634\u0627\u0641 \u0627\u0644\u0622\u0644\u064a.',
    'faq.q11': '\u0643\u0645 \u064a\u0643\u0644\u0641\u061f',
    'faq.a11': 'Globi \u0645\u062c\u0627\u0646\u064a \u062a\u0645\u0627\u0645\u064b\u0627 \u0648\u0645\u0641\u062a\u0648\u062d \u0627\u0644\u0645\u0635\u062f\u0631. \u0625\u0630\u0627 \u0643\u0646\u062a \u062a\u0633\u062a\u062e\u062f\u0645\u0647 \u0648\u062a\u0631\u063a\u0628 \u0641\u064a \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0629\u060c \u0641\u0643\u0631 \u0641\u064a \u0627\u0644\u062a\u0628\u0631\u0639 \u0639\u0628\u0631 GitHub Sponsors.',
    'footer.tagline': '\u0631\u062e\u0635\u0629 MIT \u2014 \u0645\u0635\u0645\u0645 \u0644\u0644\u0635\u062d\u0641\u064a\u064a\u0646 \u0648\u0627\u0644\u0645\u0639\u0644\u0645\u064a\u0646 \u0648\u0627\u0644\u0631\u0648\u0627\u0629.',
    'footer.links': '\u0631\u0648\u0627\u0628\u0637',
    'footer.sponsor': '\u0631\u0639\u0627\u064a\u0629',
    'footer.editor': '\u0627\u0644\u0645\u062d\u0631\u0631',
    'footer.examples': '\u0623\u0645\u062b\u0644\u0629',
    'footer.agents': '\u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
    'newsletter.title': '\u0627\u0628\u0642\u064e \u0639\u0644\u0649 \u0627\u0637\u0644\u0627\u0639',
    'newsletter.subtitle': '\u0627\u062d\u0635\u0644 \u0639\u0644\u0649 \u062a\u062d\u062f\u064a\u062b\u0627\u062a \u062d\u0648\u0644 \u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0648\u0627\u0644\u0623\u0645\u062b\u0644\u0629. \u0628\u062f\u0648\u0646 \u0628\u0631\u064a\u062f \u0645\u0632\u0639\u062c\u060c \u064a\u0645\u0643\u0646\u0643 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0641\u064a \u0623\u064a \u0648\u0642\u062a.',
    'newsletter.button': '\u0627\u0634\u062a\u0631\u0643',
  },
};

/* ─────────────────────────────────────────────
   Language switching
   ───────────────────────────────────────────── */
let currentLang = localStorage.getItem('globi-lang') || 'en';

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('globi-lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  const dict = T[lang] || T.en;
  document.title = dict['page.title'] || T.en['page.title'];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = dict[key] || T.en[key];
    if (text) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    }
  });
}

const langSelect = document.getElementById('lang-select');
langSelect.value = currentLang;
langSelect.addEventListener('change', () => applyLanguage(langSelect.value));
applyLanguage(currentLang);

/* ─────────────────────────────────────────────
   Register custom element
   ───────────────────────────────────────────── */
registerGlobiViewer();
await customElements.whenDefined('globi-viewer');

/* ─────────────────────────────────────────────
   Scene data for the three examples
   ───────────────────────────────────────────── */

/* --- Hormuz (wireframe-flat) --- */
const hormuzScene = {
  version: 1,
  locale: 'en',
  theme: 'wireframe-flat',
  planet: 'earth',
  projection: 'globe',
  surfaceTint: '#c0c0c0',
  viewerUi: {
    showLegendButton: true,
    showBodySelector: false,
    showInspectButton: false,
    showCompass: true,
    showScale: false,
    showFullscreenButton: false,
    showProjectionToggle: false,
    showMarkerFilter: false,
  },
  markers: [
    {
      id: 'uss-eisenhower',
      name: { en: 'USS Eisenhower (CVN-69)' },
      description: { en: 'Nimitz-class aircraft carrier, Carrier Strike Group 2' },
      lat: 26.56,
      lon: 56.25,
      visualType: 'image',
      markerScale: 0.014,
      assetUri: 'data:image/svg+xml,' + encodeURIComponent(natoSvg('triangle', '#1f3d73')),
      color: '#1f3d73',
      category: 'us-navy',
      calloutMode: 'always',
      calloutLabel: { en: 'CVN-69 Eisenhower' },
      callout: '<b>USS Eisenhower</b><br>Nimitz-class carrier<br>CSG-2 flagship',
      pulse: false,
      sourceId: 'osint',
    },
    {
      id: 'uss-philippine-sea',
      name: { en: 'USS Philippine Sea (CG-58)' },
      description: { en: 'Ticonderoga-class cruiser, CSG-2 escort' },
      lat: 26.40,
      lon: 56.45,
      visualType: 'image',
      markerScale: 0.014,
      assetUri: 'data:image/svg+xml,' + encodeURIComponent(natoSvg('neutral', '#1f3d73')),
      color: '#1f3d73',
      category: 'us-navy',
      calloutMode: 'always',
      calloutLabel: { en: 'CG-58 Philippine Sea' },
      callout: '<b>USS Philippine Sea</b><br>Ticonderoga-class cruiser',
      pulse: false,
      sourceId: 'osint',
    },
    {
      id: 'uss-mason',
      name: { en: 'USS Mason (DDG-87)' },
      description: { en: 'Arleigh Burke-class destroyer, CSG-2 escort' },
      lat: 26.70,
      lon: 56.10,
      visualType: 'image',
      markerScale: 0.014,
      assetUri: 'data:image/svg+xml,' + encodeURIComponent(natoSvg('square', '#1f3d73')),
      color: '#1f3d73',
      category: 'us-navy',
      calloutMode: 'always',
      calloutLabel: { en: 'DDG-87 Mason' },
      callout: '<b>USS Mason</b><br>Arleigh Burke-class destroyer',
      pulse: false,
      sourceId: 'osint',
    },
    {
      id: 'bandar-abbas',
      name: { en: 'Bandar Abbas Naval Base' },
      description: { en: 'Major Iranian naval facility on the Strait of Hormuz' },
      lat: 27.18,
      lon: 56.28,
      visualType: 'dot',
      color: '#b91c1c',
      category: 'iran',
      calloutMode: 'always',
      calloutLabel: { en: 'Bandar Abbas' },
      callout: '<b>Bandar Abbas</b><br>Iranian naval base',
      pulse: false,
    },
    {
      id: 'hormuz-strait',
      name: { en: 'Strait of Hormuz' },
      lat: 26.60,
      lon: 56.50,
      visualType: 'text',
      color: '#6b6860',
      category: 'geography',
      calloutMode: 'none',
    },
  ],
  paths: [
    {
      id: 'csg2-trail',
      name: { en: 'CSG-2 transit route' },
      points: [
        { lat: 25.20, lon: 55.10 },
        { lat: 25.80, lon: 55.60 },
        { lat: 26.10, lon: 56.00 },
        { lat: 26.35, lon: 56.20 },
        { lat: 26.56, lon: 56.25 },
      ],
      color: '#1f3d73',
      strokeWidth: 2,
      dashPattern: [3, 1],
      animationDuration: 3000,
      category: 'us-navy',
    },
  ],
  arcs: [],
  regions: [],
  animations: [],
  filters: [],
  dataSources: [
    { id: 'osint', name: 'Naval OSINT Reports', shortName: 'OSINT', url: 'https://nosi.org/', description: 'Curated naval positions from open-source intelligence' },
  ],
};

/* --- Midway (wireframe-shaded, two steps) --- */
const MIDWAY = { lat: 28.21, lon: -177.38 };
const KIDO_BUTAI = { lat: 30.50, lon: -174.50 };
const TF16 = { lat: 31.80, lon: -173.20 };
const TF17 = { lat: 32.20, lon: -172.80 };
const POINT_LUCK = { lat: 32.00, lon: -173.00 };
const US_BLUE = '#2563eb';
const JP_RED = '#dc2626';
const MIDWAY_GREEN = '#16a34a';
const C_ENTERPRISE = '#1d4ed8';
const C_YORKTOWN = '#60a5fa';
const STRIKE_AMBER = '#f59e0b';
const SUNK_GRAY = '#9ca3af';

// NATO APP-6 symbol SVGs (same approach as full Midway example)
function natoSvg(shape, color) {
  if (shape === 'friendly') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect x="1" y="1" width="28" height="18" fill="${color}" stroke="#000" stroke-width="1.5"/></svg>`;
  }
  if (shape === 'hostile') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><polygon points="14,1 27,14 14,27 1,14" fill="${color}" stroke="#000" stroke-width="1.5"/></svg>`;
  }
  if (shape === 'triangle') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 26"><polygon points="14,1 27,25 1,25" fill="${color}" stroke="#000" stroke-width="1.5"/></svg>`;
  }
  if (shape === 'square') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="1" y="1" width="22" height="22" fill="${color}" stroke="#000" stroke-width="1.5"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${color}" stroke="#000" stroke-width="1.5"/></svg>`;
}

const FRIENDLY_COLORS = new Set([US_BLUE, C_ENTERPRISE, C_YORKTOWN]);
const HOSTILE_COLORS = new Set([JP_RED]);

function mkMidwayMarker(id, name, lat, lon, color, opts = {}) {
  const nato = opts.nato || (FRIENDLY_COLORS.has(color) ? 'friendly' : HOSTILE_COLORS.has(color) ? 'hostile' : 'neutral');
  const svg = natoSvg(nato, color);
  return {
    id, name: { en: name }, lat, lon, color,
    visualType: 'image', markerScale: 0.014,
    assetUri: 'data:image/svg+xml,' + encodeURIComponent(svg),
    calloutMode: 'always', pulse: false,
    sourceId: opts.sourceId || 'parshall-tully',
  };
}

// Northwestern Hawaiian Islands — approximate atoll/island outlines
// (slightly exaggerated for cartographic visibility at battle-overview zoom levels)
const NWHI_REGIONS = [
  {
    id: 'midway-atoll',
    name: { en: 'Midway Atoll' },
    geojson: { type: 'Polygon', coordinates: [[
      [-177.32, 28.21], [-177.33, 28.24], [-177.35, 28.26], [-177.38, 28.27],
      [-177.41, 28.26], [-177.43, 28.24], [-177.44, 28.21], [-177.43, 28.18],
      [-177.41, 28.16], [-177.38, 28.15], [-177.35, 28.16], [-177.33, 28.18],
      [-177.32, 28.21],
    ]] },
    capColor: 'rgba(180, 168, 140, 0.55)', sideColor: '#8b7355', altitude: 0.0005,
  },
  {
    id: 'kure-atoll',
    name: { en: 'Kure Atoll' },
    geojson: { type: 'Polygon', coordinates: [[
      [-178.28, 28.42], [-178.29, 28.45], [-178.31, 28.47], [-178.33, 28.47],
      [-178.36, 28.46], [-178.38, 28.43], [-178.38, 28.40], [-178.37, 28.38],
      [-178.35, 28.37], [-178.33, 28.37], [-178.30, 28.38], [-178.29, 28.40],
      [-178.28, 28.42],
    ]] },
    capColor: 'rgba(180, 168, 140, 0.55)', sideColor: '#8b7355', altitude: 0.0005,
  },
  {
    id: 'pearl-hermes-atoll',
    name: { en: 'Pearl and Hermes Atoll' },
    geojson: { type: 'Polygon', coordinates: [[
      [-175.63, 27.83], [-175.67, 27.88], [-175.73, 27.92], [-175.83, 27.93],
      [-175.93, 27.92], [-175.99, 27.88], [-176.03, 27.83], [-175.99, 27.78],
      [-175.93, 27.74], [-175.83, 27.73], [-175.73, 27.74], [-175.67, 27.78],
      [-175.63, 27.83],
    ]] },
    capColor: 'rgba(180, 168, 140, 0.55)', sideColor: '#8b7355', altitude: 0.0005,
  },
  {
    id: 'lisianski-island',
    name: { en: 'Lisianski Island' },
    geojson: { type: 'Polygon', coordinates: [[
      [-173.94, 26.07], [-173.95, 26.09], [-173.97, 26.10], [-173.99, 26.09],
      [-174.00, 26.07], [-173.99, 26.05], [-173.97, 26.04], [-173.95, 26.05],
      [-173.94, 26.07],
    ]] },
    capColor: 'rgba(180, 168, 140, 0.55)', sideColor: '#8b7355', altitude: 0.0005,
  },
  {
    id: 'laysan-island',
    name: { en: 'Laysan Island' },
    geojson: { type: 'Polygon', coordinates: [[
      [-171.70, 25.77], [-171.71, 25.79], [-171.73, 25.80], [-171.75, 25.79],
      [-171.76, 25.77], [-171.75, 25.75], [-171.73, 25.74], [-171.71, 25.75],
      [-171.70, 25.77],
    ]] },
    capColor: 'rgba(180, 168, 140, 0.55)', sideColor: '#8b7355', altitude: 0.0005,
  },
];

const midwayBaseScene = {
  version: 1,
  locale: 'en',
  theme: 'wireframe-shaded',
  planet: 'earth',
  projection: 'equirectangular',
  surfaceTint: '#c0c0c0',
  viewerUi: {
    showLegendButton: false,
    showBodySelector: false,
    showInspectButton: false,
    showCompass: false,
    showScale: false,
    showFullscreenButton: false,
    showProjectionToggle: false,
    showMarkerFilter: false,
  },
  markers: [],
  paths: [],
  arcs: [],
  regions: NWHI_REGIONS,
  animations: [],
  filters: [],
  dataSources: [
    { id: 'parshall-tully', name: 'Parshall & Tully, Shattered Sword', shortName: 'PT', url: 'https://www.amazon.com/dp/1574889249', description: 'Definitive account of the Battle of Midway from the Japanese perspective' },
  ],
};

const midwaySteps = [
  {
    camera: { lat: 30.00, lon: -170.00, zoom: 8, durationMs: 2000 },
    markers: [
      mkMidwayMarker('midway', 'Midway Atoll', MIDWAY.lat, MIDWAY.lon, MIDWAY_GREEN, { nato: 'neutral' }),
      mkMidwayMarker('kb', 'Kidō Butai (4 carriers)', KIDO_BUTAI.lat, KIDO_BUTAI.lon, JP_RED),
      mkMidwayMarker('tf16', 'TF-16 (Enterprise, Hornet)', TF16.lat, TF16.lon, US_BLUE),
      mkMidwayMarker('tf17', 'TF-17 (Yorktown)', TF17.lat, TF17.lon, C_YORKTOWN),
    ],
    paths: [
      { id: 'kb-approach', name: { en: 'Kidō Butai approach' }, points: [{ lat: 33.00, lon: -180.00 }, KIDO_BUTAI], color: JP_RED, strokeWidth: 2, dashPattern: [3, 1], animationDuration: 2000 },
      { id: 'tf16-route', name: { en: 'TF-16 route' }, points: [{ lat: 28.00, lon: -165.00 }, POINT_LUCK, TF16], color: US_BLUE, strokeWidth: 2, dashPattern: [3, 1], animationDuration: 2000 },
    ],
  },
  {
    camera: { lat: 30.00, lon: -173.00, zoom: 9, durationMs: 2000 },
    markers: [
      mkMidwayMarker('midway', 'Midway Atoll', MIDWAY.lat, MIDWAY.lon, MIDWAY_GREEN, { nato: 'neutral' }),
      mkMidwayMarker('akagi', 'Akagi — sunk', 30.40, -178.80, SUNK_GRAY, { nato: 'hostile' }),
      mkMidwayMarker('kaga', 'Kaga — sunk', 30.20, -178.40, SUNK_GRAY, { nato: 'hostile' }),
      mkMidwayMarker('soryu', 'Sōryū — sunk', 30.60, -178.20, SUNK_GRAY, { nato: 'hostile' }),
      mkMidwayMarker('enterprise', 'USS Enterprise', TF16.lat, TF16.lon, C_ENTERPRISE),
    ],
    paths: [],
    arcs: [
      { id: 'dive-1', name: { en: 'VB-6 dive attack' }, start: TF16, end: { lat: 30.40, lon: -178.80 }, color: STRIKE_AMBER, strokeWidth: 2, dashPattern: [3, 1], animationTime: 1500, maxAltitude: 0.03 },
      { id: 'dive-2', name: { en: 'VS-6 dive attack' }, start: TF16, end: { lat: 30.20, lon: -178.40 }, color: STRIKE_AMBER, strokeWidth: 2, dashPattern: [3, 1], animationTime: 1500, animationDelay: 300, maxAltitude: 0.03 },
      { id: 'dive-3', name: { en: 'VB-3 dive attack' }, start: { lat: TF17.lat, lon: TF17.lon }, end: { lat: 30.60, lon: -178.20 }, color: STRIKE_AMBER, strokeWidth: 2, dashPattern: [3, 1], animationTime: 1500, animationDelay: 600, maxAltitude: 0.03 },
    ],
  },
];

/* ─────────────────────────────────────────────
   Lazy-load viewers with IntersectionObserver
   ───────────────────────────────────────────── */
let issTimer = null;

/**
 * Apply a custom theme to a viewer's Shadow DOM controls, scale bar,
 * and attribution panel. Call inside requestAnimationFrame after setScene.
 *
 * @param {HTMLElement} viewer - the <globi-viewer> element
 * @param {{ fg: string, bg: string, border: string, linkColor?: string, linkHover?: string }} t - theme colors
 */
function applyViewerTheme(viewer, t) {
  viewer.style.setProperty('--ctrl-fg', t.fg);
  viewer.style.setProperty('--ctrl-bg', t.bg);
  viewer.style.setProperty('--ctrl-border', t.border);
  viewer.style.setProperty('--ctrl-host-bg', 'transparent');

  const shadow = viewer.shadowRoot;
  if (!shadow) return;

  // Override hud scale-bar variables
  const hud = shadow.querySelector('.hud');
  if (hud) {
    hud.style.setProperty('--hud-scale-border', t.border);
    hud.style.setProperty('--hud-scale-bg', t.bg);
    hud.style.setProperty('--hud-scale-fg', t.fg);
    hud.style.setProperty('--hud-scale-text', t.fg);
  }

  const link = t.linkColor || t.fg;
  const linkH = t.linkHover || t.fg;
  const style = document.createElement('style');
  style.textContent = `
    :host { --ctrl-fg: ${t.fg} !important; --ctrl-bg: ${t.bg} !important; --ctrl-border: ${t.border} !important; }
    .attribution-label { color: ${t.fg} !important; background: ${t.bg} !important; border-color: ${t.border} !important; }
    .attribution-label:hover { background: ${t.bg} !important; color: ${t.fg} !important; }
    .attribution-panel { background: ${t.bg} !important; border-color: ${t.border} !important; color: ${t.fg} !important; }
    .attribution-close { color: ${t.fg} !important; }
    .attribution-close:hover { color: ${t.fg} !important; }
    .attribution-section-title { color: ${t.fg} !important; }
    .attribution-name { color: ${t.fg} !important; }
    .attribution-desc { color: ${t.fg} !important; }
    .attribution-license { color: ${t.fg} !important; }
    .attribution-link { color: ${link} !important; }
    .attribution-link:hover { color: ${linkH} !important; }
    .scale { border-color: ${t.border} !important; background: ${t.bg} !important; }
    .scale-bar { background: ${t.fg} !important; }
    .scale-bar::before, .scale-bar::after { background: ${t.fg} !important; }
    .scale-label { color: ${t.fg} !important; }
  `;
  shadow.appendChild(style);
}

const THEME_LIGHT = { fg: '#222222', bg: 'rgba(255, 255, 255, 0.92)', border: 'rgba(0, 0, 0, 0.18)', linkColor: '#3b5998', linkHover: '#2d4373' };
const THEME_SEPIA = { fg: '#5a4a2f', bg: 'rgba(245, 240, 225, 0.95)', border: 'rgba(139, 115, 85, 0.3)', linkColor: '#6b5d45', linkHover: '#3d3424' };

async function initHormuz(viewer) {
  viewer.setScene(hormuzScene);
  viewer.flyTo({ lat: 26.56, lon: 56.25 }, { zoom: 0.8, durationMs: 0 });

  requestAnimationFrame(() => {
    applyViewerTheme(viewer, THEME_LIGHT);

    // Open legend
    const legendBtn = viewer.shadowRoot?.querySelector('.legend-toggle');
    if (legendBtn) legendBtn.click();
  });

  // Dolly shot: animate from wide establishing view to close-up on strike group
  setTimeout(() => {
    viewer.flyTo({ lat: 26.56, lon: 56.25 }, { zoom: 2.7, durationMs: 3000 });
  }, 1000);
}

async function initMidway(viewer) {
  // Hide viewer until scene + theme are fully applied to prevent photo-globe flash
  viewer.style.opacity = '0';

  const scene = { ...midwayBaseScene, markers: midwaySteps[0].markers, paths: midwaySteps[0].paths, arcs: [] };
  viewer.setScene(scene);
  viewer.flyTo({ lat: midwaySteps[0].camera.lat, lon: midwaySteps[0].camera.lon, zoom: midwaySteps[0].camera.zoom }, { durationMs: 0 });

  // Sepia-themed controls, scale, and attribution — then reveal
  requestAnimationFrame(() => {
    applyViewerTheme(viewer, THEME_SEPIA);
    requestAnimationFrame(() => {
      viewer.style.transition = 'opacity 0.4s ease';
      viewer.style.opacity = '1';
    });
  });

  // Mark first step active
  const steps = document.querySelectorAll('.midway-step');
  steps[0]?.classList.add('active');

  // Click to switch steps
  steps.forEach((stepEl, i) => {
    stepEl.addEventListener('click', () => {
      steps.forEach(s => s.classList.remove('active'));
      stepEl.classList.add('active');
      const step = midwaySteps[i];
      if (!step) return;
      viewer.setScene({ ...midwayBaseScene, markers: step.markers, paths: step.paths || [], arcs: step.arcs || [] });
      viewer.flyTo(
        { lat: step.camera.lat, lon: step.camera.lon, zoom: step.camera.zoom },
        { durationMs: step.camera.durationMs },
      );
    });
  });

  // IntersectionObserver for scroll-triggered step changes
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const idx = Number(entry.target.dataset.step);
        steps.forEach(s => s.classList.remove('active'));
        entry.target.classList.add('active');
        const step = midwaySteps[idx];
        if (!step) return;
        viewer.setScene({ ...midwayBaseScene, markers: step.markers, paths: step.paths || [], arcs: step.arcs || [] });
        viewer.flyTo(
          { lat: step.camera.lat, lon: step.camera.lon, zoom: step.camera.zoom },
          { durationMs: step.camera.durationMs },
        );
      });
    },
    { threshold: 0.6 },
  );
  steps.forEach(s => observer.observe(s));
}

async function initISS(viewer) {
  // Use the same ISS loader as the editor — globe mode with photo theme,
  // orbit waypoints, history markers, and past trail path
  const uiOverrides = {
    showLegendButton: false,
    showBodySelector: false,
    showInspectButton: false,
    showCompass: true,
    showScale: false,
    showFullscreenButton: false,
    showProjectionToggle: false,
    showMarkerFilter: false,
  };

  async function loadAndApply(isInitial) {
    try {
      const result = await loadIssRealtimeExample({ locale: 'en' });
      // Override to photo theme + globe projection + minimal UI
      const scene = {
        ...result,
        theme: 'photo',
        projection: 'globe',
        viewerUi: uiOverrides,
        regions: [], // no landmass regions needed for photo globe
      };

      // Ensure ISS marker has calloutLabel + calloutMode
      const issMarker = scene.markers?.find(m => m.id === 'iss-current');
      if (issMarker) {
        issMarker.calloutMode = 'always';
        issMarker.calloutLabel = { en: 'ISS' };

        // Update telemetry readout
        const lat = issMarker.lat;
        const lon = issMarker.lon;
        const altKm = issMarker.alt ? Math.round(issMarker.alt * 6371) : '';
        const vel = issMarker.velocityKmh ? Math.round(issMarker.velocityKmh) : '';

        document.getElementById('iss-lat').textContent = lat.toFixed(2) + '\u00b0';
        document.getElementById('iss-lon').textContent = lon.toFixed(2) + '\u00b0';
        document.getElementById('iss-alt').textContent = altKm ? altKm + ' km' : '';
        document.getElementById('iss-vel').textContent = vel ? vel + ' km/h' : '';
      }

      // Add calloutMode to history markers
      for (const m of scene.markers || []) {
        if (m.category === 'iss-history') {
          m.calloutMode = 'always';
        }
      }

      viewer.setScene(scene);

      if (isInitial && result.camera) {
        viewer.flyTo(
          { lat: result.camera.lat, lon: result.camera.lon },
          { zoom: 1.8, durationMs: 0 },
        );
      } else if (result.camera) {
        viewer.flyTo(
          { lat: result.camera.lat, lon: result.camera.lon },
          { zoom: 1.8, durationMs: 3000 },
        );
      }
    } catch (err) {
      console.warn('[ISS] load failed:', err.message);
    }
  }

  await loadAndApply(true);

  // Periodic refresh every 30 seconds (full re-fetch like the editor)
  issTimer = setInterval(() => loadAndApply(false), 30_000);
}

/* Observer: init each viewer when it scrolls into view */
const viewerConfigs = {
  'viewer-hormuz': initHormuz,
  'viewer-midway': initMidway,
  'viewer-iss': initISS,
};

const lazyObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const viewer = entry.target;
      const id = viewer.id;
      const initFn = viewerConfigs[id];
      if (initFn) {
        lazyObserver.unobserve(viewer);
        initFn(viewer);
      }
    });
  },
  { rootMargin: '200px' },
);

Object.keys(viewerConfigs).forEach(id => {
  const el = document.getElementById(id);
  if (el) lazyObserver.observe(el);
});

/* ─────────────────────────────────────────────
   Source code toggle panels
   ───────────────────────────────────────────── */
const sourceSnippets = {
  'code-hormuz': `<globi-viewer id="viewer"></globi-viewer>
<script type="module">
  import { registerGlobiViewer } from './src/components/globi-viewer.js';
  registerGlobiViewer();
  await customElements.whenDefined('globi-viewer');

  // NATO APP-6 symbol SVGs
  function natoSvg(shape, color) {
    if (shape === 'triangle')
      return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 26">
        <polygon points="14,1 27,25 1,25" fill="\${color}" stroke="#000" stroke-width="1.5"/></svg>\`;
    if (shape === 'square')
      return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <rect x="1" y="1" width="22" height="22" fill="\${color}" stroke="#000" stroke-width="1.5"/></svg>\`;
    // circle (neutral)
    return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="\${color}" stroke="#000" stroke-width="1.5"/></svg>\`;
  }

  const viewer = document.getElementById('viewer');
  viewer.setScene({
    version: 1,
    locale: 'en',
    theme: 'wireframe-flat',
    planet: 'earth',
    projection: 'globe',
    surfaceTint: '#c0c0c0',
    viewerUi: {
      showLegendButton: true,
      showBodySelector: false,
      showInspectButton: false,
      showCompass: true,
      showScale: false,
      showFullscreenButton: false,
      showProjectionToggle: false,
      showMarkerFilter: false,
    },
    markers: [
      {
        id: 'uss-eisenhower',
        name: { en: 'USS Eisenhower (CVN-69)' },
        description: { en: 'Nimitz-class aircraft carrier, Carrier Strike Group 2' },
        lat: 26.56, lon: 56.25,
        visualType: 'image', markerScale: 0.014,
        assetUri: 'data:image/svg+xml,' + encodeURIComponent(natoSvg('triangle', '#1f3d73')),
        color: '#1f3d73', category: 'us-navy',
        calloutMode: 'always',
        calloutLabel: { en: 'CVN-69 Eisenhower' },
        callout: '<b>USS Eisenhower</b><br>Nimitz-class carrier<br>CSG-2 flagship',
        pulse: false, sourceId: 'osint',
      },
      {
        id: 'uss-philippine-sea',
        name: { en: 'USS Philippine Sea (CG-58)' },
        description: { en: 'Ticonderoga-class cruiser, CSG-2 escort' },
        lat: 26.40, lon: 56.45,
        visualType: 'image', markerScale: 0.014,
        assetUri: 'data:image/svg+xml,' + encodeURIComponent(natoSvg('neutral', '#1f3d73')),
        color: '#1f3d73', category: 'us-navy',
        calloutMode: 'always',
        calloutLabel: { en: 'CG-58 Philippine Sea' },
        callout: '<b>USS Philippine Sea</b><br>Ticonderoga-class cruiser',
        pulse: false, sourceId: 'osint',
      },
      {
        id: 'uss-mason',
        name: { en: 'USS Mason (DDG-87)' },
        description: { en: 'Arleigh Burke-class destroyer, CSG-2 escort' },
        lat: 26.70, lon: 56.10,
        visualType: 'image', markerScale: 0.014,
        assetUri: 'data:image/svg+xml,' + encodeURIComponent(natoSvg('square', '#1f3d73')),
        color: '#1f3d73', category: 'us-navy',
        calloutMode: 'always',
        calloutLabel: { en: 'DDG-87 Mason' },
        callout: '<b>USS Mason</b><br>Arleigh Burke-class destroyer',
        pulse: false, sourceId: 'osint',
      },
      {
        id: 'bandar-abbas',
        name: { en: 'Bandar Abbas Naval Base' },
        description: { en: 'Major Iranian naval facility on the Strait of Hormuz' },
        lat: 27.18, lon: 56.28,
        visualType: 'dot', color: '#b91c1c', category: 'iran',
        calloutMode: 'always',
        calloutLabel: { en: 'Bandar Abbas' },
        callout: '<b>Bandar Abbas</b><br>Iranian naval base',
        pulse: false,
      },
      {
        id: 'hormuz-strait',
        name: { en: 'Strait of Hormuz' },
        lat: 26.60, lon: 56.50,
        visualType: 'text', color: '#6b6860', category: 'geography',
        calloutMode: 'none',
      },
    ],
    paths: [
      {
        id: 'csg2-trail',
        name: { en: 'CSG-2 transit route' },
        points: [
          { lat: 25.20, lon: 55.10 },
          { lat: 25.80, lon: 55.60 },
          { lat: 26.10, lon: 56.00 },
          { lat: 26.35, lon: 56.20 },
          { lat: 26.56, lon: 56.25 },
        ],
        color: '#1f3d73', strokeWidth: 2,
        dashPattern: [3, 1], animationDuration: 3000,
        category: 'us-navy',
      },
    ],
    dataSources: [
      { id: 'osint', name: 'Naval OSINT Reports', shortName: 'OSINT',
        url: 'https://nosi.org/',
        description: 'Curated naval positions from open-source intelligence' },
    ],
  });

  // Light theme for controls
  const THEME_LIGHT = {
    fg: '#222222', bg: 'rgba(255, 255, 255, 0.92)',
    border: 'rgba(0, 0, 0, 0.18)',
    linkColor: '#3b5998', linkHover: '#2d4373',
  };

  requestAnimationFrame(() => {
    // Apply custom theme to Shadow DOM controls
    viewer.style.setProperty('--ctrl-fg', THEME_LIGHT.fg);
    viewer.style.setProperty('--ctrl-bg', THEME_LIGHT.bg);
    viewer.style.setProperty('--ctrl-border', THEME_LIGHT.border);

    // Auto-open legend
    const legendBtn = viewer.shadowRoot?.querySelector('.legend-toggle');
    if (legendBtn) legendBtn.click();
  });

  // Establishing shot → dolly into the strike group
  viewer.flyTo({ lat: 26.56, lon: 56.25 }, { zoom: 0.8, durationMs: 0 });
  setTimeout(() => {
    viewer.flyTo({ lat: 26.56, lon: 56.25 }, { zoom: 2.7, durationMs: 3000 });
  }, 1000);
<\/script>`,

  'code-midway': `<globi-viewer id="viewer"></globi-viewer>
<div class="midway-step active" data-step="0">
  <h4>The Fleets Converge</h4>
  <p>Admiral Nagumo's Kidō Butai approaches Midway from the northwest…</p>
</div>
<div class="midway-step" data-step="1">
  <h4>The Fatal Five Minutes</h4>
  <p>SBD Dauntless dive-bombers plunge through broken clouds…</p>
</div>

<script type="module">
  import { registerGlobiViewer } from './src/components/globi-viewer.js';
  registerGlobiViewer();
  await customElements.whenDefined('globi-viewer');

  // NATO APP-6 symbol SVGs
  function natoSvg(shape, color) {
    if (shape === 'friendly')
      return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20">
        <rect x="1" y="1" width="28" height="18" fill="\${color}" stroke="#000" stroke-width="1.5"/></svg>\`;
    if (shape === 'hostile')
      return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
        <polygon points="14,1 27,14 14,27 1,14" fill="\${color}" stroke="#000" stroke-width="1.5"/></svg>\`;
    return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="\${color}" stroke="#000" stroke-width="1.5"/></svg>\`;
  }

  const US_BLUE = '#2563eb', JP_RED = '#dc2626', MIDWAY_GREEN = '#16a34a';
  const C_ENTERPRISE = '#1d4ed8', C_YORKTOWN = '#60a5fa';
  const STRIKE_AMBER = '#f59e0b', SUNK_GRAY = '#9ca3af';

  const FRIENDLY = new Set([US_BLUE, C_ENTERPRISE, C_YORKTOWN]);
  const HOSTILE = new Set([JP_RED]);

  function mkMarker(id, name, lat, lon, color, opts = {}) {
    const nato = opts.nato
      || (FRIENDLY.has(color) ? 'friendly' : HOSTILE.has(color) ? 'hostile' : 'neutral');
    return {
      id, name: { en: name }, lat, lon, color,
      visualType: 'image', markerScale: 0.014,
      assetUri: 'data:image/svg+xml,' + encodeURIComponent(natoSvg(nato, color)),
      calloutMode: 'always', pulse: false,
      sourceId: 'parshall-tully',
    };
  }

  const MIDWAY = { lat: 28.21, lon: -177.38 };
  const TF16 = { lat: 31.80, lon: -173.20 };
  const TF17 = { lat: 32.20, lon: -172.80 };

  const baseScene = {
    version: 1, locale: 'en',
    theme: 'wireframe-shaded', planet: 'earth',
    projection: 'equirectangular', surfaceTint: '#c0c0c0',
    viewerUi: {
      showLegendButton: false, showBodySelector: false,
      showInspectButton: false, showCompass: false,
      showScale: false, showFullscreenButton: false,
      showProjectionToggle: false, showMarkerFilter: false,
    },
    regions: [
      { id: 'midway-atoll', name: { en: 'Midway Atoll' },
        geojson: { type: 'Polygon', coordinates: [[
          [-177.32,28.21],[-177.35,28.26],[-177.41,28.26],
          [-177.44,28.21],[-177.41,28.16],[-177.35,28.16],[-177.32,28.21]
        ]] },
        capColor: 'rgba(180, 168, 140, 0.55)', altitude: 0.0005 },
    ],
    dataSources: [
      { id: 'parshall-tully', name: 'Parshall & Tully, Shattered Sword',
        shortName: 'PT', url: 'https://www.amazon.com/dp/1574889249' },
    ],
  };

  // Step 1: The Fleets Converge
  const steps = [
    {
      camera: { lat: 30, lon: -170, zoom: 8, durationMs: 2000 },
      markers: [
        mkMarker('midway', 'Midway Atoll', MIDWAY.lat, MIDWAY.lon, MIDWAY_GREEN, { nato: 'neutral' }),
        mkMarker('kb', 'Kidō Butai (4 carriers)', 30.50, -174.50, JP_RED),
        mkMarker('tf16', 'TF-16 (Enterprise, Hornet)', TF16.lat, TF16.lon, US_BLUE),
        mkMarker('tf17', 'TF-17 (Yorktown)', 32.20, -172.80, C_YORKTOWN),
      ],
      paths: [
        { id: 'kb-approach', name: { en: 'Kidō Butai approach' },
          points: [{ lat: 33, lon: -180 }, { lat: 30.5, lon: -174.5 }],
          color: JP_RED, strokeWidth: 2, dashPattern: [3, 1], animationDuration: 2000 },
        { id: 'tf16-route', name: { en: 'TF-16 route' },
          points: [{ lat: 28, lon: -165 }, { lat: 32, lon: -173 }, TF16],
          color: US_BLUE, strokeWidth: 2, dashPattern: [3, 1], animationDuration: 2000 },
      ],
    },
    // Step 2: The Fatal Five Minutes
    {
      camera: { lat: 30, lon: -173, zoom: 9, durationMs: 2000 },
      markers: [
        mkMarker('midway', 'Midway Atoll', MIDWAY.lat, MIDWAY.lon, MIDWAY_GREEN, { nato: 'neutral' }),
        mkMarker('akagi', 'Akagi — sunk', 30.40, -178.80, SUNK_GRAY, { nato: 'hostile' }),
        mkMarker('kaga', 'Kaga — sunk', 30.20, -178.40, SUNK_GRAY, { nato: 'hostile' }),
        mkMarker('soryu', 'Sōryū — sunk', 30.60, -178.20, SUNK_GRAY, { nato: 'hostile' }),
        mkMarker('enterprise', 'USS Enterprise', TF16.lat, TF16.lon, C_ENTERPRISE),
      ],
      arcs: [
        { id: 'dive-1', name: { en: 'VB-6 dive attack' },
          start: TF16, end: { lat: 30.40, lon: -178.80 },
          color: STRIKE_AMBER, strokeWidth: 2, dashPattern: [3, 1],
          animationTime: 1500, maxAltitude: 0.03 },
        { id: 'dive-2', name: { en: 'VS-6 dive attack' },
          start: TF16, end: { lat: 30.20, lon: -178.40 },
          color: STRIKE_AMBER, strokeWidth: 2, dashPattern: [3, 1],
          animationTime: 1500, animationDelay: 300, maxAltitude: 0.03 },
        { id: 'dive-3', name: { en: 'VB-3 dive attack' },
          start: TF17, end: { lat: 30.60, lon: -178.20 },
          color: STRIKE_AMBER, strokeWidth: 2, dashPattern: [3, 1],
          animationTime: 1500, animationDelay: 600, maxAltitude: 0.03 },
      ],
    },
  ];

  const viewer = document.getElementById('viewer');
  viewer.style.opacity = '0';

  // Load first step
  viewer.setScene({ ...baseScene,
    markers: steps[0].markers,
    paths: steps[0].paths, arcs: [],
  });
  viewer.flyTo(
    { lat: steps[0].camera.lat, lon: steps[0].camera.lon,
      zoom: steps[0].camera.zoom },
    { durationMs: 0 },
  );

  // Sepia theme for controls, then reveal
  const THEME_SEPIA = {
    fg: '#5a4a2f', bg: 'rgba(245, 240, 225, 0.95)',
    border: 'rgba(139, 115, 85, 0.3)',
  };
  requestAnimationFrame(() => {
    viewer.style.setProperty('--ctrl-fg', THEME_SEPIA.fg);
    viewer.style.setProperty('--ctrl-bg', THEME_SEPIA.bg);
    viewer.style.setProperty('--ctrl-border', THEME_SEPIA.border);
    requestAnimationFrame(() => {
      viewer.style.transition = 'opacity 0.4s ease';
      viewer.style.opacity = '1';
    });
  });

  // Scrollytelling: switch steps on scroll
  const stepEls = document.querySelectorAll('.midway-step');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const idx = Number(entry.target.dataset.step);
      stepEls.forEach(s => s.classList.remove('active'));
      entry.target.classList.add('active');
      const step = steps[idx];
      if (!step) return;
      viewer.setScene({ ...baseScene,
        markers: step.markers,
        paths: step.paths || [], arcs: step.arcs || [],
      });
      viewer.flyTo(
        { lat: step.camera.lat, lon: step.camera.lon,
          zoom: step.camera.zoom },
        { durationMs: step.camera.durationMs },
      );
    });
  }, { threshold: 0.6 });
  stepEls.forEach(s => observer.observe(s));
<\/script>`,

  'code-iss': `<globi-viewer id="viewer"></globi-viewer>
<script type="module">
  import { registerGlobiViewer } from './src/components/globi-viewer.js';
  import { loadIssRealtimeExample } from './src/examples/loaders.js';
  registerGlobiViewer();
  await customElements.whenDefined('globi-viewer');

  const viewer = document.getElementById('viewer');

  async function loadAndApply(isInitial) {
    const result = await loadIssRealtimeExample({ locale: 'en' });

    // Photo globe with minimal UI
    const scene = {
      ...result,
      theme: 'photo',
      projection: 'globe',
      viewerUi: {
        showLegendButton: false, showBodySelector: false,
        showInspectButton: false, showCompass: true,
        showScale: false, showFullscreenButton: false,
        showProjectionToggle: false, showMarkerFilter: false,
      },
      regions: [],
    };

    // Ensure ISS marker has callout
    const iss = scene.markers?.find(m => m.id === 'iss-current');
    if (iss) {
      iss.calloutMode = 'always';
      iss.calloutLabel = { en: 'ISS' };
    }

    // Show callouts on history markers
    for (const m of scene.markers || []) {
      if (m.category === 'iss-history') m.calloutMode = 'always';
    }

    viewer.setScene(scene);
    if (result.camera) {
      viewer.flyTo(
        { lat: result.camera.lat, lon: result.camera.lon },
        { zoom: 1.8, durationMs: isInitial ? 0 : 3000 },
      );
    }
  }

  await loadAndApply(true);

  // Refresh every 30 seconds
  setInterval(() => loadAndApply(false), 30_000);
<\/script>`,
};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.querySelectorAll('.code-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const panel = document.getElementById(targetId);
    if (!panel) return;
    if (panel.classList.contains('open')) {
      panel.classList.remove('open');
      return;
    }
    // Populate on first open using safe DOM methods
    if (!panel.querySelector('pre')) {
      const snippet = sourceSnippets[targetId] || '';
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = snippet;
      pre.appendChild(code);
      panel.appendChild(pre);
    }
    panel.classList.add('open');
  });
});

/* ─────────────────────────────────────────────
   Newsletter subscribe form
   ───────────────────────────────────────────── */
const subscribeForm = document.getElementById('subscribe-form');
const subscribeToast = document.getElementById('subscribe-toast');

if (subscribeForm) {
  subscribeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('subscribe-email').value.trim();
    if (!email) return;

    const btn = document.getElementById('subscribe-btn');
    btn.disabled = true;

    try {
      const res = await fetch('api/subscribe.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || 'Something went wrong.', 'error');
        return;
      }
      if (data.message === 'already_subscribed') {
        showToast('You\u2019re already subscribed!', 'success');
      } else {
        showToast('Thanks for subscribing!', 'success');
        subscribeForm.reset();
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

function showToast(msg, type) {
  if (!subscribeToast) return;
  subscribeToast.textContent = msg;
  subscribeToast.className = 'subscribe-toast ' + type;
  setTimeout(() => {
    subscribeToast.textContent = '';
    subscribeToast.className = 'subscribe-toast';
  }, 4000);
}
