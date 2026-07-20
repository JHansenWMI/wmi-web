# In-page content editing (current design thought)

**Status:** exploratory design — not a commitment, not a release blocker.  
**Audience:** sole developer (or one replacement) + about four content editors.  
**Related:** public site remains static on Cloudflare; see [ARCHITECTURE.md](./ARCHITECTURE.md), [LEGACY_URLS.md](./LEGACY_URLS.md).

This note captures where thinking stands so far. Details will change when we implement or learn more.

---

## Intent

Give a small set of people a way to fix **page content** in context — on the page they already know how to open — without learning a separate page-builder or waiting on a developer for every wording change.

Still out of scope for this tool (dev pass, often with AI help):

- Site structure, nav, chrome, layout systems  
- New page types, forms, tables as structure  
- Global CSS / brand system  
- Complex embeds and one-off widgets  

**Public internet users never edit.** Editing is an **intranet** activity.

---

## People and pace

| Who | Role |
|-----|------|
| **Dev** | One person (today) or a single replacement. Owns structure, deploy, tooling, this editor’s evolution. |
| **Content editors** | ~4 people. Especially blog-style pages; occasional fixes on static interior pages. |
| **Public** | Read-only on the live site. |

Not a busy multi-tenant CMS environment. Still expect occasional overlap (two people open the same blog post), so a **simple lock** is worth having even if days go by with no conflict.

No full role/permission matrix planned for v1 — login that proves “allowed to edit,” plus page locks, is enough to think about.

---

## Core UX idea

1. Editors know how to reach the **edit host** (intranet URL), not a secret on the public domain.  
2. After login, a **bar across the top**: at least **View** / **Edit**, plus save/discard when dirty.  
3. In **Edit** mode, click **marked** content → change text.  
4. Two levels of region (conceptually):  
   - **Standard / text** — edit the text of that element only (titles, short labels).  
   - **Rich region** — broader container; rich-text editing of the body inside; toolbar actions appear in the top bar while that region is focused (bold, link, lists, clear formatting — exact set TBD).  
5. Unmarked DOM is not editable (protects header, side nav, footer, accidental layout breakage).

Entry via “known path” or “query on the URL” is fine **on the intranet host**. It is **not** the security boundary for the public site.

---

## Network boundary (important preference)

**Current preference: no in-page editing over the public internet.**

| Surface | Where (thought) | Editor? |
|---------|------------------|--------|
| **Live public site** | Cloudflare Pages / production domain | No editor script, no save API |
| **Preview + edit** | Server on the private network (e.g. Mac Mini), same spirit as Media Archive Searcher | Login + bar + regions + save |

Remote staff would join the private network first (VPN / LAN), same pattern already described for other intranet tools.

### Why this is attractive

- Avoids “anyone who guesses `?edit=`” on a public static host  
- Reuses habits and hardware you already have (Mini, launchd, LAN services)  
- Public deploy stays simple: static files only  
- Auth can stay modest (shared or few named logins) because the app is not world-exposed  

This is a design preference, not a law of physics — if requirements change later, public edit with stronger auth could be reconsidered. For now, intranet-only keeps the problem small.

---

## Relationship to existing ops (reference, not copy)

Useful parallels from other WMI tooling (for shape, not for reusing code wholesale):

**rumble-WMI-videos** (`rumbleScraper/rumble-WMI-videos`)

- Private side generates data; **public** gets static feeds/widgets via git push / GitHub Pages  
- Mac Mini + scheduled jobs; human paste of CMS shells when needed  
- Lesson: **change privately → publish statically**

**Media Archive Searcher** (`MediaWeb/MediaArchiveSearcher`)

- FastAPI app intended for **private intranet** on the Mac Mini  
- Simple login; bind carefully (localhost vs LAN)  
- Explicit non-goal of being a subscription CMS  
- Lesson: **LAN web app + light auth** is a known, comfortable pattern here  

A WMI site **preview/edit server** would sit in that same family: private app that mutates a working copy of the site (or content store), then a **publish** step updates what the world sees.

---

## Suggested topology (sketch)

```text
Content editors (office LAN / VPN)
        │
        ▼
┌───────────────────────────────────────┐
│  Preview / edit host (e.g. Mac Mini)  │
│  - login                              │
│  - serve local checkout of wmi-web    │
│  - inject editor bar when authorized  │
│  - page locks (SQLite or similar)     │
│  - save → files / git working tree    │
└───────────────────────────────────────┘
        │  publish (button or dev-run)
        ▼
   git push / Cloudflare Pages build
        │
        ▼
   Public static site (read-only)
```

Exact host, port, process manager (launchd, etc.) TBD. The idea is “another intranet service,” not “edit Cloudflare in place.”

---

## Marking editable content

Prefer **explicit regions** over “click anything.”

Illustrative markup (not final API):

```html
<h1 data-edit="text" data-edit-id="title">Contact Us</h1>

<div class="page-content" data-edit="rich" data-edit-id="main">
  …body copy…
</div>
```

| Kind | Intent |
|------|--------|
| `text` | Plain text of one element; no free-form HTML paste |
| `rich` | Constrained rich text inside a container; toolbar in the top bar while focused |

IDs (`data-edit-id`) give save/load something stable to key on per page.

Chrome (header, footer, side nav) stays outside these markers unless we deliberately opt in later.

How markers get into pages (hand-authored, build step, blog template only, …) is open.

---

## Rich text

Browser `contenteditable` alone tends to produce messy markup (the same class of problem the static build already cleans up from the old CMS).

Current leaning:

- Use a **small, constrained** editor stack for rich regions (e.g. TipTap / ProseMirror / Quill-class tools — choice later)  
- Allowlist tags/behavior; avoid reintroducing font/color soup  
- Toolbar lives in the **top bar** when a rich region is active, not a floating free-for-all on every click  

Projects worth skimming for ideas (not “must adopt”):

- **TinaCMS / CloudCannon / Decap** — visual edit of static sites, regions, git-ish workflows  
- **TipTap / ProseMirror** — constrained rich text  
- **MediaArchiveSearcher / rumble pipelines** — *our* intranet + publish shape  

Building the **shell** (bar, mode toggle, region click, lock, save) from scratch is fine. Reusing a mature engine for rich text is smarter than pure DIY contenteditable.

---

## Save and source of truth

Open question, with options ranked by current comfort for an experiment:

| Approach | Notes |
|----------|--------|
| **A. Save into local git working tree on Mini, then publish** | Keeps repo as history; fits “one dev” + AI review of diffs |
| **B. Save fragments to a small store (SQLite/files), merge at preview/serve** | Flexible; need clear rules so a rebuild doesn’t surprise anyone |
| **C. Experiment only: save disabled / export patch** | Good for first spike; not a real editor product |

Drift risk to watch: **edit host** vs **git main** vs **Cloudflare**. Whatever we pick, “what wins after publish?” should be obvious.

Blog content (many articles, frequent edits) may eventually want a clearer content store than “raw HTML file per post.” That can evolve after a static-page spike.

---

## Concurrent edit / lockout

Low traffic, but real people. Current thought: **pessimistic lock per page** (or per major region later if needed).

Sketch:

1. Enter Edit on a page → acquire lock (`page id`, `user`, `expiry` e.g. 15 minutes).  
2. Another editor → “X is editing”; no silent overwrite. Optional “take over” only if we want it.  
3. Heartbeat while the bar is open so a closed laptop doesn’t hold the lock forever.  
4. Save / leave Edit / timeout → release.  

SQLite on the edit host is enough to think about; no CRDT/real-time co-editing planned.

---

## Auth (edit host only)

Keep boring:

- Login required before editor JS runs  
- Shared password or a short list of named users in config/env  
- Same general idea as Media Archive Searcher’s light gate — harden as needed, don’t build SSO first  

Public Cloudflare deployment does not include this login surface.

---

## Phasing (loose)

Not a schedule — a possible order that **does not block** public site cutover:

0. **Now** — Finish public static site, cutover, legacy redirects. No dependency on this editor.  
1. **Spike** — Intranet preview of one page; bar; a few `text` regions; no real save.  
2. **Rich region + toolbar** — One constrained rich body.  
3. **Save + lock** — Working tree or store; page lock; login.  
4. **Publish** — Path to git/Cloudflare that editors or dev can run safely.  
5. **Blog-oriented UX** — If static markers aren’t enough for daily long-form work.  
6. **Thought For The Day** — Prefer a **row/DB admin** on the Mini ([BLOG_PUBLISHING.md](./BLOG_PUBLISHING.md)), not in-page Word-like editing.

Ship the ministry site without waiting for the editor or TFTD admin.

---

## Explicit non-goals (for this thought)

- Full CMS (media library, workflows, roles, scheduling) as day-one scope  
- Internet-facing visual editor on the production domain  
- Editors redesigning nav or page templates in the browser  
- Real-time multi-caret collaboration  
- Replacing developer/AI work for structural changes  

---

## Open questions

- Exact edit-host stack (static file server + small API vs full FastAPI app)?  
- Markers on all interior pages vs blog-first only?  
- Who may press **Publish** — any of the four, or only dev at first?  
- How blog/dynamic content (phase 2 CMS) shares this UX vs a separate admin?  
- Whether content lives as HTML files, markdown, or JSON fragments long-term?  

---

## Summary

**Current design thought:** a modest, intranet-only, in-page content editor for a handful of people; view/edit bar; marked text vs rich regions; simple locks; private preview host (Mini-class) that publishes to a read-only public static site. Developer retains structure. Public cutover does not wait on this.

Revisit freely as we spike or as blog needs firm up.
