// Upscales a tileset PNG onto an opaque background with real alpha compositing,
// plus a tile grid, so sprites can be judged the way the map will actually draw them.
// Usage: node preview-tileset.cjs <sheet.png> <out.png> [scale] [bgHex]
const fs = require("fs");
const { PNG } = require("pngjs");

const [, , inPath, outPath, scaleArg, bgArg] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node preview-tileset.cjs <sheet.png> <out.png> [scale] [bgHex]");
  process.exit(1);
}
const scale = parseInt(scaleArg || "7", 10);
const bgHex = (bgArg || "dcdfe3").replace("#", "");
const BG = [
  parseInt(bgHex.slice(0, 2), 16),
  parseInt(bgHex.slice(2, 4), 16),
  parseInt(bgHex.slice(4, 6), 16),
];

const src = PNG.sync.read(fs.readFileSync(inPath));
const out = new PNG({ width: src.width * scale, height: src.height * scale });

for (let y = 0; y < src.height; y++) {
  for (let x = 0; x < src.width; x++) {
    const si = (y * src.width + x) * 4;
    const a = src.data[si + 3] / 255;
    const r = Math.round(src.data[si] * a + BG[0] * (1 - a));
    const g = Math.round(src.data[si + 1] * a + BG[1] * (1 - a));
    const b = Math.round(src.data[si + 2] * a + BG[2] * (1 - a));
    for (let sy = 0; sy < scale; sy++) {
      for (let sx = 0; sx < scale; sx++) {
        const di = ((y * scale + sy) * out.width + (x * scale + sx)) * 4;
        out.data[di] = r; out.data[di + 1] = g; out.data[di + 2] = b; out.data[di + 3] = 255;
      }
    }
  }
}

// tile grid
for (let c = 0; c <= src.width / 32; c++) {
  const x = Math.min(c * 32 * scale, out.width - 1);
  for (let y = 0; y < out.height; y++) {
    const di = (y * out.width + x) * 4;
    out.data[di] = 220; out.data[di + 1] = 40; out.data[di + 2] = 40;
  }
}
for (let r = 0; r <= src.height / 32; r++) {
  const y = Math.min(r * 32 * scale, out.height - 1);
  for (let x = 0; x < out.width; x++) {
    const di = (y * out.width + x) * 4;
    out.data[di] = 220; out.data[di + 1] = 40; out.data[di + 2] = 40;
  }
}

fs.writeFileSync(outPath, PNG.sync.write(out));
console.log(`Wrote ${outPath} (${out.width}x${out.height}) bg #${bgHex}`);
