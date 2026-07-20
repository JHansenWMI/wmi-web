# Article body snippets

HTML **body fragments** for blog posts (not full pages — no chrome, no `<html>` shell).

## Naming

```text
YYMMDD-Title.html
```

| Part | Rule | Example |
|------|------|---------|
| `YYMMDD` | Post date (2-digit year) | `260714` for 2026-07-14 |
| `Title` | Title-Case words, hyphens, ASCII-safe | `Turning-Compassion-into-Action` |
| Extension | **`.html`** | Standard for HTML fragments; no special “snippet” extension needed |

Full example: `260714-Turning-Compassion-into-Action.html`

## Why this folder

| Path | Role |
|------|------|
| **`content/articles/`** | Editable product content (repo + eventual deploy) |
| `data/*-catalog.json` | Thin metadata (id, title, date, cats, excerpt); demo may still inline `bodyHtml` |
| `reference/` | Design samples only — not the live content store |

## File shape

Each file is the **inner article HTML** (paragraphs, headings, images, links) plus an optional HTML comment header for tooling:

```html
<!--
wmi-post-id: 14080
wmi-title: Turning Compassion into Action
wmi-date: 7/14/2026
wmi-blog: pastoral-articles
wmi-slug: turning-compassion-into-action
-->
<p>Article body…</p>
```

## Index

`_index.json` maps stable **post id** → filename so renames/title edits stay findable:

```json
{
  "version": 1,
  "posts": {
    "14080": {
      "file": "260714-Turning-Compassion-into-Action.html",
      "title": "Turning Compassion into Action",
      "updated": "2026-07-19T12:00:00Z"
    }
  }
}
```

## How files get here

1. **Dev / Mini:** in-page editor → **Save** → `scripts/dev_server.py` writes under this folder (localhost only).  
2. **Later:** Word → cleanup pipeline can write the same shape.  
3. **Publish (not yet):** git commit/push of these files + catalog; public host stays read-only.

## Load order (article view)

1. If `_index.json` has this post → fetch `content/articles/{file}`.  
2. Else use catalog `bodyHtml` (sample / import fallback).

## Safety

- Write API only on the **dev server** bound to **127.0.0.1** — never on Cloudflare.  
- Plain `python -m http.server` cannot save; use `npm run dev` / `python3 scripts/dev_server.py`.
