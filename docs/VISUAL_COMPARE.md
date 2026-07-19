# Visual compare (above the fold)

Semi-automated screenshots of **local** vs **live** pages for visual QA.

## Setup (once)

```bash
cd /Users/fredchristian/dev/wmi-web
npm install
npm run screenshots:install   # downloads Chromium for Playwright
```

## Run

```bash
# Terminal 1 — local site
python3 -m http.server 8080

# Terminal 2 — screenshots
npm run screenshots
```

Options:

```bash
# Priority set (default): home, about, watch-warning, donate, …
node scripts/screenshot-compare.mjs

# Specific pages
node scripts/screenshot-compare.mjs --pages about.html,watch-warning.html

# Every mapped page
node scripts/screenshot-compare.mjs --all

# Viewport width (default 1440)
node scripts/screenshot-compare.mjs --width 1280
```

## Output

All under `temp/screenshots/` (**gitignored**):

| Path | Contents |
|------|----------|
| `desktop/<page>.local.png` | Local above-the-fold |
| `desktop/<page>.live.png` | Live above-the-fold |
| `index.html` | Side-by-side gallery |
| `manifest.json` | Run metadata |

Open the gallery:

```text
http://localhost:8080/temp/screenshots/index.html
```

## Fair comparison notes

- Script waits for **`document.fonts.ready`** so Poppins/Caveat should be loaded on both sides.
- Local font link matches live: Poppins **200 / 400 / 800** + Caveat **500**.
- Dynamic widgets (Rumble grids, “Loading…”) will still differ — ignore those regions for pass 1.
- Live URLs use `.aspx` (and a few `reading.aspx?cat=…` listings); map is in `scripts/screenshot-compare.mjs` (`LIVE_PATH`).

## Fonts (product)

Keep this Google Fonts URL sitewide (same as live):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Poppins:ital,wght@0,200;0,400;0,800;1,400&display=swap" rel="stylesheet">
```

Do not load extra Poppins weights (500/600/700) — they change heading/nav rendering vs live.
