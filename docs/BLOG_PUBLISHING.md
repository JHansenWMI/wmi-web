# Blog publishing on the new stack (current design thought)

**Status:** goal / design thought — not implemented, not a public-site cutover blocker.  
**Related:** [blog-design notes](../reference/blog-design/README.md), [blog samples](../reference/blog-samples/), [INLINE_EDITOR.md](./INLINE_EDITOR.md), [ARCHITECTURE.md](./ARCHITECTURE.md).

This describes the **intended common flow** for new blog content after the static site is live, using the **local Mac Mini** for creation and preview. Details will change when we build it.

---

## Intent

Support how articles are actually written today:

1. Author creates a **Word document** (print-ready / main version).  
2. Export **HTML, filtered** for web.  
3. Light cleanup (whitespace, web-friendlier markup).  
4. Publish on the site.

Target UX (aspirational):

- Drop the Word (or filtered HTML) into a known place.  
- User marks it **Ready**.  
- Mac Mini prepares a **web version** and shows it on the **intranet preview server**.  
- After **Approve**, it **goes live** (public Cloudflare site).

In-page editing ([INLINE_EDITOR.md](./INLINE_EDITOR.md)) remains useful for small fixes after publish; this doc is about the **create / import pipeline**.

---

## Who and where

| Who | Role in this flow |
|-----|-------------------|
| **Authors / content editors (~4)** | Write in Word; drop files; mark Ready; preview; Approve (when trusted) |
| **Dev (1)** | Pipeline, templates, cleanup rules, publish plumbing, hard problems |

| Where | Role |
|-------|------|
| **Author workstation** | Word, print version, “Save as filtered HTML” if needed |
| **Mac Mini (intranet)** | Inbox, conversion, preview server, approval queue |
| **Public site (Cloudflare)** | Read-only live blog pages — no Word, no edit inbox |

Same network boundary as other design notes: **create/preview on LAN**, **public is static**.

---

## Primary authoring flow (most common)

```text
Word (.docx)  ──print/main version lives here──►  keep on shared drive or inbox
       │
       │  export "Web Page, Filtered" (or pipeline converts .docx → HTML)
       ▼
  Web HTML (Word soup)  ──cleanup──►  site-shaped HTML fragment
       │
       ▼
  Preview on Mini (site chrome + article template)
       │
       │  Approve
       ▼
  Publish → git / Cloudflare → live URL
```

### Why Word stays first-class

- Already how teaching / pastoral content is produced.  
- Print version and web version share one source of truth (the doc).  
- Editors should not be forced into a browser-only CMS for long articles.

### Filtered HTML vs converting `.docx` on the server

Two acceptable paths (pick one as default later):

| Path | Notes |
|------|--------|
| **A. Human exports filtered HTML**, drops HTML (+ optional images) | Matches current habit; less server dependency on Word |
| **B. Drop `.docx` only**; Mini converts (e.g. LibreOffice, pandoc, or a small service) | Fewer manual steps; conversion quality must be tested on real WMI docs |

**Ready** can mean “this file is final for web prep,” whether the file is `.docx` or filtered `.html`.

A hybrid is fine: prefer `.docx` in the inbox if conversion is good enough; allow filtered HTML when conversion fails.

---

## Target UX sketch

1. **Drop**  
   - Put file(s) in a watched folder on the Mini (or shared volume the Mini can see), e.g.  
     `…/wmi-blog-inbox/{blog-key}/…`  
   - Optional companion folder for images.  
   - Optional small form on the intranet UI: blog (Pastoral / Prophecies / …), categories, publish date, title override.

2. **Ready**  
   - User action: checkbox, button, or rename/side-car `article.ready` / status in a simple queue UI.  
   - Until Ready, the pipeline does not promote to preview (avoids half-written drafts flapping).

3. **Prepare (Mac Mini)**  
   - Convert if needed (`.docx` → HTML).  
   - Run **cleanup** (see below).  
   - Wrap in **article template** (title, date, categories, site chrome).  
   - Store as a **draft** with a stable id/slug.  
   - Make available only on **preview host** (not public).

4. **Preview**  
   - Open `http://mini…/preview/blog/…` (or similar) — same visual system as the live site as much as practical.  
   - Editors proofread; may request re-drop or light in-page tweak later.

5. **Approve → live**  
   - Button or confirmed action.  
   - Publish step copies/commits into the public site pipeline (git push / Pages deploy).  
   - Old-style redirects only matter for legacy posts; new posts get clean URLs under the chosen blog.

Exact folder names, queue UI, and who may Approve (any of four vs dev-only at first) are open.

---

## Cleanup goals (Word → web)

Word “filtered HTML” is better than full Word HTML but still messy. Automated prep should aim for:

- Strip Word/Office namespaces, conditional comments, `mso-` styles  
- Prefer semantic tags (`p`, `h2`–`h4`, `ul`/`ol`, `a`, `strong`/`em`, `img`)  
- Normalize whitespace / empty paragraphs  
- Images: extract or copy next to the article; fix paths; reasonable max-width via site CSS  
- Do **not** reintroduce the old CMS style soup the static build already fights  

Human “minor modifications” can stay for edge cases; the server should handle the boring 80%.

Tools to evaluate later (not chosen yet): pandoc, mammoth.js, LibreOffice headless, custom tidy pass.

---

## Fit with the five CMS blogs

From [blog-design](../reference/blog-design/):

| Blog | Flow |
|------|------|
| Pastoral Articles | **Word drop** (this doc’s main flow) |
| Prophecies | **Word drop** |
| Soldiers of the Cross | **Word drop** (sometimes shorter, still article-shaped) |
| Dorcas Fund Articles | **Word drop** |
| **Thought For The Day** | **Different flow** — see [below](#thought-for-the-day-separate-flow) |

Inbox or queue for Word articles should **choose a blog** among the long-form blogs (and that blog’s categories). Prophecies categories ≠ Pastoral categories.

Migration of **old** posts is still “CMS dump from host,” not the drop-folder flow. Word drop is for **new** long-form content after cutover.

---

## Thought For The Day (separate flow)

TFTD is **not** the Word → filtered HTML pipeline. Entries are **short**, often **date-titled**, high cadence — a different product shape.

### Intent

- Local **database** (or equivalent table store) of thoughts on the Mac Mini.  
- Simple **row-style admin UI** on the intranet: one row per day/entry.  
- Multi-line text fields per row (the body is short but not always a single line).  
- Preview on Mini; publish/sync selected or “through today” to the public static site (or a small generated feed the site reads).

### Why not Word-drop

- Overhead of doc → export → cleanup is silly for a few sentences.  
- Grid/list edit matches “fill in today’s thought” better than a document pipeline.  
- Historical dump from CMS still useful once; ongoing entry is spreadsheet-like.

### UI sketch (thought only)

```text
Date          | Thought (multi-line)              | Status
--------------|-----------------------------------|--------
2026-07-19    | …                                 | live
2026-07-20    | …                                 | draft
[+ add row]
```

- Edit in place or open a small multi-line editor per row.  
- Optional: paste several days at once later; not required for v1.  
- No rich-text arms race — plain text or very light markup unless real need appears.

### Data / publish sketch

```text
Mini SQLite (or similar)
  thoughts(date PRIMARY, body_text, updated_at, status)
        │
        ├── intranet admin UI (row edit)
        └── publish job → public JSON/HTML fragments → Cloudflare
```

Public page can be:

- Generated static pages/list, or  
- One page that loads a published JSON feed (still built from the Mini DB).

Exact public URL shape TBD (`thought-for-the-day.html` shell already exists as a stub).

### Relationship to in-page editor

TFTD admin is the **create/edit** surface for this stream. In-page edit of the live Thought page is optional later; the row UI is the primary path.

---

## States (simple lifecycle)

```text
  dropped  →  ready  →  preparing  →  preview  →  approved  →  live
                ↑           │              │
                └───────────┴── failed / needs rework ──┘
```

| State | Meaning |
|-------|---------|
| dropped | File landed; not ready for conversion |
| ready | Author says process this |
| preparing | Conversion/cleanup running |
| preview | Visible on Mini preview only |
| approved | Cleared for public |
| live | On Cloudflare / public URL |
| failed / rework | Conversion or review problem; back to author |

Low traffic: no need for a heavy CMS workflow engine. A small DB or JSON queue on the Mini is enough to think about.

Locks ([INLINE_EDITOR.md](./INLINE_EDITOR.md)): if someone is editing a live post in the in-page editor, Approve of a **replacement** import should not clobber without warning.

---

## Topology (sketch)

```text
Shared folder / inbox (Office volume or Mini disk)
        │
        ▼
┌─────────────────────────────────────┐
│ Mac Mini                            │
│  - watch inbox / Ready trigger      │
│  - convert + cleanup                │
│  - draft store                      │
│  - preview web app (intranet)       │
│  - Approve → publish script         │
└─────────────────────────────────────┘
        │  git push / deploy
        ▼
   Public static site (Cloudflare)
```

Aligns with existing Mini habits (Media Archive Searcher, rumble feed jobs): **private ops machine, public static result**.

---

## Relationship to other pieces

| Piece | Relationship |
|-------|----------------|
| **Public cutover** | Ship static site first; this pipeline can follow |
| **CMS dump** | Historical archive import; separate one-time (or rare) path |
| **In-page editor** | Fix typos / small rich-text on already-published (or preview) pages |
| **Word drop flow** | Primary **create** path for long articles |
| **Legacy redirects** | Old `reading.aspx?post=` → new article URLs after migration |

---

## Content storage preference (long-form blogs)

**Current lean (preferred): not a runtime database for public Reading.**

Ship and serve articles as **static files + JavaScript**, same family as the rest of wmi-web:

| Piece | Role |
|-------|------|
| **HTML snippets** (one file per article, or fragment + shell) | Body content after Word cleanup |
| **Index/catalog JSON** (or small JS module) | id, title, slug, date, category ids, path to snippet, excerpt |
| **Listing JS** (`reading.js` today) | Load catalog, filter by category/search/year, render cards |
| **Article view** | Load snippet into the article chrome (or navigate to a static page built from the snippet) |

**Why this fits**

- Matches a static Cloudflare site (no DB on the edge for public reads).  
- Word → cleanup → snippet is a natural pipeline output.  
- Easy to git-diff, review, and publish from the Mini.  
- Sample demo already points this way: `data/reading-catalog.json` + `js/reading.js` (bodies inlined in the demo catalog for simplicity; production can keep **bodies in separate `.html` snippets** and catalog entries as metadata + `bodyPath`).

**What a “database” was only for in the notes**

- Optional **Mini-side** queue/state for publish workflow (draft / ready / live) — can also be JSON files.  
- **Thought For The Day** was sketched as a small local table for row editing; even that can be “JSON array + admin UI” if we want zero SQL. Prefer the lightest store that makes the row UI pleasant.

**Not preferred for public long-form:** querying Postgres/SQLite on every page view of Reading.

Publish step: Mini writes/updates snippets + regenerates catalog index → git push / deploy → CDN.

### Scale & search (locked lean)

Rough load after cutover:

| Stream | Cadence | Implication |
|--------|---------|-------------|
| Long-form (Pastoral, Prophecies, Soldiers, Dorcas, …) | ~**4 articles / month** | Tiny growth; easy to keep as snippets + catalog |
| Thought For The Day | ~**1 / day** since mid‑2022 | ~1.5k+ rows; fine as year-bucketed JSON, not “too big for static” |

**Search (match live “find all articles with this word/phrase”):**  
prefer a **full-text index built at publish** over all snippets + TOTD — e.g. Pagefind, Lunr, or a generated `search-index.json` — not a runtime DB on Cloudflare.

```text
Word / TFTD row UI  →  snippets + TOTD buckets + catalog
                              │
                              ├──► reading.js (list / filter / article)
                              └──► search index (rebuild on publish)
                                         │
                                         └──► search UI on public site
```

No Cloudflare database required for public reads or search at this volume. Optional SQLite on the Mini remains only if the **admin** tools want it; public stays static files + JS + prebuilt index.

---

## Public URL shape (Reading / articles)

**Dev today** (static files, `python -m http.server`): query strings work without rewrites.

| View | Dev URL |
|------|---------|
| Listing | `reading.html` |
| Category | `reading.html?cat=493` |
| Article | `reading.html?post=14080&title=turning-compassion-into-action` |

**Goal** (Cloudflare / Mini routing — no `.html`, slash style instead of `?` / `&`):

| View | Goal path |
|------|-----------|
| Listing | `/reading` |
| Category | `/reading/category/pastoral-articles` (or `/reading/category/493`) |
| Article | `/reading/14080/turning-compassion-into-action` |

Legacy live maps with redirects, e.g.  
`/reading.aspx?post=14080&title=Turning-Compassion-into-Action` → goal article path.

First UI demo: `reading.html` + `js/reading.js` + `data/reading-catalog.json` (sample posts).  
Catalog field `urlGoal` documents the target shape for deploy config later.

---

## Open questions

- Default input: `.docx` only, filtered HTML only, or both?  
- Where do print-canonical Word files live long-term (archive drive vs Mini)?  
- Category UI on Ready vs tags inside the document?  
- Who can Approve long-form articles to live on day one?  
- Images: embed in Word only, or allow a side `images/` folder?  
- Slug rules (from title vs manual)?  
- TFTD: who may edit the row DB; publish all drafts vs “today only”?  

---

## Phasing (loose)

**Long-form (Word):**

0. Public static site + legacy redirects (independent).  
1. Manual process: filtered HTML → cleanup → template → preview on Mini.  
2. Inbox + Ready + auto cleanup → preview URL.  
3. Approve → publish to Cloudflare.  
4. Optional: `.docx` conversion.  
5. Optional: light in-page edit on preview before Approve.

**Thought For The Day (parallel, smaller):**

0. Import historical TFTD from CMS dump into local DB when available.  
1. Simple intranet row editor + multi-line body.  
2. Publish job to public site/feed.  
3. Polish (bulk paste, calendar view) only if needed.

---

## Summary

**Long-form blogs:** Word (print) → drop / Ready → Mini prepares web version → intranet preview → Approve → live on Cloudflare.

**Thought For The Day:** separate — short entries in a **local DB** with a **simple multi-line row editor** on the Mini; publish from there. Not the Word pipeline.

Not a commitment to a particular converter, queue, or DB product—just the intended shape.
