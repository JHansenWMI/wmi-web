# wmi-web

Replica of [World Ministries International](https://www.worldministries.org) for Cloudflare Pages + Workers.

## Quick start

```bash
npm run dev
# http://127.0.0.1:8080
# Prefer this over plain http.server — enables article editor Save → files
```

Read-only static serve (no file save):

```bash
python3 -m http.server 8080
```

## Architecture

**Menus are edited in one place:** [`js/nav-data.js`](js/nav-data.js)

| File | Role |
|------|------|
| `js/nav-data.js` | All nav + footer + social links |
| `js/site-chrome.js` | Injects header / mobile nav / footer |
| `js/main.js` | Sticky header, mobile menu, newsletter UI |
| `js/reading.js` | Blog listings + articles (catalogs + snippets) |
| `js/editor.js` | On-page article editor (localhost / Mini later) |
| `css/styles.css` | Brand + homepage + interior styles |
| `content/articles/` | Saved article body snippets (`YYMMDD-Title.html`) |
| `data/*-catalog.json` | Blog metadata (+ demo inlined bodies as fallback) |
| `scripts/dev_server.py` | Localhost static + `POST /api/editor/save` |
| `scripts/build_pages.py` | Port old-site HTML → interior pages |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/INLINE_EDITOR.md`](docs/INLINE_EDITOR.md), [`docs/BLOG_PUBLISHING.md`](docs/BLOG_PUBLISHING.md).

## Structure

```
index.html                 Homepage
about.html, donate.html…   Interior pages
css/  js/  assets/
content/articles/          Article HTML snippets + _index.json
data/                      Blog catalogs
scripts/dev_server.py      Dev server (write API)
scripts/build_pages.py     Rebuild pages from reference/
reference/                 Design samples, screenshots (not live content)
old-site/                  Full crawl (gitignored, local only)
```

### Change the menu

1. Edit `js/nav-data.js`
2. Refresh the browser (no rebuild)

**Reading categories in the top/main nav (match live):**

| Nav label | URL |
|-----------|-----|
| Benevolence | `reading.html?cat=520` |
| Missions | `reading.html?cat=494` |
| Pastoral Articles | `reading.html?cat=493` |

### On-page article editor (dev)

```bash
npm run dev
# open reading.html?editor=1  → password wmi-edit
# open an article → Edit → Save → content/articles/YYMMDD-Title.html
```

Details: [`content/articles/README.md`](content/articles/README.md), [`docs/INLINE_EDITOR.md`](docs/INLINE_EDITOR.md).

### Rebuild interior pages from reference

```bash
python3 scripts/build_pages.py
```

### Visual compare (local vs live)

```bash
npm install && npm run screenshots:install   # once
npm run dev                                  # or plain http.server
npm run screenshots
# open http://localhost:8080/temp/screenshots/index.html
```

Details: [`docs/VISUAL_COMPARE.md`](docs/VISUAL_COMPARE.md). Output is gitignored under `temp/`.

## Brand

| Token | Hex |
|-------|-----|
| Purple | `#4F2683` |
| Light | `#8546C2` |
| Dark | `#271241` |
| Gold | `#FFC62F` |

Fonts: Poppins **200 / 400 / 800** only (see design goals for weight mapping).
