// Cuts the unused west wing (lounge, kitchen, reception) off the full map, moves the garden
// beside the office, and writes the compact home-office.tmj that actually ships. The full map stays in scripts/source and is
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
  l.objects = l.objects.filter((o) => o.x + o.width > shift);
  for (const o of l.objects) o.x -= shift;
}

// ---------- the garden moves beside the office ----------
// A 16:9 screen is wider than the office is tall, but the garden used to sit underneath
// it, which made the map too tall to fit a full-screen window without zooming out. It now
// lives in a strip west of the office, entered through a door on the terrazzo path's axis,
// and the map is cut down to the office's 15 rows: 28x15, close to 16:9.
const GARDEN = 4;
const ROWS = 15;
const midW = newW;
const finalW = midW + GARDEN;
const layers = Object.fromEntries(tileLayers(map.layers).map((l) => [l.name, l]));
const mid = Object.fromEntries(Object.values(layers).map((l) => [l.name, l.data]));
const GRASS = mid.floor1[17 * midW];

for (const l of Object.values(layers)) {
  const out = new Array(finalW * ROWS).fill(0);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < midW; x++) out[y * finalW + x + GARDEN] = mid[l.name][y * midW + x];
    if (l.name === "floor1") for (let x = 0; x < GARDEN; x++) out[y * finalW + x] = GRASS;
  }
  l.data = out;
  l.width = finalW;
  l.height = ROWS;
}
map.width = finalW;
map.height = ROWS;

const at = (name, x, y) => layers[name].data[y * finalW + x];
const put = (name, x, y, v) => { layers[name].data[y * finalW + x] = v; };
// Copies a block of the old garden (in the 24x21 coordinates above) into the strip, every
// layer but the grass and any layer named in skip.
function moveBlock(sx, sy, w, h, dx, dy, skip = []) {
  for (const name of Object.keys(layers)) {
    if (name === "floor1" || skip.includes(name)) continue;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) put(name, dx + i, dy + j, mid[name][(sy + j) * midW + sx + i]);
  }
}

// The material sheets are seamless 2x2 blocks picked by position parity, so patching a
// cell with the one two columns over keeps the texture continuous.
const DOOR_X = GARDEN, PATH_Y = 8;
for (const name of ["walls1", "wallShade", "walls2", "collisions"]) put(name, DOOR_X, PATH_Y, 0);
put("floor1", DOOR_X, PATH_Y, at("floor1", DOOR_X + 1, PATH_Y));
put("floorMat", DOOR_X, PATH_Y, at("floorMat", DOOR_X + 2, PATH_Y));
for (let x = 0; x < GARDEN; x++) put("floorMat", x, PATH_Y, at("floorMat", x + 6, PATH_Y));
// the old run of path down to the south door turns back into office floor...
for (let y = 9; y <= 13; y++)
  for (const x of [GARDEN + 1, GARDEN + 2]) put("floorMat", x, y, at("floorMat", x + 2, y));
// ...and the south door is walled up
for (const x of [GARDEN + 1, GARDEN + 2, GARDEN + 3])
  for (const name of Object.keys(layers)) put(name, x, 14, at(name, GARDEN + 4, 14));
// with no doorway beside it, the west wall now runs straight into a plain corner
const room = map.tilesets.find((t) => t.name === "WA_Room_Builder").firstgid;
put("walls1", GARDEN, 13, room + 102);   // plain side wall instead of its end cap
put("walls1", GARDEN, 14, room + 53);    // bottom-left corner

moveBlock(21, 17, 3, 4, 0, 0, ["floor2", "furniture1", "furniture2", "above1"]); // tree, without its neighbours
moveBlock(7, 17, 1, 1, 3, 2);           // fern
moveBlock(2, 18, 2, 2, 0, 5);           // barbecue; the strip is too narrow to keep its table too
// the silent corner: bench and flower bed inside the zone outline, its icon above
moveBlock(14, 17, 2, 1, 1, 10, ["floor2"]);
moveBlock(14, 18, 2, 2, 1, 11, ["floor2"]);
moveBlock(7, 17, 1, 1, 0, 13);
const edge = (x, y) => mid.floor2[y * midW + x];
for (let y = 10; y <= 14; y++)
  for (let x = 0; x < GARDEN; x++) {
    const top = y === 10, bottom = y === 14, left = x === 0, right = x === GARDEN - 1;
    let v = 0;
    if (top) v = left ? edge(13, 17) : right ? edge(19, 17) : edge(14, 17);
    else if (bottom) v = left ? edge(13, 20) : right ? edge(19, 20) : edge(14, 20);
    else if (left) v = edge(13, 18);
    else if (right) v = edge(19, 18);
    if (v) put("floor2", x, y, v);
  }
put("floor2", 0, 9, edge(12, 17));

for (const l of map.layers.filter((l) => l.type === "objectgroup")) {
  l.objects = l.objects.filter((o) => o.y < ROWS * 32 || o.name === "silentZone");
  for (const o of l.objects) {
    if (o.name === "silentZone") Object.assign(o, { x: 0, y: 10 * 32, width: GARDEN * 32, height: 5 * 32 });
    else o.x += GARDEN * 32;
  }
}

fs.writeFileSync(dst, JSON.stringify(map, null, 2));
console.log(`compact map ${finalW}x${ROWS} written`);
