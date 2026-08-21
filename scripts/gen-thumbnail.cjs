// Builds the 512x512 thumbnail WorkAdventure shows for the map, from the full render.
// Downscales with box-filter averaging so the pixel art stays legible instead of aliasing.
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const SIZE = 512;
const BG = [38, 39, 43];

const src = PNG.sync.read(fs.readFileSync(path.join(__dirname, "..", "home-office.preview.png")));
const scale = Math.min(SIZE / src.width, SIZE / src.height);
const dw = Math.round(src.width * scale);
const dh = Math.round(src.height * scale);
const offX = Math.floor((SIZE - dw) / 2);
const offY = Math.floor((SIZE - dh) / 2);

const out = new PNG({ width: SIZE, height: SIZE });
for (let i = 0; i < out.data.length; i += 4) {
  out.data[i] = BG[0]; out.data[i + 1] = BG[1]; out.data[i + 2] = BG[2]; out.data[i + 3] = 255;
}

for (let y = 0; y < dh; y++) {
  for (let x = 0; x < dw; x++) {
    // average the source pixels this destination pixel covers
    const sx0 = Math.floor(x / scale), sx1 = Math.min(src.width, Math.ceil((x + 1) / scale));
    const sy0 = Math.floor(y / scale), sy1 = Math.min(src.height, Math.ceil((y + 1) / scale));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = sy0; sy < sy1; sy++) {
      for (let sx = sx0; sx < sx1; sx++) {
        const si = (sy * src.width + sx) * 4;
        const sa = src.data[si + 3] / 255;
        r += src.data[si] * sa; g += src.data[si + 1] * sa; b += src.data[si + 2] * sa;
        a += sa; n++;
      }
    }
    if (n === 0) continue;
    const cov = a / n;
    const di = ((offY + y) * SIZE + (offX + x)) * 4;
    out.data[di] = Math.round((r / n) / (cov || 1) * cov + BG[0] * (1 - cov));
    out.data[di + 1] = Math.round((g / n) / (cov || 1) * cov + BG[1] * (1 - cov));
    out.data[di + 2] = Math.round((b / n) / (cov || 1) * cov + BG[2] * (1 - cov));
    out.data[di + 3] = 255;
  }
}

const outPath = path.join(__dirname, "..", "home-office-thumb.png");
fs.writeFileSync(outPath, PNG.sync.write(out));
console.log(`Wrote ${outPath} (${SIZE}x${SIZE}, map drawn at ${dw}x${dh})`);
