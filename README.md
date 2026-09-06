# 直到地极 · An interactive map of the Acts of the Apostles

A 3D relief map of the world the book of Acts moves through: 63 places, the four
itineraries drawn over real terrain, and the Roman provinces as they stood
around AD 50. Simplified Chinese, Traditional Chinese and English.

It is a sibling of [messiah-land-map](https://github.com/Artlands/messiah-land-map)
and reuses most of its engine — the projection and the Google-Earth-style pointer
controls, the canvas terrain renderer, the greedy label declutter, and the
three-way script toggle that converts the DOM after each render. What is new here
is the journeys layer and a frame twenty times wider.

## The map at a glance

* **Terrain** — NASA SRTM 90 m, sampled on a 0.1° (~11 km) grid, 32,886 nodes,
  drawn as a depth-sorted mesh with hillshading from the true surface gradient.
  Heights are exaggerated 20×; at this width they would otherwise be invisible.
* **No coastline vector.** SRTM is a land model and reports open water as zero,
  so the zero-metre contour *is* the shore. That is the one change that lets the
  map span a sea full of islands without carrying a shapefile — the Israel map
  needed a digitised coast because its frame had one monotone shoreline in it.
* **Provinces** — hand-authored rings, tinted by standing (Italy, senatorial,
  imperial, client kingdom). They are generous blobs rather than surveyed
  borders, which is affordable because only dry cells are tinted: wherever a ring
  runs out over water, the sea trims it.
* **Journeys** — each itinerary is a list of gazetteer ids, resampled at 0.15°
  and draped over the ground. Acts names the stops, not the tracks, so an
  overland leg follows the Roman road that joined two towns and a sea leg the
  shortest sensible course. Pick a journey from the legend or the filter bar and
  the other three drop back.

## Running it

```
npm install
npm run dev            # vite dev server
npm run build:static   # static bundle into dist-static/
```

`npm run build:dem` refetches `app/dem.ts` from the public OpenTopoData API. It
paces itself at one call a second and takes about six minutes, and it only needs
running if the bounds or the grid step change.

`npm run build:zh` regenerates `app/zh-hant.ts` after any Chinese text changes —
it derives a Simplified→Traditional table from OpenCC covering only this site's
vocabulary, so the 6 MB of OpenCC dictionaries never reach the browser.

## Checks

CI runs all of these, and they are worth running before a commit:

| command | what it holds |
| --- | --- |
| `npm run verify` | DEM grid alignment against surveyed landmarks, no dry land below sea level outside the Jordan rift, every place inside the frame, every journey stop resolving |
| `npm run check:view` | markers sit *on* the mesh, cursor-anchored zoom holds within half a pixel in both projections, itineraries stay in frame, the exaggeration figure quoted in the prose matches `EXAGGERATION` |
| `npm run check:en` | every user-visible Chinese string has an English form in `app/en.json`, and nothing in the table is stale |
| `npm run lint` | `tsc --noEmit` |

## Layout

```
app/dem.ts        generated elevation grid (base64 Int16, ~88 KB)
app/geo.ts        provinces, region labels, seas, peaks — hand-authored
app/places.ts     the gazetteer and the four itineraries
app/terrain.ts    projection, palette, sea mask, the canvas renderer
app/page.tsx      the whole UI, one client component
app/en.json       Chinese → English lookup, keyed by the simplified source text
```

## Sources and caveats

Elevation from [NASA SRTM](https://www.earthdata.nasa.gov/data/instruments/srtm)
via [OpenTopoData](https://www.opentopodata.org/datasets/srtm/). Negative
elevations outside the Jordan rift are floored at 1 m so that the Qattara
Depression is not drawn as a lake.

At 11 km per grid cell, small islands vanish: four gazetteer sites — Cauda and
its neighbours among them — land in what the model calls open water. Provincial
borders and ancient place names are educational approximations, and the route
lines show the order of travel, not surveyed tracks.
