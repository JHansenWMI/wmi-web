#!/usr/bin/env python3
"""
Medium crawl of worldministries.org for offline reference.

- Static/nav-style pages only (no ?post= / ?title= article dumps)
- One sample dynamic article for structure
- Hard time budget + page/asset caps so category/list sprawl cannot run forever
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen

BASE = "https://www.worldministries.org"
OUT = Path(__file__).resolve().parents[1] / "old-site"

# Time / size protection
TIME_BUDGET_SEC = 240  # 4 minutes hard stop
MAX_HTML_PAGES = 80
MAX_ASSETS = 400
# Prefer chrome/CSS over huge photo galleries when budget is tight
ASSET_PRIORITY_PREFIXES = (
    "/asp/",
    "/userfiles/template/",
    "/userfiles/podcast-logos/",
    "/userfiles/esn/",
    "/specialfunctions/",
    "/inc/",
)
REQUEST_TIMEOUT = 25
USER_AGENT = "WMI-ReplicaCrawl/1.0 (+local archive for site rebuild; contact site owner)"

# Seed: homepage + known chrome (expanded via static links found in HTML)
SEED_URLS = [
    f"{BASE}/",
    f"{BASE}/about.aspx",
    f"{BASE}/wmi-orientation-2.aspx",
    f"{BASE}/dr-hansens-bio.aspx",
    f"{BASE}/what-is-a-prophet.aspx",
    f"{BASE}/statement-of-faith.aspx",
    f"{BASE}/standards-of-conduct.aspx",
    f"{BASE}/testimonials.aspx",
    f"{BASE}/compassion-in-action.aspx",
    f"{BASE}/wmi-school-of-theology.aspx",
    f"{BASE}/prayer-3.aspx",
    f"{BASE}/contact.aspx",
    f"{BASE}/prayer-requests.aspx",
    f"{BASE}/intercessors.aspx",
    f"{BASE}/intercessor-application-form.aspx",
    f"{BASE}/donate.aspx",
    f"{BASE}/watch-warning.aspx",
    f"{BASE}/wmi-orientation.aspx",
    f"{BASE}/the-overcoming-women.aspx",
    f"{BASE}/tv-broadcasts.aspx",
    f"{BASE}/tv-channels.aspx",
    f"{BASE}/listen-to-warning.aspx",
    f"{BASE}/radio-broadcasts.aspx",
    f"{BASE}/shortwave-broadcasts.aspx",
    f"{BASE}/radio-stations.aspx",
    f"{BASE}/all-prophecies.aspx",  # listing shell only (no query)
    f"{BASE}/eagles-saving-nations-membership.aspx",
    f"{BASE}/eagles-saving-nations-vision.aspx",
    f"{BASE}/eagles-saving-nations-mission.aspx",
    f"{BASE}/esn-statement-of-faith.aspx",
    f"{BASE}/reading.aspx",  # listing shell only
    f"{BASE}/soldiers-of-the-cross.aspx",
    f"{BASE}/thought-for-the-day.aspx",  # listing shell only
    f"{BASE}/the-dorcas-fund-articles.aspx",
    f"{BASE}/events.aspx",
    f"{BASE}/united-states-itinerary.aspx",
    f"{BASE}/international-itinerary.aspx",
]

# One dynamic sample for article/detail structure (not a full archive)
SAMPLE_DYNAMIC = [
    f"{BASE}/reading.aspx?post=14080&title=Turning-Compassion-into-Action",
]

SKIP_HOST_PARTS = (
    "store-worldministries.org",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "cdnjs.cloudflare.com",
    "googletagmanager.com",
    "google-analytics.com",
    "facebook.com",
    "youtube.com",
    "rumble.com",
    "linkedin.com",
    "podcasts.apple.com",
    "open.spotify.com",
    "iheart.com",
    "podbean.com",
    "tunein.com",
    "channelstore.roku.com",
    "music.amazon.com",
    "podcasts.google.com",
)


def now() -> float:
    return time.monotonic()


def log(msg: str) -> None:
    print(msg, flush=True)


def normalize_url(url: str) -> str:
    p = urlparse(url)
    # drop fragments
    path = p.path or "/"
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    # canonical host + always https (avoids http/https double-fetch)
    netloc = p.netloc.lower()
    if netloc in ("worldministries.org", "www.worldministries.org"):
        netloc = "www.worldministries.org"
        scheme = "https"
    else:
        scheme = (p.scheme or "https").lower()
    # strip tracking-ish query on assets (e.g. rumble.js?timestamp=…)
    query = p.query
    if path.lower().endswith((".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp")):
        query = ""
    return urlunparse((scheme, netloc, path, "", query, ""))


def is_worldministries(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return host in ("www.worldministries.org", "worldministries.org")


def is_dynamic_content(url: str) -> bool:
    """Medium crawl: any query string is treated as dynamic/list content.

    Exceptions are only the explicit SAMPLE_DYNAMIC whitelist (handled by kind=sample).
    """
    p = urlparse(url)
    if p.query:
        return True
    return False


def is_html_path(url: str) -> bool:
    p = urlparse(url)
    path = p.path.lower()
    if path in ("", "/"):
        return True
    if path.endswith(".aspx"):
        return True
    if path.endswith(".html") or path.endswith(".htm"):
        return True
    # bare paths without extension sometimes
    if "." not in Path(path).name:
        return True
    return False


def is_asset_path(url: str) -> bool:
    path = urlparse(url).path.lower()
    return path.endswith(
        (
            ".css",
            ".js",
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".svg",
            ".webp",
            ".ico",
            ".woff",
            ".woff2",
            ".ttf",
            ".eot",
            ".map",
            ".webmanifest",
        )
    ) or "/userfiles/" in path or path.startswith("/asp/")


def should_skip_external(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return any(s in host for s in SKIP_HOST_PARTS)


def local_path_for(url: str, kind: str) -> Path:
    p = urlparse(url)
    path = p.path
    if path in ("", "/"):
        rel = "pages/index.html"
        return OUT / rel
    # assets keep path under assets/origin-path
    if kind == "asset":
        rel = path.lstrip("/")
        return OUT / "assets" / rel
    # html pages
    name = path.lstrip("/")
    if name.endswith(".aspx"):
        name = name[: -len(".aspx")] + ".html"
    elif not name.endswith(".html"):
        name = name.rstrip("/") + ".html"
    if p.query:
        # sample dynamic only
        h = hashlib.sha1(p.query.encode()).hexdigest()[:10]
        stem = Path(name).stem
        name = f"{stem}__sample_{h}.html"
        return OUT / "pages" / "samples" / name
    return OUT / "pages" / name


def fetch(url: str) -> tuple[bytes, str | None]:
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
        ctype = resp.headers.get("Content-Type", "")
        return resp.read(), ctype


def extract_links(html: str, base_url: str) -> list[str]:
    found = []
    for attr in ("href", "src"):
        for m in re.finditer(rf'{attr}=[\'"]([^\'"]+)[\'"]', html, flags=re.I):
            found.append(urljoin(base_url, m.group(1)))
    # css url(...)
    for m in re.finditer(r'url\([\'"]?([^\'")\s]+)[\'"]?\)', html, flags=re.I):
        u = m.group(1)
        if u.startswith("data:"):
            continue
        found.append(urljoin(base_url, u))
    return found


def extract_title(html: str) -> str:
    m = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.I | re.S)
    if not m:
        return ""
    return re.sub(r"\s+", " ", m.group(1)).strip()


def main() -> int:
    started = now()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "pages").mkdir(exist_ok=True)
    (OUT / "pages" / "samples").mkdir(exist_ok=True)
    (OUT / "assets").mkdir(exist_ok=True)

    inventory_rows: list[dict] = []
    errors: list[dict] = []
    saved_html = 0
    saved_assets = 0
    seen: set[str] = set()
    queue: deque[tuple[str, str]] = deque()  # url, kind html|asset|sample

    for u in SEED_URLS:
        queue.append((normalize_url(u), "html"))
    for u in SAMPLE_DYNAMIC:
        queue.append((normalize_url(u), "sample"))

    log(f"Start medium crawl → {OUT}")
    log(f"Budget: {TIME_BUDGET_SEC}s, max HTML={MAX_HTML_PAGES}, max assets={MAX_ASSETS}")

    while queue:
        elapsed = now() - started
        if elapsed > TIME_BUDGET_SEC:
            log(f"TIME BUDGET hit at {elapsed:.1f}s — stopping.")
            break
        if saved_html >= MAX_HTML_PAGES and saved_assets >= MAX_ASSETS:
            log("Page/asset caps both reached — stopping.")
            break

        url, kind = queue.popleft()
        if url in seen:
            continue

        if should_skip_external(url):
            continue
        if not is_worldministries(url):
            # only allow same-site assets/pages
            continue

        if kind == "html":
            if is_dynamic_content(url):
                continue
            if not is_html_path(url) and is_asset_path(url):
                kind = "asset"
            elif not is_html_path(url):
                continue
        if kind == "asset" and not is_asset_path(url):
            continue
        if kind == "html" and saved_html >= MAX_HTML_PAGES:
            continue
        if kind == "asset" and saved_assets >= MAX_ASSETS:
            continue
        if kind == "sample" and is_dynamic_content(url) is False:
            kind = "html"

        seen.add(url)

        try:
            body, ctype = fetch(url)
        except (HTTPError, URLError, TimeoutError, OSError) as e:
            errors.append({"url": url, "error": str(e)})
            log(f"  ERR {url} — {e}")
            continue

        if kind in ("html", "sample"):
            # if server returned non-html asset by mistake
            if ctype and "html" not in ctype.lower() and is_asset_path(url):
                kind = "asset"
            else:
                text = body.decode("utf-8", errors="replace")
                dest = local_path_for(url, "html" if kind == "html" else "sample")
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(text, encoding="utf-8")
                saved_html += 1
                title = extract_title(text)
                inventory_rows.append(
                    {
                        "url": url,
                        "kind": kind,
                        "title": title,
                        "local_path": str(dest.relative_to(OUT)),
                        "bytes": len(body),
                        "dynamic": kind == "sample",
                    }
                )
                log(f"  HTML [{saved_html}] {url} → {dest.relative_to(OUT)}")

                # enqueue static page links + assets from this page
                for link in extract_links(text, url):
                    link = normalize_url(link) if is_worldministries(link) else link
                    if not is_worldministries(link):
                        continue
                    if link in seen:
                        continue
                    if is_asset_path(link):
                        # priority chrome assets go to the front of the queue
                        path_l = urlparse(link).path.lower()
                        if any(path_l.startswith(p) for p in ASSET_PRIORITY_PREFIXES):
                            queue.appendleft((normalize_url(link), "asset"))
                        else:
                            queue.append((normalize_url(link), "asset"))
                    elif is_html_path(link) and not is_dynamic_content(link):
                        # one-hop expansion of static pages only (no query strings)
                        queue.append((link, "html"))
                continue

        # asset
        dest = local_path_for(url, "asset")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
        saved_assets += 1
        inventory_rows.append(
            {
                "url": url,
                "kind": "asset",
                "title": "",
                "local_path": str(dest.relative_to(OUT)),
                "bytes": len(body),
                "dynamic": False,
            }
        )
        log(f"  ASSET [{saved_assets}] {url}")

        # if CSS, pull url() references (high priority)
        if urlparse(url).path.lower().endswith(".css"):
            try:
                css = body.decode("utf-8", errors="replace")
            except Exception:
                css = ""
            for link in extract_links(css, url):
                if is_worldministries(link) and is_asset_path(link) and link not in seen:
                    queue.appendleft((normalize_url(link), "asset"))

    elapsed = now() - started

    # write inventory
    inv_csv = OUT / "inventory.csv"
    fields = ["url", "kind", "title", "local_path", "bytes", "dynamic"]
    with inv_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for row in inventory_rows:
            w.writerow(row)

    summary = {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "base": BASE,
        "elapsed_sec": round(elapsed, 2),
        "time_budget_sec": TIME_BUDGET_SEC,
        "html_pages": saved_html,
        "assets": saved_assets,
        "unique_urls_seen": len(seen),
        "queue_remaining": len(queue),
        "errors": len(errors),
        "skipped_policy": "No ?post= / ?title= / filtered listing queries except one sample article",
        "sample_dynamic": SAMPLE_DYNAMIC,
        "error_details": errors[:50],
    }
    (OUT / "crawl-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    readme = f"""# old-site — raw reference from worldministries.org

Captured: {summary['captured_at']}  
Elapsed: {summary['elapsed_sec']}s (budget {TIME_BUDGET_SEC}s)  
HTML pages: {saved_html} · Assets: {saved_assets} · Errors: {len(errors)}

## Purpose

Offline **reference only** for the WMI website rebuild. Not deployed. Not a full CMS export.

## Policy (medium crawl)

- **Included:** nav/footer-style static pages (`.aspx` shells without article query strings)
- **Included:** shared CSS/JS/images discovered from those pages (`/asp/`, `/Userfiles/`, icons)
- **One sample** dynamic article for layout structure under `pages/samples/`
- **Skipped:** `?post=` / `?title=` articles, category-filtered listings (`reading.aspx?cat=…`, etc.)
- **Skipped:** external CDNs, store subdomain, social/podcast host pages
- **Caps:** {TIME_BUDGET_SEC}s wall time, {MAX_HTML_PAGES} HTML, {MAX_ASSETS} assets

Dynamic article bodies and prophecy archives come later from the CMS (phase 2).

## Layout

```
old-site/
  inventory.csv         # every saved URL
  crawl-summary.json    # run stats
  pages/                # static page HTML
  pages/samples/        # one dynamic article sample
  assets/               # css, images, etc. (site path preserved)
```

## Re-run

```bash
python3 scripts/crawl_old_site.py
```
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    log("")
    log(f"Done in {elapsed:.1f}s")
    log(f"  HTML:   {saved_html}")
    log(f"  Assets: {saved_assets}")
    log(f"  Errors: {len(errors)}")
    log(f"  Queue left (not fetched): {len(queue)}")
    log(f"  Inventory: {inv_csv}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
