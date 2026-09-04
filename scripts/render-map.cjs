// Composites a .tmj map (all visible tile layers, including nested groups) into a single PNG,
// so we can visually inspect edits without needing Tiled or a live WorkAdventure client.
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const mapPath = process.argv[2];
const outPath = process.argv[3] || mapPath.replace(/\.tmj$/, ".preview.png");

if (!mapPath) {
  console.error("Usage: node render-map.cjs <map.tmj> [out.png]");
  process.exit(1);
}

const root = path.dirname(mapPath);
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));

const FLIP_H = 0x80000000;
const FLIP_V = 0x40000000;
const FLIP_D = 0x20000000;
const GID_MASK = ~(FLIP_H | FLIP_V | FLIP_D);

// Load all tileset images
const tilesets = map.tilesets
  .map((t) => {
    const imgPath = path.join(root, t.image);
    const png = PNG.sync.read(fs.readFileSync(imgPath));
    return { ...t, png };
  })
  .sort((a, b) => a.firstgid - b.firstgid);

function tilesetForGid(gid) {
  let found = null;
  for (const t of tilesets) {
    if (t.firstgid <= gid) found = t;
    else break;
  }
  return found;
}

const tileW = map.tilewidth;
const tileH = map.tileheight;
const mapWpx = map.width * tileW;
const mapHpx = map.height * tileH;

const out = new PNG({ width: mapWpx, height: mapHpx });
// transparent background
out.data.fill(0);

function blitTile(gid, dx, dy) {
  const rawGid = gid & GID_MASK;
  if (rawGid === 0) return;
  const flipH = !!(gid & FLIP_H);
  const flipV = !!(gid & FLIP_V);
  const ts = tilesetForGid(rawGid);
  if (!ts) return;
  const local = rawGid - ts.firstgid;
  const col = local % ts.columns;
  const row = Math.floor(local / ts.columns);
  const sx = ts.margin + col * (ts.tilewidth + ts.spacing);
  const sy = ts.margin + row * (ts.tileheight + ts.spacing);

  for (let y = 0; y < tileH; y++) {
    for (let x = 0; x < tileW; x++) {
      const srcX = flipH ? tileW - 1 - x : x;
      const srcY = flipV ? tileH - 1 - y : y;
      const si = ((sy + srcY) * ts.imagewidth + (sx + srcX)) * 4;
      const a = ts.png.data[si + 3];
      if (a === 0) continue;
      const dxp = dx + x;
      const dyp = dy + y;
      if (dxp < 0 || dyp < 0 || dxp >= mapWpx || dyp >= mapHpx) continue;
      const di = (dyp * mapWpx + dxp) * 4;
      // simple alpha-over compositing
      const sa = a / 255;
      for (let c = 0; c < 3; c++) {
        out.data[di + c] = Math.round(
          ts.png.data[si + c] * sa + out.data[di + c] * (1 - sa)
        );
      }
      out.data[di + 3] = Math.min(255, out.data[di + 3] + a);
    }
  }
}

function drawLayer(layer, offX = 0, offY = 0) {
  if (layer.visible === false) return;
  if (layer.type === "group") {
    for (const child of layer.layers) drawLayer(child, offX + (layer.offsetx || 0), offY + (layer.offsety || 0));
    return;
  }
  if (layer.type !== "tilelayer") return;
  const w = layer.width;
  const data = layer.data;
  for (let i = 0; i < data.length; i++) {
    const gid = data[i];
    if (!gid) continue;
    const tx = i % w;
    const ty = Math.floor(i / w);
    blitTile(gid, offX + (layer.x || 0) * tileW + tx * tileW, offY + (layer.y || 0) * tileH + ty * tileH);
  }
}

// Optional stand-in avatars: --avatar x,y[;x,y...]
// Drawn after the furniture layers but before the "above" group, which is exactly where
// WorkAdventure composites the player. Lets us check whether a chair reads as "sat in"
// or "stood on" without launching the real client.
const avatarArg = (process.argv.find((a) => a.startsWith("--avatar=")) || "").split("=")[1];
const avatars = avatarArg
  ? avatarArg.split(";").map((p) => p.split(",").map(Number))
  : [];

function drawAvatar(tx, ty) {
  const x0 = tx * tileW, y0 = ty * tileH;
  // rough woka proportions: head in the top 40%, body below
  for (let y = 0; y < tileH; y++) {
    for (let x = 0; x < tileW; x++) {
      const inHead = y >= 4 && y < 15 && x >= 10 && x < 22;
      const inBody = y >= 15 && y < 30 && x >= 8 && x < 24;
      if (!inHead && !inBody) continue;
      const c = inHead ? [242, 202, 168] : [220, 60, 140];
      const dxp = x0 + x, dyp = y0 + y;
      if (dxp < 0 || dyp < 0 || dxp >= mapWpx || dyp >= mapHpx) continue;
      const di = (dyp * mapWpx + dxp) * 4;
      out.data[di] = c[0]; out.data[di + 1] = c[1]; out.data[di + 2] = c[2]; out.data[di + 3] = 255;
    }
  }
}

for (const layer of map.layers) {
  if (avatars.length && layer.type === "group" && layer.name === "above") {
    for (const [ax, ay] of avatars) drawAvatar(ax, ay);
  }
  drawLayer(layer);
}

fs.writeFileSync(outPath, PNG.sync.write(out));
console.log("Wrote", outPath, `${mapWpx}x${mapHpx}`);
