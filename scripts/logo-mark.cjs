// Single source of truth for the studio's logo mark, plus the anti-aliased stroke
// rasteriser shared by every piece that draws curves (the mark and the neon script).
//
// The mark is defined in a normalised 0..1 box. Reading the reference:
//   * a long, near-horizontal lens ("leaf") across the upper half
//   * its top edge rises into a sharp triangular fin about 55% across, then drops
//   * the drop continues right and hangs into a narrow vertical teardrop
//   * a long diagonal sweeps from below the fin down to the lower left
// Control points may sit outside 0..1; that is what gives the arcs their tension.
// Coordinates traced off the reference photo and normalised. IMPORTANT: the box these are
// fitted into must keep the reference's ~4:3 aspect, otherwise the teardrop (which is
// nearly three times taller than it is wide) stretches and the mark stops reading.
// The mark is a rooster drawn as one continuous vector line: the long lens is the body,
// the spike on top is the comb, the hanging loop is the tail and the long diagonal is the
// leg. The comb is built from two near-straight segments so its vertex stays a sharp
// corner -- running a single curve through it rounds the point off and kills the read.
const PATHS = [
  [[0.018, 0.133], [0.240, 0.005], [0.480, 0.068]],   // body, upper edge
  [[0.480, 0.068], [0.520, 0.030], [0.560, 0.000]],   // comb, leading edge
  [[0.560, 0.000], [0.600, 0.042], [0.640, 0.095]],   // comb, trailing edge
  [[0.640, 0.095], [0.690, 0.155], [0.725, 0.252]],   // neck dropping to the shoulder
  [[0.018, 0.133], [0.415, 0.332], [0.725, 0.252]],   // body, belly closing on the neck
  [[0.232, 0.371], [0.580, 0.383], [0.929, 0.324]],   // long horizontal bar under the body
  [[0.725, 0.252], [0.745, 0.280], [0.750, 0.310]],   // shoulder into the tail
  [[0.750, 0.310], [1.011, 0.578], [0.829, 0.914]],   // tail, outer flank
  [[0.750, 0.310], [0.733, 0.626], [0.829, 0.914]],   // tail, inner flank
  [[0.732, 0.238], [0.460, 0.600], [0.232, 0.976]],   // leg sweeping down to the left
];

// Width-to-height ratio of the reference mark. Callers should size their box with this.
const ASPECT = 280 / 210;

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

// Returns the mark as polylines fitted into the box {x, y, w, h}, in pixel coordinates.
function logoPolylines(box, steps = 64) {
  return PATHS.map(([p0, p1, p2]) => {
    const map = (p) => [box.x + p[0] * box.w, box.y + p[1] * box.h];
    return qbez(map(p0), map(p1), map(p2), steps);
  });
}

function distToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x0) * dx + (py - y0) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

// Rasterises polylines as a stroke of the given width, returning a Map of "x,y" -> coverage
// in 0..1. Coverage comes from the true distance to the centre line, so edges land on
// fractional alpha instead of stair-stepping -- that is what stops the curves reading as
// hand-drawn at this size.
function strokeCoverage(polylines, width) {
  const half = width / 2;
  const pad = Math.ceil(half) + 1;
  const cov = new Map();
  for (const pts of polylines) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const minX = Math.floor(Math.min(x0, x1)) - pad;
      const maxX = Math.ceil(Math.max(x0, x1)) + pad;
      const minY = Math.floor(Math.min(y0, y1)) - pad;
      const maxY = Math.ceil(Math.max(y0, y1)) + pad;
      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const d = distToSegment(px + 0.5, py + 0.5, x0, y0, x1, y1);
          const c = half + 0.5 - d;
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

// Adds a filled disc (used for the dot on an "i") into an existing coverage map.
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

// Largest box with the reference's aspect that fits inside w x h, centred on (cx, cy).
function fitLogoBox(cx, cy, w, h) {
  let bw = w, bh = w / ASPECT;
  if (bh > h) { bh = h; bw = h * ASPECT; }
  return { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh };
}

module.exports = { logoPolylines, strokeCoverage, discCoverage, fitLogoBox, qbez, ASPECT };
