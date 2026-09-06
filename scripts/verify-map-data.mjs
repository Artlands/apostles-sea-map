// Self-check for the generated map data. `node scripts/verify-map-data.mjs`
// Fails loudly if the DEM, the bounds, or a gazetteer coordinate drifts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dem_ts = readFileSync(new URL('../app/dem.ts', import.meta.url), 'utf8');
const places = readFileSync(new URL('../app/places.ts', import.meta.url), 'utf8');

const num = (re) => Number(dem_ts.match(re)[1]);
const W = num(/BOUNDS = \{ w: ([\d.-]+)/);
const E = num(/e: ([\d.-]+), s:/);
const S = num(/s: ([\d.-]+), n:/);
const N = num(/n: ([\d.-]+) \}/);
const NX = num(/DEM_NX = (\d+)/);
const NY = num(/DEM_NY = (\d+)/);
const b64 = dem_ts.match(/DEM_B64 = '([^']+)'/)[1];

const bytes = Buffer.from(b64, 'base64');
const dem = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength >> 1);
assert.equal(dem.length, NX * NY, 'DEM length must match the declared grid');

const sx = (E - W) / (NX - 1);
const sy = (N - S) / (NY - 1);
function elevation(lon, lat) {
  const fx = Math.min(NX - 1.001, Math.max(0, (lon - W) / sx));
  const fy = Math.min(NY - 1.001, Math.max(0, (N - lat) / sy));
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const i = y0 * NX + x0;
  return (dem[i] * (1 - tx) + dem[i + 1] * tx) * (1 - ty)
       + (dem[i + NX] * (1 - tx) + dem[i + NX + 1] * tx) * ty;
}

// Ground truth from published survey figures. A 5.5 km grid still smooths, so
// these windows are wide — the point is to catch a misaligned or transposed
// grid, not to second-guess the survey. The open-water rows are the strict
// ones: the whole sea mask rests on water reading as exactly 0, and Malta is
// the strict one the other way: at 11 km it was open water, and the island
// coming back is what the finer grid bought.
const landmarks = [
  ['Rome', 12.4823, 41.8930, 5, 250],
  ['Jerusalem ridge', 35.2345, 31.7784, 500, 900],
  ['Dead Sea surface', 35.4500, 31.5000, -430, -250],
  ['Anatolian plateau at Iconium', 32.4930, 37.8710, 850, 1300],
  ['Pisidian highland', 31.1830, 38.3060, 850, 1600],
  ['Nile delta', 31.0000, 30.6000, 0, 60],
  ['Malta', 14.4200, 35.8900, 20, 260],
  ['Libyan Sea, south of Crete', 24.0000, 34.0000, 0, 0],
  ['Open Aegean', 24.5000, 36.5000, 0, 0],
  ['Tyrrhenian Sea', 12.4000, 39.9000, 0, 0],
];
for (const [name, lon, lat, lo, hi] of landmarks) {
  const v = elevation(lon, lat);
  assert.ok(v >= lo && v <= hi, `${name}: DEM says ${v.toFixed(0)} m, expected ${lo}..${hi}`);
}

// Nothing outside the rift may sit below sea level, or it would be painted as
// water — and nothing anywhere may go deeper than the floor of the Dead Sea.
// The source carries bathymetry, so a rift box drawn a little too wide quietly
// preserves open seafloor instead of masking it; the depth floor is what makes
// that show up as a failure rather than as a trench in the Levant.
const DEAD_SEA_FLOOR = -800;
for (let j = 0; j < NY; j++) {
  for (let i = 0; i < NX; i++) {
    const v = dem[j * NX + i];
    if (v >= 0) continue;
    const lon = W + i * sx;
    const lat = N - j * sy;
    assert.ok(lon >= 35.25 && lon <= 35.85 && lat >= 30.9 && lat <= 33.05,
      `below sea level outside the Jordan rift at ${lon.toFixed(2)}, ${lat.toFixed(2)}: ${v} m`);
    assert.ok(v >= DEAD_SEA_FLOOR,
      `${v} m at ${lon.toFixed(2)}, ${lat.toFixed(2)} is below the floor of the Dead Sea`);
  }
}

// Every gazetteer entry must sit inside the frame and carry a unique id.
const rows = [...places.matchAll(
  /id: '([\w-]+)',[\s\S]{0,500}?lon: ([\d.-]+), lat: ([\d.-]+), elev: ([\d.-]+)/g,
)];
assert.ok(rows.length > 50, `expected the full gazetteer, parsed ${rows.length}`);
const seen = new Set();
let afloat = 0;
for (const [, id, lonS, latS] of rows) {
  const lon = +lonS, lat = +latS;
  assert.ok(!seen.has(id), `duplicate place id: ${id}`);
  seen.add(id);
  assert.ok(lon > W && lon < E && lat > S && lat < N, `${id} falls outside the map frame`);
  // The smallest islands and the harbour moles are still below one cell at
  // 5.5 km, so a site reading as water is expected — a great many of them doing
  // so is a transposed coordinate.
  if (elevation(lon, lat) <= 0) afloat++;
}
assert.ok(afloat <= 10, `${afloat} places land in open water — check the coordinates`);

// Every journey stop must name a real place, or a route would run to nowhere.
const stops = [...places.matchAll(/stops: \[([\s\S]*?)\]/g)]
  .flatMap(([, body]) => [...body.matchAll(/'([\w-]+)'/g)].map(([, id]) => id));
assert.ok(stops.length > 60, `expected the itineraries, parsed ${stops.length} stops`);
for (const id of stops) assert.ok(seen.has(id), `journey stop names an unknown place: ${id}`);

console.log(
  `ok — ${dem.length} DEM nodes, ${rows.length} places, ${stops.length} journey stops, ` +
  `${afloat} sites the grid puts offshore`,
);
