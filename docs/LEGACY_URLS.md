# Legacy URLs & redirects

Plan for bookmarks, emailed links, and old CMS paths after cutover to the static site on **Cloudflare Pages**.

**Audience:** solo site editor, ship-soon release.  
**Not required:** re-crawling the old site, perfect coverage of every historical CMS URL.

## Goals

1. Old links still land on the right content.
2. Browser updates to the **new canonical** URL (301 / 308).
3. Explicit renames you made are never lost.
4. Same-name pages work via a simple extension swap when not in the rename table.

## Solo workflow (source of truth)

You are the only one editing static pages (blog/dynamic is separate). You **will not** rescan the live CMS for ongoing changes. Instead:

| When you… | Do this |
|-----------|---------|
| Rename a page or pick a new slug | Add one line to [`legacy-redirects.json`](../legacy-redirects.json) |
| Add a new page that never existed as `.aspx` | No legacy entry needed |
| Learn of an emailed/bookmarked path that 404s after launch | Add it to the map and redeploy |

The map is hand-maintained. That is intentional and enough for v1.

## Resolution order (at the edge)

When Cloudflare receives a request (after DNS cutover):

```
1. Exact match in legacy-redirects.json
   (includes renames + important query-string keys)

2. Else if path ends in .aspx / .htm / .html:
   same stem → current page if it exists
   e.g. /contact.aspx → /contact.html  (or /contact once clean URLs ship)

3. Else if extensionless pretty path and file exists
   e.g. /donate → serve donate.html (rewrite 200)   // future clean URLs

4. Else → normal 404 (helpful page later if desired)
```

**Always prefer the explicit map over the heuristic** so renames win.

## What is in the map today

See [`legacy-redirects.json`](../legacy-redirects.json).

- **`redirects`** — every known old path → current file (`.html` on disk today).
- **`renames`** — subset where the slug changed (not just the extension). Easy to scan when reviewing.
- **`queryRedirects`** — high-value `?cat=` (and similar) only; incomplete by design.

Non-trivial renames already tracked (examples):

| Old | New |
|-----|-----|
| `/compassion-in-action.aspx` | `/the-dorcas-fund.html` |
| `/wmi-school-of-theology.aspx` | `/bible-college.html` |
| `/prayer-3.aspx` | `/prayer.html` |
| `/intercessor-application-form.aspx` | `/intercessor-application.html` |
| `/all-prophecies.aspx` | `/prophecies.html` |
| `/eagles-saving-nations-membership.aspx` | `/eagles-saving-nations.html` |
| `/prayform-frame.htm` | `/prayer-requests.html` |

Two orientation URLs stay **distinct** (do not merge):

- `/wmi-orientation.aspx` → Warning TV branch page  
- `/wmi-orientation-2.aspx` → About branch page  

## Hosting notes

| Host | Role |
|------|------|
| **Cloudflare Pages** | Production; implement map + same-stem fallback here |
| **GitHub Pages** | Optional preview; weak redirects — not the legacy-URL strategy |

Implementation options (pick at cutover; not all required on day one):

1. Generate `_redirects` from `legacy-redirects.json` (static list of 301s).
2. Small Worker / Pages Function for: exact map → same-stem → optional unmatched logging.
3. Later: clean (extensionless) public URLs; update `to` targets and 301 `*.html` → clean paths.

Until clean URLs ship, **canonical targets stay `*.html`** so they match files on disk and local `python -m http.server`.

## Out of scope for v1 (on purpose)

- Re-crawl of worldministries.org for “anything we missed”
- Full fidelity for every blog/listing query (`?sdate=`, every `?cat=`)
- Client-side JS redirects on a 404 page as the primary mechanism
- Perfect deep links into phase-2 CMS articles (those get maps when articles return)

Unknown old query URLs can fall through to the **parent listing** later (e.g. any unknown `reading.aspx?…` → `/reading.html`) if needed; not required for first release.

## Relationship to build tooling

`scripts/build_pages.py` also rewrites `.aspx` strings **inside** ported HTML bodies so internal links work on localhost. That dict should stay aligned with `legacy-redirects.json`.

- **Edge map** = bookmarks & emails (HTTP 301).  
- **Build rewrite** = content you already ported (link hrefs in HTML).

When you rename a page, update **both** if the build still inlines those strings (or later generate the build dict from the JSON).

## Checklist: cutover day

- [ ] Domain DNS → Cloudflare  
- [ ] Deploy current static site  
- [ ] Apply redirects from `legacy-redirects.json` (301)  
- [ ] Same-stem fallback for leftover `*.aspx`  
- [ ] Spot-check renames + a few same-stem URLs + one emailed link if you have one  
- [ ] Optional: log unmatched paths for a few weeks; add rows only when real traffic shows gaps  

## Checklist: when you rename a page

1. Rename / add the new `.html` file and nav entry.  
2. Add `{ "from": "/old…", "to": "/new.html", "note": "…" }` to `legacy-redirects.json`.  
3. If build content still references the old path, update `build_pages.py` replacements or re-run with shared source.  
4. Deploy.

## Future: clean URLs

See also architecture notes on extensionless paths. When enabled:

1. Public canonical becomes `/donate` not `/donate.html`.  
2. Update `to` values in the map (or add a build step that strips `.html` from targets).  
3. 301 `/donate.html` → `/donate`.  
4. Legacy `.aspx` entries still point at the clean path.

---

**Summary:** Hand-maintained map of what **you** changed + automatic same-stem `.aspx` → current page. No full-site rescan required for release.
