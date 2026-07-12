#!/usr/bin/env node
// generate-brand-assets.mjs — deterministic Sonye brand-asset generator.
//
// Emits (into src/app/, auto-served by Next's metadata file convention):
//   icon.svg            rounded rx=22 wash tile + "s." mark (path-converted glyph)
//   favicon.ico         same rounded mark rasterized at 16 + 32 + 48
//   apple-icon.png      180x180 square wash tile + mark (iOS masks its own corners)
//   opengraph-image.png 1200x630 share card: mark tile, "sonye." wordmark, subline
//
// All text is converted to PATHS at generation time — Baloo 2 ExtraBold (800) for
// the "s" glyph and the "sonye" wordmark, Nunito Sans (400) for the OG subline —
// and the extracted path data + metrics are vendored into scripts/brand-paths.mjs
// so regeneration is fully offline. The TTFs are fetched from Google Fonts at
// generation time ONLY and never committed. Re-vendor with --refresh-paths.
//
// Determinism / robustness notes:
//   * We fetch STATIC weight-pinned .ttf via the css2 API + a legacy UA (a variable
//     font or woff2 would not give us weight 800). The response is byte-stable.
//   * opentype.js v2 has two outline bugs we route around: glyph.getPath(x,y) with a
//     non-zero translation corrupts composite glyphs, and Path.toPathData()'s command
//     optimizer emits NaN/undefined. So we extract every glyph at the ORIGIN (proven
//     clean), translate command coordinates ourselves, and serialize path data with
//     our own writer. A NaN/undefined guard fails the build if that ever regresses.
//   * We import the ESM build explicitly (no `exports` map, so a bare import resolves
//     to the CJS/UMD `main`; the `module` field is bundler-only and Node ignores it).

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "opentype.js/dist/opentype.mjs";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const APP = join(ROOT, "src", "app");
const PATHS_MODULE = join(__dirname, "brand-paths.mjs");
const REFRESH = process.argv.includes("--refresh-paths");

// ---- Canon: tokens (mirror globals.css @theme) ----
const WASH = "#E6F0FF"; // bg / wash tile
const INK = "#14304D"; // ink — the "s"
const CORAL = "#EE5E00"; // action — the dot / period
const STEEL_AA = "#4A6B8C"; // AA secondary text — OG subline

// ---- Canon: icon-mark geometry (viewBox 0 0 100 100), exact — do not restyle ----
const S_FONT_SIZE = 92;
const S_ANCHOR_X = 38; // text-anchor:middle x
const S_BASELINE_Y = 74;
const DOT = { cx: 73, cy: 63.5, r: 10.5 };
const TILE_RX = 22;

// ---- OG layout knobs (asset layout, not canon; safe to tune) ----
const OG_W = 1200;
const OG_H = 630;
const WORDMARK_SIZE = 120;
const SUBLINE_SIZE = 40;
const SUBLINE_TEXT = "Curated pickleball games in Dallas.";

const UA =
  "Mozilla/5.0 (Linux; U; Android 4.0.3; en-us) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30";

const toAB = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

// ---- path-data serializer (our own — opentype's optimizer is buggy) ----
const PREC = 2;
const SCALE = 10 ** PREC;
const f = (v) => "" + Math.round(v * SCALE) / SCALE; // round to PREC, no trailing zeros
function serialize(cmds) {
  let d = "";
  for (const c of cmds) {
    if (c.type === "M") d += `M${f(c.x)} ${f(c.y)}`;
    else if (c.type === "L") d += `L${f(c.x)} ${f(c.y)}`;
    else if (c.type === "Q") d += `Q${f(c.x1)} ${f(c.y1)} ${f(c.x)} ${f(c.y)}`;
    else if (c.type === "C") d += `C${f(c.x1)} ${f(c.y1)} ${f(c.x2)} ${f(c.y2)} ${f(c.x)} ${f(c.y)}`;
    else if (c.type === "Z") d += "Z";
  }
  if (d.includes("NaN") || d.includes("undefined")) throw new Error("path serialization produced NaN/undefined");
  return d;
}
function bboxOf(cmds) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const c of cmds)
    for (const [kx, ky] of [["x", "y"], ["x1", "y1"], ["x2", "y2"]])
      if (c[kx] !== undefined) {
        x1 = Math.min(x1, c[kx]); x2 = Math.max(x2, c[kx]);
        y1 = Math.min(y1, c[ky]); y2 = Math.max(y2, c[ky]);
      }
  return { x1: +x1.toFixed(PREC), y1: +y1.toFixed(PREC), x2: +x2.toFixed(PREC), y2: +y2.toFixed(PREC) };
}

// Fetch a STATIC TrueType instance from Google Fonts pinned to `weight`.
async function fetchTTF(family, weight) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`;
  const css = await (await fetch(cssUrl, { headers: { "User-Agent": UA } })).text();
  const m = css.match(/url\((https:[^)]+\.ttf[^)]*)\)/) || css.match(/url\((https:[^)]+)\)/);
  if (!m) throw new Error(`no font url for ${family}@${weight}\n${css.slice(0, 200)}`);
  const buf = Buffer.from(await (await fetch(m[1], { headers: { "User-Agent": UA } })).arrayBuffer());
  const magic = buf.subarray(0, 4);
  const ok = magic.readUInt32BE(0) === 0x00010000 || ["true", "OTTO", "ttcf"].includes(magic.toString("latin1"));
  if (!ok) throw new Error(`${family}@${weight}: not sfnt/TTF (magic ${magic.toString("hex")}, ${buf.length}B)`);
  return buf;
}

// Lay out a Latin string as translated path COMMANDS. Each glyph outline is taken at
// the origin (opentype's clean path), then shifted by the pen position ourselves.
// Kerning comes from the kern table. Returns { commands, advanceWidth }.
function layout(font, text, x, y, size, kerning = true) {
  const scale = size / font.unitsPerEm;
  const out = [];
  let penX = x;
  let prev = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (kerning && prev) penX += font.getKerningValue(prev, g) * scale;
    for (const c of g.getPath(0, 0, size).commands) {
      const n = { type: c.type };
      if (c.x !== undefined) { n.x = c.x + penX; n.y = c.y + y; }
      if (c.x1 !== undefined) { n.x1 = c.x1 + penX; n.y1 = c.y1 + y; }
      if (c.x2 !== undefined) { n.x2 = c.x2 + penX; n.y2 = c.y2 + y; }
      out.push(n);
    }
    penX += (g.advanceWidth || 0) * scale;
    prev = g;
  }
  return { commands: out, advanceWidth: penX - x };
}

// Convert glyphs -> path data + metrics. Returns the exact shape brand-paths.mjs exports.
function vendorPaths(baloo, nunito) {
  // Icon "s": middle-anchored at S_ANCHOR_X, baseline S_BASELINE_Y — baked absolute.
  const sAdvance = layout(baloo, "s", 0, 0, S_FONT_SIZE, false).advanceWidth;
  const iconS = layout(baloo, "s", S_ANCHOR_X - sAdvance / 2, S_BASELINE_Y, S_FONT_SIZE, false);

  // OG wordmark "sonye" (ink) + "." (coral) at origin baseline, period at the next slot.
  const sonye = layout(baloo, "sonye", 0, 0, WORDMARK_SIZE);
  const period = layout(baloo, ".", sonye.advanceWidth, 0, WORDMARK_SIZE, false);

  // OG subline (Nunito Sans) at origin baseline.
  const sub = layout(nunito, SUBLINE_TEXT, 0, 0, SUBLINE_SIZE);

  return {
    ICON_S_PATH: serialize(iconS.commands),
    WORDMARK: {
      sonyePath: serialize(sonye.commands),
      periodPath: serialize(period.commands),
      fontSize: WORDMARK_SIZE,
      bbox: bboxOf(sonye.commands.concat(period.commands)),
    },
    SUBLINE: {
      path: serialize(sub.commands),
      text: SUBLINE_TEXT,
      fontSize: SUBLINE_SIZE,
      bbox: bboxOf(sub.commands),
    },
  };
}

function renderModule(P) {
  return (
    `// AUTO-GENERATED by scripts/generate-brand-assets.mjs — do not edit by hand.\n` +
    `// Vendored Baloo 2 ExtraBold + Nunito Sans path data so brand-asset regeneration\n` +
    `// is fully offline. Re-vendor: node scripts/generate-brand-assets.mjs --refresh-paths\n` +
    `export const ICON_S_PATH = ${JSON.stringify(P.ICON_S_PATH)};\n` +
    `export const WORDMARK = ${JSON.stringify(P.WORDMARK, null, 2)};\n` +
    `export const SUBLINE = ${JSON.stringify(P.SUBLINE, null, 2)};\n`
  );
}

// The mark, drawn in the 100x100 unit space. rounded=true bakes rx=22 (icon/favicon);
// square for apple-icon + OG tiles (iOS masks its own corners).
function markInner(rounded, P) {
  return (
    `<rect width="100" height="100" rx="${rounded ? TILE_RX : 0}" fill="${WASH}"/>` +
    `<path d="${P.ICON_S_PATH}" fill="${INK}"/>` +
    `<circle cx="${DOT.cx}" cy="${DOT.cy}" r="${DOT.r}" fill="${CORAL}"/>`
  );
}
function markSvg(rounded, px, P) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 100 100">${markInner(rounded, P)}</svg>`;
}

// x translate that centers a bbox-bounded path's visual center at totalW/2.
const centerX = (totalW, bbox) => (totalW - (bbox.x2 - bbox.x1)) / 2 - bbox.x1;

function ogSvg(P) {
  const markPx = 160;
  const markX = (OG_W - markPx) / 2;
  const markY = 120;
  const wmX = centerX(OG_W, P.WORDMARK.bbox);
  const wmBaselineY = markY + markPx + 170; // below the mark tile
  const slX = centerX(OG_W, P.SUBLINE.bbox);
  const slBaselineY = wmBaselineY + 78;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}">` +
    `<rect width="${OG_W}" height="${OG_H}" fill="${WASH}"/>` +
    `<g transform="translate(${markX} ${markY}) scale(${markPx / 100})">${markInner(false, P)}</g>` +
    `<g transform="translate(${wmX} ${wmBaselineY})">` +
    `<path d="${P.WORDMARK.sonyePath}" fill="${INK}"/>` +
    `<path d="${P.WORDMARK.periodPath}" fill="${CORAL}"/>` +
    `</g>` +
    `<path d="${P.SUBLINE.path}" transform="translate(${slX} ${slBaselineY})" fill="${STEEL_AA}"/>` +
    `</svg>`
  );
}

async function main() {
  let P;
  if (REFRESH || !existsSync(PATHS_MODULE)) {
    console.log("• fetching fonts (Baloo 2 @800, Nunito Sans @400) …");
    const baloo = parse(toAB(await fetchTTF("Baloo+2", 800)));
    const nunito = parse(toAB(await fetchTTF("Nunito+Sans", 400)));
    P = vendorPaths(baloo, nunito);
    await writeFile(PATHS_MODULE, renderModule(P));
    console.log(`• vendored paths -> ${PATHS_MODULE}`);
  } else {
    P = await import(pathToFileURL(PATHS_MODULE).href);
    console.log(`• using vendored paths from ${PATHS_MODULE} (offline)`);
  }

  // Guard: never rasterize a poisoned path.
  for (const d of [P.ICON_S_PATH, P.WORDMARK.sonyePath, P.WORDMARK.periodPath, P.SUBLINE.path]) {
    if (!d || d.includes("NaN") || d.includes("undefined")) throw new Error("vendored path contains NaN/undefined");
  }

  await mkdir(APP, { recursive: true });

  // icon.svg — rounded, scalable
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">${markInner(true, P)}</svg>\n`;
  await writeFile(join(APP, "icon.svg"), icon);

  // favicon.ico — rounded, multi-size 16/32/48
  const sizes = [16, 32, 48];
  const icoPngs = await Promise.all(sizes.map((s) => sharp(Buffer.from(markSvg(true, s, P))).png().toBuffer()));
  await writeFile(join(APP, "favicon.ico"), await pngToIco(icoPngs));

  // apple-icon.png — 180x180 square
  await writeFile(join(APP, "apple-icon.png"), await sharp(Buffer.from(markSvg(false, 180, P))).png().toBuffer());

  // opengraph-image.png — 1200x630
  await writeFile(join(APP, "opengraph-image.png"), await sharp(Buffer.from(ogSvg(P))).png().toBuffer());

  console.log("• wrote icon.svg, favicon.ico, apple-icon.png, opengraph-image.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
