// Crops a region of a rendered map PNG by TILE coordinates and upscales it.
// Usage: node crop-map.cjs <render.png> <out.png> <tx> <ty> <tw> <th> [scale]
const fs = require("fs");
const { PNG } = require("pngjs");

const [, , inPath, outPath, txA, tyA, twA, thA, scaleA] = process.argv;
const TILE = 32;
const tx = parseInt(txA, 10), ty = parseInt(tyA, 10);
const tw = parseInt(twA, 10), th = parseInt(thA, 10);
const scale = parseInt(scaleA || "4", 10);

const src = PNG.sync.read(fs.readFileSync(inPath));
const x0 = tx * TILE, y0 = ty * TILE, w = tw * TILE, h = th * TILE;
const out = new PNG({ width: w * scale, height: h * scale });

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const sx = x0 + x, sy = y0 + y;
    let r = 255, g = 255, b = 255;
    if (sx >= 0 && sy >= 0 && sx < src.width && sy < src.height) {
      const si = (sy * src.width + sx) * 4;
      const a = src.data[si + 3] / 255;
      r = Math.round(src.data[si] * a + 255 * (1 - a));
      g = Math.round(src.data[si + 1] * a + 255 * (1 - a));
      b = Math.round(src.data[si + 2] * a + 255 * (1 - a));
    }
    for (let sy2 = 0; sy2 < scale; sy2++) {
      for (let sx2 = 0; sx2 < scale; sx2++) {
        const di = ((y * scale + sy2) * out.width + (x * scale + sx2)) * 4;
        out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = 255;
      }
    }
  }
}
fs.writeFileSync(outPath, PNG.sync.write(out));
console.log(`Wrote ${outPath} tiles x${tx}..${tx + tw - 1}, y${ty}..${ty + th - 1}`);
