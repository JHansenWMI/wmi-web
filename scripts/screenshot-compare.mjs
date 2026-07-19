#!/usr/bin/env node
/**
 * Above-the-fold screenshot compare: local vs live worldministries.org
 *
 * Prerequisites:
 *   npm install
 *   npx playwright install chromium
 *   python3 -m http.server 8080   # from repo root
 *
 * Usage:
 *   npm run screenshots
 *   node scripts/screenshot-compare.mjs --pages about.html,watch-warning.html
 *   node scripts/screenshot-compare.mjs --width 1440
 *
 * Output (gitignored via temp/):
 *   temp/screenshots/desktop/<slug>.local.png
 *   temp/screenshots/desktop/<slug>.live.png
 *   temp/screenshots/index.html   (side-by-side gallery)
 */

import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const LOCAL_BASE = process.env.LOCAL_BASE || "http://127.0.0.1:8080";
const LIVE_BASE = process.env.LIVE_BASE || "https://www.worldministries.org";
const OUT_DIR = path.join(ROOT, "temp", "screenshots");
const WIDTH = Number(process.env.SHOT_WIDTH || 1440);
const HEIGHT = Number(process.env.SHOT_HEIGHT || 900);
const TIMEOUT = Number(process.env.SHOT_TIMEOUT || 45000);

/** local page → live path (no origin) */
const LIVE_PATH = {
  "index.html": "/",
  "about.html": "/about.aspx",
  "wmi-orientation.html": "/wmi-orientation.aspx",
  "wmi-orientation-2.html": "/wmi-orientation-2.aspx",
  "dr-hansens-bio.html": "/dr-hansens-bio.aspx",
  "what-is-a-prophet.html": "/what-is-a-prophet.aspx",
  "statement-of-faith.html": "/statement-of-faith.aspx",
  "standards-of-conduct.html": "/standards-of-conduct.aspx",
  "testimonials.html": "/testimonials.aspx",
  "benevolence.html": "/reading.aspx?cat=520",
  "the-dorcas-fund.html": "/compassion-in-action.aspx",
  "bible-college.html": "/wmi-school-of-theology.aspx",
  "prayer.html": "/prayer-3.aspx",
  "contact.html": "/contact.aspx",
  "prayer-requests.html": "/prayer-requests.aspx",
  "intercessors.html": "/intercessors.aspx",
  "intercessor-application.html": "/intercessor-application-form.aspx",
  "donate.html": "/donate.aspx",
  "watch-warning.html": "/watch-warning.aspx",
  "the-overcoming-women.html": "/the-overcoming-women.aspx",
  "tv-broadcasts.html": "/tv-broadcasts.aspx",
  "tv-channels.html": "/tv-channels.aspx",
  "tv-guests.html": "/reading.aspx?nv=492&cat=492",
  "listen-to-warning.html": "/listen-to-warning.aspx",
  "radio-broadcasts.html": "/radio-broadcasts.aspx",
  "shortwave-broadcasts.html": "/shortwave-broadcasts.aspx",
  "radio-stations.html": "/radio-stations.aspx",
  "radio-guests.html": "/reading.aspx?nv=491&cat=491",
  "prophecies.html": "/all-prophecies.aspx",
  "missions.html": "/reading.aspx?nv=494&cat=494",
  "eagles-saving-nations.html": "/eagles-saving-nations-membership.aspx",
  "eagles-saving-nations-vision.html": "/eagles-saving-nations-vision.aspx",
  "eagles-saving-nations-mission.html": "/eagles-saving-nations-mission.aspx",
  "esn-statement-of-faith.html": "/esn-statement-of-faith.aspx",
  "attributes-of-eagles.html": null, // CMS post; skip live or use reading post later
  "reading.html": "/reading.aspx",
  "pastoral-articles.html": "/reading.aspx?cat=493",
  "soldiers-of-the-cross.html": "/soldiers-of-the-cross.aspx",
  "thought-for-the-day.html": "/thought-for-the-day.aspx",
  "the-dorcas-fund-articles.html": "/the-dorcas-fund-articles.aspx",
  "events.html": "/events.aspx",
  "united-states-itinerary.html": "/united-states-itinerary.aspx",
  "international-itinerary.html": "/international-itinerary.aspx",
};

/** First-pass “priority” pages (above-the-fold comparison set) */
const DEFAULT_PAGES = [
  "index.html",
  "about.html",
  "watch-warning.html",
  "donate.html",
  "contact.html",
  "statement-of-faith.html",
  "the-dorcas-fund.html",
  "eagles-saving-nations.html",
  "prophecies.html",
  "dr-hansens-bio.html",
  "bible-college.html",
  "prayer.html",
  "testimonials.html",
  "events.html",
];

function parseArgs(argv) {
  const out = { pages: DEFAULT_PAGES, width: WIDTH };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pages" && argv[i + 1]) {
      out.pages = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (a === "--all") {
      out.pages = Object.keys(LIVE_PATH);
    } else if (a === "--width" && argv[i + 1]) {
      out.width = Number(argv[++i]);
    }
  }
  return out;
}

async function waitForReady(page) {
  await page.waitForLoadState("domcontentloaded");
  // Let chrome inject + fonts load (critical for fair compare)
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (_) {}
    }
  });
  // Extra beat for layout / sticky header
  await page.waitForTimeout(300);
}

async function shot(page, url, filePath) {
  const res = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: TIMEOUT,
  });
  await waitForReady(page);
  await page.screenshot({
    path: filePath,
    fullPage: false, // above the fold only
    type: "png",
  });
  return res ? res.status() : 0;
}

function slug(pageFile) {
  return pageFile.replace(/\.html$/, "") || "index";
}

function galleryHtml(rows, width, height) {
  const cards = rows
    .map((r) => {
      const liveCell = r.liveFile
        ? `<figure><figcaption>Live ${r.liveStatus || ""}</figcaption><img src="${r.liveRel}" alt="live ${r.slug}"></figure>`
        : `<figure><figcaption>Live (skipped)</figcaption><p class="skip">No live URL map</p></figure>`;
      return `
      <section class="card">
        <h2>${r.slug}</h2>
        <p class="meta"><a href="${r.localUrl}">local</a>${
          r.liveUrl ? ` · <a href="${r.liveUrl}">live</a>` : ""
        }</p>
        <div class="pair">
          <figure><figcaption>Local ${r.localStatus || ""}</figcaption><img src="${r.localRel}" alt="local ${r.slug}"></figure>
          ${liveCell}
        </div>
      </section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>WMI screenshot compare (${width}×${height})</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 1.5rem; background: #1e1d22; color: #eee; }
    h1 { font-weight: 600; }
    .note { color: #aaa; max-width: 60rem; line-height: 1.4; }
    .card { background: #2a2930; border-radius: 12px; padding: 1rem 1.25rem 1.5rem; margin: 1.5rem 0; }
    .card h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    .meta { margin: 0 0 1rem; font-size: 0.9rem; }
    .meta a { color: #c4a0ff; }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    figure { margin: 0; }
    figcaption { font-size: 0.8rem; color: #9b9; margin-bottom: 0.35rem; }
    img { width: 100%; height: auto; border-radius: 8px; border: 1px solid #444; background: #111; display: block; }
    .skip { color: #888; padding: 2rem; border: 1px dashed #555; border-radius: 8px; }
    @media (max-width: 900px) { .pair { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Above-the-fold compare</h1>
  <p class="note">Viewport <strong>${width}×${height}</strong>. Fonts waited via <code>document.fonts.ready</code>.
  Dynamic regions (Rumble, stats) may still differ. Open this file from disk or via local server under <code>temp/screenshots/</code>.</p>
  ${cards}
</body>
</html>`;
}

async function main() {
  const args = parseArgs(process.argv);
  const desktopDir = path.join(OUT_DIR, "desktop");
  await mkdir(desktopDir, { recursive: true });

  // Smoke-check local
  try {
    const r = await fetch(LOCAL_BASE + "/");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  } catch (e) {
    console.error(
      `Cannot reach local server at ${LOCAL_BASE}\n` +
        `Start it with:  cd ${ROOT} && python3 -m http.server 8080\n` +
        e
    );
    process.exit(1);
  }

  console.log(`Local:  ${LOCAL_BASE}`);
  console.log(`Live:   ${LIVE_BASE}`);
  console.log(`Size:   ${args.width}×${HEIGHT} (above fold)`);
  console.log(`Pages:  ${args.pages.length}`);
  console.log(`Output: ${OUT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: args.width, height: HEIGHT },
    deviceScaleFactor: 1,
    // Prefer consistent locale / color scheme
    locale: "en-US",
    colorScheme: "light",
  });

  const rows = [];

  for (const pageFile of args.pages) {
    const s = slug(pageFile);
    const localUrl =
      LOCAL_BASE.replace(/\/$/, "") +
      "/" +
      (pageFile === "index.html" ? "" : pageFile);
    const livePath = LIVE_PATH[pageFile];
    const liveUrl =
      livePath == null
        ? null
        : LIVE_BASE.replace(/\/$/, "") +
          (livePath.startsWith("/") ? livePath : "/" + livePath);

    const localFile = path.join(desktopDir, `${s}.local.png`);
    const liveFile = path.join(desktopDir, `${s}.live.png`);

    const page = await context.newPage();
    console.log(`\n→ ${s}`);

    let localStatus = "";
    let liveStatus = "";
    try {
      localStatus = String(await shot(page, localUrl, localFile));
      console.log(`  local ${localStatus} → ${path.relative(ROOT, localFile)}`);
    } catch (e) {
      console.error(`  local FAIL ${localUrl}`, e.message || e);
      localStatus = "ERR";
    }

    if (liveUrl) {
      try {
        liveStatus = String(await shot(page, liveUrl, liveFile));
        console.log(`  live  ${liveStatus} → ${path.relative(ROOT, liveFile)}`);
      } catch (e) {
        console.error(`  live  FAIL ${liveUrl}`, e.message || e);
        liveStatus = "ERR";
      }
    } else {
      console.log(`  live  skip (no map)`);
    }

    await page.close();

    rows.push({
      slug: s,
      localUrl,
      liveUrl,
      localStatus,
      liveStatus,
      localRel: `desktop/${s}.local.png`,
      liveRel: liveUrl ? `desktop/${s}.live.png` : null,
      liveFile: liveUrl ? liveFile : null,
    });
  }

  await browser.close();

  const indexPath = path.join(OUT_DIR, "index.html");
  await writeFile(
    indexPath,
    galleryHtml(rows, args.width, HEIGHT),
    "utf8"
  );

  // Small manifest for tooling
  await writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        localBase: LOCAL_BASE,
        liveBase: LIVE_BASE,
        width: args.width,
        height: HEIGHT,
        pages: rows,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`\nGallery: ${indexPath}`);
  console.log(`Open:    ${LOCAL_BASE}/temp/screenshots/index.html`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
