# Design goals — WMI website replica

This is a large site. We will not pixel-match everything. Use this doc to decide **what must feel the same** vs **what can differ**.

## North star

Ship a clean, maintainable static (Cloudflare Pages + Workers) replacement of [worldministries.org](https://www.worldministries.org) that **humans perceive as the same site** — especially for first impressions and primary content — without cloning every CMS quirk or ASP.NET artifact.

## Priority tiers

### P0 — Human attention anchors (must match closely)

Things visitors notice immediately. If these are off, the site “feels wrong.”

| Area | Expectation |
|------|-------------|
| **Hero / pastor photo** | Size, crop, and placement relative to the hero text |
| **Hero headline block** | “Warning!” hierarchy, font family, weight, approximate size; text alignment of that column |
| **Logo in header** | Recognizable size and placement |
| **Brand colors** | Purple `#4F2683` / `#8546C2` / `#271241`, gold `#FFC62F`, dark `#1E1D22` |
| **Primary typefaces** | Poppins (UI/body), Caveat where the live site uses script accents |

When in doubt: **center of attention first** (hero image, main headline), then chrome.

### P1 — Page structure & content fidelity

| Area | Expectation |
|------|-------------|
| Section order on homepage | Header → hero → listen → ESN → thought → TV → prophecies → newsletter → footer |
| Nav labels & destinations | Same menu structure; links may be clean URLs instead of `.aspx` |
| Static copy | Same wording as live for public-facing static content |
| Footer contact & socials | Correct address, phone, social destinations |
| Section spacing / padding | Match live section padding when it changes the “rhythm” of the page |

### P2 — Polish (match when practical, batch later)

| Area | Expectation |
|------|-------------|
| Wave / curve dividers | Same general shape language |
| Card styling (prophecies, etc.) | Same purple borders / title chips |
| Button style | Gold fill, uppercase, rounded |
| Mobile drawer | Usable parity, not identical animation |
| Podcast logo row | Same dark bar, logo heights (`30px` / `2.1vw`) |

### P3 — OK to differ

| Area | Why |
|------|-----|
| Menu item **spacing** (a few px) | Humans rarely notice |
| Subpixel font rendering | Browser/OS variance |
| CMS / ViewState / MooTools | Not part of the product |
| Exact carousel library (Owl) | Function > identical plugin; grid OK until we need swipe |
| Dynamic feeds (Thought of the Day, Rumble videos) | Wired later via Workers/API |
| Pixel-perfect dropdown chrome | Structure and readability first |
| “Web Design by Efinitytech” credit | Old host credit; drop or replace when we ship |
| Number of prophecy cards on home | Live dumps a long slider; a short static set is fine until CMS |

## Working process

1. **One attention issue at a time** until the hero and header feel right, then batch related fixes.
2. Prefer **comparing live CSS intent** (e.g. `min-width: 70%` on the photo) over eyeballing alone.
3. Keep HTML semantic and maintainable; do not paste ASP.NET markup.
4. Capture comparison screenshots under `temp/` (gitignored).
5. When a section is “good enough,” note it under **Signed off** below so later work does not re-litigate it.
6. When live CSS hides something (`display: none`), hide it in our copy too unless we deliberately revive it.

## Brand tokens (source of truth)

```
Purple:        #4F2683
Purple light:  #8546C2
Purple dark:   #271241
Gold:          #FFC62F
Near black:    #1E1D22
Lavender:      #DCD4E6

Root rem:      html { font-size: 62.5%; }  /* 1rem ≈ 10px, matches live Skeleton */
Body:          Poppins 1.7rem / 400
Headings:      Poppins ExtraBold 800
               (live CSS says font-weight:600, but Google Fonts only
               loads 200/400/800 — browser maps 600 → 800. Load the
               same three weights or "Warning!" looks too light.)

Google Fonts (match live):
  Caveat 500
  Poppins 200, 400, 800 + italic 400
```

## Gotchas discovered (keep these)

| Gotcha | Lesson |
|--------|--------|
| **Font weight mapping** | Loading extra Poppins weights (500/600/700) makes headings render lighter than live. Stick to 200/400/800. |
| **Logo flex squeeze** | Header is flex; logo needs `flex-shrink: 0` and live min/max (160–200px). Do not shrink logo on scroll (live does not). |
| **Hero image column** | Live uses `min-width: 70%` for the pastor photo — not ~50/50. |
| **Hero text alignment** | Intro stays `text-align: center` even on desktop (narrow right column). |
| **Hidden live UI** | `.listen-title` (“Listen On…”) is `display: none` on live — keep it hidden. |
| **“Improving” while copying** | Resist restyling (left-align hero, smaller type, extra weights). Match first; improve later if product asks. |
| **Font smoothing** | Do **not** set `-webkit-font-smoothing: antialiased` on `body`. Live uses browser default (subpixel); antialiased thins white nav text. |
| **Hero lede line-height** | “Proclaiming the Kingdom…” uses `line-height: 1.1` (live `.featured-intro-wrap`), not body `1.4`. |

## Homepage pass 1 — product decisions (2026-07)

Owner review: remaining homepage diffs were **intentionally skipped** for now.

| Decision | Guidance |
|----------|----------|
| **Above-the-fold / first impression** | Prioritize hero, logo, primary nav weight/feel, headline block. Keep iterating if something “jumps out.” |
| **Below the fold** | OK if “just as good” in the new layout even when not pixel-matched (ESN, prophecy grid vs carousel, section rhythm). Do not block ship on these. |
| **Dynamic content → pass 2** | Thought for the Day body, Rumble/Warning TV embeds, live prophecy list, newsletter backend. Shells/placeholders are fine until CMS/Workers. |
| **Menu spacing / micro-diffs** | Accept unless a human calls them out again. |
| **Re-open a skipped item** | Only when product names it (e.g. “ESN card next”) — not by default when polishing other pages. |

## Signed off (human-checked)

Update this list as sections are approved.

| Area | Status | Notes |
|------|--------|-------|
| Header logo size | Closer | Live 160–200px; no scroll shrink |
| Hero pastor image | Closer | Desktop `min-width: 70%` |
| Hero “Warning!” weight | Closer | ExtraBold 800 via font load + weight |
| Hero lede line-height | Closer | `1.1` on “Proclaiming…” |
| Main nav stroke weight | Closer | No forced antialiased smoothing |
| Listen title visible | Fixed | `display: none` like live |
| Menu spacing | Accept differences | P3 |
| Homepage below-fold polish | Accept for pass 1 | New look OK; not pixel-chasing |
| Thought of the Day (dynamic) | Pass 2 | Static placeholder OK |
| Warning TV videos (dynamic) | Pass 2 | Placeholders / Rumble link OK |

## Homepage audit backlog (static)

Tracked during full-page review. Dynamic items are deferred on purpose.

| Item | Priority | Status | Notes |
|------|----------|--------|-------|
| Listen bar padding (`10rem` top / `8rem`) | P1 | Done | Matched live `.listen-wrap` |
| ESN heading size / card padding | P1 | Done | Default h3 scale; `padding-bottom: 0` |
| Thought h1 `line-height: 0.8`, always `5rem` | P2 | Done | Matched live |
| Prophecy title chip offset (`left/top: -2rem`) | P2 | Done | Purple tab hangs off corner |
| Prophecy layout = horizontal strip | P3 | Accept pass 1 | Live Owl carousel; grid OK |
| Below-fold visual parity (general) | P3 | Accept pass 1 | Product: fine if “just as good” |
| Video embeds | Pass 2 | Open | Rumble JS on live |
| Thought of the Day content | Pass 2 | Open | CMS/API later |
| Newsletter submit backend | Pass 2 | Open | UI only for now |
| Footer “Efinitytech” credit | P3 | Accept | Drop for new host |

## Screenshot review backlog (2026-07-19)

From `temp/screenshots/` above-the-fold compare (local vs live).

### Fixed this pass

| Issue | Fix |
|-------|-----|
| Side nav listed parent page as purple pill (e.g. About) | Children only + large title (live behavior) |
| Content `h2`/`h3` too bright purple | Use `#271241` (purple-dark) like live skeleton |
| Content column too narrow (`max-width: 900px`) | Use site container width (~80% / 1440) |
| Donate `h5` labels not purple | Style `h4`–`h6` in `.page-content` |
| Long PayPal URLs overflow | `overflow-wrap: anywhere` |
| Donate missions link still `reading.html?…` | → `missions.html` |

### Ask before changing (next pass)

| Item | Why uncertain |
|------|----------------|
| **Rumble / video embeds** (About orientation, watch-warning grid) | Pass 2 / dynamic; live has players, local has “Loading…” or empty after script strip |
| **Home header transparent vs solid** | **Resolved:** match live — transparent on home until scroll; solid on interior |
| **PayPal buttons** | **Resolved:** gold links to hosted_button_id URLs are correct (no separate PayPal.js widget on live) |
| **Shareable Link raw URLs** on donate | **Resolved:** keep, match live |
| **Interior hero wave layers** | **Resolved:** multi-path white wave (live shape) |
| **Testimonials layout** | **Resolved:** stack OK (matches live at various widths) |
| **Rumble / video embeds** | **Resolved:** preserve Rumble + github.io widget scripts in build |
| **Prophecies / reading listing density** | Shells trimmed for phase 2 by design |

## How to ask for the next pass

Be specific about **what jumps out** (e.g. “pastor image still small on 1440px laptop”) and **what can wait**. Vague “make it match” is less useful than one or two human-attention items.

Good example:

> Hero image is closer. Next: ESN card and podcast logo row only.

## Out of scope for visual parity

- Admin / login CMS screens  
- Exact third-party embed chrome  
- Old IE/Skeleton grid quirks that do not affect modern browsers  

## Reference archive (`old-site/`)

Gitignored raw capture of the live site for comparison while rebuilding.

| Policy | Detail |
|--------|--------|
| Included | Nav/static page shells (no `?post=` articles) |
| Included | Shared CSS/JS/template images + images linked from those shells |
| One sample | Single dynamic article under `old-site/pages/samples/` for detail layout |
| Skipped | Full article/prophecy archives (CMS export in phase 2) |
| Caps | Time budget + max HTML/assets in `scripts/crawl_old_site.py` |

```bash
python3 scripts/crawl_old_site.py   # re-run medium crawl
```

See `old-site/README.md` and `old-site/INVENTORY.md`.
