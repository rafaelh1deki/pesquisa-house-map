# Scripts

Everything custom in this map is generated from code, so the artwork and the layout can be
regenerated and tweaked without a pixel editor.

## Regenerating everything

```bash
node scripts/gen-personal-decor.cjs   # neon "Pesquisa House" sign, logo mat, energy can
node scripts/gen-modern-decor.cjs     # chairs, furniture, plants, kitchen, arcade, BBQ...
node scripts/apply-decor.cjs          # writes all of it into home-office.tmj
node scripts/render-map.cjs home-office.tmj home-office.preview.png
node scripts/gen-thumbnail.cjs        # 512x512 map thumbnail from the render
```

`apply-decor.cjs` is idempotent: it wipes every tile belonging to the two custom tilesets
before re-placing them, so running it twice produces a byte-identical map.

## What each file does

| File | Purpose |
| --- | --- |
| `gen-personal-decor.cjs` | Builds `tilesets/Personal_Decor.png` — the sign, the logo mat, the can. |
| `gen-modern-decor.cjs` | Builds `tilesets/Modern_Decor.png` — all the furniture and props. |
| `apply-decor.cjs` | Places every custom tile into `home-office.tmj` by absolute position. |
| `logo-mark.cjs` | The studio logo's geometry plus the anti-aliased stroke rasteriser. Shared by the mat and the framed wall piece so the two can never drift apart. |
| `script-font.cjs` | A small handwriting alphabet used to bend the neon sign's script. |
| `render-map.cjs` | Composites a `.tmj` into a flat PNG, for reviewing changes without Tiled. |
| `crop-map.cjs` | Crops a region of that render by tile coordinates, for close inspection. |
| `preview-tileset.cjs` | Previews a tileset sheet composited over an opaque background with a tile grid. |
| `gen-thumbnail.cjs` | Produces the 512x512 `mapImage` thumbnail. |

## Gotchas worth remembering

- **Tileset gid ranges must not overlap.** `Personal_Decor` and `Modern_Decor` are sized in
  `apply-decor.cjs`, which recomputes `firstgid` for the second sheet from the first one's
  tile count. Growing a sheet without that recalculation silently aliases one sheet's tiles
  onto the other's.
- **Sprites that tile vertically must not use a vertical gradient** — it restarts on every
  segment and shows up as banding at the seams. See the kitchen counter.
- **Chairs come in four orientations.** The bench-desk chairs are single sprites centred on
  the boundary between two tiles, not one chair per tile.
