// Generates the "Personal_Decor" tileset: the neon "Pesquisa House" sign drawn as bent
// script tubing, the studio logo woven into an entrance mat, and an energy-drink can.
//
// Sheet layout (4 cols x 4 rows, 128x128), idx = row*4 + col:
//   idx 0-3  / 4-7     the sign (4 tiles wide, 2 tall)
//   idx 8-10 / 12-14   the logo mat (3 tiles wide, 2 tall)
//   idx 11             energy drink can
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const { scriptWord, measure } = require("./script-font.cjs");
const { logoPolylines, strokeCoverage, discCoverage, fitLogoBox } = require("./logo-mark.cjs");

const TILE = 32;
const COLS = 4;
const ROWS = 4;
const MAT_W = TILE * 3, MAT_H = TILE * 2;
const png = new PNG({ width: TILE * COLS, height: TILE * ROWS });
png.data.fill(0);

function setPx(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  const srcA = a / 255;
  const dstA = png.data[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  png.data[i] = Math.round((r * srcA + png.data[i] * dstA * (1 - srcA)) / outA);
  png.data[i + 1] = Math.round((g * srcA + png.data[i + 1] * dstA * (1 - srcA)) / outA);
  png.data[i + 2] = Math.round((b * srcA + png.data[i + 2] * dstA * (1 - srcA)) / outA);
  png.data[i + 3] = Math.round(outA * 255);
}
function fillRect(x0, y0, w, h, r, g, b, a = 255) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPx(x, y, r, g, b, a);
}

const NEON = [57, 255, 20];
const GLOW = [18, 84, 10];
const WHITE = [255, 255, 255];

// Paints an anti-aliased coverage map as a neon tube: soft halo, bright core, hot centre.
// Every pass is scaled by the pixel's coverage, so the glow feathers with the stroke edge
// instead of forming a hard outline around it.
function renderNeon(cov, core, glow, radius = 3, glowMax = 130, hot = null) {
  const cells = [...cov.entries()].map(([k, c]) => {
    const [x, y] = k.split(",");
    return [Number(x), Number(y), c];
  });
  for (const [x, y, c] of cells) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d === 0 || d > radius) continue;
        const a = glowMax * (1 - d / (radius + 0.2)) * c;
        if (a >= 3) setPx(x + dx, y + dy, glow[0], glow[1], glow[2], a);
      }
    }
  }
  for (const [x, y, c] of cells) setPx(x, y, core[0], core[1], core[2], Math.round(255 * c));
  if (hot) for (const [x, y, c] of cells) setPx(x, y, hot[0], hot[1], hot[2], Math.round(80 * c));
}

// ---------- the sign ----------
// The board fills nearly the whole 4-tile block: it sits between the two windows, so the
// extra width is free and the script needs every pixel it can get.
const BOARD_X = 2, BOARD_W = 124;
fillRect(BOARD_X, 0, BOARD_W, TILE * 2, 11, 12, 13, 255);
for (let x = BOARD_X; x < BOARD_X + BOARD_W; x++) {
  setPx(x, 0, 38, 39, 43, 255);
  setPx(x, TILE * 2 - 1, 38, 39, 43, 255);
}
for (let y = 0; y < TILE * 2; y++) {
  setPx(BOARD_X, y, 38, 39, 43, 255);
  setPx(BOARD_X + BOARD_W - 1, y, 38, 39, 43, 255);
}
{
  const lines = [];
  // "Pesquisa" sits high and left, "House" drops below and to the right, mirroring the
  // real sign's stacked, offset composition.
  const w1 = measure("Pesquisa");
  const a = scriptWord("Pesquisa", BOARD_X + 8, 25);
  lines.push(a);
  const w2 = measure("House");
  const b = scriptWord("House", BOARD_X + BOARD_W - w2 - 20, 54);
  lines.push(b);

  // underline swoosh sweeping out from beneath "House"
  const swooshStart = [BOARD_X + 28, 58];
  const swooshCtrl = [BOARD_X + 74, 63];
  const swooshEnd = [BOARD_X + BOARD_W - 8, 50];
  const { qbez } = require("./script-font.cjs");
  lines.push({ polylines: [qbez(swooshStart, swooshCtrl, swooshEnd, 40)], dots: [] });

  const polylines = lines.flatMap((l) => l.polylines);
  const cov = strokeCoverage(polylines, 2.1);
  for (const l of lines) for (const [dx, dy, r] of l.dots) discCoverage(cov, dx, dy, r);
  renderNeon(cov, NEON, GLOW, 3, 125, [205, 255, 190]);
  void w1;
}

// ---------- the logo, woven into an entrance mat (cols 0-2, rows 2-3) ----------
const LOGO_X = 0, LOGO_Y = TILE * 2;
for (let y = 3; y <= MAT_H - 4; y++) {
  for (let x = 3; x <= MAT_W - 4; x++) {
    const edge = x <= 4 || x >= MAT_W - 5 || y <= 4 || y >= MAT_H - 5;
    const weave = ((x + y) % 4 === 0) ? 6 : 0;
    setPx(LOGO_X + x, LOGO_Y + y, 28 + weave + (edge ? 14 : 0), 30 + weave + (edge ? 14 : 0), 36 + weave + (edge ? 16 : 0), 255);
  }
}
for (let x = 6; x <= MAT_W - 7; x++) {
  setPx(LOGO_X + x, LOGO_Y + 6, 96, 100, 110, 200);
  setPx(LOGO_X + x, LOGO_Y + MAT_H - 7, 96, 100, 110, 200);
}
for (let y = 6; y <= MAT_H - 7; y++) {
  setPx(LOGO_X + 6, LOGO_Y + y, 96, 100, 110, 200);
  setPx(LOGO_X + MAT_W - 7, LOGO_Y + y, 96, 100, 110, 200);
}
{
  // Fills the mat's inner panel as far as the reference aspect allows. The gap between the
  // body's belly and the horizontal bar is only ~11% of the mark's height, so every pixel
  // of height matters -- squeeze the box and the two strokes merge into one.
  const box = fitLogoBox(LOGO_X + MAT_W / 2, LOGO_Y + MAT_H / 2, 80, 52);
  const polylines = logoPolylines(box);
  const cov = strokeCoverage(polylines, 2.8);
  // printed on fabric, not a neon tube: tight soft edge instead of a wide bloom
  renderNeon(cov, WHITE, [120, 124, 132], 1, 90);
}

// ---------- energy drink can (idx 11 = row 2, col 3) ----------
{
  const ox = TILE * 3, oy = TILE * 2;
  for (let y = 6; y <= 27; y++) {
    for (let x = 10; x <= 21; x++) {
      if ((x === 10 || x === 21) && (y <= 7 || y >= 26)) continue;
      setPx(ox + x, oy + y, 18, 18, 18, 255);
    }
  }
  for (let x = 11; x <= 20; x++) {
    setPx(ox + x, oy + 6, 195, 195, 200, 255);
    setPx(ox + x, oy + 7, 160, 160, 165, 255);
  }
  setPx(ox + 15, oy + 5, 200, 200, 205, 255);
  setPx(ox + 16, oy + 5, 200, 200, 205, 255);
  const bolt = [
    [14, 10], [15, 10], [13, 12], [14, 12], [15, 12], [13, 14], [14, 14],
    [12, 16], [13, 16], [14, 16], [15, 18], [16, 18], [14, 20], [15, 20], [16, 20], [15, 22], [16, 22],
  ];
  for (const [x, y] of bolt) setPx(ox + x, oy + y, NEON[0], NEON[1], NEON[2], 255);
  for (let y = 9; y <= 24; y++) setPx(ox + 11, oy + y, 60, 60, 60, 200);
}

const outPath = path.join(__dirname, "..", "tilesets", "Personal_Decor.png");
fs.writeFileSync(outPath, PNG.sync.write(png));
console.log("Wrote", outPath, `${png.width}x${png.height}`);
