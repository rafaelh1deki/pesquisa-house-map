// Generates the custom "Modern_Decor" tileset: gaming chairs in every orientation the map
// needs, an arcade cabinet, modern planters, neon LED wall strips, bean bags and a pouf.
//
// Sheet layout (8 cols x 3 rows, 256x96). Two-tile-tall sprites live in rows 0-1:
//   idx  0/1 + 8/9    chair facing DOWN  (sits above a desk; cushion visible)
//   idx  2/3 + 10/11  chair facing UP    (sits below a desk; we see its back)
//   idx  4   + 12     arcade cabinet
//   idx  5   + 13     planter, monstera
//   idx  6   + 14     planter, palm
//   idx 16            chair, side view facing RIGHT (sits left of a desk)
//   idx 17            chair, side view facing LEFT  (sits right of a desk)
//   idx 18/19/20      neon wall strip: middle / left cap / right cap
//   idx 21/22         bean bag: teal / charcoal
//   idx 23            pouf
//
// Note: the map's original chair sprites are ~22px wide and are positioned straddling the
// boundary between two tiles, so the 2x2 chairs here are drawn centred at x=32 of the block.
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const TILE = 32;
const COLS = 8;
const ROWS = 16;
const png = new PNG({ width: TILE * COLS, height: TILE * ROWS });
png.data.fill(0);

function px(x, y, r, g, b, a = 255) {
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
function rect(x0, y0, w, h, c, a = 255) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(x, y, c[0], c[1], c[2], a);
}
function vgrad(x0, y0, w, h, c0, c1, a = 255) {
  for (let y = 0; y < h; y++) {
    const t = h <= 1 ? 0 : y / (h - 1);
    const r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
    const g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
    const b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
    for (let x = x0; x < x0 + w; x++) px(x, y0 + y, r, g, b, a);
  }
}
function shadow(cx, cy, rx, ry, maxA = 115) {
  for (let y = -ry - 2; y <= ry + 2; y++) {
    for (let x = -rx - 2; x <= rx + 2; x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (d > 1.35) continue;
      const a = Math.round(maxA * Math.max(0, 1 - d));
      if (a > 0) px(cx + x, cy + y, 5, 6, 8, a);
    }
  }
}
// filled ellipse, used for leaves and bean bags
function ellipse(cx, cy, rx, ry, c, a = 255) {
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1) continue;
      px(cx + x, cy + y, c[0], c[1], c[2], a);
    }
  }
}
function mirrorBlock(ox, oy, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w / 2; x++) {
      const i1 = ((oy + y) * png.width + (ox + x)) * 4;
      const i2 = ((oy + y) * png.width + (ox + w - 1 - x)) * 4;
      for (let c = 0; c < 4; c++) {
        const t = png.data[i1 + c];
        png.data[i1 + c] = png.data[i2 + c];
        png.data[i2 + c] = t;
      }
    }
  }
}

const BACK_TOP = [52, 54, 60];
const BACK_BOT = [18, 18, 21];
// cushion sits noticeably lighter than the backrest so the two read as separate parts
const SEAT_TOP = [72, 76, 84];
const SEAT_BOT = [38, 40, 46];
const WING = [12, 12, 15];
const NEON = [57, 255, 20];
const NEON_SOFT = [24, 110, 12];
const METAL = [96, 99, 106];
const METAL_DARK = [52, 54, 60];

// ---------- 5-star base, shared by the wheeled chairs ----------
function starBase(cx, baseY) {
  shadow(cx, baseY + 5, 12, 4, 120);
  const spokes = [[-9, 4], [9, 4], [0, 7], [-6, 1], [6, 1]];
  for (const [dx, dy] of spokes) {
    px(cx + dx, baseY + dy, METAL_DARK[0], METAL_DARK[1], METAL_DARK[2]);
    px(cx + dx, baseY + dy - 1, METAL[0], METAL[1], METAL[2]);
  }
  rect(cx - 1, baseY - 4, 2, 6, METAL);
}

// ---------- chair facing DOWN (above a desk: backrest north, cushion south) ----------
// block origin (0,0), 64x64; sprite centred on x=32
{
  const cx = 32;
  starBase(cx, 44);
  // seat cushion
  vgrad(cx - 12, 30, 24, 13, SEAT_TOP, SEAT_BOT);
  rect(cx - 12, 30, 24, 1, [70, 73, 80], 190);      // top edge highlight
  rect(cx - 12, 41, 24, 2, NEON, 235);               // neon front lip
  // backrest
  vgrad(cx - 11, 17, 22, 14, BACK_TOP, BACK_BOT);
  rect(cx - 9, 14, 18, 4, BACK_TOP);                 // headrest cap
  rect(cx - 13, 18, 3, 11, WING);                    // wings
  rect(cx + 10, 18, 3, 11, WING);
  rect(cx - 1, 15, 2, 16, NEON);                     // centre stripe
  rect(cx - 1, 15, 1, 16, [170, 255, 150], 150);
  for (let y = 19; y < 30; y++) px(cx - 10, y, 96, 99, 106, 85); // left light edge
}

// ---------- chair facing UP (below a desk: we see the back of the backrest) ----------
{
  const ox = 64;
  const cx = ox + 32;
  starBase(cx, 44);
  // solid back slab, no cushion band visible
  vgrad(cx - 12, 16, 24, 25, BACK_TOP, BACK_BOT);
  rect(cx - 10, 13, 20, 4, BACK_TOP);
  rect(cx - 14, 18, 3, 16, WING);
  rect(cx + 11, 18, 3, 16, WING);
  rect(cx - 1, 14, 2, 27, NEON);
  rect(cx - 1, 14, 1, 27, [170, 255, 150], 150);
  rect(cx - 6, 28, 12, 1, NEON, 70);                 // subtle lumbar accent
  for (let y = 18; y < 40; y++) px(cx - 11, y, 96, 99, 106, 85);
}

// ---------- chair, side view facing RIGHT (sits to the LEFT of a desk) ----------
{
  const ox = 0, oy = 64;
  shadow(ox + 18, oy + 28, 11, 3, 110);
  // gas lift + wheel base
  rect(ox + 17, oy + 22, 3, 6, METAL);
  for (const [wx, wy] of [[11, 27], [25, 27], [18, 29]]) {
    rect(ox + wx, oy + wy, 2, 2, METAL_DARK);
    px(ox + wx, oy + wy - 1, METAL[0], METAL[1], METAL[2]);
  }
  rect(ox + 11, oy + 26, 15, 1, METAL_DARK);         // base spar
  // seat, running right toward the desk
  vgrad(ox + 12, oy + 14, 17, 9, SEAT_TOP, SEAT_BOT);
  rect(ox + 12, oy + 14, 17, 1, [92, 96, 104], 200); // top highlight
  rect(ox + 27, oy + 14, 2, 9, NEON, 235);           // neon front edge, faces the desk
  // backrest on the left, with headrest
  vgrad(ox + 4, oy + 4, 9, 21, BACK_TOP, BACK_BOT);
  rect(ox + 4, oy + 2, 9, 4, BACK_TOP);              // headrest cap
  rect(ox + 4, oy + 2, 1, 22, WING);                 // outer (shaded) edge
  rect(ox + 11, oy + 6, 2, 17, NEON);                // neon down the inner face
  rect(ox + 11, oy + 6, 1, 17, [170, 255, 150], 140);
  // armrest bridging backrest and seat
  rect(ox + 13, oy + 11, 9, 3, [30, 31, 36]);
  rect(ox + 13, oy + 11, 9, 1, [70, 73, 80], 170);
}
// ---------- chair, side view facing LEFT (sits to the RIGHT of a desk) ----------
{
  // draw into col1 by copying col0 then mirroring
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const si = ((64 + y) * png.width + x) * 4;
      const di = ((64 + y) * png.width + (32 + x)) * 4;
      for (let c = 0; c < 4; c++) png.data[di + c] = png.data[si + c];
    }
  }
  mirrorBlock(32, 64, TILE, TILE);
}

// ---------- arcade cabinet (col4, rows 0-1) ----------
{
  const ox = TILE * 4;
  vgrad(ox + 3, 8, 26, 24, [40, 40, 45], [26, 26, 30]);
  rect(ox + 2, 2, 28, 7, [10, 10, 12]);
  rect(ox + 4, 3, 24, 5, NEON, 235);
  for (let x = 5; x < 27; x++) px(ox + x, 5, 10, 40, 8);
  rect(ox + 6, 11, 20, 16, [12, 12, 14]);
  rect(ox + 8, 13, 16, 12, [8, 6, 20]);
  const blips = [
    [10, 15, [57, 255, 20]], [13, 18, [255, 210, 40]], [17, 16, [230, 40, 60]],
    [20, 20, [60, 160, 255]], [11, 21, [57, 255, 20]], [16, 22, [255, 210, 40]],
  ];
  for (const [x, y, c] of blips) px(ox + x, y, c[0], c[1], c[2]);
  vgrad(ox + 3, 8, 3, 24, [26, 26, 30], [16, 16, 18]);
  vgrad(ox + 26, 8, 3, 24, [16, 16, 18], [8, 8, 9]);

  const oy = TILE;
  shadow(ox + 16, oy + 20, 13, 4, 120);
  vgrad(ox + 3, oy + 0, 26, 22, [30, 30, 34], [18, 18, 20]);
  vgrad(ox + 3, oy + 0, 3, 22, [22, 22, 25], [12, 12, 14]);
  vgrad(ox + 26, oy + 0, 3, 22, [14, 14, 16], [7, 7, 8]);
  rect(ox + 5, oy + 3, 22, 8, [14, 14, 16]);
  rect(ox + 9, oy + 4, 2, 5, [60, 60, 66]);
  rect(ox + 9, oy + 3, 2, 2, [220, 30, 30]);
  const buttons = [[15, 6, [230, 40, 60]], [18, 5, [255, 210, 40]], [21, 6, [57, 255, 20]], [24, 5, [60, 160, 255]]];
  for (const [x, y, c] of buttons) rect(ox + x, oy + y, 2, 2, c);
  rect(ox + 14, oy + 13, 4, 2, [10, 10, 12]);
  rect(ox + 4, oy + 18, 24, 4, [15, 15, 17]);
}

// ---------- modern planters (cols 5 and 6, rows 0-1) ----------
const POT_LIGHT = [238, 240, 242];
const POT_MID = [214, 218, 222];
const POT_DARK = [176, 182, 188];
const LEAF_D = [30, 92, 48];
const LEAF_M = [56, 142, 72];
const LEAF_L = [116, 190, 118];

function drawPot(ox) {
  const oy = TILE; // bottom tile of the pair
  shadow(ox + 16, oy + 24, 10, 3, 110);
  // tapered cylindrical pot
  vgrad(ox + 9, oy + 6, 14, 17, POT_LIGHT, POT_DARK);
  rect(ox + 9, oy + 6, 14, 2, [250, 251, 252]);    // rim highlight
  rect(ox + 10, oy + 8, 2, 14, [252, 253, 254], 110); // left sheen
  rect(ox + 20, oy + 8, 2, 14, [150, 156, 162], 90);  // right shading
  rect(ox + 10, oy + 22, 12, 2, POT_MID);
}

// monstera
{
  const ox = TILE * 5;
  drawPot(ox);
  // stems
  for (let y = 20; y < 38; y++) px(ox + 16, y, 46, 110, 56);
  const leaves = [
    [10, 20, 6, 5], [23, 21, 6, 5], [16, 14, 7, 6],
    [11, 28, 6, 5], [22, 29, 6, 5], [16, 24, 7, 5],
  ];
  for (const [cx, cy, rx, ry] of leaves) {
    ellipse(ox + cx, cy, rx, ry, LEAF_M);
    ellipse(ox + cx - 1, cy - 1, Math.max(1, rx - 3), Math.max(1, ry - 3), LEAF_L, 160);
    // monstera split
    px(ox + cx + 1, cy, LEAF_D[0], LEAF_D[1], LEAF_D[2]);
    px(ox + cx + 2, cy + 1, LEAF_D[0], LEAF_D[1], LEAF_D[2]);
  }
}
// palm / dracaena: blade-shaped leaves radiating up and arching outward
function blade(cx, cy, angle, len, curve) {
  for (let i = 2; i <= len; i++) {
    const t = i / len;
    const a = angle + curve * t * t;              // arches over toward the tip
    const x = Math.round(cx + Math.cos(a) * i);
    const y = Math.round(cy + Math.sin(a) * i);
    const thick = t > 0.85 ? 1 : 2;               // tapers to a point
    for (let k = 0; k < thick; k++) px(x, y + k, LEAF_M[0], LEAF_M[1], LEAF_M[2]);
    if (i % 3 === 0) px(x, y - 1, LEAF_L[0], LEAF_L[1], LEAF_L[2], 200);
    if (t > 0.4 && i % 2 === 0) px(x, y + thick, LEAF_D[0], LEAF_D[1], LEAF_D[2], 190);
  }
}
{
  const ox = TILE * 6;
  drawPot(ox);
  const cx = ox + 16, cy = 36;                    // just above the pot rim
  const UP = -Math.PI / 2;
  const spec = [
    [UP - 1.30, 11, 0.60], [UP - 0.95, 14, 0.50], [UP - 0.60, 17, 0.40],
    [UP - 0.28, 18, 0.20], [UP, 19, 0.05], [UP + 0.28, 18, -0.20],
    [UP + 0.60, 17, -0.40], [UP + 0.95, 14, -0.50], [UP + 1.30, 11, -0.60],
    // shorter inner layer fills the crown out
    [UP - 0.75, 9, 0.55], [UP - 0.15, 10, 0.15], [UP + 0.45, 10, -0.35],
  ];
  for (const [angle, len, curve] of spec) blade(cx, cy, angle, len, curve);
  for (let y = 30; y < 38; y++) px(cx, y, 46, 110, 56);  // short visible stem
}

// ---------- neon LED wall strips (idx 18 mid, 19 left cap, 20 right cap) ----------
function neonStrip(ox, x0, x1) {
  const oy = TILE * 2;
  const barY = 25;
  // glow halo
  for (let y = barY - 5; y <= barY + 5; y++) {
    const dist = Math.abs(y - barY);
    const a = Math.max(0, 105 * (1 - dist / 5.5));
    if (a < 4) continue;
    for (let x = x0; x <= x1; x++) px(ox + x, oy + y, NEON_SOFT[0], NEON_SOFT[1], NEON_SOFT[2], a);
  }
  // core tube
  for (let x = x0; x <= x1; x++) {
    px(ox + x, oy + barY, NEON[0], NEON[1], NEON[2]);
    px(ox + x, oy + barY + 1, NEON[0], NEON[1], NEON[2]);
    px(ox + x, oy + barY, 200, 255, 185, 110);
  }
}
neonStrip(TILE * 2, 0, 31);   // idx 18: middle, tiles seamlessly
neonStrip(TILE * 3, 3, 31);   // idx 19: left cap
neonStrip(TILE * 4, 0, 28);   // idx 20: right cap

// ---------- bean bags + pouf (idx 21, 22, 23) ----------
function beanBag(ox, oy, base, top, piping) {
  shadow(ox + 16, oy + 26, 11, 3, 110);
  // slouchy blob: wide base, softer top
  ellipse(ox + 16, oy + 21, 12, 6, base);
  ellipse(ox + 16, oy + 15, 9, 6, top);
  ellipse(ox + 14, oy + 13, 5, 3, [255, 255, 255], 45); // soft highlight
  // seam
  for (let x = -9; x <= 9; x++) {
    const y = oy + 17 + Math.round((x * x) / 26);
    px(ox + 16 + x, y, piping[0], piping[1], piping[2], 210);
  }
}
beanBag(TILE * 5, TILE * 2, [16, 122, 118], [24, 158, 152], [90, 220, 210]);  // idx 21 teal
beanBag(TILE * 6, TILE * 2, [26, 27, 32], [40, 42, 48], NEON);                // idx 22 charcoal
{
  // idx 23: round pouf, sand
  const ox = TILE * 7, oy = TILE * 2;
  shadow(ox + 16, oy + 25, 10, 3, 105);
  ellipse(ox + 16, oy + 19, 11, 7, [198, 189, 174]);
  ellipse(ox + 16, oy + 17, 11, 6, [222, 214, 200]);
  ellipse(ox + 14, oy + 15, 5, 3, [246, 242, 234], 150);
  for (let x = -10; x <= 10; x++) px(ox + 16 + x, oy + 22, 178, 168, 152, 200);
}

// ---------- idx 24: small desk plant (sits on a desktop) ----------
{
  const ox = 0, oy = TILE * 3;
  shadow(ox + 16, oy + 24, 7, 2, 90);
  vgrad(ox + 12, oy + 17, 9, 6, POT_LIGHT, POT_DARK);   // little cube pot
  rect(ox + 11, oy + 15, 11, 2, [250, 251, 252]);       // rim
  rect(ox + 13, oy + 18, 1, 4, [252, 253, 254], 120);
  // compact succulent
  for (const [a, len] of [[-2.5, 6], [-2.0, 7], [-1.57, 8], [-1.1, 7], [-0.6, 6]]) {
    for (let i = 0; i < len; i++) {
      const x = Math.round(ox + 16 + Math.cos(a) * i);
      const y = Math.round(oy + 15 + Math.sin(a) * i);
      px(x, y, LEAF_M[0], LEAF_M[1], LEAF_M[2]);
      px(x, y + 1, LEAF_D[0], LEAF_D[1], LEAF_D[2], 200);
    }
  }
  ellipse(ox + 16, oy + 12, 3, 2, LEAF_L, 210);
}

// ---------- idx 25: lime bean bag ----------
beanBag(TILE, TILE * 3, [74, 132, 22], [104, 176, 30], [190, 255, 120]);

// =====================================================================================
// Lounge furniture, games room and outdoor pieces (rows 4-9)
// =====================================================================================
const CHARCOAL_T = [66, 69, 78];
const CHARCOAL_B = [34, 36, 42];
const CUSHION_T = [92, 96, 106];
const CUSHION_B = [56, 59, 68];
const TEAL = [24, 158, 152];
const OFFWHITE = [238, 240, 243];
const OFFWHITE_D = [196, 201, 208];
const METAL_LEG = [58, 60, 66];

function softShadowRect(x0, y0, w, h, a = 95) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const edge = Math.min(x - x0, x0 + w - 1 - x, y - y0, y0 + h - 1 - y);
      px(x, y, 6, 7, 9, edge === 0 ? a * 0.45 : a);
    }
  }
}

// ---------- modern sofa: rows 4-5, cols 0-3 (128x64) ----------
// The 92px-wide body is inset 16px inside a 4-tile block. Placed at x2..x5 that puts its
// centre on pixel 128 -- exactly the middle of the lounge (tiles x1..x6).
{
  const ox = 16, oy = TILE * 4;
  softShadowRect(ox + 6, oy + 50, 84, 6, 80);
  // backrest
  vgrad(ox + 6, oy + 6, 84, 20, CHARCOAL_T, CHARCOAL_B);
  rect(ox + 6, oy + 6, 84, 2, [86, 90, 100], 190);
  // armrests
  vgrad(ox + 2, oy + 16, 14, 36, CHARCOAL_T, CHARCOAL_B);
  vgrad(ox + 80, oy + 16, 14, 36, CHARCOAL_T, CHARCOAL_B);
  rect(ox + 2, oy + 16, 14, 2, [86, 90, 100], 170);
  rect(ox + 80, oy + 16, 14, 2, [86, 90, 100], 170);
  // back cushions, divided to match the seat below
  for (let i = 0; i < 3; i++) {
    const cx = ox + 17 + i * 21;
    rect(cx, oy + 9, 19, 15, [58, 61, 70]);
    rect(cx, oy + 9, 19, 1, [92, 96, 106], 200);
  }
  // seat cushions: all three drawn first, then the seams, so nothing overwrites them
  for (let i = 0; i < 3; i++) vgrad(ox + 16 + i * 21, oy + 26, 21, 24, CUSHION_T, CUSHION_B);
  for (let i = 0; i < 3; i++) {
    const cx = ox + 16 + i * 21;
    rect(cx + 1, oy + 27, 19, 1, [122, 127, 138], 210);            // cushion highlight
    rect(cx, oy + 26, 1, 24, [22, 24, 28], 230);                   // seam on the left edge
  }
  rect(ox + 79, oy + 26, 1, 24, [22, 24, 28], 230);                // closing seam
  rect(ox + 16, oy + 48, 64, 2, [30, 32, 38], 200);                // front lip shadow
  // accent throw pillows
  rect(ox + 20, oy + 12, 12, 12, TEAL);
  rect(ox + 20, oy + 12, 12, 2, [70, 200, 192], 200);
  rect(ox + 64, oy + 12, 12, 12, [104, 176, 30]);
  rect(ox + 64, oy + 12, 12, 2, [150, 220, 90], 200);
  // feet
  for (const fx of [8, 85]) rect(ox + fx, oy + 52, 3, 3, METAL_LEG);
}

// ---------- coffee table: rows 4-5, cols 4-5 (64x64) ----------
{
  const ox = TILE * 4, oy = TILE * 4;
  softShadowRect(ox + 10, oy + 42, 44, 6, 85);
  // thin metal legs peeking out
  for (const [lx, ly] of [[12, 40], [49, 40], [12, 18], [49, 18]]) rect(ox + lx, oy + ly, 3, 8, METAL_LEG);
  // light top
  vgrad(ox + 8, oy + 14, 48, 30, OFFWHITE, OFFWHITE_D);
  rect(ox + 8, oy + 14, 48, 2, [250, 251, 253]);
  rect(ox + 8, oy + 42, 48, 2, [170, 176, 184]);
  // objects: book stack + tiny plant
  rect(ox + 15, oy + 22, 13, 4, [200, 70, 70]);
  rect(ox + 15, oy + 26, 13, 3, [70, 110, 190]);
  rect(ox + 38, oy + 24, 8, 8, POT_LIGHT);
  ellipse(ox + 42, oy + 21, 5, 4, LEAF_M);
  ellipse(ox + 41, oy + 20, 3, 2, LEAF_L, 190);
}

// ---------- sideboard / shelving: rows 4-5, cols 6-7 (64x64) ----------
{
  const ox = TILE * 6, oy = TILE * 4;
  softShadowRect(ox + 6, oy + 44, 52, 5, 85);
  vgrad(ox + 4, oy + 12, 56, 34, OFFWHITE, OFFWHITE_D);
  rect(ox + 4, oy + 10, 56, 4, [44, 46, 52]);           // dark top slab
  rect(ox + 4, oy + 28, 56, 1, [176, 182, 190]);         // shelf line
  rect(ox + 31, oy + 14, 1, 32, [176, 182, 190]);        // divider
  // books on the upper shelf
  const spines = [[57, 200, 70], [70, 110, 190], [230, 170, 50], [200, 70, 70], [140, 90, 200]];
  spines.forEach((c, i) => rect(ox + 8 + i * 4, oy + 16, 3, 11, c));
  // objects on the lower shelf
  rect(ox + 36, oy + 32, 10, 11, [60, 63, 70]);
  ellipse(ox + 52, oy + 38, 5, 5, TEAL);
  // small plant on top
  rect(ox + 44, oy + 4, 8, 7, POT_LIGHT);
  ellipse(ox + 48, oy + 2, 6, 4, LEAF_M);
  for (const fx of [7, 54]) rect(ox + fx, oy + 46, 3, 3, METAL_LEG);
}

// ---------- accent armchairs: rows 6-7, col 0 (faces right) and col 1 (faces left) ----------
{
  const ox = 0, oy = TILE * 6;
  softShadowRect(ox + 6, oy + 44, 22, 5, 85);
  // backrest on the left
  vgrad(ox + 5, oy + 12, 9, 30, [30, 176, 168], [14, 108, 104]);
  rect(ox + 5, oy + 10, 9, 4, [40, 190, 182]);
  // seat running right
  vgrad(ox + 13, oy + 22, 15, 18, [26, 158, 152], [16, 112, 108]);
  rect(ox + 13, oy + 22, 15, 2, [76, 210, 202], 190);
  // armrest
  rect(ox + 14, oy + 18, 12, 4, [20, 132, 128]);
  for (const [lx, ly] of [[9, 42], [25, 40]]) rect(ox + lx, oy + ly, 3, 5, [120, 96, 70]);
  // mirror into col 1
  for (let y = 0; y < TILE * 2; y++) {
    for (let x = 0; x < TILE; x++) {
      const si = ((oy + y) * png.width + x) * 4;
      const di = ((oy + y) * png.width + (TILE + x)) * 4;
      for (let c = 0; c < 4; c++) png.data[di + c] = png.data[si + c];
    }
  }
  mirrorBlock(TILE, oy, TILE, TILE * 2);
}

// ---------- ping-pong table: rows 6-7, cols 2-5 (128x64) ----------
{
  const ox = TILE * 2, oy = TILE * 6;
  softShadowRect(ox + 10, oy + 54, 108, 6, 85);
  // legs
  for (const [lx, ly] of [[12, 46], [112, 46], [12, 12], [112, 12]]) rect(ox + lx, oy + ly, 4, 10, [40, 42, 46]);
  // playing surface
  vgrad(ox + 6, oy + 8, 116, 48, [30, 78, 108], [20, 56, 80]);
  // white boundary lines
  rect(ox + 8, oy + 10, 112, 2, [242, 245, 248]);
  rect(ox + 8, oy + 52, 112, 2, [242, 245, 248]);
  rect(ox + 8, oy + 10, 2, 44, [242, 245, 248]);
  rect(ox + 118, oy + 10, 2, 44, [242, 245, 248]);
  rect(ox + 8, oy + 31, 112, 1, [242, 245, 248], 200);   // centre service line
  // net across the middle, standing slightly proud of the table
  rect(ox + 62, oy + 4, 5, 56, [232, 236, 240]);
  rect(ox + 63, oy + 5, 3, 54, [176, 182, 190]);
  for (let y = oy + 6; y < oy + 58; y += 3) rect(ox + 63, y, 3, 1, [214, 219, 225]);
  // paddles and ball
  ellipse(ox + 30, oy + 22, 6, 5, [186, 46, 46]);
  rect(ox + 29, oy + 26, 3, 6, [150, 110, 70]);
  ellipse(ox + 96, oy + 40, 6, 5, [186, 46, 46]);
  rect(ox + 95, oy + 34, 3, 6, [150, 110, 70]);
  ellipse(ox + 76, oy + 20, 3, 2, [252, 252, 248]);
}

// ---------- charcoal kettle BBQ: rows 6-7, cols 6-7 (64x64) ----------
{
  const ox = TILE * 6, oy = TILE * 6;
  softShadowRect(ox + 10, oy + 48, 40, 6, 90);
  // legs and wheels
  for (const [lx, ly] of [[13, 42], [39, 42]]) rect(ox + lx, oy + ly, 4, 10, [40, 42, 46]);
  ellipse(ox + 15, oy + 52, 4, 3, [26, 27, 31]);
  ellipse(ox + 41, oy + 52, 4, 3, [26, 27, 31]);
  // raised lid, hinged at the back
  ellipse(ox + 27, oy + 14, 17, 9, [30, 31, 36]);
  ellipse(ox + 27, oy + 13, 15, 7, [48, 50, 56]);
  rect(ox + 25, oy + 4, 5, 3, [70, 73, 80]);            // lid handle
  // kettle bowl
  ellipse(ox + 27, oy + 34, 19, 11, [24, 25, 29]);
  ellipse(ox + 27, oy + 33, 17, 9, [16, 17, 20]);
  // grate with glowing coals
  for (let i = 0; i < 6; i++) rect(ox + 12 + i * 5, oy + 27, 1, 12, [96, 99, 106], 210);
  for (const [gx, gy] of [[20, 31], [26, 34], [33, 30], [23, 37], [31, 37], [28, 29]]) {
    px(ox + gx, oy + gy, 255, 140, 40, 255);
    px(ox + gx + 1, oy + gy, 255, 90, 20, 220);
    px(ox + gx, oy + gy - 1, 255, 200, 90, 160);
  }
  // side shelf
  vgrad(ox + 46, oy + 28, 14, 4, [90, 94, 102], [58, 61, 68]);
  rect(ox + 47, oy + 32, 2, 8, [40, 42, 46]);
}

// ---------- 1-tile wall art + ornaments: row 3, idx 26-31 ----------
function frame(ox, oy, w, h, border, fill) {
  const x0 = ox + Math.round((32 - w) / 2), y0 = oy + Math.round((32 - h) / 2);
  rect(x0, y0, w, h, border);
  rect(x0 + 2, y0 + 2, w - 4, h - 4, fill);
  return [x0, y0, w, h];
}
{
  const oy = TILE * 3;
  // idx 26: bold abstract colour-block canvas
  {
    const ox = TILE * 2;
    const [x0, y0, w, h] = frame(ox, oy, 20, 24, [46, 40, 34], [240, 238, 232]);
    rect(x0 + 2, y0 + 2, 16, 8, [232, 92, 76]);
    rect(x0 + 2, y0 + 10, 8, 10, [64, 138, 200]);
    rect(x0 + 10, y0 + 12, 8, 8, [244, 190, 60]);
  }
  // idx 27: dark photographic print
  {
    const ox = TILE * 3;
    const [x0, y0] = frame(ox, oy, 18, 22, [30, 31, 36], [22, 26, 38]);
    ellipse(x0 + 9, y0 + 9, 4, 4, [220, 210, 190], 220);
    rect(x0 + 2, y0 + 14, 14, 6, [44, 52, 70]);
  }
  // idx 28: neon-outline geometric panel
  {
    const ox = TILE * 4;
    const [x0, y0, w, h] = frame(ox, oy, 22, 22, [18, 18, 21], [12, 12, 14]);
    for (let i = 0; i < 3; i++) {
      const inset = 3 + i * 3;
      const a = 255 - i * 60;
      rect(x0 + inset, y0 + inset, w - inset * 2, 1, NEON, a);
      rect(x0 + inset, y0 + h - inset - 1, w - inset * 2, 1, NEON, a);
    }
  }
  // idx 29: small square photo
  {
    const ox = TILE * 5;
    const [x0, y0] = frame(ox, oy, 14, 14, [58, 50, 42], [206, 220, 214]);
    rect(x0 + 2, y0 + 7, 10, 5, [92, 150, 110]);
    ellipse(x0 + 5, y0 + 5, 2, 2, [244, 214, 120]);
  }
  // idx 30: round mirror
  {
    const ox = TILE * 6;
    ellipse(ox + 16, oy + 16, 11, 11, [70, 73, 80]);
    ellipse(ox + 16, oy + 16, 9, 9, [206, 216, 224]);
    ellipse(ox + 13, oy + 13, 4, 4, [238, 244, 248], 210);
  }
  // idx 31: framed studio logo mark, white on dark
  {
    const ox = TILE * 7;
    const [x0, y0, w, h] = frame(ox, oy, 22, 22, [40, 40, 44], [14, 14, 17]);
    const cx = x0 + w / 2, cy = y0 + h / 2;
    for (let i = -6; i <= 6; i++) px(Math.round(cx + i), Math.round(cy - 3 - Math.abs(i) * 0.25), 245, 245, 245);
    for (let i = 0; i <= 9; i++) px(Math.round(cx + 3 - i * 0.8), Math.round(cy - 1 + i), 245, 245, 245);
    for (let i = 0; i <= 6; i++) px(Math.round(cx + 4 + i * 0.3), Math.round(cy + i), 245, 245, 245);
  }
}

// ---------- 2-tall ornaments: rows 8-9 ----------
// idx 64/72: abstract sculpture on a pedestal
{
  const ox = 0, oy = TILE * 8;
  softShadowRect(ox + 9, oy + 54, 15, 5, 90);
  vgrad(ox + 10, oy + 38, 13, 18, OFFWHITE, OFFWHITE_D);   // pedestal
  rect(ox + 9, oy + 36, 15, 3, [250, 251, 253]);
  // solid bronze form resting on the pedestal, split down the middle
  rect(ox + 13, oy + 32, 6, 5, [150, 116, 60]);            // foot, joins the plinth
  ellipse(ox + 16, oy + 23, 7, 12, [176, 138, 74]);
  ellipse(ox + 14, oy + 21, 4, 8, [214, 180, 116], 170);   // lit face
  for (let y = oy + 14; y < oy + 33; y++) px(ox + 18, y, 116, 88, 44, 230);
  for (let y = oy + 16; y < oy + 31; y++) px(ox + 19, y, 138, 104, 52, 190);
}
// idx 65/73: floor lamp
{
  const ox = TILE, oy = TILE * 8;
  softShadowRect(ox + 10, oy + 54, 13, 4, 85);
  ellipse(ox + 16, oy + 55, 7, 3, [56, 58, 64]);           // base
  rect(ox + 15, oy + 26, 2, 30, [78, 81, 88]);             // pole
  // cone shade with a warm glow underneath
  for (let y = 0; y < 14; y++) {
    const halfW = 5 + y;
    vgrad(ox + 16 - halfW, oy + 10 + y, halfW * 2, 1, [58, 61, 68], [40, 42, 48]);
  }
  for (let y = 0; y < 6; y++) {
    const halfW = 17 - y * 2;
    rect(ox + 16 - halfW, oy + 24 + y, halfW * 2, 1, [255, 226, 150], 70 - y * 10);
  }
  rect(ox + 8, oy + 23, 17, 2, [255, 236, 186], 220);
}
// idx 66/74: tall vase with dried pampas
{
  const ox = TILE * 2, oy = TILE * 8;
  softShadowRect(ox + 10, oy + 54, 13, 4, 85);
  vgrad(ox + 11, oy + 34, 11, 22, [214, 206, 192], [166, 158, 144]);
  rect(ox + 11, oy + 34, 11, 2, [232, 226, 214]);
  rect(ox + 13, oy + 36, 2, 17, [238, 233, 223], 120);
  for (const [angle, len] of [[-1.9, 22], [-1.57, 26], [-1.25, 22], [-2.2, 17], [-0.95, 17]]) {
    for (let i = 4; i < len; i++) {
      const x = Math.round(ox + 16 + Math.cos(angle) * i);
      const y = Math.round(oy + 36 + Math.sin(angle) * i);
      px(x, y, 206, 190, 162);
      if (i > len * 0.55) { px(x + 1, y, 224, 212, 188, 200); px(x - 1, y, 224, 212, 188, 160); }
    }
  }
}

// ---------- modern kitchen counter, seen from above, running vertically ----------
// Three 2-tile-wide segments (north cap / repeatable middle / south cap) plus two overlays.
const STONE_T = [232, 234, 236];
const STONE_B = [206, 209, 213];
const CAB_EDGE = [46, 48, 54];

function counterSurface(ox, oy, y0, h) {
  // Shaded left-to-right, never top-to-bottom: a vertical gradient would restart on every
  // segment and show as banding where the tiles meet.
  for (let x = 0; x < 58; x++) {
    const t = x / 57;
    const c = [
      Math.round(STONE_T[0] + (STONE_B[0] - STONE_T[0]) * t),
      Math.round(STONE_T[1] + (STONE_B[1] - STONE_T[1]) * t),
      Math.round(STONE_T[2] + (STONE_B[2] - STONE_T[2]) * t),
    ];
    rect(ox + 3 + x, oy + y0, 1, h, c);
  }
  // speckled quartz
  for (let y = oy + y0; y < oy + y0 + h; y++) {
    for (let x = ox + 3; x < ox + 61; x++) {
      if ((x * 7 + y * 13) % 23 === 0) px(x, y, 186, 190, 196, 120);
    }
  }
  rect(ox + 1, oy + y0, 2, h, CAB_EDGE);        // against the wall
  rect(ox + 61, oy + y0, 2, h, CAB_EDGE);       // room-facing cabinet edge
  rect(ox + 59, oy + y0, 2, h, [176, 180, 186], 160);
}
// idx 67,68: north cap
{
  const ox = TILE * 3, oy = TILE * 8;
  counterSurface(ox, oy, 5, 27);
  rect(ox + 1, oy + 3, 62, 3, CAB_EDGE);
  rect(ox + 3, oy + 5, 58, 1, [250, 251, 252], 190);
}
// idx 75,76: repeatable middle
{
  const ox = TILE * 3, oy = TILE * 9;
  counterSurface(ox, oy, 0, 32);
}
// idx 69,70: south cap
{
  const ox = TILE * 5, oy = TILE * 8;
  counterSurface(ox, oy, 0, 25);
  rect(ox + 1, oy + 25, 62, 3, CAB_EDGE);
  softShadowRect(ox + 3, oy + 28, 58, 3, 70);
}
// idx 71: sink basin
{
  const ox = TILE * 7, oy = TILE * 8;
  rect(ox + 5, oy + 9, 22, 17, [150, 155, 161]);
  rect(ox + 7, oy + 11, 18, 13, [116, 121, 128]);
  rect(ox + 7, oy + 11, 18, 1, [92, 96, 103]);
  ellipse(ox + 16, oy + 18, 2, 2, [70, 74, 80]);          // drain
  rect(ox + 14, oy + 4, 4, 6, [178, 183, 190]);           // faucet body
  rect(ox + 14, oy + 4, 4, 1, [212, 216, 222]);
  rect(ox + 16, oy + 7, 5, 2, [178, 183, 190]);           // spout
}
// idx 77: espresso machine
{
  const ox = TILE * 5, oy = TILE * 9;
  softShadowRect(ox + 8, oy + 24, 16, 3, 80);
  vgrad(ox + 7, oy + 5, 18, 20, [58, 61, 68], [30, 32, 37]);
  rect(ox + 7, oy + 5, 18, 2, [86, 90, 98]);
  rect(ox + 10, oy + 9, 12, 6, [20, 21, 25]);             // group head recess
  rect(ox + 13, oy + 15, 6, 5, [214, 218, 224]);          // cup
  px(ox + 22, oy + 7, NEON[0], NEON[1], NEON[2]);         // power LED
  px(ox + 23, oy + 7, NEON[0], NEON[1], NEON[2]);
}

// ---------- counter-top items, each 2 tiles wide so they centre on the counter ----------
// The counter is two tiles across, so a one-tile item always reads as off to one side.
// idx 80,81: sink
{
  const ox = 0, oy = TILE * 10;
  rect(ox + 18, oy + 9, 28, 18, [150, 155, 161]);
  rect(ox + 20, oy + 11, 24, 14, [116, 121, 128]);
  rect(ox + 20, oy + 11, 24, 1, [92, 96, 103]);
  ellipse(ox + 32, oy + 18, 2, 2, [70, 74, 80]);
  rect(ox + 30, oy + 3, 4, 7, [178, 183, 190]);
  rect(ox + 30, oy + 3, 4, 1, [212, 216, 222]);
  rect(ox + 32, oy + 7, 6, 2, [178, 183, 190]);
}
// idx 82,83: espresso machine with two cups
{
  const ox = TILE * 2, oy = TILE * 10;
  softShadowRect(ox + 20, oy + 26, 24, 3, 80);
  vgrad(ox + 19, oy + 4, 26, 22, [58, 61, 68], [30, 32, 37]);
  rect(ox + 19, oy + 4, 26, 2, [86, 90, 98]);
  rect(ox + 23, oy + 9, 18, 7, [20, 21, 25]);
  rect(ox + 25, oy + 17, 6, 5, [222, 226, 232]);
  rect(ox + 34, oy + 17, 6, 5, [222, 226, 232]);
  px(ox + 41, oy + 6, NEON[0], NEON[1], NEON[2]);
  px(ox + 42, oy + 6, NEON[0], NEON[1], NEON[2]);
}
// idx 84,85: fruit bowl
{
  // sits 5px lower than the other items so the fruit clears the counter's top edge
  const ox = TILE * 4, oy = TILE * 10 + 5;
  softShadowRect(ox + 20, oy + 25, 24, 3, 75);
  ellipse(ox + 32, oy + 19, 15, 8, [226, 229, 233]);
  ellipse(ox + 32, oy + 18, 13, 6, [246, 248, 250]);
  ellipse(ox + 25, oy + 14, 4, 4, [226, 118, 40]);      // orange
  ellipse(ox + 33, oy + 13, 5, 4, [198, 52, 48]);       // apple
  ellipse(ox + 40, oy + 15, 4, 3, [236, 196, 60]);      // lemon
  for (const [gx, gy] of [[29, 10], [32, 9], [35, 10], [31, 12], [34, 12]]) {
    ellipse(ox + gx, oy + gy, 2, 2, [124, 86, 168]);    // grapes
  }
  ellipse(ox + 27, oy + 12, 2, 1, [96, 168, 72], 220);  // leaf
}
// idx 86,87: snack tray
{
  const ox = TILE * 6, oy = TILE * 10;
  softShadowRect(ox + 18, oy + 24, 28, 3, 75);
  rect(ox + 17, oy + 10, 30, 14, [206, 186, 154]);
  rect(ox + 19, oy + 12, 26, 10, [232, 216, 188]);
  rect(ox + 17, oy + 10, 30, 1, [232, 216, 188]);
  for (const [cx, cy] of [[24, 15], [31, 15], [38, 15]]) {
    ellipse(ox + cx, oy + cy, 3, 3, [176, 130, 78]);    // cookies
    px(ox + cx - 1, oy + cy, 118, 84, 48);
    px(ox + cx + 1, oy + cy + 1, 118, 84, 48);
  }
  rect(ox + 22, oy + 19, 20, 3, [238, 200, 128]);       // pastry strip
  rect(ox + 22, oy + 19, 20, 1, [250, 226, 176]);
}

// ---------- framed studio logo, 2x2 (idx 88,89 / 96,97) ----------
{
  const { logoCoverage, fitLogoBox } = require("./logo-mark.cjs");
  const ox = 0, oy = TILE * 11;
  rect(ox + 3, oy + 3, 58, 58, [44, 45, 50]);           // frame
  rect(ox + 6, oy + 6, 52, 52, [14, 15, 17]);           // mount
  rect(ox + 6, oy + 6, 52, 1, [70, 72, 78], 160);
  const cov = logoCoverage(fitLogoBox(ox + 32, oy + 32, 48, 44));
  for (const [key, c] of cov) {
    const [x, y] = key.split(",").map(Number);
    px(x, y, 248, 249, 250, Math.round(255 * c));
  }
}

// ---------- nine-slice area rug (rows 13-15, cols 0-2) ----------
// Nine slices rather than one tile so a rug can be laid at any size. The lattice pattern
// has an 8px period, which divides 32 exactly, so it carries across tile seams unbroken.
const RUG_BASE = [202, 197, 188];
const RUG_LIGHT = [214, 210, 202];
const RUG_LINE = [168, 162, 152];

function rugTile(col, row, top, right, bottom, left) {
  const ox = col * TILE, oy = (13 + row) * TILE;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      // absolute position inside the rug, so the lattice never breaks at a seam
      const ax = ox + x, ay = oy + y;
      const lattice = (ax + ay) % 8 === 0 || (ax - ay + 256) % 8 === 0;
      const c = lattice ? RUG_LIGHT : RUG_BASE;
      px(ox + x, oy + y, c[0], c[1], c[2]);
    }
  }
  // classic double-line border, drawn only on the rug's outer sides
  const band = (side) => {
    for (const inset of [1, 5]) {
      if (side === "top") rect(ox, oy + inset, TILE, 1, RUG_LINE);
      if (side === "bottom") rect(ox, oy + TILE - 1 - inset, TILE, 1, RUG_LINE);
      if (side === "left") rect(ox + inset, oy, 1, TILE, RUG_LINE);
      if (side === "right") rect(ox + TILE - 1 - inset, oy, 1, TILE, RUG_LINE);
    }
  };
  if (top) band("top");
  if (bottom) band("bottom");
  if (left) band("left");
  if (right) band("right");
  // soften the outermost row/column so the rug edge reads as fabric, not a hard cut
  if (top) rect(ox, oy, TILE, 1, RUG_LINE, 120);
  if (bottom) rect(ox, oy + TILE - 1, TILE, 1, RUG_LINE, 120);
  if (left) rect(ox, oy, 1, TILE, RUG_LINE, 120);
  if (right) rect(ox + TILE - 1, oy, 1, TILE, RUG_LINE, 120);
}
rugTile(0, 0, true, false, false, true);    // 104 top-left
rugTile(1, 0, true, false, false, false);   // 105 top
rugTile(2, 0, true, true, false, false);    // 106 top-right
rugTile(0, 1, false, false, false, true);   // 112 left
rugTile(1, 1, false, false, false, false);  // 113 centre
rugTile(2, 1, false, true, false, false);   // 114 right
rugTile(0, 2, false, false, true, true);    // 120 bottom-left
rugTile(1, 2, false, false, true, false);   // 121 bottom
rugTile(2, 2, false, true, true, false);    // 122 bottom-right

// ---------- round cafe table, 2x2 (idx 107,108 / 115,116) ----------
{
  const ox = TILE * 3, oy = TILE * 13;
  // The top hides most of the base: only a few pixels of pedestal and foot show below its
  // lower edge (oy+42), otherwise the base reads as a dark blob detached from the table.
  shadow(ox + 32, oy + 47, 12, 3, 85);
  rect(ox + 30, oy + 34, 4, 11, [78, 81, 88]);           // pedestal
  ellipse(ox + 32, oy + 45, 8, 3, [96, 100, 108]);       // foot
  ellipse(ox + 32, oy + 28, 22, 16, [214, 210, 204]);    // top, underside
  ellipse(ox + 32, oy + 26, 22, 16, OFFWHITE);
  ellipse(ox + 24, oy + 20, 8, 5, [250, 251, 252], 150); // sheen
  // a mug and a small plant on it
  ellipse(ox + 24, oy + 26, 4, 3, [232, 236, 240]);
  ellipse(ox + 24, oy + 25, 3, 2, [120, 84, 56]);
  rect(ox + 38, oy + 22, 7, 7, POT_LIGHT);
  ellipse(ox + 41, oy + 19, 5, 4, LEAF_M);
  ellipse(ox + 40, oy + 18, 3, 2, LEAF_L, 190);
}

// ---------- upholstered stool (idx 109) ----------
{
  const ox = TILE * 5, oy = TILE * 13;
  softShadowRect(ox + 10, oy + 24, 13, 4, 90);
  for (const lx of [11, 20]) rect(ox + lx, oy + 18, 2, 7, [92, 74, 52]);
  ellipse(ox + 16, oy + 17, 10, 6, [22, 148, 142]);
  ellipse(ox + 16, oy + 15, 10, 6, [30, 176, 168]);
  ellipse(ox + 13, oy + 13, 4, 2, [110, 220, 212], 170);
}

const outPath = path.join(__dirname, "..", "tilesets", "Modern_Decor.png");
fs.writeFileSync(outPath, PNG.sync.write(png));
console.log("Wrote", outPath, `${png.width}x${png.height}`);
