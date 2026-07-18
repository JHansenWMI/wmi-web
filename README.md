# wmi-web

Replica of [World Ministries International](https://www.worldministries.org) for hosting on Cloudflare Pages + Workers.

## Structure

```
├── index.html              # Homepage
├── css/styles.css          # Brand-matched styles
├── js/main.js              # Header, mobile nav, newsletter UI
├── assets/                 # Production images, podcast logos, icons
├── docs/DESIGN_GOALS.md    # What must match vs what can differ
├── scripts/crawl_old_site.py
├── reference/              # Old-site HTML snapshots (for comparison)
│   └── old-site-pages/     # 37 static shells + 1 sample article
└── old-site/               # Local only (gitignored): full crawl + heavy assets
```

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Old-site reference

- **In repo:** `reference/old-site-pages/` — page HTML for offline comparison  
- **Local only:** `old-site/` — full crawl including image assets (~49MB, gitignored)  
- **Re-crawl:** `python3 scripts/crawl_old_site.py`

## Brand

| Token      | Hex       |
|------------|-----------|
| Purple     | `#4F2683` |
| Light      | `#8546C2` |
| Dark       | `#271241` |
| Gold       | `#FFC62F` |
| Near-black | `#1E1D22` |
| Lavender   | `#DCD4E6` |

Fonts: **Poppins** (UI), **Caveat** (script accents). See `docs/DESIGN_GOALS.md` for weight mapping gotchas.
