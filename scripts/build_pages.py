#!/usr/bin/env python3
"""
Build static interior pages from reference HTML + shared chrome mounts.

- Extracts title, h1, and #content from reference/old-site-pages
- Light cleanup of CMS noise
- Writes clean .html pages that use js/nav-data.js + site-chrome.js

Usage:
  python3 scripts/build_pages.py
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "reference" / "old-site-pages"
OUT = ROOT

# dest filename -> reference filename (or None = placeholder)
PAGES: dict[str, dict] = {
    "about.html": {
        "ref": "about.html",
        "description": "About World Ministries International — mission, vision, and commission.",
    },
    "wmi-orientation.html": {
        "ref": "wmi-orientation.html",
        "description": "WMI Orientation with Dr. Jonathan Hansen.",
    },
    "dr-hansens-bio.html": {
        "ref": "dr-hansens-bio.html",
        "description": "Biography of Dr. Jonathan Hansen.",
    },
    "what-is-a-prophet.html": {
        "ref": "what-is-a-prophet.html",
        "description": "What is a prophet? Teaching from World Ministries International.",
    },
    "statement-of-faith.html": {
        "ref": "statement-of-faith.html",
        "description": "World Ministries International Statement of Faith.",
    },
    "standards-of-conduct.html": {
        "ref": "standards-of-conduct.html",
        "description": "Standards of Conduct for World Ministries International.",
    },
    "testimonials.html": {
        "ref": "testimonials.html",
        "description": "Testimonials about World Ministries International and Dr. Hansen.",
    },
    "benevolence.html": {
        "ref": None,
        "title": "Benevolence",
        "h1": "Benevolence",
        "description": "Benevolence and compassion ministry through World Ministries International.",
        "placeholder": "Benevolence articles are managed in the CMS and will be connected in phase 2. For related content, see The Dorcas Fund.",
        "links": [("The Dorcas Fund", "the-dorcas-fund.html")],
    },
    "the-dorcas-fund.html": {
        "ref": "compassion-in-action.html",
        "description": "The Dorcas Fund — compassion in action.",
    },
    "bible-college.html": {
        "ref": "wmi-school-of-theology.html",
        "description": "WMI School of Theology / Bible College.",
    },
    "prayer.html": {
        "ref": "prayer-3.html",
        "description": "Prayer ministry at World Ministries International.",
    },
    "contact.html": {
        "ref": "contact.html",
        "description": "Contact World Ministries International.",
    },
    "prayer-requests.html": {
        "ref": "prayer-requests.html",
        "description": "Submit prayer requests to Gate Breakers.",
    },
    "intercessors.html": {
        "ref": "intercessors.html",
        "description": "Soldiers of the Cross intercessors information.",
    },
    "intercessor-application.html": {
        "ref": "intercessor-application-form.html",
        "description": "Soldiers of the Cross intercessor application form.",
    },
    "donate.html": {
        "ref": "donate.html",
        "description": "Support World Ministries International.",
    },
    "watch-warning.html": {
        "ref": "watch-warning.html",
        "description": "Watch Warning with Dr. Jonathan Hansen.",
    },
    "the-overcoming-women.html": {
        "ref": "the-overcoming-women.html",
        "description": "The Overcoming Women TV.",
    },
    "tv-broadcasts.html": {
        "ref": "tv-broadcasts.html",
        "description": "Warning TV Broadcasts.",
    },
    "tv-channels.html": {
        "ref": "tv-channels.html",
        "description": "TV channels carrying Warning with Dr. Jonathan Hansen.",
    },
    "tv-guests.html": {
        "ref": None,
        "title": "TV Guests",
        "h1": "TV Guests",
        "description": "Guests featured on Warning TV.",
        "placeholder": "TV guest articles will load from the CMS in phase 2.",
    },
    "listen-to-warning.html": {
        "ref": "listen-to-warning.html",
        "description": "Listen to Warning with Dr. Jonathan Hansen.",
    },
    "radio-broadcasts.html": {
        "ref": "radio-broadcasts.html",
        "description": "Warning Radio broadcasts.",
    },
    "shortwave-broadcasts.html": {
        "ref": "shortwave-broadcasts.html",
        "description": "Shortwave broadcasts.",
    },
    "radio-stations.html": {
        "ref": "radio-stations.html",
        "description": "Radio channels carrying Warning.",
    },
    "radio-guests.html": {
        "ref": None,
        "title": "Radio Guests",
        "h1": "Radio Guests",
        "description": "Guests featured on Warning Radio.",
        "placeholder": "Radio guest articles will load from the CMS in phase 2.",
    },
    "prophecies.html": {
        "ref": "all-prophecies.html",
        "description": "Prophecies from Dr. Jonathan Hansen.",
        "trim_listing": True,
    },
    "missions.html": {
        "ref": None,
        "title": "Missions",
        "h1": "Missions",
        "description": "Mission trips and outreach with World Ministries International.",
        "placeholder": "Mission trip listings will load from the CMS in phase 2.",
    },
    "eagles-saving-nations.html": {
        "ref": "eagles-saving-nations-membership.html",
        "description": "Eagles Saving Nations membership and giving.",
    },
    "eagles-saving-nations-vision.html": {
        "ref": "eagles-saving-nations-vision.html",
        "description": "Eagles Saving Nations vision statement.",
    },
    "eagles-saving-nations-mission.html": {
        "ref": "eagles-saving-nations-mission.html",
        "description": "Eagles Saving Nations mission statement.",
    },
    "esn-statement-of-faith.html": {
        "ref": "esn-statement-of-faith.html",
        "description": "Eagles Saving Nations statement of faith.",
    },
    "attributes-of-eagles.html": {
        "ref": None,
        "title": "Attributes of an Eagle",
        "h1": "Attributes of an Eagle",
        "description": "Attributes of an Eagle — Eagles Saving Nations.",
        "placeholder": "This article was a CMS post on the old site and will be imported in phase 2.",
    },
    "reading.html": {
        "ref": "reading.html",
        "description": "Reading — articles from World Ministries International.",
        "trim_listing": True,
    },
    "pastoral-articles.html": {
        "ref": None,
        "title": "Pastoral Articles",
        "h1": "Pastoral Articles",
        "description": "Pastoral articles from Dr. Jonathan Hansen.",
        "placeholder": "Pastoral article listings will load from the CMS in phase 2.",
        "links": [("Reading", "reading.html")],
    },
    "soldiers-of-the-cross.html": {
        "ref": "soldiers-of-the-cross.html",
        "description": "Soldiers of the Cross articles.",
        "trim_listing": True,
    },
    "thought-for-the-day.html": {
        "ref": "thought-for-the-day.html",
        "description": "Dr. Hansen's Thought for the Day.",
        "trim_listing": True,
    },
    "the-dorcas-fund-articles.html": {
        "ref": "the-dorcas-fund-articles.html",
        "description": "The Dorcas Fund articles.",
        "trim_listing": True,
    },
    "events.html": {
        "ref": "events.html",
        "description": "Upcoming events and itineraries.",
    },
    "united-states-itinerary.html": {
        "ref": "united-states-itinerary.html",
        "description": "United States itinerary.",
    },
    "international-itinerary.html": {
        "ref": "international-itinerary.html",
        "description": "International itinerary.",
    },
}


def extract(html: str) -> tuple[str, str, str]:
    title_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    title = re.sub(r"\s+", " ", title_m.group(1)).strip() if title_m else ""
    # strip truncated titles like "Statement Of Fai"
    title = title.replace("\xa0", " ").strip()

    h1_m = re.search(
        r'<h1[^>]*class="[^"]*pagename[^"]*"[^>]*>(.*?)</h1>', html, re.S | re.I
    )
    if not h1_m:
        h1_m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S | re.I)
    h1 = re.sub(r"<[^>]+>", "", h1_m.group(1)).strip() if h1_m else title
    h1 = re.sub(r"\s+", " ", h1)

    body = ""
    m = re.search(
        r'<!--\s*start pagecontent\s*-->(.*?)<!--\s*end pagecontent\s*-->',
        html,
        re.S | re.I,
    )
    if m:
        body = m.group(1)
    else:
        m = re.search(r'id="content"[^>]*>(.*)', html, re.S | re.I)
        if m:
            body = m.group(1)
            for marker in (
                "subscribe-wrap",
                "footer-wrap",
                'class="section footer',
                "news-section",
            ):
                i = body.find(marker)
                if i > 0:
                    body = body[:i]
                    # back up to last full tag roughly
                    last = body.rfind("</")
                    if last > len(body) // 2:
                        # keep through a reasonable end
                        pass

    return title, h1, body.strip()


def clean_body(body: str, trim_listing: bool = False) -> str:
    # Remove ASP.NET / CMS noise
    body = re.sub(r'<div class="specDivVSM"[^>]*>.*?</div>', "", body, flags=re.S | re.I)
    body = re.sub(r'<div id="counterBox">[\s\S]*?</div>', "", body, flags=re.I)
    body = re.sub(r'<div id="statsModalOverlay">[\s\S]*?</div>\s*</div>\s*</div>', "", body, flags=re.I)

    # Preserve Rumble embeds + WMI video widgets (work on localhost via CDN)
    kept_scripts: list[str] = []

    def _keep_script(m: re.Match) -> str:
        tag = m.group(0)
        if re.search(
            r"rumble\.com|Rumble\(|jhansenwmi\.github\.io/rumble",
            tag,
            re.I,
        ):
            kept_scripts.append(tag)
            return f"<!--WMI_KEEP_SCRIPT_{len(kept_scripts) - 1}-->"
        return ""

    body = re.sub(
        r"<script\b[^>]*>[\s\S]*?</script>",
        _keep_script,
        body,
        flags=re.I,
    )
    # Self-closing / empty external scripts sometimes appear as <script src="..."></script>
    # already handled above.

    body = re.sub(r"<!--(?!WMI_KEEP_SCRIPT_).*?-->", "", body, flags=re.S)

    # ------------------------------------------------------------------
    # Layout styles: convert/allowlist — do NOT re-apply CMS font/padding.
    # Font sizes (700+) are design-system owned; page-by-page would not scale.
    # ------------------------------------------------------------------
    LAYOUT_PROPS = {
        "float",
        "text-align",
        "width",
        "height",
        "max-width",
        "max-height",
        "min-width",
        "margin",
        "margin-left",
        "margin-right",
        "margin-top",
        "margin-bottom",
        "vertical-align",
    }

    def _parse_style(style: str) -> dict[str, str]:
        out: dict[str, str] = {}
        for part in style.split(";"):
            if ":" not in part:
                continue
            k, v = part.split(":", 1)
            k, v = k.strip().lower(), v.strip()
            if k and v:
                out[k] = v
        return out

    def _add_class(tag: str, *classes: str) -> str:
        classes = [c for c in classes if c]
        if not classes:
            return tag
        class_str = " ".join(dict.fromkeys(classes))
        if re.search(r'\sclass="', tag, re.I):
            return re.sub(
                r'\sclass="([^"]*)"',
                lambda cm: f' class="{cm.group(1)} {class_str}"',
                tag,
                count=1,
                flags=re.I,
            )
        return re.sub(r"^<(\w+)", rf'<\1 class="{class_str}"', tag, count=1)

    def _safe_size(val: str) -> str | None:
        val = val.strip().lower()
        if val in ("auto", "0"):
            return val
        if re.fullmatch(r"\d+\.?\d*(px|%)?", val):
            if val[-1].isdigit():
                return val + "px"
            return val
        return None

    def _rewrite_tag_styles(m: re.Match) -> str:
        tag = m.group(0)
        # event handlers always go
        tag = re.sub(r'\s(on\w+)="[^"]*"', "", tag, flags=re.I)

        classes: list[str] = []
        keep_style: dict[str, str] = {}

        style_m = re.search(r'\sstyle="([^"]*)"', tag, re.I)
        props = _parse_style(style_m.group(1)) if style_m else {}

        # align= attribute (legacy)
        align_m = re.search(r'\salign="(left|right|center|middle)"', tag, re.I)
        if align_m:
            a = align_m.group(1).lower()
            if a == "right":
                classes.append("img-float-right" if tag.lower().startswith("<img") else "text-right")
            elif a == "left":
                classes.append("img-float-left" if tag.lower().startswith("<img") else "text-left")
            elif a == "center":
                classes.append("img-center" if tag.lower().startswith("<img") else "text-center")

        for prop, val in props.items():
            if prop not in LAYOUT_PROPS:
                continue  # drop font-size, padding, color, etc.
            if prop == "float":
                v = val.lower().split()[0]
                if v == "right":
                    classes.append("img-float-right")
                elif v == "left":
                    classes.append("img-float-left")
                elif v == "none":
                    classes.append("img-float-none")
            elif prop == "text-align":
                v = val.lower().split()[0]
                if v in ("left", "right", "center", "justify"):
                    classes.append(f"text-{v}")
            elif prop in ("width", "height", "max-width", "max-height", "min-width"):
                sz = _safe_size(val)
                if sz:
                    keep_style[prop] = sz
            elif prop.startswith("margin") or prop == "vertical-align":
                # keep simple values only
                if re.fullmatch(r"[\w\s.%+-]+", val) and "expression" not in val:
                    keep_style[prop] = val

        # HTML width/height attributes → explicit CSS (author stylesheets can
        # otherwise ignore presentational width= and show full intrinsic size)
        if tag.lower().startswith("<img"):
            w_attr = re.search(r'\swidth="(\d+)"', tag, re.I)
            if w_attr:
                keep_style["width"] = w_attr.group(1) + "px"
            if "width" in keep_style:
                keep_style["max-width"] = "100%"
                keep_style["height"] = "auto"
            # Put float in style too — higher cascade than stylesheet alone
            if "img-float-right" in classes:
                keep_style["float"] = "right"
                keep_style.setdefault("margin", "0.5rem 0 1.5rem 2rem")
            elif "img-float-left" in classes:
                keep_style["float"] = "left"
                keep_style.setdefault("margin", "0.5rem 2rem 1.5rem 0")
            elif "img-center" in classes:
                keep_style["display"] = "block"
                keep_style["margin-left"] = "auto"
                keep_style["margin-right"] = "auto"

        tag = re.sub(r'\sstyle="[^"]*"', "", tag, flags=re.I)
        tag = re.sub(r'\salign="[^"]*"', "", tag, flags=re.I)
        tag = _add_class(tag, *classes)
        if keep_style:
            # !important so global .page-content img rules cannot enlarge CMS sizes
            style_str = "; ".join(
                f"{k}: {v} !important" for k, v in keep_style.items()
            )
            tag = re.sub(r"<(\w+)", rf'<\1 style="{style_str}"', tag, count=1)
        return tag

    # Rewrite styles on common content tags only (allowlist applied inside)
    body = re.sub(
        r"<(img|p|div|span|table|tr|td|th|h[1-6]|ul|ol|li|section|article)\b[^>]*>",
        _rewrite_tag_styles,
        body,
        flags=re.I,
    )
    # Strip style=/on* only on tags we did not process (rare leftovers)
    def _strip_unprocessed_styles(m: re.Match) -> str:
        tag = m.group(0)
        name = m.group(1).lower()
        if name in {
            "img", "p", "div", "span", "table", "tr", "td", "th",
            "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
            "section", "article",
        }:
            return tag  # already allowlisted
        return re.sub(r'\s(style|on\w+)="[^"]*"', "", tag, flags=re.I)

    body = re.sub(r"<(\w+)\b[^>]*>", _strip_unprocessed_styles, body)

    for i, script in enumerate(kept_scripts):
        body = body.replace(f"<!--WMI_KEEP_SCRIPT_{i}-->", script)
    # Empty fonts / junk
    body = re.sub(r"<font[^>]*>", "", body, flags=re.I)
    body = re.sub(r"</font>", "", body, flags=re.I)
    body = re.sub(r"<span>\s*</span>", "", body)
    # Collapse excessive whitespace
    body = re.sub(r"\n{3,}", "\n\n", body)
    body = re.sub(r"(&nbsp;\s*){2,}", "&nbsp;", body)

    # Listing pages dump huge post lists — keep intro + note
    if trim_listing:
        # Keep first ~4000 chars of cleaned content, cut at article boundary if possible
        if len(body) > 5000:
            cut = body.find('<div class="recent"')
            if cut < 0:
                cut = body.find("class=\"recent\"")
            if 500 < cut < 8000:
                body = body[:cut]
            else:
                body = body[:4500]
            body += (
                '\n<div class="phase-note">'
                "<strong>Full archive coming in phase 2.</strong> "
                "Individual articles and prophecies will load from the CMS. "
                "This page currently shows the static shell and introduction only."
                "</div>\n"
            )

    # Rewrite common absolute site paths to relative where possible
    body = body.replace('src="../Userfiles/', 'src="https://www.worldministries.org/Userfiles/')
    body = body.replace('src="/Userfiles/', 'src="https://www.worldministries.org/Userfiles/')
    body = body.replace('href="/Userfiles/', 'href="https://www.worldministries.org/Userfiles/')
    # Old .aspx links → clean .html where we know them
    replacements = {
        "about.aspx": "about.html",
        "contact.aspx": "contact.html",
        "donate.aspx": "donate.html",
        "dr-hansens-bio.aspx": "dr-hansens-bio.html",
        "statement-of-faith.aspx": "statement-of-faith.html",
        "standards-of-conduct.aspx": "standards-of-conduct.html",
        "testimonials.aspx": "testimonials.html",
        "compassion-in-action.aspx": "the-dorcas-fund.html",
        "wmi-school-of-theology.aspx": "bible-college.html",
        "prayer-3.aspx": "prayer.html",
        "prayer-requests.aspx": "prayer-requests.html",
        "intercessors.aspx": "intercessors.html",
        "intercessor-application-form.aspx": "intercessor-application.html",
        "wmi-orientation.aspx": "wmi-orientation.html",
        "wmi-orientation-2.aspx": "wmi-orientation.html",
        "all-prophecies.aspx": "prophecies.html",
        "eagles-saving-nations-membership.aspx": "eagles-saving-nations.html",
        "eagles-saving-nations-vision.aspx": "eagles-saving-nations-vision.html",
        "eagles-saving-nations-mission.aspx": "eagles-saving-nations-mission.html",
        "esn-statement-of-faith.aspx": "esn-statement-of-faith.html",
        "watch-warning.aspx": "watch-warning.html",
        "the-overcoming-women.aspx": "the-overcoming-women.html",
        "tv-broadcasts.aspx": "tv-broadcasts.html",
        "tv-channels.aspx": "tv-channels.html",
        "listen-to-warning.aspx": "listen-to-warning.html",
        "radio-broadcasts.aspx": "radio-broadcasts.html",
        "shortwave-broadcasts.aspx": "shortwave-broadcasts.html",
        "radio-stations.aspx": "radio-stations.html",
        "reading.aspx": "reading.html",
        "soldiers-of-the-cross.aspx": "soldiers-of-the-cross.html",
        "thought-for-the-day.aspx": "thought-for-the-day.html",
        "the-dorcas-fund-articles.aspx": "the-dorcas-fund-articles.html",
        "events.aspx": "events.html",
        "united-states-itinerary.aspx": "united-states-itinerary.html",
        "international-itinerary.aspx": "international-itinerary.html",
        "what-is-a-prophet.aspx": "what-is-a-prophet.html",
        "prayform-frame.htm": "prayer-requests.html",
    }
    for old, new in replacements.items():
        body = body.replace(old, new)

    return body.strip()


def placeholder_body(meta: dict) -> str:
    html = f'<div class="phase-note"><strong>Content placeholder.</strong> {meta["placeholder"]}</div>'
    if meta.get("links"):
        html += "<ul>"
        for label, href in meta["links"]:
            html += f'<li><a href="{href}">{label}</a></li>'
        html += "</ul>"
    return html


PAGE_SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} | World Ministries International</title>
  <meta name="description" content="{description}">
  <meta name="author" content="World Ministries International">
  <meta name="theme-color" content="#4f2683">

  <link rel="apple-touch-icon" sizes="180x180" href="assets/icons/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="assets/icons/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="assets/icons/favicon-16x16.png">

  <!-- Same Google Fonts URL as live worldministries.org (Poppins 200/400/800 only) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&amp;family=Poppins:ital,wght@0,200;0,400;0,800;1,400&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/css/all.min.css">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body class="page-interior">
  <div id="site-header-mount"></div>

  <main>
    <section class="page-hero" aria-hidden="true">
      <div class="hero-base"></div>
      <div class="wave" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" class="shape-fill"></path>
          <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" class="shape-fill"></path>
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" class="shape-fill"></path>
        </svg>
      </div>
    </section>

    <section class="content-wrap">
      <div class="container">
        <h1 class="pagename">{h1}</h1>
        <div class="page-content">
{body}
        </div>
      </div>
    </section>

    <div id="site-newsletter-mount"></div>
  </main>

  <div id="site-footer-mount"></div>

  <script src="js/nav-data.js"></script>
  <script src="js/site-chrome.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
"""


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def build_one(dest: str, meta: dict) -> None:
    if meta.get("ref"):
        src = REF / meta["ref"]
        if not src.exists():
            print(f"  SKIP missing ref {src}")
            return
        raw = src.read_text(encoding="utf-8", errors="replace")
        title, h1, body = extract(raw)
        if meta.get("title"):
            title = meta["title"]
        if meta.get("h1"):
            h1 = meta["h1"]
        body = clean_body(body, trim_listing=bool(meta.get("trim_listing")))
        if not body:
            body = '<p class="phase-note">Content could not be extracted from the reference page.</p>'
    else:
        title = meta["title"]
        h1 = meta["h1"]
        body = placeholder_body(meta)

    # Prefer full titles
    if len(title) < 8 and h1:
        title = h1

    description = meta.get("description") or f"{h1} — World Ministries International."
    html = PAGE_SHELL.format(
        title=esc(title),
        description=esc(description),
        h1=esc(h1),
        body=body,
    )
    out_path = OUT / dest
    out_path.write_text(html, encoding="utf-8")
    print(f"  wrote {dest} ({len(html)} bytes)")


def main() -> None:
    print(f"Building pages into {OUT}")
    for dest, meta in PAGES.items():
        build_one(dest, meta)
    print(f"Done — {len(PAGES)} pages")


if __name__ == "__main__":
    main()
