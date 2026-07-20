# Blog design samples

Pulled from live `https://www.worldministries.org/reading.aspx` for layout/design work.
About **2 posts per category** (Reading category sidebar). Posts may appear in multiple categories on the live site; samples are chosen from each category listing.

**Scope of this folder:** **Pastoral Articles** stream only (CMS blog / `blog135rss.xml`).  
The CMS has **five blogs** with different category sets — see [`../blog-design/`](../blog-design/) (`blogs.txt`, category lists).

**Not a full archive.** For production migration, get a CMS dump from the host provider.

Fetched (UTC): `2026-07-20T01:06:43Z`

| Cat ID | Category | Samples | Titles |
|--------|----------|---------|--------|
| 491 | radio-guests | 2 | 2025 TV & Radio Guests; 2024 TV & Radio Guests |
| 492 | tv-guests | 2 | 2025 TV & Radio Guests; 2024 TV & Radio Guests |
| 493 | pastoral-articles | 2 | Turning Compassion into Action; The Sacrifice God Desires |
| 494 | mission-trips | 2 | Turning Compassion into Action; Kenya Trip April 2026 |
| 496 | africa | 2 | Turning Compassion into Action; Kenya Trip April 2026 |
| 497 | caribbean | 2 | WARNING - 25 PROPHETIC DREAMS; Tattoos and the Pagan Nations |
| 498 | middle-east | 2 | Israel October 2025; The Church in Prophecy in Every Nation |
| 499 | asia | 2 | The Philippines Nov 19 - Dec 3, 2025; The 9th World Holy Spirit Ministries Int |
| 500 | central-america | 2 | WARNING - 25 PROPHETIC DREAMS; Tattoos and the Pagan Nations |
| 501 | north-america | 2 | AMERICA HAS THE SPIRIT OF SODOM & GOMORR; January 2026 - Canada - Sheriffs Rally - |
| 502 | australia-oceania | 2 | WARNING - 25 PROPHETIC DREAMS; THE PLUMB LINE |
| 503 | europe | 2 | Germany in Prophecy; NORWAY APRIL 1-9, 2025 |
| 504 | south-america | 2 | WASHINGTON D.C. JANUARY 20-23, 2025; Bogota, Colombia, South America Mission  |
| 505 | bible-teaching | 2 | King David's Mighty Men; AMERICA HAS THE SPIRIT OF SODOM & GOMORR |
| 506 | israel | 2 | Israel October 2025; The Church in Prophecy in Every Nation |
| 513 | new-world-order | 2 | January 2026 - Canada - Sheriffs Rally -; The Marxist - Islamic - Attack on Americ |
| 514 | united-states | 2 | AMERICA HAS THE SPIRIT OF SODOM & GOMORR; January 2026 - Canada - Sheriffs Rally - |
| 520 | benevolence | 2 | Turning Compassion into Action; Kenya Trip, May 12-23, 2017 |
| 523 | eagles-saving-nations | 2 | Kenya & Malawi September 4-18, 2025; Kenya Mission Trip May 19-31, 2025 |
| 550 | prophecies | 2 | Germany in Prophecy; Prophecy-Ukraine & Russia-America & Nucl |
| 590 | soldiers-of-the-cross | 2 | The Sacrifice God Desires; World Ministries International Family |

## Files

```
reference/blog-samples/
  README.md
  manifest.json
  {catId}-{slug}/
    listing.source.html          # category listing page
    {postId}-{title}.source.html # full live page HTML
    {postId}-{title}.body.html   # extracted content fragment
    {postId}-{title}.json        # id, url, title, date, categories
```

## Live category IDs (for reference)

From Reading sidebar: Radio Guests 491, TV Guests 492, Pastoral 493, Mission Trips 494,
Africa 496 … Europe 503, South America 504, Bible Teaching 505, Israel 506,
New World Order 513, USA 514, Benevolence 520, ESN 523, Prophecies 550, Soldiers of the Cross 590.

## Other CMS blogs (2 posts each via RSS)

Fetched (UTC): `2026-07-20T01:24:40Z`

| Blog | Folder | Samples |
|------|--------|---------|
| Prophecies | `blog-prophecies/` | Bomb Attack; NIGERIA |
| Soldiers of the Cross | `blog-soldiers-of-the-cross/` | Urgent Compassion for Malawi; The Sacrifice God Desires |
| The Dorcas Fund Articles | `blog-dorcas-fund-articles/` | Turning Compassion into Action; The Forgotten Faces |
| Thought For The Day | `blog-thought-for-the-day/` | July 19 2026; July 18 2026 |

These map to CMS blogs in [`../blog-design/blogs.txt`](../blog-design/blogs.txt):
Prophecies (`blog138`), Soldiers (`blog160`), Dorcas (`blog165`), Thought For The Day (`blog137`).
Pastoral Articles samples remain under the `{catId}-{slug}/` folders above.

Note: Prophecies RSS is not strict XML (HTML entities in the feed); samples used a loose parser.
