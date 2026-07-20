#!/usr/bin/env python3
"""
Local preview + article-snippet save for wmi-web.

  python3 scripts/dev_server.py
  # or: npm run dev

Serves the site root on http://127.0.0.1:8080 (localhost only).
Adds write endpoints the plain http.server cannot provide:

  GET  /api/editor/status  → { ok, snippetsDir, writeEnabled }
  POST /api/editor/save    → write content/articles/YYMMDD-Title.html + _index.json

Security (intentionally small):
  - Bind 127.0.0.1 only (not LAN/public)
  - Writes only under content/articles/
  - Optional password matches editor default (WMI_EDITOR_PASSWORD / wmi-edit)
  - Do NOT deploy this process to Cloudflare — public site is static/read-only
"""

from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
SNIPPETS_DIR = ROOT / "content" / "articles"
INDEX_PATH = SNIPPETS_DIR / "_index.json"
HOST = os.environ.get("WMI_DEV_HOST", "127.0.0.1")
PORT = int(os.environ.get("WMI_DEV_PORT", "8080"))
EDITOR_PASSWORD = os.environ.get("WMI_EDITOR_PASSWORD", "wmi-edit")

# Words kept lowercase in Title-Case filenames (readable titles)
_SMALL = {
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "by",
    "for",
    "from",
    "in",
    "into",
    "nor",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
}


def _json_response(handler: SimpleHTTPRequestHandler, code: int, payload: dict) -> None:
    body = json.dumps(payload, indent=2).encode("utf-8")
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


def slugify_title(title: str) -> str:
    """Title → Title-Case-With-Hyphens for YYMMDD-Title.html."""
    if not title:
        return "Untitled"
    # Normalize unicode, drop combining marks
    t = unicodedata.normalize("NFKD", title)
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"['’]", "", t)
    t = re.sub(r"[^A-Za-z0-9]+", " ", t).strip()
    if not t:
        return "Untitled"
    words = t.split()
    out = []
    for i, w in enumerate(words):
        low = w.lower()
        if i > 0 and low in _SMALL:
            out.append(low)
        else:
            out.append(low[:1].upper() + low[1:] if low else w)
    name = "-".join(out)
    return name[:120] or "Untitled"


def yymmdd_from_date(date_str: str | None) -> str:
    """Parse common post dates into YYMMDD; fall back to today."""
    if date_str:
        s = date_str.strip()
        # M/D/YYYY or MM/DD/YYYY
        m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", s)
        if m:
            month, day, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            return f"{year % 100:02d}{month:02d}{day:02d}"
        # YYYY-MM-DD
        m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
        if m:
            year, month, day = int(m.group(1)), int(m.group(2)), int(m.group(3))
            return f"{year % 100:02d}{month:02d}{day:02d}"
        # YYMMDD already
        if re.match(r"^\d{6}$", s):
            return s
    now = datetime.now()
    return f"{now.year % 100:02d}{now.month:02d}{now.day:02d}"


def safe_filename(name: str) -> str:
    """Allow only basename-like YYMMDD-Title.html under snippets dir."""
    base = Path(name).name
    if base != name or ".." in base or base.startswith("."):
        raise ValueError("invalid filename")
    if not re.match(r"^[0-9]{6}-[A-Za-z0-9][A-Za-z0-9._-]*\.html$", base):
        raise ValueError("filename must be YYMMDD-Title.html")
    return base


def load_index() -> dict:
    if INDEX_PATH.is_file():
        try:
            return json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"version": 1, "posts": {}}


def save_index(data: dict) -> None:
    SNIPPETS_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def build_snippet_file(
    *,
    post_id: str,
    title: str,
    date: str,
    blog: str,
    slug: str,
    body_html: str,
) -> str:
    header = (
        "<!--\n"
        f"wmi-post-id: {post_id}\n"
        f"wmi-title: {title}\n"
        f"wmi-date: {date}\n"
        f"wmi-blog: {blog}\n"
        f"wmi-slug: {slug}\n"
        "-->\n"
    )
    body = (body_html or "").strip()
    if not body:
        body = "<p></p>"
    return header + body + "\n"


def handle_save(payload: dict) -> dict:
    password = payload.get("password") or ""
    if password != EDITOR_PASSWORD:
        return {"ok": False, "error": "Unauthorized", "code": 401}

    post_id = str(payload.get("postId") or payload.get("post_id") or "").strip()
    if not post_id or not re.match(r"^[A-Za-z0-9._-]{1,64}$", post_id):
        return {"ok": False, "error": "Missing or invalid postId", "code": 400}

    title = (payload.get("title") or "Untitled").strip() or "Untitled"
    date = (payload.get("date") or "").strip()
    blog = (payload.get("blog") or "pastoral-articles").strip()
    slug = (payload.get("slug") or "").strip() or slugify_title(title).lower().replace(
        "--", "-"
    )
    body_html = payload.get("html") or payload.get("bodyHtml") or ""
    if not isinstance(body_html, str):
        return {"ok": False, "error": "html must be a string", "code": 400}
    if len(body_html) > 2_000_000:
        return {"ok": False, "error": "html too large", "code": 400}

    # Prefer client-suggested name if valid; else build from date+title
    suggested = (payload.get("filename") or "").strip()
    if suggested:
        try:
            filename = safe_filename(suggested)
        except ValueError:
            filename = f"{yymmdd_from_date(date)}-{slugify_title(title)}.html"
    else:
        filename = f"{yymmdd_from_date(date)}-{slugify_title(title)}.html"
        filename = safe_filename(filename)

    SNIPPETS_DIR.mkdir(parents=True, exist_ok=True)
    index = load_index()
    posts = index.setdefault("posts", {})

    # If this post already has a different file, remove the old file when unused
    prev = posts.get(post_id) or {}
    prev_file = prev.get("file")
    target = SNIPPETS_DIR / filename
    # Resolve must stay under SNIPPETS_DIR
    if not str(target.resolve()).startswith(str(SNIPPETS_DIR.resolve())):
        return {"ok": False, "error": "Path escape blocked", "code": 400}

    content = build_snippet_file(
        post_id=post_id,
        title=title,
        date=date or yymmdd_from_date(date),
        blog=blog,
        slug=slug,
        body_html=body_html,
    )
    target.write_text(content, encoding="utf-8")

    if prev_file and prev_file != filename:
        old = SNIPPETS_DIR / Path(prev_file).name
        # Only delete if no other post points at it
        still_used = any(
            (p.get("file") == prev_file) and (pid != post_id)
            for pid, p in posts.items()
        )
        if old.is_file() and not still_used:
            try:
                old.unlink()
            except OSError:
                pass

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    posts[post_id] = {
        "file": filename,
        "title": title,
        "date": date,
        "blog": blog,
        "slug": slug,
        "updated": now,
    }
    index["version"] = 1
    save_index(index)

    rel = f"content/articles/{filename}"
    return {
        "ok": True,
        "file": filename,
        "path": rel,
        "url": f"/{rel}",
        "postId": post_id,
        "updated": now,
    }


class WmiHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0 or length > 2_500_000:
            raise ValueError("bad Content-Length")
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_OPTIONS(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
            return
        self.send_error(404)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/editor/status":
            _json_response(
                self,
                200,
                {
                    "ok": True,
                    "writeEnabled": True,
                    "host": HOST,
                    "snippetsDir": "content/articles",
                    "index": "content/articles/_index.json",
                    "naming": "YYMMDD-Title.html",
                },
            )
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/api/editor/save":
            self.send_error(404, "Unknown API path")
            return
        try:
            payload = self._read_json()
        except Exception as e:  # noqa: BLE001
            _json_response(self, 400, {"ok": False, "error": f"Invalid JSON: {e}"})
            return
        result = handle_save(payload)
        code = int(result.pop("code", 200 if result.get("ok") else 400))
        if result.get("ok"):
            code = 200
        _json_response(self, code, result)


def main() -> int:
    SNIPPETS_DIR.mkdir(parents=True, exist_ok=True)
    if not INDEX_PATH.is_file():
        save_index({"version": 1, "posts": {}})

    # Threading so static + save don't block each other
    httpd = ThreadingHTTPServer((HOST, PORT), WmiHandler)
    print(f"WMI dev server  http://{HOST}:{PORT}/", flush=True)
    print(f"  site root     {ROOT}", flush=True)
    print(f"  snippets      {SNIPPETS_DIR.relative_to(ROOT)}/", flush=True)
    print(f"  save API      POST /api/editor/save  (localhost write)", flush=True)
    print("  stop          Ctrl+C", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
