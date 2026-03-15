# Release Notes

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
