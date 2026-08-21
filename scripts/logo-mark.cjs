// Single source of truth for the studio's rooster logo, traced from the vector artwork.
//
// The mark is NOT a uniform line drawing. It is two kinds of geometry:
//   * the wing/leaf is a FILLED closed shape, with a sharp V notch cut into its top edge
//     that splits it into two lobes
//   * the bar, the leg and the hanging loop are one thick stroke of constant width
// Drawing the wing as an outline (which is what the neon sign does) loses the mark's
// weight, so both are rendered here and composited into one coverage map.
//
// All coordinates are normalised into a 0..1 box measured off the artwork, whose bounding
// box is 590x472 -- callers must preserve that aspect or the shape skews.
const ASPECT = 590 / 472;

// Wing: closed path, filled. Each entry is a quadratic bezier [from, control, to].
const WING = [
  [[0.005, 0.095], [0.190, 0.015], [0.432, 0.036]],   // top edge sweeping right
  [[0.432, 0.036], [0.442, 0.075], [0.449, 0.117]],   // notch, cutting down
  [[0.449, 0.117], [0.485, 0.055], [0.525, 0.011]],   // notch, rising to the peak
  [[0.525, 0.011], [0.700, 0.075], [0.771, 0.303]],   // outer edge falling to the right
  [[0.771, 0.303], [0.560, 0.372], [0.373, 0.407]],   // underside running back left
  // Near-straight, very slightly concave: bulging this control point downward is what
  // turns the wing from a slim crescent into a blob.
  [[0.373, 0.407], [0.172, 0.238], [0.005, 0.095]],   // back up to the tip
];

// Thick stroke pieces, given as centre lines.
const BAR = [[0.376, 0.407], [0.660, 0.381], [0.953, 0.356]];
const LEG = [[0.398, 0.417], [0.330, 0.700], [0.263, 0.960]];
const LOOP = [
  [[0.780, 0.439], [0.960, 0.560], [0.949, 0.735]],
  [[0.949, 0.735], [0.938, 0.880], [0.881, 0.951]],
  [[0.881, 0.951], [0.820, 0.880], [0.797, 0.735]],
  [[0.797, 0.735], [0.775, 0.570], [0.780, 0.439]],
];
const STROKE_W = 0.085;   // as a fraction of the box height

function qbez(p0, p1, p2, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    pts.push([
      u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
      u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    ]);
  }
  return pts;
}

function flatten(segments, box, steps = 24) {
  const map = (p) => [box.x + p[0] * box.w, box.y + p[1] * box.h];
  const out = [];
  for (const [p0, p1, p2] of segments) {
    const pts = qbez(map(p0), map(p1), map(p2), steps);
    for (let i = out.length ? 1 : 0; i < pts.length; i++) out.push(pts[i]);
  }
  return out;
}

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x0) * dx + (py - y0) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

function nearPolyline(px, py, pts, half) {
  for (let i = 0; i < pts.length - 1; i++) {
    if (distToSegment(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= half) return true;
  }
  return false;
}

// Rasterises the whole mark into the given pixel box, returning a Map of "x,y" -> coverage
// in 0..1. Coverage comes from 4x4 supersampling, which anti-aliases the filled wing and
// the thick strokes with one consistent rule.
function logoCoverage(box, ss = 4) {
  const wing = flatten(WING, box);
  const bar = flatten([[BAR[0], BAR[1], BAR[2]]], box);
  const leg = flatten([[LEG[0], LEG[1], LEG[2]]], box);
  const loop = flatten(LOOP, box);
  const half = (STROKE_W * box.h) / 2;

  const x0 = Math.floor(box.x - half - 2), x1 = Math.ceil(box.x + box.w + half + 2);
  const y0 = Math.floor(box.y - half - 2), y1 = Math.ceil(box.y + box.h + half + 2);

  const cov = new Map();
  const step = 1 / ss;
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      let hits = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const cx = px + (sx + 0.5) * step;
          const cy = py + (sy + 0.5) * step;
          if (
            pointInPolygon(cx, cy, wing) ||
            nearPolyline(cx, cy, bar, half) ||
            nearPolyline(cx, cy, leg, half) ||
            nearPolyline(cx, cy, loop, half)
          ) hits++;
        }
      }
      if (hits > 0) cov.set(px + "," + py, hits / (ss * ss));
    }
  }
  return cov;
}

// Largest box with the artwork's aspect that fits inside w x h, centred on (cx, cy).
function fitLogoBox(cx, cy, w, h) {
  let bw = w, bh = w / ASPECT;
  if (bh > h) { bh = h; bw = h * ASPECT; }
  return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
}

// Kept for the neon script, which is genuinely stroke-based.
function strokeCoverage(polylines, width) {
  const half = width / 2;
  const pad = Math.ceil(half) + 1;
  const cov = new Map();
  for (const pts of polylines) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      for (let py = Math.floor(Math.min(ay, by)) - pad; py <= Math.ceil(Math.max(ay, by)) + pad; py++) {
        for (let px = Math.floor(Math.min(ax, bx)) - pad; px <= Math.ceil(Math.max(ax, bx)) + pad; px++) {
          const c = half + 0.5 - distToSegment(px + 0.5, py + 0.5, ax, ay, bx, by);
          if (c <= 0) continue;
          const clamped = c > 1 ? 1 : c;
          const key = px + "," + py;
          if ((cov.get(key) || 0) < clamped) cov.set(key, clamped);
        }
      }
    }
  }
  return cov;
}

function discCoverage(cov, cx, cy, r) {
  for (let py = Math.floor(cy - r - 1); py <= Math.ceil(cy + r + 1); py++) {
    for (let px = Math.floor(cx - r - 1); px <= Math.ceil(cx + r + 1); px++) {
      const c = r + 0.5 - Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
      if (c <= 0) continue;
      const clamped = c > 1 ? 1 : c;
      const key = px + "," + py;
      if ((cov.get(key) || 0) < clamped) cov.set(key, clamped);
    }
  }
  return cov;
}

module.exports = { logoCoverage, fitLogoBox, strokeCoverage, discCoverage, qbez, ASPECT };
