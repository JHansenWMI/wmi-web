# Blog design notes (CMS structure)

Hand notes from the live CMS, for designing listings and article pages.  
**Not** the full content archive — see also [`../blog-samples/`](../blog-samples/) for a few fetched posts.

## Five blogs (not one)

From [`blogs.txt`](./blogs.txt), the host has **separate blogs**, each with its own RSS:

| Blog | Comments | RSS | Local listing shell (today) |
|------|----------|-----|-----------------------------|
| **Pastoral Articles** | no | `blog135rss.xml` | `reading.html` / `pastoral-articles.html` |
| **Prophecies** | no | `blog138rss.xml` | `prophecies.html` (live: `all-prophecies.aspx`) |
| **Soldiers of the Cross** | no | `blog160rss.xml` | `soldiers-of-the-cross.html` |
| **The Dorcas Fund Articles** | no | `blog165rss.xml` | `the-dorcas-fund-articles.html` |
| **Thought For The Day** | no | `blog137rss.xml` | `thought-for-the-day.html` |

Implications for design/migration:

- Nav “Reading” children map to these blogs, not only to `reading.aspx`.
- Category sets **differ by blog** (see below).
- A full CMS dump should preserve **blog id + categories per post**, not flatten everything into one “blog.”
- Thought For The Day is high-volume/date-titled; Dorcas has a much smaller set (RSS showed ~4 items).

Live Reading hub (`reading.aspx`) is effectively the **Pastoral Articles** stream (with its category sidebar). Other blogs use their own listing pages.

## Pastoral Articles categories

From [`Pastoral Articles categories.txt`](./Pastoral%20Articles%20categories.txt) — matches the live Reading sidebar / `?cat=` ids we used in samples:

| Category | Live cat id (approx) |
|----------|----------------------|
| Radio Guests | 491 |
| TV Guests | 492 |
| Pastoral Articles | 493 |
| Mission Trips | 494 |
| Africa | 496 |
| Caribbean | 497 |
| Middle East | 498 |
| Asia | 499 |
| Central America | 500 |
| North America | 501 |
| Australia/Oceania | 502 |
| Europe | 503 |
| South America | 504 |
| Bible Teaching | 505 |
| Israel | 506 |
| New World Order | 513 |
| United States of America | 514 |
| Benevolence | 520 |
| Eagles Saving Nations | 523 |
| Prophecies | 550 |
| Soldiers of the Cross | 590 |

Posts are often **multi-tagged** (e.g. mission trip + Africa + Pastoral).

## Prophecies categories

From [`Prophecies categories.txt`](./Prophecies%20categories.txt) — **different** from Pastoral:

- Regions: Africa, Caribbean, Middle East, Asia, Central America, North America, Australia/Oceania, Europe, South America, Israel, United States of America  
- Country-style: Kenya, South Korea, Colombia  
- Theme: New World Order  

Live nav also references Prophecy-USA style filters under Reading → Prophecies (`all-prophecies.aspx?cat=…` — exact ids TBD from dump or scrape).

Soldiers / Dorcas / Thought category lists are not in this folder yet; fill in when known.

## Design samples already pulled

[`../blog-samples/`](../blog-samples/):

| Source | Location |
|--------|----------|
| Pastoral Articles (~2 per category via `reading.aspx?cat=…`) | `{catId}-{slug}/` |
| Prophecies (2 via `blog138rss.xml`) | `blog-prophecies/` |
| Soldiers of the Cross (2 via `blog160rss.xml`) | `blog-soldiers-of-the-cross/` |
| Dorcas Fund Articles (2 via `blog165rss.xml`) | `blog-dorcas-fund-articles/` |
| Thought For The Day (2 via `blog137rss.xml`) | `blog-thought-for-the-day/` |

See `blog-samples/README.md` and `manifest.json` for titles and paths.

## Publishing goal (new stack)

See [docs/BLOG_PUBLISHING.md](../../docs/BLOG_PUBLISHING.md).

| Stream | Day-to-day create (design thought) |
|--------|--------------------------------------|
| Pastoral, Prophecies, Soldiers, Dorcas | **Word (print) → drop/Ready on Mini → cleanup → preview → approve → live** |
| **Thought For The Day** | **Local DB + simple multi-line row editor** on Mini (short entries; not Word-drop) |

Historical content still expects a **CMS dump** from the host; the flows above are for ongoing work after cutover.

## Suggested information model (later)

```text
Blog
  id, name, rss_url, comments_allowed
Category
  id, blog_id, name, slug
Post
  id, blog_id, title, slug, published_at, body_html, …
PostCategory
  post_id, category_id   # many-to-many
```

URL ideas (not final):

- `/reading` or `/pastoral` — Pastoral listing  
- `/reading/{slug}` or `/posts/{id}` — article  
- `/prophecies`, `/dorcas-articles`, `/soldiers-of-the-cross`, `/thought-for-the-day` — other blogs  
- Filters: `?cat=` or path segments — keep redirects from old `reading.aspx?post=&title=` and `?cat=`

## CMS dump request (for host)

When asking the provider for a full export, useful fields:

1. List of blogs (id, name)  
2. Categories per blog  
3. All posts: id, blog, title, slug, date, body HTML, category ids, featured image if any  
4. Whether comments were ever used (RSS says false for all five)

Until then, design against this folder + `blog-samples` + live RSS.
