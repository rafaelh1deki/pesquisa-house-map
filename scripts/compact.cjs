// Cuts the unused west wing (lounge, kitchen, reception) off the full map and writes the
// compact home-office.tmj that actually ships. The full map stays in scripts/source and is
// what apply-decor.cjs edits, so the wing can be brought back by changing CUT to 0.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "source", "home-office.full.json");
const dst = path.join(__dirname, "..", "home-office.tmj");
const map = JSON.parse(fs.readFileSync(src, "utf8"));

// Columns removed from the west side. Old column CUT becomes column 0.
const CUT = 7;
// Rows above this get a fresh west wall copied from the old outer wall (column 0); rows below
// keep the old column CUT, which already is the left flank of the garden doorway.
const WALL_ROWS = 13;

const oldW = map.width;
const newW = oldW - CUT;

function tileLayers(layers, out = []) {
  for (const l of layers) {
    if (l.type === "tilelayer") out.push(l);
    if (l.layers) tileLayers(l.layers, out);
  }
  return out;
}

for (const l of tileLayers(map.layers)) {
  const old = l.data;
  const data = new Array(newW * l.height);
  for (let y = 0; y < l.height; y++)
    for (let x = 0; x < newW; x++) data[y * newW + x] = old[y * oldW + x + CUT];
  if (CUT > 0) {
    // the old outer west wall, windows included, becomes the new one
    for (let y = 0; y <= WALL_ROWS; y++) data[y * newW] = old[y * oldW];
    // daylight spill from those windows sits one column in
    if (l.name === "floorLight")
      for (let y = 0; y <= WALL_ROWS; y++) data[y * newW + 1] = old[y * oldW + 1];
  }
  l.data = data;
  l.width = newW;
}
map.width = newW;

const shift = CUT * 32;
for (const l of map.layers.filter((l) => l.type === "objectgroup")) {
  l.objects = l.objects.filter((o) => o.name === "from-conference" || o.x + o.width > shift);
  for (const o of l.objects) {
    // the arrival point moves from the reception to just outside the garden door
    if (o.name === "from-conference") o.x = 1 * 32 + (o.x % 32);
    else o.x -= shift;
  }
}

fs.writeFileSync(dst, JSON.stringify(map, null, 2));
console.log(`compact map ${newW}x${map.height} written`);
