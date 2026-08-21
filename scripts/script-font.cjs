// A minimal handwriting/script alphabet, just the letters the neon sign needs.
// Each glyph is a set of quadratic beziers in a local space where (0,0) is the baseline
// at the glyph's left edge and negative y goes up. Rendering these as one continuous
// stroke is what gives the sign its bent-neon-tube look, which a bitmap font cannot do.
const { qbez } = (() => {
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
  return { qbez };
})();

// glyph = { w: advance width, strokes: [[p0,p1,p2], ...], dots: [[x,y,r], ...] }
const GLYPHS = {
  P: {
    w: 13,
    strokes: [
      [[3, -19], [0, -8], [2, 3]],            // stem, flicking below the baseline
      [[3, -19], [13, -21], [11, -13]],       // bowl, upper half
      [[11, -13], [8, -8], [3, -8]],          // bowl, lower half
    ],
  },
  H: {
    w: 17,
    strokes: [
      [[0, -12], [1, -21], [4, -19]],         // entry flourish
      [[4, -19], [2, -10], [3, -1]],          // left stem
      [[3, -9], [8, -13], [13, -10]],         // linking crossbar
      [[14, -19], [12, -10], [13, -1]],       // right stem
      [[13, -1], [15, 0], [17, -3]],          // exit into the next letter
    ],
  },
  a: {
    w: 11,
    strokes: [
      [[9, -10], [3, -13], [1, -7]],
      [[1, -7], [0, -1], [6, -1]],
      [[6, -1], [9, -2], [9, -8]],
      [[9, -11], [9, -6], [9, -1]],
      [[9, -1], [11, 0], [13, -3]],
    ],
  },
  e: {
    w: 10,
    strokes: [
      [[1, -5], [5, -6], [9, -7]],            // crossbar
      [[9, -7], [9, -13], [4, -11]],
      [[4, -11], [-1, -9], [1, -4]],
      [[1, -4], [3, 0], [10, -2]],
    ],
  },
  i: {
    w: 6,
    strokes: [
      [[2, -11], [2, -6], [2, -1]],
      [[2, -1], [4, 0], [6, -3]],
    ],
    dots: [[3, -15, 1]],
  },
  o: {
    w: 11,
    strokes: [
      [[6, -11], [1, -12], [1, -6]],
      [[1, -6], [1, 0], [6, -1]],
      [[6, -1], [10, -2], [9, -8]],
      [[9, -8], [8, -12], [6, -11]],
      [[9, -8], [12, -9], [13, -6]],          // exit
    ],
  },
  q: {
    w: 11,
    strokes: [
      [[9, -11], [3, -13], [1, -7]],
      [[1, -7], [0, -1], [6, -1]],
      [[6, -1], [9, -2], [9, -9]],
      [[9, -11], [9, -2], [9, 6]],            // stem through the descender
      [[9, 6], [12, 8], [14, 5]],             // tail
    ],
  },
  s: {
    w: 9,
    strokes: [
      [[8, -9], [4, -12], [2, -9]],
      [[2, -9], [1, -6], [5, -5]],
      [[5, -5], [9, -3], [3, -1]],
      [[3, -1], [1, -1], [0, -2]],
    ],
  },
  u: {
    w: 11,
    strokes: [
      [[1, -11], [0, -3], [4, -1]],
      [[4, -1], [8, 0], [9, -8]],
      [[9, -11], [9, -6], [9, -1]],
      [[9, -1], [11, 0], [13, -3]],
    ],
  },
};

const SLANT = 0.16;   // gentle italic lean, like handwriting

// Lays a word out along a baseline and returns polylines plus dot circles, in pixel space.
function scriptWord(text, originX, baselineY, tracking = 1) {
  const polylines = [];
  const dots = [];
  let cursor = originX;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) { cursor += 6 + tracking; continue; }
    const place = ([x, y]) => [cursor + x - y * SLANT, baselineY + y];
    for (const [p0, p1, p2] of g.strokes) {
      polylines.push(qbez(place(p0), place(p1), place(p2), 26));
    }
    for (const [dx, dy, r] of g.dots || []) {
      const [px, py] = place([dx, dy]);
      dots.push([px, py, r]);
    }
    cursor += g.w + tracking;
  }
  return { polylines, dots, width: cursor - tracking - originX };
}

function measure(text, tracking = 1) {
  let w = 0;
  for (const ch of text) w += (GLYPHS[ch] ? GLYPHS[ch].w : 6) + tracking;
  return w - tracking;
}

module.exports = { scriptWord, measure, qbez };
