# Architecture — wmi-web

Static site for Cloudflare Pages. Shared chrome is **data-driven in JavaScript** so menus are edited in one place.

## Layout

```
index.html                 Homepage (hero, sections)
*.html                     Interior pages (generated or hand-maintained)
css/styles.css             Brand + layout + interior styles
js/
  nav-data.js              ★ Single source of truth for all menus
  site-chrome.js           Renders header, mobile nav, footer, newsletter bar
  main.js                  Sticky header, mobile menu, forms
assets/                    Production images/icons
scripts/
  build_pages.py           Port reference HTML → interior pages
  crawl_old_site.py        Medium crawl into old-site/ (gitignored)
reference/                 Old-site HTML snapshots (comparison)
docs/                      Design goals + this file
```

## Shared menu (edit once)

**File:** `js/nav-data.js` → `window.WMI_NAV`

| Key | Purpose |
|-----|---------|
| `top` | Secondary nav (About, Donate, …) |
| `main` | Primary nav (Warning TV, Prophecies, …) |
| `footer` | Footer link list |
| `contact` / `social` | Footer address + icons |

**File:** `js/site-chrome.js` reads `WMI_NAV` and replaces:

```html
<div id="site-header-mount"></div>
<div id="site-newsletter-mount"></div>  <!-- optional -->
<div id="site-footer-mount"></div>
```

Every page loads, in order:

```html
<script src="js/nav-data.js"></script>
<script src="js/site-chrome.js"></script>
<script src="js/main.js"></script>
```

### Changing the menu

1. Edit `js/nav-data.js`
2. Refresh the browser — no rebuild required for nav-only changes

### Adding a page

1. Add a `.html` file using the interior shell (or extend `scripts/build_pages.py` mapping)
2. Link it from `nav-data.js`
3. If porting from the old site, add a `ref` entry in `build_pages.py` and re-run:

```bash
python3 scripts/build_pages.py
```

## Page types

| Type | Pattern |
|------|---------|
| **Home** | `body.page-home` — custom hero + sections; chrome mounts only |
| **Interior** | `body.page-interior` — purple page hero, `h1.pagename`, `.page-content` |
| **Listing shells** | Ported intro + phase-2 note (articles from CMS later) |
| **Placeholders** | Nav destinations without static HTML yet (e.g. TV Guests) |

## Content pipeline

```
old live site
  → scripts/crawl_old_site.py  →  old-site/ + reference/
  → scripts/build_pages.py     →  clean *.html pages
  → (phase 2) CMS / Workers    →  dynamic articles, prophecies, thought of day
```

Light cleanup in `build_pages.py`: strip scripts/comments, map common `.aspx` → `.html`, trim huge listing dumps.

A **refactor pass** (cleaner semantic HTML, local images, forms) can follow once structure is signed off.

## Phase 2 (deferred)

- Article / prophecy detail routes from CMS
- Thought for the Day daily feed
- Rumble video embeds (home + watch pages)
- Newsletter + form backends (Workers)
- Image assets fully local (stop hotlinking `worldministries.org/Userfiles`)

## Local preview

```bash
python3 -m http.server 8080
# http://localhost:8080
# http://localhost:8080/about.html
```
