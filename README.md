# wmi-web

Replica of [World Ministries International](https://www.worldministries.org) for Cloudflare Pages + Workers.

## Quick start

```bash
python3 -m http.server 8080
# http://localhost:8080
# http://localhost:8080/about.html
```

## Architecture

**Menus are edited in one place:** [`js/nav-data.js`](js/nav-data.js)

| File | Role |
|------|------|
| `js/nav-data.js` | All nav + footer + social links |
| `js/site-chrome.js` | Injects header / mobile nav / footer |
| `js/main.js` | Sticky header, mobile menu, newsletter UI |
| `css/styles.css` | Brand + homepage + interior styles |
| `scripts/build_pages.py` | Port old-site HTML → interior pages |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/DESIGN_GOALS.md`](docs/DESIGN_GOALS.md).

## Structure

```
index.html                 Homepage
about.html, donate.html…   Interior pages (41 total)
css/  js/  assets/
scripts/build_pages.py     Rebuild pages from reference/
reference/old-site-pages/  Old HTML snapshots
old-site/                  Full crawl + assets (gitignored, local only)
```

### Change the menu

1. Edit `js/nav-data.js`
2. Refresh the browser (no rebuild)

### Rebuild interior pages from reference

```bash
python3 scripts/build_pages.py
```

## Brand

| Token | Hex |
|-------|-----|
| Purple | `#4F2683` |
| Light | `#8546C2` |
| Dark | `#271241` |
| Gold | `#FFC62F` |

Fonts: Poppins **200 / 400 / 800** only (see design goals for weight mapping).
