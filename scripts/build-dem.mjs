// Fetches the elevation grid behind the map and writes app/dem.ts.
//
//     node scripts/build-dem.mjs
//
// Source: GMRT, the Global Multi-Resolution Topography synthesis, which serves a
// whole bounding box as one ESRI ASCII grid. That is the reason this map can
// afford its resolution at all. The point-query elevation APIs meter by the
// hundred-coordinate call — OpenTopoData allows a thousand calls a day and
// Open-Meteo starts returning 429s well before that — so a grid this size costs
// more than a day's quota there, and one request here.
//
// GMRT returns whatever cell size its tier gives, so the grid is resampled onto
// the STEP below. Ask for a tier at least as fine as STEP, and preferably two or
// three times finer so the resample has something to average: `high` is about
// 0.0088° and covers the 0.025° target well. The tiers roughly double each time
// — low 0.035°, med 0.018°, high 0.0088°, max 0.0044° — and so does the download,
// which is 32 MB at `high`.
//
// Halving STEP quadruples the node count, the payload and the draw cost. Measure
// before reaching for the next tier down.
//
// GMRT carries bathymetry, so open water comes back deeply negative. The
// renderer wants water flat, so anything below zero outside the Jordan rift is
// written as exactly 0 — that is the sea mask — and land is floored at 1 m so a
// low-lying coast is never mistaken for water. Inside the rift the real depth is
// kept, which is what holds the Dead Sea and the Sea of Galilee as water rather
// than as holes in the map.
import { writeFileSync } from 'node:fs';

const BOUNDS = { w: 11.5, e: 37.5, s: 30.0, n: 42.5 };
const STEP = 0.025;
const TIER = 'high';
const NX = Math.round((BOUNDS.e - BOUNDS.w) / STEP) + 1;
const NY = Math.round((BOUNDS.n - BOUNDS.s) / STEP) + 1;

/**
 * Where a negative elevation is real water rather than seafloor or a dry
 * depression: the Dead Sea, the Jordan valley and the Sea of Galilee.
 *
 * Keep it inland. An earlier, looser box reached to 33.3°N and 35.0°E, which
 * takes in open Mediterranean off the Lebanese coast — and every metre of that
 * seafloor was then preserved as if it were the Dead Sea, down to −1155 m.
 * verify-map-data.mjs now floors the whole grid at the Dead Sea's own depth so
 * that mistake cannot come back quietly.
 */
const RIFT = { w: 35.25, e: 35.85, s: 30.9, n: 33.05 };

const url = 'https://www.gmrt.org/services/GridServer'
  + `?minlongitude=${BOUNDS.w}&maxlongitude=${BOUNDS.e}`
  + `&minlatitude=${BOUNDS.s}&maxlatitude=${BOUNDS.n}`
  + `&format=esriascii&resolution=${TIER}&layer=topo`;

process.stdout.write(`fetching the ${TIER} tier… `);
const res = await fetch(url);
if (!res.ok) throw new Error(`GMRT returned HTTP ${res.status}`);
const text = await res.text();
console.log(`${(text.length / 1e6).toFixed(1)} MB`);

// --- Parse the ESRI ASCII header, then the values. Rows run north to south.
const head = {};
let cursor = 0;
for (let i = 0; i < 6; i++) {
  const end = text.indexOf('\n', cursor);
  const [key, value] = text.slice(cursor, end).trim().split(/\s+/);
  head[key.toLowerCase()] = Number(value);
  cursor = end + 1;
}
const { ncols, nrows, xllcorner, yllcorner, cellsize, nodata_value: nodata } = head;
const src = new Float32Array(ncols * nrows);
{
  let k = 0;
  for (const token of text.slice(cursor).split(/\s+/)) {
    if (token) src[k++] = Number(token);
  }
  if (k !== src.length) throw new Error(`expected ${src.length} values, parsed ${k}`);
}
console.log(`grid ${ncols}×${nrows} at ${cellsize.toFixed(5)}° (~${(cellsize * 111).toFixed(1)} km)`);
if (cellsize > STEP) {
  throw new Error(`the ${TIER} tier is coarser than STEP ${STEP}° — ask for a finer tier`);
}

/** Bilinear sample of the source grid, in metres. */
const sampleAt = (lon, lat) => {
  const fx = Math.min(ncols - 1.001, Math.max(0, (lon - xllcorner) / cellsize));
  // yllcorner is the southern edge, but row 0 of the data is the northern one.
  const fy = Math.min(nrows - 1.001, Math.max(0, (yllcorner + (nrows - 1) * cellsize - lat) / cellsize));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const i = y0 * ncols + x0;
  const q = [src[i], src[i + 1], src[i + ncols], src[i + ncols + 1]];
  // A nodata cell would poison the whole neighbourhood, so fall back to the
  // nearest real value rather than averaging the sentinel in.
  if (q.some((v) => v === nodata)) return q.find((v) => v !== nodata) ?? 0;
  return (q[0] * (1 - tx) + q[1] * tx) * (1 - ty) + (q[2] * (1 - tx) + q[3] * tx) * ty;
};

const dem = new Int16Array(NX * NY);
for (let j = 0; j < NY; j++) {
  const lat = BOUNDS.n - j * STEP;
  for (let i = 0; i < NX; i++) {
    const lon = BOUNDS.w + i * STEP;
    const v = sampleAt(lon, lat);
    const inRift = lon >= RIFT.w && lon <= RIFT.e && lat >= RIFT.s && lat <= RIFT.n;
    dem[j * NX + i] = inRift ? Math.round(v) : v < 0 ? 0 : Math.max(1, Math.round(v));
  }
}

const b64 = Buffer.from(dem.buffer, dem.byteOffset, dem.byteLength).toString('base64');
writeFileSync(new URL('../app/dem.ts', import.meta.url), `\
// AUTO-GENERATED by scripts/build-dem.mjs — do not edit by hand.
// GMRT elevations resampled onto a ${STEP}° grid. Water is written as 0.

export const BOUNDS = { w: ${BOUNDS.w}, e: ${BOUNDS.e}, s: ${BOUNDS.s}, n: ${BOUNDS.n} };
export const DEM_NX = ${NX};
export const DEM_NY = ${NY};
const DEM_B64 = '${b64}';

function decode(b64: string): Int16Array {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength >> 1);
}

/** Elevation in metres, row-major from the north-west corner. 0 means open water. */
export const DEM = decode(DEM_B64);
`);

let lo = Infinity;
let hi = -Infinity;
let sea = 0;
for (const v of dem) {
  if (v < lo) lo = v;
  if (v > hi) hi = v;
  if (v <= 0) sea++;
}
console.log(`app/dem.ts — ${NX}×${NY} = ${dem.length} nodes, ${lo}..${hi} m, ${(sea / dem.length * 100).toFixed(0)}% water`);
