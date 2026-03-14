# Community Platform SEO — Design Spec

**Date:** 2026-03-14
**Status:** Draft
**Scope:** SEO optimization for globe detail pages on `globi.world/community/`
**Dependency:** Requires the community platform (see `2026-03-14-community-platform-design.md`) to be built first. The source files referenced in "Files to Create/Modify" are defined in that spec.

---

## Problem

Globe detail pages (`/community/globe/:id`) are served by a React SPA. Search engines see only the generic `index.html` shell — no scene-specific title, description, meta tags, or structured data. URLs use opaque IDs with no human-readable slug. There is no sitemap, no FAQ content, and no machine-readable scene description for crawlers.

## Solution

A PHP front controller (`seo.php`) that intercepts globe detail page requests, fetches scene data from PocketBase (localhost), and injects SEO-optimized content into the HTML before the SPA boots. All visitors (bots and humans) receive the same enriched HTML.

---

## 1. URL Structure

**Pattern:** `/community/globe/:id/:slug`

- `:id` — PocketBase scene ID, alphanumeric (e.g. `prt9qai4qswc380`). May contain uppercase letters.
- `:slug` — URL-safe version of the title (e.g. `ancient-trade-routes`), always lowercase
- Slug is optional — bare `/community/globe/:id` issues a 301 redirect to the canonical slug URL
- If the slug is wrong/outdated, the server ignores it — ID is authoritative

**Slug generation rules:**
1. Lowercase the title
2. Transliterate accented characters to ASCII (e.g. `ö` → `o`, `é` → `e`)
3. Replace non-alphanumeric characters with hyphens
4. Collapse multiple hyphens into one
5. Trim leading/trailing hyphens
6. Truncate to 60 ASCII characters, breaking at the last hyphen before the limit (i.e. word boundary = hyphen position)

**Test fixtures:** A shared JSON file (`slug-test-fixtures.json`) with `{input, expected}` pairs must be consumed by both PHP and JS unit tests to guarantee parity.

**Backward compatibility:** Existing links (`/community/globe/prt9qai4qswc380`) continue working via 301 redirect.

**React Router** updated to match `/globe/:id/:slug?` — slug parameter is optional. Client-side navigation generates the slug from the scene title.

---

## 2. .htaccess Routing

**Location:** `/public_html/globi.world/community/.htaccess` (inside the `/community/` subdirectory, so paths are relative to `/community/`)

```apache
RewriteEngine On

# Route globe detail pages through PHP front controller
# Slug segment requires at least one character if present
RewriteRule ^globe/([a-zA-Z0-9]+)(/[a-z0-9][a-z0-9-]*)?/?$ seo.php?id=$1 [L,QSA]

# Sitemap
RewriteRule ^sitemap\.xml$ sitemap.php [L]
```

Static assets (JS, CSS, images) continue to be served directly — only globe detail URLs route through PHP.

---

## 3. PHP Front Controller (`seo.php`)

**Location:** `globi-community/public/seo.php` → deployed to `/community/seo.php`

### Flow

1. Extract `?id=` from rewrite
2. Check file cache (60s TTL) for scene data
3. If cache miss → `GET http://127.0.0.1:8090/api/collections/scenes/records/{id}?expand=author`
4. If scene found & visibility is public or unlisted → inject SEO data
5. If scene not found or private → serve generic fallback (default meta tags, SPA loads normally)
6. For unlisted scenes → inject SEO data + `<meta name="robots" content="noindex">`

### Template Injection

The PHP script reads `__DIR__ . '/index.html'` (the Vite-built `index.html` in the same directory as `seo.php`) and injects:

**Into `<head>`:**
- `<title>{title} — Globi Community</title>`
- `<meta name="description" content="{description, truncated to 160 chars}">`
- `<meta name="keywords" content="{tags, comma-separated}">`
- `<link rel="canonical" href="https://globi.world/community/globe/{id}/{slug}">`
- Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type: website`, `og:site_name: Globi Community`, `og:image:width: 1200`, `og:image:height: 630`
- Twitter Card tags: `twitter:card: summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`
- `<link rel="alternate" type="application/json" href="/community/api/collections/scenes/records/{id}">`
- JSON-LD blocks (see Section 4)

**Into `<body>` (before React root):**
- `<div id="seo-content">` containing the collapsible scene description and FAQ (see Sections 5–6)

### sceneJson Parsing

`seo.php` must parse the `sceneJson` JSON blob server-side to extract marker names, coordinates, paths, arcs, regions, and data source references. The expected schema fields used are:

- `sceneJson.markers[]` — `.name.en`, `.lat`, `.lon`, `.sourceId`
- `sceneJson.paths[]` — `.name.en`, `.points[]`
- `sceneJson.arcs[]` — `.name.en`, `.start`, `.end`
- `sceneJson.regions[]` — `.name.en`
- `sceneJson.dataSources[]` — `.id`, `.name`, `.url`, `.license`
- `sceneJson.planet` — fallback if top-level `planet` field is empty

Missing or malformed fields are silently skipped — the description renders whatever is available.

### Author URL Guard

If `author.username` is null or empty, omit the `author.url` field from JSON-LD and omit any author-related meta tags. Display name falls back to "Anonymous".

---

## 4. JSON-LD Structured Data

### 4a. CreativeWork (per scene)

```json
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "{title}",
  "description": "{description}",
  "image": "{thumbnail URL or fallback}",
  "url": "https://globi.world/community/globe/{id}/{slug}",
  "author": {
    "@type": "Person",
    "name": "{author.displayName}"
  },
  "dateCreated": "{created}",
  "dateModified": "{updated}",
  "license": "{mapped license URL, see below}",
  "interactionStatistic": [
    {
      "@type": "InteractionCounter",
      "interactionType": "LikeAction",
      "userInteractionCount": "{likeCount}"
    },
    {
      "@type": "InteractionCounter",
      "interactionType": "WatchAction",
      "userInteractionCount": "{viewCount}"
    }
  ],
  "keywords": "{tags}",
  "isPartOf": {
    "@type": "WebSite",
    "name": "Globi Community",
    "url": "https://globi.world/community/"
  }
}
```

If `author.username` is set, add `"url": "https://globi.world/community/user/{author.username}"` to the author object.

**License URL mapping:**

| PocketBase value | JSON-LD `license` URL |
|---|---|
| `CC-BY-4.0` | `https://creativecommons.org/licenses/by/4.0/` |
| `CC-BY-SA` | `https://creativecommons.org/licenses/by-sa/4.0/` |
| `CC0` | `https://creativecommons.org/publicdomain/zero/1.0/` |
| `All-Rights-Reserved` | Omit the `license` field entirely |

### 4b. FAQPage

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Globi?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Globi is an interactive 3D globe component for the web..."
      }
    }
  ]
}
```

Contains 5–6 questions (see Section 6 for full list).

### 4c. BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Globi", "item": "https://globi.world/" },
    { "@type": "ListItem", "position": 2, "name": "Community", "item": "https://globi.world/community/" },
    { "@type": "ListItem", "position": 3, "name": "{scene title}" }
  ]
}
```

---

## 5. Collapsible Scene Description

A `<details>` element injected into `<div id="seo-content">`, containing a human-readable summary of the scene data (similar to "Copy LLMs.txt" output). Data is extracted by parsing the `sceneJson` blob in PHP (see Section 3).

### Content

- Scene title and description
- Planet, category, license
- **Markers:** count, list of names with coordinates and data source attribution (e.g. "Marker Name — 26.5°N, 56.2°E (Source: WHO Global Health Data)")
- **Paths:** count, names
- **Arcs:** count, names with start/end points
- **Regions:** count, names
- **Data Sources:** full attribution list (name, URL, license) for all sources referenced by markers/places
- Author attribution

### HTML Structure

```html
<details class="seo-scene-description">
  <summary>Scene Details</summary>
  <div class="scene-description-content">
    <h2>{title}</h2>
    <p>{description}</p>

    <h3>Markers ({count})</h3>
    <ul>
      <li>Marker Name — 26.5°N, 56.2°E (Source: WHO Global Health Data)</li>
    </ul>

    <h3>Paths ({count})</h3>
    <ul><li>Path Name</li></ul>

    <h3>Arcs ({count})</h3>
    <ul><li>Arc Name — Start to End</li></ul>

    <h3>Regions ({count})</h3>
    <ul><li>Region Name</li></ul>

    <h3>Data Sources</h3>
    <ul>
      <li>WHO Global Health Data — https://who.int/data (CC-BY-4.0)</li>
    </ul>

    <p>Created by {author} · {category} · {license}</p>
  </div>
</details>
```

### Styling

Minimal, unobtrusive. Collapsed by default. CSS in the SPA stylesheet for visual consistency. React can leave this element as-is or replace it upon hydration.

---

## 6. FAQ with Microformats

A static FAQ block on every globe detail page. Uses JSON-LD FAQPage schema (Section 4b) for Google rich snippets. Uses standard microformats2 classes (`h-entry`, `p-name`, `e-content`) for indie web parser compatibility — no custom property names.

### Questions

1. **What is Globi?** → Brief product description (interactive 3D globe component for education, journalism, storytelling)
2. **What is the Globi Community?** → Sharing platform where users publish, discover, and remix interactive globe scenes
3. **Can I embed this globe on my website?** → Yes, via iframe embed code available on the page
4. **Can I remix this globe?** → Depends on the scene's license (displayed on page)
5. **What data does this globe show?** → *Semi-dynamic:* planet, category, marker/path/arc/region counts
6. **Is Globi free to use?** → Pricing/licensing summary

### HTML Structure

```html
<section class="seo-faq">
  <h2>Frequently Asked Questions</h2>
  <div class="h-entry">
    <h3 class="p-name">What is Globi?</h3>
    <div class="e-content">
      <p>Globi is an interactive 3D globe component for the web that lets
         you visualize geographic data on 13 celestial bodies...</p>
    </div>
  </div>
  <div class="h-entry">
    <h3 class="p-name">What data does this globe show?</h3>
    <div class="e-content">
      <p>This globe displays {planet} with {markerCount} markers,
         {pathCount} paths, and {regionCount} regions in the
         {category} category.</p>
    </div>
  </div>
  <!-- remaining questions -->
</section>
```

---

## 7. Sitemap

**Location:** `globi-community/public/sitemap.php` → served as `/community/sitemap.xml`

A PHP script that queries PocketBase for all public scenes and generates a standard XML sitemap.

### Pagination

PocketBase returns paginated results (default 30, max 500 per page). `sitemap.php` must loop through all pages (`page=1,2,...` until `page * perPage >= totalItems`). If scene count exceeds 50,000, generate a sitemap index file pointing to multiple sitemap files.

### Included URLs

- `/community/` — gallery page
- `/community/globe/{id}/{slug}` — each public scene
- `/community/user/{username}` — user profile pages
- `/community/search` — search page

### Fields per URL

- `<loc>` — canonical URL
- `<lastmod>` — scene updated timestamp
- `<changefreq>` — `weekly` for scenes, `daily` for gallery
- `<priority>` — `1.0` for gallery, `0.8` for scenes, `0.5` for profiles

### robots.txt

The sitemap directive goes in the **domain root** `robots.txt` at `https://globi.world/robots.txt` (not a subdirectory `robots.txt`):

```
Sitemap: https://globi.world/community/sitemap.xml
```

---

## 8. Thumbnail & Open Graph Image

- Primary: PocketBase thumbnail URL (`/community/api/files/scenes/{id}/{thumbnail}`)
- Fallback: Default Globi Community image at `/community/assets/og-default.png`
- Recommended dimensions: **1200×630** pixels (both primary thumbnails and fallback)
- OG tags include `og:image:width: 1200` and `og:image:height: 630`

---

## 9. Caching

**File-based cache** for PocketBase API responses:

- **Cache directory:** Located **outside the web root** at `/home/salach/globi-seo-cache/` to prevent direct HTTP access to cached data
- Key: scene ID (filename: `{id}.json`)
- TTL: 60 seconds
- Format: JSON file with `expires` timestamp and `data` payload
- Cache miss → fetch from PocketBase, write cache file
- No explicit invalidation — natural expiry is sufficient given the 60s window

`deploy.sh` must create this directory on first deploy:
```bash
ssh salach@s003.cyon.net "mkdir -p /home/salach/globi-seo-cache"
```

---

## 10. Privacy & Visibility

| Visibility | SEO behavior |
|---|---|
| **Public** | Full SEO: all meta tags, JSON-LD, description, FAQ, included in sitemap |
| **Unlisted** | Full SEO + `<meta name="robots" content="noindex">`, excluded from sitemap |
| **Private** | Generic fallback meta tags, no scene data exposed, excluded from sitemap. React handles auth UI client-side. |

---

## Files to Create/Modify

### New files
- `globi-community/public/seo.php` — PHP front controller
- `globi-community/public/sitemap.php` — Dynamic sitemap generator
- `globi-community/public/assets/og-default.png` — Fallback OG image (1200×630)
- `globi-community/slug-test-fixtures.json` — Shared test cases for slug generation

### Modified files
- `/public_html/globi.world/community/.htaccess` (on server) — Add rewrite rules for globe URLs and sitemap
- `globi-community/src/main.jsx` — Update React Router to `/globe/:id/:slug?`
- `globi-community/src/pages/Detail.jsx` — Generate slug, update internal links, handle `#seo-content` div
- `globi-community/src/components/ShareDialog.jsx` — Include slug in shared URLs
- `globi-community/src/components/EmbedDialog.jsx` — Include slug in embed URLs
- `globi-community/src/pages/Gallery.jsx` — Include slug in globe card links
- `globi-community/deploy.sh` — Deploy `seo.php`, `sitemap.php`; create cache dir on server; exclude cache from rsync `--delete`
- `/public_html/globi.world/robots.txt` (on server) — Add sitemap reference
- SPA stylesheet — Styles for `.seo-scene-description` and `.seo-faq`

### Shared logic
- Slug generation function must be identical in PHP and JS to ensure URL consistency. Both implementations validated against `slug-test-fixtures.json`.
