# Community SEO Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SEO-optimized URLs, meta tags, structured data, scene descriptions, FAQ, and sitemap to the Globi Community platform.

**Architecture:** A PHP front controller (`seo.php`) intercepts globe detail page requests via `.htaccess` rewrite, fetches scene data from PocketBase on localhost, and injects meta tags, JSON-LD, and visible SEO content into the Vite-built `index.html` before the SPA boots. A shared slug utility ensures URL parity between PHP and JS. A separate `sitemap.php` generates a dynamic XML sitemap.

**Tech Stack:** PHP 8.3 (Cyon shared hosting), React 19 + React Router 7, Vite 8, PocketBase 0.26, Vitest (testing)

**Spec:** `docs/superpowers/specs/2026-03-14-community-seo-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `globi-community/src/utils/slug.js` | Create | Slug generation utility (JS) |
| `globi-community/src/utils/slug.test.js` | Create | Slug tests against shared fixtures |
| `globi-community/slug-test-fixtures.json` | Create | Shared slug test cases for PHP+JS parity |
| `globi-community/public/seo.php` | Create | PHP front controller — meta tags, JSON-LD, scene description, FAQ |
| `globi-community/public/sitemap.php` | Create | Dynamic XML sitemap generator |
| `globi-community/public/assets/og-default.png` | Create | Fallback OG image (1200×630) |
| `globi-community/tests/seo.test.php` | Create | PHP unit tests for seo.php |
| `globi-community/tests/sitemap.test.php` | Create | PHP unit tests for sitemap.php |
| `globi-community/htaccess-community` | Create | `.htaccess` template for `/community/` directory |
| `globi-community/src/main.jsx` | Modify | Add `:slug?` to route patterns |
| `globi-community/src/pages/Detail.jsx` | Modify | Redirect to slug URL, hide `#seo-content` on hydration |
| `globi-community/src/components/ShareDialog.jsx` | Modify | Include slug in share URL |
| `globi-community/src/components/EmbedDialog.jsx` | Modify | Include slug in embed URL |
| `globi-community/src/components/GlobeCard.jsx` | Modify | Include slug in card links |
| `globi-community/deploy.sh` | Modify | Deploy PHP files, create cache dir, exclude cache from rsync |
| `globi-community/package.json` | Modify | Add vitest for testing |

---

## Chunk 1: Slug Utility & Test Fixtures

### Task 1: Create shared slug test fixtures

**Files:**
- Create: `globi-community/slug-test-fixtures.json`

- [ ] **Step 1: Write the test fixture file**

```json
[
  { "input": "Ancient Trade Routes", "expected": "ancient-trade-routes" },
  { "input": "  Hello   World  ", "expected": "hello-world" },
  { "input": "Côte d'Ivoire Trade", "expected": "cote-d-ivoire-trade" },
  { "input": "---dashes---everywhere---", "expected": "dashes-everywhere" },
  { "input": "ALLCAPS", "expected": "allcaps" },
  { "input": "special!@#$%chars", "expected": "special-chars" },
  { "input": "a", "expected": "a" },
  { "input": "", "expected": "" },
  { "input": "München Zürich Straße", "expected": "munchen-zurich-strasse" },
  { "input": "This is a very long title that should be truncated at approximately sixty characters on a word boundary", "expected": "this-is-a-very-long-title-that-should-be-truncated-at" },
  { "input": "emoji 🌍 globe test", "expected": "emoji-globe-test" },
  { "input": "12345 numeric start", "expected": "12345-numeric-start" }
]
```

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add globi-community/slug-test-fixtures.json && git commit -m "feat(seo): add shared slug test fixtures" -- globi-community/slug-test-fixtures.json
```

---

### Task 2: Set up Vitest and create JS slug utility with tests

**Files:**
- Create: `globi-community/src/utils/slug.js`
- Create: `globi-community/src/utils/slug.test.js`
- Modify: `globi-community/package.json`
- Modify: `globi-community/vite.config.js`

- [ ] **Step 1: Install vitest**

```bash
cd globi-community && npm install --save-dev vitest
```

- [ ] **Step 2: Add test script to package.json**

Change `"test": "echo \"Error: no test specified\" && exit 1"` to `"test": "vitest run"` in `globi-community/package.json`.

- [ ] **Step 3: Add vitest config to vite.config.js**

Add `test: { globals: true }` to the `defineConfig` object in `globi-community/vite.config.js`.

- [ ] **Step 4: Write the failing test**

Create `globi-community/src/utils/slug.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { slugify } from './slug.js';
import fixtures from '../../slug-test-fixtures.json';

describe('slugify', () => {
  for (const { input, expected } of fixtures) {
    it(`slugify("${input}") → "${expected}"`, () => {
      expect(slugify(input)).toBe(expected);
    });
  }
});
```

- [ ] **Step 5: Run test to verify it fails**

```bash
cd globi-community && npx vitest run
```

Expected: FAIL — `slug.js` does not exist yet.

- [ ] **Step 6: Implement slug.js**

Create `globi-community/src/utils/slug.js`:

```js
/**
 * Generate a URL-safe slug from a title string.
 * Must produce identical output to the PHP equivalent in seo.php.
 */
export function slugify(title) {
  if (!title) return '';

  let s = title
    .normalize('NFD')                    // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')     // strip diacritics
    .replace(/\u00df/g, 'ss')            // ß → ss (not decomposed by NFD)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')         // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '');            // trim leading/trailing hyphens

  // Truncate to 60 chars on a hyphen boundary
  if (s.length > 60) {
    s = s.substring(0, 60);
    const lastHyphen = s.lastIndexOf('-');
    if (lastHyphen > 0) s = s.substring(0, lastHyphen);
  }

  return s;
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd globi-community && npx vitest run
```

Expected: ALL PASS.

- [ ] **Step 8: Commit**

```bash
git restore --staged :/ && git add globi-community/src/utils/slug.js globi-community/src/utils/slug.test.js globi-community/package.json globi-community/package-lock.json globi-community/vite.config.js && git commit -m "feat(seo): add JS slug utility with tests" -- globi-community/src/utils/slug.js globi-community/src/utils/slug.test.js globi-community/package.json globi-community/package-lock.json globi-community/vite.config.js
```

---

## Chunk 2: React Router & Component Updates

### Task 3: Update React Router to accept optional slug parameter

**Files:**
- Modify: `globi-community/src/main.jsx`

- [ ] **Step 1: Add `:slug?` to globe routes**

In `globi-community/src/main.jsx`, update the route patterns:

```jsx
// Before:
<Route path="/globe/:id/embed" element={<Embed />} />
// After:
<Route path="/globe/:id/:slug/embed" element={<Embed />} />
<Route path="/globe/:id/embed" element={<Embed />} />
```

And inside the nested `<Routes>`:

```jsx
// Before:
<Route path="/globe/:id" element={<Detail />} />
<Route path="/globe/:id/remix" element={<Detail />} />
<Route path="/globe/:id/edit" element={<Create />} />
// After:
<Route path="/globe/:id/:slug" element={<Detail />} />
<Route path="/globe/:id/:slug/remix" element={<Detail />} />
<Route path="/globe/:id" element={<Detail />} />
<Route path="/globe/:id/remix" element={<Detail />} />
<Route path="/globe/:id/:slug/edit" element={<Create />} />
<Route path="/globe/:id/edit" element={<Create />} />
```

- [ ] **Step 2: Verify app still builds**

```bash
cd globi-community && npx vite build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add globi-community/src/main.jsx && git commit -m "feat(seo): add optional slug param to routes" -- globi-community/src/main.jsx
```

---

### Task 4: Update Detail page to redirect to slug URL and hide SSR content

**Files:**
- Modify: `globi-community/src/pages/Detail.jsx`

- [ ] **Step 1: Import slugify and add redirect logic**

At top of `Detail.jsx`, add:
```js
import { slugify } from '../utils/slug.js';
```

Inside the `Detail` component, after `const { id } = useParams();`, also extract slug:
```js
const { id, slug } = useParams();
```

After `if (!scene) return null;`, add slug redirect:
```js
const expectedSlug = slugify(scene.title);
if (expectedSlug && slug !== expectedSlug && !window.location.pathname.includes('/remix') && !window.location.pathname.includes('/edit')) {
  navigate(`/globe/${id}/${expectedSlug}`, { replace: true });
  return null;
}
```

- [ ] **Step 2: Hide PHP-injected SEO content on hydration**

Add a `useEffect` to remove the `#seo-content` div once React takes over:
```js
useEffect(() => {
  const seoDiv = document.getElementById('seo-content');
  if (seoDiv) seoDiv.remove();
}, []);
```

- [ ] **Step 3: Verify app still builds**

```bash
cd globi-community && npx vite build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git restore --staged :/ && git add globi-community/src/pages/Detail.jsx && git commit -m "feat(seo): redirect to slug URL on detail page, hide SSR content" -- globi-community/src/pages/Detail.jsx
```

---

### Task 5: Update ShareDialog, EmbedDialog, and GlobeCard to use slug URLs

**Files:**
- Modify: `globi-community/src/components/ShareDialog.jsx`
- Modify: `globi-community/src/components/EmbedDialog.jsx`
- Modify: `globi-community/src/components/GlobeCard.jsx`

- [ ] **Step 1: Update ShareDialog**

In `ShareDialog.jsx`, add slug import and update URL:

```jsx
import { slugify } from '../utils/slug.js';

export default function ShareDialog({ sceneId, title, onClose }) {
  const [copied, setCopied] = useState(false);
  const slug = slugify(title);
  const url = `https://globi.world/community/globe/${sceneId}${slug ? '/' + slug : ''}`;
  // ... rest unchanged
```

- [ ] **Step 2: Update EmbedDialog**

In `EmbedDialog.jsx`, add slug import and update embed URL. The component needs to accept a `title` prop:

```jsx
import { slugify } from '../utils/slug.js';

export default function EmbedDialog({ sceneId, title, onClose }) {
  const [copied, setCopied] = useState(false);
  const slug = slugify(title);
  const embedCode = `<iframe src="https://globi.world/community/globe/${sceneId}${slug ? '/' + slug : ''}/embed" width="600" height="400" frameborder="0"></iframe>`;
  // ... rest unchanged
```

Also update `Detail.jsx` where `EmbedDialog` is rendered to pass `title`:
```jsx
{showEmbed && <EmbedDialog sceneId={id} title={scene.title} onClose={() => setShowEmbed(false)} />}
```

- [ ] **Step 3: Update GlobeCard**

In `GlobeCard.jsx`, add slug import and update link:

```jsx
import { slugify } from '../utils/slug.js';

export default function GlobeCard({ scene }) {
  const slug = slugify(scene.title);
  // ...
  return (
    <Link to={`/globe/${scene.id}${slug ? '/' + slug : ''}`} className={styles.card}>
    // ... rest unchanged
```

- [ ] **Step 4: Verify app builds**

```bash
cd globi-community && npx vite build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git restore --staged :/ && git add globi-community/src/components/ShareDialog.jsx globi-community/src/components/EmbedDialog.jsx globi-community/src/components/GlobeCard.jsx globi-community/src/pages/Detail.jsx && git commit -m "feat(seo): use slug URLs in ShareDialog, EmbedDialog, GlobeCard" -- globi-community/src/components/ShareDialog.jsx globi-community/src/components/EmbedDialog.jsx globi-community/src/components/GlobeCard.jsx globi-community/src/pages/Detail.jsx
```

---

## Chunk 3: PHP Front Controller

### Task 6: Create .htaccess template

**Files:**
- Create: `globi-community/htaccess-community`

- [ ] **Step 1: Write the .htaccess file**

Create `globi-community/htaccess-community`:

```apache
RewriteEngine On

# PocketBase API proxy (existing)
RewriteRule ^api/(.*) http://127.0.0.1:8090/api/$1 [P,L]
RewriteRule ^_/(.*) http://127.0.0.1:8090/_/$1 [P,L]

# Embed/remix/edit — serve SPA directly, no PHP needed
RewriteRule ^globe/[a-zA-Z0-9]+(/[a-z0-9][a-z0-9-]*)?/(embed|remix|edit)/?$ index.html [L]

# Globe detail pages → PHP front controller
# Passes slug as query param for 301 redirect logic
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^globe/([a-zA-Z0-9]+)(/([a-z0-9][a-z0-9-]*))?/?$ seo.php?id=$1&slug=$3 [L,QSA]

# Sitemap
RewriteRule ^sitemap\.xml$ sitemap.php [L]

# SPA fallback: all non-file routes → index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . index.html [L]
```

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add globi-community/htaccess-community && git commit -m "feat(seo): add .htaccess template for community directory" -- globi-community/htaccess-community
```

---

### Task 7: Create the PHP front controller (`seo.php`)

**Files:**
- Create: `globi-community/public/seo.php`

- [ ] **Step 1: Write seo.php**

Create `globi-community/public/seo.php`:

```php
<?php
/**
 * SEO Front Controller for Globi Community globe detail pages.
 * Fetches scene data from PocketBase, injects meta tags, JSON-LD,
 * scene description, and FAQ into the Vite-built index.html.
 */

// -- Config --
define('PB_URL', 'http://127.0.0.1:8090');
define('CACHE_DIR', '/home/salach/globi-seo-cache');
define('CACHE_TTL', 60);
define('SITE_URL', 'https://globi.world');
define('OG_DEFAULT_IMAGE', '/community/assets/og-default.png');
define('OG_IMAGE_WIDTH', 1200);
define('OG_IMAGE_HEIGHT', 630);

// -- License mapping --
$LICENSE_URLS = [
    'CC-BY-4.0' => 'https://creativecommons.org/licenses/by/4.0/',
    'CC-BY-SA'  => 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC0'       => 'https://creativecommons.org/publicdomain/zero/1.0/',
];

$LICENSE_LABELS = [
    'CC-BY-4.0'           => 'Creative Commons Attribution 4.0',
    'CC-BY-SA'            => 'Creative Commons Attribution-ShareAlike 4.0',
    'CC0'                 => 'Creative Commons Zero — Public Domain',
    'All-Rights-Reserved' => 'All Rights Reserved',
];

// -- Slug function (must match JS slugify exactly) --
function slugify(string $title): string {
    if ($title === '') return '';
    // Transliterate to ASCII
    $s = transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $title);
    if ($s === false) {
        $s = str_replace('ß', 'ss', mb_strtolower($title, 'UTF-8'));
    }
    $s = strtolower($s);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    $s = trim($s, '-');
    // Truncate to 60 chars on hyphen boundary
    if (strlen($s) > 60) {
        $s = substr($s, 0, 60);
        $last = strrpos($s, '-');
        if ($last > 0) $s = substr($s, 0, $last);
    }
    return $s;
}

// -- Cache helpers --
function cacheGet(string $id): ?array {
    $file = CACHE_DIR . '/' . preg_replace('/[^a-zA-Z0-9]/', '', $id) . '.json';
    if (!file_exists($file)) return null;
    $data = json_decode(file_get_contents($file), true);
    if (!$data || ($data['expires'] ?? 0) < time()) return null;
    return $data['data'];
}

function cacheSet(string $id, array $data): void {
    if (!is_dir(CACHE_DIR)) @mkdir(CACHE_DIR, 0755, true);
    $file = CACHE_DIR . '/' . preg_replace('/[^a-zA-Z0-9]/', '', $id) . '.json';
    file_put_contents($file, json_encode([
        'expires' => time() + CACHE_TTL,
        'data' => $data,
    ]));
}

// -- Fetch scene from PocketBase --
function fetchScene(string $id): ?array {
    $cached = cacheGet($id);
    if ($cached !== null) return $cached;

    $url = PB_URL . '/api/collections/scenes/records/' . urlencode($id) . '?expand=author';
    $ctx = stream_context_create(['http' => ['timeout' => 3, 'ignore_errors' => true]]);
    $response = @file_get_contents($url, false, $ctx);
    if ($response === false) return null;

    $data = json_decode($response, true);
    if (!$data || !isset($data['id'])) return null;

    // Don't cache private scenes
    if (($data['visibility'] ?? '') !== 'private') {
        cacheSet($id, $data);
    }
    return $data;
}

// -- Extract text from i18n field --
function i18nText($field, string $fallback = ''): string {
    if (is_string($field)) return $field;
    if (is_array($field)) return $field['en'] ?? reset($field) ?: $fallback;
    return $fallback;
}

// -- Build scene description HTML --
function buildSceneDescription(array $scene): string {
    $sceneJson = $scene['sceneJson'] ?? [];
    if (is_string($sceneJson)) $sceneJson = json_decode($sceneJson, true) ?? [];

    $title = htmlspecialchars($scene['title'] ?? 'Untitled');
    $desc = htmlspecialchars($scene['description'] ?? '');
    $author = $scene['expand']['author'] ?? null;
    $authorName = htmlspecialchars($author['displayName'] ?? $author['username'] ?? 'Anonymous');

    $markers = $sceneJson['markers'] ?? [];
    $paths = $sceneJson['paths'] ?? [];
    $arcs = $sceneJson['arcs'] ?? [];
    $regions = $sceneJson['regions'] ?? [];
    $dataSources = $sceneJson['dataSources'] ?? [];
    $dsMap = [];
    foreach ($dataSources as $ds) {
        $dsMap[$ds['id'] ?? ''] = $ds;
    }

    $html = '<details class="seo-scene-description"><summary>Scene Details</summary>';
    $html .= '<div class="scene-description-content">';
    $html .= '<h2>' . $title . '</h2>';
    if ($desc) $html .= '<p>' . $desc . '</p>';

    // Markers
    if (count($markers) > 0) {
        $html .= '<h3>Markers (' . count($markers) . ')</h3><ul>';
        foreach ($markers as $m) {
            $name = htmlspecialchars(i18nText($m['name'] ?? null, 'Unnamed'));
            $lat = isset($m['lat']) ? round($m['lat'], 1) : null;
            $lon = isset($m['lon']) ? round($m['lon'], 1) : null;
            $coord = ($lat !== null && $lon !== null)
                ? ' — ' . abs($lat) . '°' . ($lat >= 0 ? 'N' : 'S') . ', ' . abs($lon) . '°' . ($lon >= 0 ? 'E' : 'W')
                : '';
            $source = '';
            if (isset($m['sourceId']) && isset($dsMap[$m['sourceId']])) {
                $source = ' (Source: ' . htmlspecialchars($dsMap[$m['sourceId']]['name'] ?? '') . ')';
            }
            $html .= '<li>' . $name . $coord . $source . '</li>';
        }
        $html .= '</ul>';
    }

    // Paths
    if (count($paths) > 0) {
        $html .= '<h3>Paths (' . count($paths) . ')</h3><ul>';
        foreach ($paths as $p) {
            $html .= '<li>' . htmlspecialchars(i18nText($p['name'] ?? null, 'Unnamed')) . '</li>';
        }
        $html .= '</ul>';
    }

    // Arcs
    if (count($arcs) > 0) {
        $html .= '<h3>Arcs (' . count($arcs) . ')</h3><ul>';
        foreach ($arcs as $a) {
            $name = htmlspecialchars(i18nText($a['name'] ?? null, 'Unnamed'));
            $start = isset($a['start']) ? round($a['start']['lat'] ?? 0, 1) . '°, ' . round($a['start']['lon'] ?? 0, 1) . '°' : '?';
            $end = isset($a['end']) ? round($a['end']['lat'] ?? 0, 1) . '°, ' . round($a['end']['lon'] ?? 0, 1) . '°' : '?';
            $html .= '<li>' . $name . ' — ' . $start . ' → ' . $end . '</li>';
        }
        $html .= '</ul>';
    }

    // Regions
    if (count($regions) > 0) {
        $html .= '<h3>Regions (' . count($regions) . ')</h3><ul>';
        foreach ($regions as $r) {
            $html .= '<li>' . htmlspecialchars(i18nText($r['name'] ?? null, 'Unnamed')) . '</li>';
        }
        $html .= '</ul>';
    }

    // Data Sources
    if (count($dataSources) > 0) {
        $html .= '<h3>Data Sources</h3><ul>';
        foreach ($dataSources as $ds) {
            $dsName = htmlspecialchars($ds['name'] ?? 'Unknown');
            $dsUrl = $ds['url'] ?? '';
            $dsLicense = $ds['license'] ?? '';
            $line = $dsName;
            if ($dsUrl) $line .= ' — <a href="' . htmlspecialchars($dsUrl) . '" rel="nofollow">' . htmlspecialchars($dsUrl) . '</a>';
            if ($dsLicense) $line .= ' (' . htmlspecialchars($dsLicense) . ')';
            $html .= '<li>' . $line . '</li>';
        }
        $html .= '</ul>';
    }

    $category = htmlspecialchars($scene['category'] ?? '');
    $license = htmlspecialchars($GLOBALS['LICENSE_LABELS'][$scene['license'] ?? ''] ?? $scene['license'] ?? '');
    $html .= '<p>Created by ' . $authorName;
    if ($category) $html .= ' · ' . $category;
    if ($license) $html .= ' · ' . $license;
    $html .= '</p>';

    $html .= '</div></details>';
    return $html;
}

// -- Build FAQ HTML --
function buildFAQ(array $scene): string {
    $sceneJson = $scene['sceneJson'] ?? [];
    if (is_string($sceneJson)) $sceneJson = json_decode($sceneJson, true) ?? [];

    $planet = htmlspecialchars($scene['planet'] ?? $sceneJson['planet'] ?? 'earth');
    $category = htmlspecialchars($scene['category'] ?? 'General');
    $markerCount = count($sceneJson['markers'] ?? []);
    $pathCount = count($sceneJson['paths'] ?? []);
    $arcCount = count($sceneJson['arcs'] ?? []);
    $regionCount = count($sceneJson['regions'] ?? []);

    $faqs = [
        [
            'q' => 'What is Globi?',
            'a' => 'Globi is an interactive 3D globe component for the web. It lets you visualize geographic data on 13 celestial bodies including Earth, Mars, and the Moon. Globi is used for education, journalism, data storytelling, and art.',
        ],
        [
            'q' => 'What is the Globi Community?',
            'a' => 'The Globi Community is a platform where users publish, discover, and remix interactive globe scenes. Anyone can create a globe visualization and share it with the world.',
        ],
        [
            'q' => 'Can I embed this globe on my website?',
            'a' => 'Yes! Click the "Embed" button on the globe page to get an iframe code you can paste into any website or blog.',
        ],
        [
            'q' => 'Can I remix this globe?',
            'a' => 'That depends on the scene\'s license. If the license allows it, click the "Remix" button to create your own version based on this globe.',
        ],
        [
            'q' => 'What data does this globe show?',
            'a' => "This globe displays {$planet} with {$markerCount} markers, {$pathCount} paths, {$arcCount} arcs, and {$regionCount} regions in the {$category} category.",
        ],
        [
            'q' => 'Is Globi free to use?',
            'a' => 'Globi offers a free tier for personal and educational use. See globi.world for full pricing and licensing details.',
        ],
    ];

    $html = '<section class="seo-faq"><h2>Frequently Asked Questions</h2>';
    foreach ($faqs as $faq) {
        $html .= '<div class="h-entry">';
        $html .= '<h3 class="p-name">' . htmlspecialchars($faq['q']) . '</h3>';
        $html .= '<div class="e-content"><p>' . htmlspecialchars($faq['a']) . '</p></div>';
        $html .= '</div>';
    }
    $html .= '</section>';
    return $html;
}

// -- Build JSON-LD --
function buildJsonLd(array $scene, string $slug): string {
    global $LICENSE_URLS;
    $sceneJson = $scene['sceneJson'] ?? [];
    if (is_string($sceneJson)) $sceneJson = json_decode($sceneJson, true) ?? [];

    $id = $scene['id'];
    $title = $scene['title'] ?? 'Untitled';
    $description = $scene['description'] ?? '';
    $author = $scene['expand']['author'] ?? null;
    $canonicalUrl = SITE_URL . '/community/globe/' . $id . ($slug ? '/' . $slug : '');

    // Thumbnail
    $thumbnail = '';
    if (!empty($scene['thumbnail'])) {
        $thumbnail = SITE_URL . '/community/api/files/scenes/' . $id . '/' . $scene['thumbnail'];
    } else {
        $thumbnail = SITE_URL . OG_DEFAULT_IMAGE;
    }

    // CreativeWork
    $cw = [
        '@context' => 'https://schema.org',
        '@type' => 'CreativeWork',
        'name' => $title,
        'description' => $description,
        'image' => $thumbnail,
        'url' => $canonicalUrl,
        'dateCreated' => $scene['created'] ?? '',
        'dateModified' => $scene['updated'] ?? '',
        'keywords' => implode(', ', $scene['tags'] ?? []),
        'interactionStatistic' => [
            ['@type' => 'InteractionCounter', 'interactionType' => 'LikeAction', 'userInteractionCount' => $scene['likeCount'] ?? 0],
            ['@type' => 'InteractionCounter', 'interactionType' => 'WatchAction', 'userInteractionCount' => $scene['viewCount'] ?? 0],
        ],
        'isPartOf' => ['@type' => 'WebSite', 'name' => 'Globi Community', 'url' => SITE_URL . '/community/'],
    ];

    // Author
    if ($author) {
        $authorObj = ['@type' => 'Person', 'name' => $author['displayName'] ?? $author['username'] ?? 'Anonymous'];
        if (!empty($author['username'])) {
            $authorObj['url'] = SITE_URL . '/community/user/' . $author['username'];
        }
        $cw['author'] = $authorObj;
    }

    // License
    $licenseKey = $scene['license'] ?? '';
    if (isset($LICENSE_URLS[$licenseKey])) {
        $cw['license'] = $LICENSE_URLS[$licenseKey];
    }

    // FAQ
    $planet = $scene['planet'] ?? $sceneJson['planet'] ?? 'earth';
    $category = $scene['category'] ?? 'General';
    $mc = count($sceneJson['markers'] ?? []);
    $pc = count($sceneJson['paths'] ?? []);
    $ac = count($sceneJson['arcs'] ?? []);
    $rc = count($sceneJson['regions'] ?? []);

    $faq = [
        '@context' => 'https://schema.org',
        '@type' => 'FAQPage',
        'mainEntity' => [
            ['@type' => 'Question', 'name' => 'What is Globi?', 'acceptedAnswer' => ['@type' => 'Answer', 'text' => 'Globi is an interactive 3D globe component for the web. It lets you visualize geographic data on 13 celestial bodies including Earth, Mars, and the Moon. Globi is used for education, journalism, data storytelling, and art.']],
            ['@type' => 'Question', 'name' => 'What is the Globi Community?', 'acceptedAnswer' => ['@type' => 'Answer', 'text' => 'The Globi Community is a platform where users publish, discover, and remix interactive globe scenes. Anyone can create a globe visualization and share it with the world.']],
            ['@type' => 'Question', 'name' => 'Can I embed this globe on my website?', 'acceptedAnswer' => ['@type' => 'Answer', 'text' => 'Yes! Click the Embed button on the globe page to get an iframe code you can paste into any website or blog.']],
            ['@type' => 'Question', 'name' => 'Can I remix this globe?', 'acceptedAnswer' => ['@type' => 'Answer', 'text' => "That depends on the scene's license. If the license allows it, click the Remix button to create your own version based on this globe."]],
            ['@type' => 'Question', 'name' => 'What data does this globe show?', 'acceptedAnswer' => ['@type' => 'Answer', 'text' => "This globe displays {$planet} with {$mc} markers, {$pc} paths, {$ac} arcs, and {$rc} regions in the {$category} category."]],
            ['@type' => 'Question', 'name' => 'Is Globi free to use?', 'acceptedAnswer' => ['@type' => 'Answer', 'text' => 'Globi offers a free tier for personal and educational use. See globi.world for full pricing and licensing details.']],
        ],
    ];

    // Breadcrumbs
    $breadcrumbs = [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Globi', 'item' => SITE_URL . '/'],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'Community', 'item' => SITE_URL . '/community/'],
            ['@type' => 'ListItem', 'position' => 3, 'name' => $title],
        ],
    ];

    return '<script type="application/ld+json">' . json_encode($cw, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>'
         . '<script type="application/ld+json">' . json_encode($faq, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>'
         . '<script type="application/ld+json">' . json_encode($breadcrumbs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
}

// ======== MAIN ========

header('Content-Type: text/html; charset=UTF-8');

$id = $_GET['id'] ?? '';
$requestSlug = $_GET['slug'] ?? '';
if (!$id || !preg_match('/^[a-zA-Z0-9]+$/', $id)) {
    // Not a valid globe request — serve index.html as-is
    readfile(__DIR__ . '/index.html');
    exit;
}

$scene = fetchScene($id);
$html = file_get_contents(__DIR__ . '/index.html');

// No scene found or private → serve generic fallback
if (!$scene || ($scene['visibility'] ?? '') === 'private') {
    echo $html;
    exit;
}

$title = $scene['title'] ?? 'Untitled Globe';

// 301 redirect to canonical slug URL if slug is missing or wrong
$expectedSlug = slugify($title);
if ($expectedSlug && $requestSlug !== $expectedSlug) {
    header('HTTP/1.1 301 Moved Permanently');
    header('Location: ' . SITE_URL . '/community/globe/' . $id . '/' . $expectedSlug);
    exit;
}
$description = mb_substr($scene['description'] ?? '', 0, 160);
$tags = implode(', ', $scene['tags'] ?? []);
$slug = slugify($title);
$canonicalUrl = SITE_URL . '/community/globe/' . $id . ($slug ? '/' . $slug : '');

// Thumbnail
$thumbnail = SITE_URL . OG_DEFAULT_IMAGE;
if (!empty($scene['thumbnail'])) {
    $thumbnail = SITE_URL . '/community/api/files/scenes/' . $id . '/' . $scene['thumbnail'];
}

// Build meta tags
$meta = '';
$meta .= '<meta name="description" content="' . htmlspecialchars($description) . '">';
$meta .= '<meta name="keywords" content="' . htmlspecialchars($tags) . '">';
$meta .= '<link rel="canonical" href="' . $canonicalUrl . '">';
// Open Graph
$meta .= '<meta property="og:type" content="website">';
$meta .= '<meta property="og:site_name" content="Globi Community">';
$meta .= '<meta property="og:title" content="' . htmlspecialchars($title) . '">';
$meta .= '<meta property="og:description" content="' . htmlspecialchars($description) . '">';
$meta .= '<meta property="og:url" content="' . $canonicalUrl . '">';
$meta .= '<meta property="og:image" content="' . htmlspecialchars($thumbnail) . '">';
$meta .= '<meta property="og:image:width" content="' . OG_IMAGE_WIDTH . '">';
$meta .= '<meta property="og:image:height" content="' . OG_IMAGE_HEIGHT . '">';
// Twitter
$meta .= '<meta name="twitter:card" content="summary_large_image">';
$meta .= '<meta name="twitter:title" content="' . htmlspecialchars($title) . '">';
$meta .= '<meta name="twitter:description" content="' . htmlspecialchars($description) . '">';
$meta .= '<meta name="twitter:image" content="' . htmlspecialchars($thumbnail) . '">';
// Alternate
$meta .= '<link rel="alternate" type="application/json" href="/community/api/collections/scenes/records/' . $id . '">';
// Unlisted: noindex
if (($scene['visibility'] ?? '') === 'unlisted') {
    $meta .= '<meta name="robots" content="noindex">';
}

// JSON-LD
$jsonLd = buildJsonLd($scene, $slug);

// Body content
$bodyContent = '<div id="seo-content">'
    . buildSceneDescription($scene)
    . buildFAQ($scene)
    . '</div>';

// Inject into HTML
// Replace <title>
$html = preg_replace('/<title>.*?<\/title>/', '<title>' . htmlspecialchars($title) . ' — Globi Community</title>', $html);
// Inject meta tags before </head>
$html = str_replace('</head>', $meta . $jsonLd . '</head>', $html);
// Inject body content before <div id="root">
$html = str_replace('<div id="root">', $bodyContent . '<div id="root">', $html);

echo $html;
```

- [ ] **Step 2: Verify PHP syntax**

```bash
php -l globi-community/public/seo.php
```

Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add globi-community/public/seo.php && git commit -m "feat(seo): add PHP front controller with meta tags, JSON-LD, scene description, FAQ" -- globi-community/public/seo.php
```

---

## Chunk 4: Sitemap, Deploy, and Assets

### Task 8: Create sitemap generator

**Files:**
- Create: `globi-community/public/sitemap.php`

- [ ] **Step 1: Write sitemap.php**

Create `globi-community/public/sitemap.php`:

```php
<?php
/**
 * Dynamic XML sitemap for Globi Community.
 * Queries PocketBase for all public scenes and generates sitemap XML.
 */

define('PB_URL', 'http://127.0.0.1:8090');
define('SITE_URL', 'https://globi.world');
define('PER_PAGE', 500);

function slugify(string $title): string {
    if ($title === '') return '';
    $s = transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $title);
    if ($s === false) {
        $s = str_replace('ß', 'ss', mb_strtolower($title, 'UTF-8'));
    }
    $s = strtolower($s);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    $s = trim($s, '-');
    if (strlen($s) > 60) {
        $s = substr($s, 0, 60);
        $last = strrpos($s, '-');
        if ($last > 0) $s = substr($s, 0, $last);
    }
    return $s;
}

header('Content-Type: application/xml; charset=UTF-8');
echo '<?xml version="1.0" encoding="UTF-8"?>';
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

// Gallery
echo '<url><loc>' . SITE_URL . '/community/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>';

// Search
echo '<url><loc>' . SITE_URL . '/community/search</loc><changefreq>daily</changefreq><priority>0.7</priority></url>';

// Scenes (paginated)
$page = 1;
$total = PHP_INT_MAX;
while (($page - 1) * PER_PAGE < $total) {
    $url = PB_URL . '/api/collections/scenes/records?filter=' . urlencode('visibility = "public"')
         . '&fields=id,title,updated&sort=-updated&perPage=' . PER_PAGE . '&page=' . $page;
    $ctx = stream_context_create(['http' => ['timeout' => 10]]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp === false) break;
    $data = json_decode($resp, true);
    if (!$data || empty($data['items'])) break;
    $total = $data['totalItems'] ?? 0;
    foreach ($data['items'] as $item) {
        $slug = slugify($item['title'] ?? '');
        $loc = SITE_URL . '/community/globe/' . $item['id'] . ($slug ? '/' . $slug : '');
        $lastmod = substr($item['updated'] ?? '', 0, 10); // YYYY-MM-DD
        echo '<url><loc>' . htmlspecialchars($loc) . '</loc>';
        if ($lastmod) echo '<lastmod>' . $lastmod . '</lastmod>';
        echo '<changefreq>weekly</changefreq><priority>0.8</priority></url>';
    }
    $page++;
}

// Users
$page = 1;
$total = PHP_INT_MAX;
while (($page - 1) * PER_PAGE < $total) {
    $url = PB_URL . '/api/collections/users/records?fields=username,updated&perPage=' . PER_PAGE . '&page=' . $page;
    $ctx = stream_context_create(['http' => ['timeout' => 10]]);
    $resp = @file_get_contents($url, false, $ctx);
    if ($resp === false) break;
    $data = json_decode($resp, true);
    if (!$data || empty($data['items'])) break;
    $total = $data['totalItems'] ?? 0;
    foreach ($data['items'] as $u) {
        if (empty($u['username'])) continue;
        echo '<url><loc>' . SITE_URL . '/community/user/' . htmlspecialchars($u['username']) . '</loc>';
        echo '<changefreq>weekly</changefreq><priority>0.5</priority></url>';
    }
    $page++;
}

echo '</urlset>';
```

- [ ] **Step 2: Verify PHP syntax**

```bash
php -l globi-community/public/sitemap.php
```

Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

```bash
git restore --staged :/ && git add globi-community/public/sitemap.php && git commit -m "feat(seo): add dynamic sitemap generator" -- globi-community/public/sitemap.php
```

---

### Task 9: Create fallback OG image

**Files:**
- Create: `globi-community/public/assets/og-default.png`

- [ ] **Step 1: Generate a 1200×630 default OG image**

Use ImageMagick to create a simple branded placeholder:

```bash
mkdir -p globi-community/public/assets && convert -size 1200x630 xc:'#f8f6f1' -gravity center -font Helvetica-Bold -pointsize 72 -fill '#2c2a25' -annotate +0-40 'Globi Community' -pointsize 32 -fill '#6b6860' -annotate +0+40 'Interactive 3D Globe Visualizations' globi-community/public/assets/og-default.png
```

If ImageMagick is not available, create a minimal placeholder and note that a proper branded image should be designed later.

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add globi-community/public/assets/og-default.png && git commit -m "feat(seo): add fallback OG image" -- globi-community/public/assets/og-default.png
```

---

### Task 10: Update deploy.sh

**Files:**
- Modify: `globi-community/deploy.sh`

- [ ] **Step 1: Update deploy script**

Replace the contents of `globi-community/deploy.sh`:

```bash
#!/bin/bash
# globi-community/deploy.sh
# Build and deploy to cyon.ch
set -e

REMOTE="salach@s003.cyon.net"
REMOTE_DIR="/home/salach/public_html/globi.world/community"
CACHE_DIR="/home/salach/globi-seo-cache"

echo "Building..."
npx vite build

echo "Copying PHP files to dist..."
cp public/seo.php dist/
cp public/sitemap.php dist/
cp -r public/assets dist/

echo "Ensuring remote cache directory exists..."
ssh "$REMOTE" "mkdir -p $CACHE_DIR"

echo "Uploading to cyon..."
rsync -avz --delete \
  --exclude='.htaccess' \
  dist/ "$REMOTE:$REMOTE_DIR/"

echo "Done! Live at https://globi.world/community/"
```

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add globi-community/deploy.sh && git commit -m "feat(seo): update deploy script for PHP files and cache dir" -- globi-community/deploy.sh
```

---

## Chunk 5: SEO Styles and Final Verification

### Task 11: Add CSS for SEO content sections

**Files:**
- Modify: `globi-community/src/theme.css`

- [ ] **Step 1: Append SEO styles to theme.css**

Add to the end of `globi-community/src/theme.css`:

```css
/* -- SEO content injected by seo.php -- */
.seo-scene-description {
  max-width: var(--max-w);
  margin: 2rem auto;
  padding: 0 1rem;
}
.seo-scene-description summary {
  cursor: pointer;
  font-family: var(--font-heading);
  font-weight: 600;
  color: var(--text-muted);
}
.scene-description-content {
  margin-top: 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.7;
}
.scene-description-content h2 { font-size: 1.1rem; color: var(--text); margin-bottom: 0.5rem; }
.scene-description-content h3 { font-size: 0.95rem; color: var(--text); margin: 1rem 0 0.5rem; }
.scene-description-content ul { padding-left: 1.5rem; }
.scene-description-content li { margin-bottom: 0.25rem; }

.seo-faq {
  max-width: var(--max-w);
  margin: 2rem auto;
  padding: 0 1rem 3rem;
  border-top: 1px solid var(--border);
}
.seo-faq h2 {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  margin: 2rem 0 1rem;
}
.seo-faq .h-entry {
  margin-bottom: 1.5rem;
}
.seo-faq .p-name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.seo-faq .e-content {
  color: var(--text-muted);
  font-size: 0.9rem;
}
```

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add globi-community/src/theme.css && git commit -m "feat(seo): add styles for scene description and FAQ sections" -- globi-community/src/theme.css
```

---

### Task 12: Full build and test verification

- [ ] **Step 1: Run all JS tests**

```bash
cd globi-community && npx vitest run
```

Expected: ALL PASS.

- [ ] **Step 2: Verify full Vite build**

```bash
cd globi-community && npx vite build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify PHP syntax on all PHP files**

```bash
php -l globi-community/public/seo.php && php -l globi-community/public/sitemap.php
```

Expected: `No syntax errors detected` for both.

- [ ] **Step 4: Manual smoke test**

Start the dev server and PocketBase, then:
1. Visit `/community/globe/{existing-id}` — should redirect to `/community/globe/{id}/{slug}`
2. View page source — should see `<div id="seo-content">` with description and FAQ (only works when served through PHP on cyon; in dev mode the SPA serves directly)
3. Check that Share dialog shows slug URL
4. Check that Embed dialog shows slug URL
5. Check that GlobeCard links include slug

- [ ] **Step 5: Final commit if any adjustments needed**

---

### Task 13: Update robots.txt on server

**Files:**
- Modify: `/public_html/globi.world/robots.txt` (on cyon server)

- [ ] **Step 1: Add sitemap directive to robots.txt**

SSH into the server and append the sitemap line:

```bash
ssh salach@s003.cyon.net "echo 'Sitemap: https://globi.world/community/sitemap.xml' >> /home/salach/public_html/globi.world/robots.txt"
```

If `robots.txt` doesn't exist yet, create it:

```bash
ssh salach@s003.cyon.net "echo -e 'User-agent: *\nAllow: /\n\nSitemap: https://globi.world/community/sitemap.xml' > /home/salach/public_html/globi.world/robots.txt"
```

- [ ] **Step 2: Verify**

```bash
ssh salach@s003.cyon.net "cat /home/salach/public_html/globi.world/robots.txt"
```

Expected: Contains `Sitemap: https://globi.world/community/sitemap.xml`

---

### Task 14: Update RELEASE_NOTES.md and FEATURES.md

**Files:**
- Modify: `RELEASE_NOTES.md`
- Modify: `FEATURES.md` (if applicable)

- [ ] **Step 1: Add release notes**

Add a new section to `RELEASE_NOTES.md`:

```markdown
## Release X.X (Mar 14, 2026)

* SEO-friendly URLs for community globes (`/community/globe/:id/your-globe-title`)
* Dynamic meta tags (Open Graph, Twitter Card) for rich link previews when sharing globes
* JSON-LD structured data (CreativeWork, FAQ, Breadcrumbs) for search engine rich snippets
* Collapsible scene description with marker locations, data source attributions
* FAQ section on every globe page with microformats support
* Dynamic XML sitemap for all public community globes
* Fallback Open Graph image when no thumbnail is available
```

- [ ] **Step 2: Commit**

```bash
git restore --staged :/ && git add RELEASE_NOTES.md && git commit -m "docs: add SEO feature release notes" -- RELEASE_NOTES.md
```
