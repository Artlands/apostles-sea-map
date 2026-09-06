import { BOUNDS, DEM, DEM_NX, DEM_NY } from './dem';
import { regions, type StatusKey } from './geo';
import { journeys, places, type JourneyKey } from './places';

const { w: W, e: E, s: S, n: N } = BOUNDS;
const MID_LAT = ((N + S) / 2) * (Math.PI / 180);

/** Width of the frame relative to its height, corrected for the meridian convergence. */
const ASPECT = ((E - W) * Math.cos(MID_LAT)) / (N - S);
/** North–south extent of the frame, in metres. */
const SPAN_M = (N - S) * 111_320;
/**
 * Vertical exaggeration. The frame is 26° across and the tallest thing in it is
 * under 4 km, so at 1x the whole relief is a rounding error. Printed relief
 * atlases of the Mediterranean use something like 20–40x at this width; 20x
 * reads flatter than an atlas and still shows the Taurus wall Paul had to climb
 * to reach Pisidian Antioch. The labels that quote the figure are checked
 * against it by scripts/check-view.mjs, so this stays the one place to tune.
 */
export const EXAGGERATION = 20;

export const normLon = (lon: number) => (lon - W) / (E - W);
export const normLat = (lat: number) => (N - lat) / (N - S);
/** Metres above sea level → height in frame units. */
export const relief = (metres: number) => (metres / SPAN_M) * EXAGGERATION;

// ---------------------------------------------------------------- elevation

const STEP_X = (E - W) / (DEM_NX - 1);
const STEP_Y = (N - S) / (DEM_NY - 1);

/** Bilinear sample of the DEM, in metres. */
export function elevationAt(lon: number, lat: number) {
  const fx = Math.min(DEM_NX - 1.001, Math.max(0, (lon - W) / STEP_X));
  const fy = Math.min(DEM_NY - 1.001, Math.max(0, (N - lat) / STEP_Y));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const i = y0 * DEM_NX + x0;
  const a = DEM[i];
  const b = DEM[i + 1];
  const c = DEM[i + DEM_NX];
  const d = DEM[i + DEM_NX + 1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

export const elevationRange = (() => {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < DEM.length; i++) {
    if (DEM[i] < lo) lo = DEM[i];
    if (DEM[i] > hi) hi = DEM[i];
  }
  return { lo, hi };
})();

/**
 * The sea mask. The elevation model reports open water as exactly 0 and
 * scripts/build-dem.mjs floors dry land at 1 m, so the coastline needs no
 * separate vector — it is wherever this flips. That is the whole reason this
 * map can span a sea with a hundred islands in it and still carry no shapefile.
 */
export const isSea = (metres: number) => metres <= 0;

// ---------------------------------------------------------------- geometry

export type View = {
  rotation: number; tilt: number; zoom: number; perspective: boolean;
  /** Pan offset in canvas pixels, applied after the frame is fitted. */
  panX: number; panY: number;
};
export type Frame = { cx: number; cy: number; scale: number; view: View };

export type Projected = { x: number; y: number; depth: number };

function rotate(u: number, v: number, view: View) {
  const px = (u - 0.5) * ASPECT;
  const pz = v - 0.5;
  const cos = Math.cos(view.rotation);
  const sin = Math.sin(view.rotation);
  return { rx: px * cos - pz * sin, rz: px * sin + pz * cos };
}

/**
 * Eye distance for the perspective projection, in frame units — the frame is
 * ASPECT × 1, and the nearest point of it reaches about 0.6 at full tilt. Lower
 * means a wider cone and a heavier foreshortening. Tune here, nowhere else.
 */
const EYE = 2.4;

/**
 * Foreshortening at a point, 1 for the axonometric view. `rz * cos(tilt) +
 * h * sin(tilt)` is how far the point stands towards the camera along its
 * viewing axis, so near ground and high summits both grow.
 */
function foreshorten(rz: number, h: number, view: View) {
  if (!view.perspective) return 1;
  return EYE / (EYE - (rz * Math.cos(view.tilt) + h * Math.sin(view.tilt)));
}

export function project(u: number, v: number, h: number, f: Frame): Projected {
  const { rx, rz } = rotate(u, v, f.view);
  const k = foreshorten(rz, h, f.view) * f.scale;
  return {
    x: f.cx + rx * k,
    y: f.cy + (rz * Math.sin(f.view.tilt) - h * Math.cos(f.view.tilt)) * k,
    // Painter's order and haze both read the unforeshortened depth, which is
    // the same ordering either way.
    depth: rz,
  };
}

export const projectGeo = (lon: number, lat: number, h: number, f: Frame) =>
  project(normLon(lon), normLat(lat), h, f);

/**
 * Height of the drawn surface at a point, in frame units — the same height
 * `drawScene` paints the mesh at. Markers and labels anchor to this and add
 * nothing on top: a lift in frame units is a fixed altitude, not a fixed gap
 * above the ground, so it grows as a share of the relief every time
 * EXAGGERATION comes down and starts reading as a hover. A visual gap belongs
 * in CSS pixels, which no projection parameter can stretch.
 */
export const groundAt = (lon: number, lat: number) => relief(elevationAt(lon, lat));

export const ZOOM = { min: 0.7, max: 9 };
/** Tilt is measured up from a side-on view: 1.5 rad is all but straight down. */
export const TILT = { min: 0.16, max: 1.5 };

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** Keep the terrain from being dragged entirely out of the viewport. */
export const clampPan = (n: number, extent: number) => clamp(n, -extent * 0.6, extent * 0.6);

/**
 * Zoom by `factor` while holding whatever sits at canvas pixel (ax, ay) still,
 * the way a wheel over a point on the ground behaves in Google Earth.
 *
 * A projected point is `centre + pan + Q * scale`, where Q depends only on the
 * rotation and tilt, and `scale` is proportional to `zoom` while those hold. So
 * the correction is exact and needs no reprojection: shift the pan by however
 * far the anchor would otherwise have travelled. The pan clamp can pull it off
 * the anchor, but only once the view is already at the edge of its travel.
 */
export function zoomAbout(
  view: View, factor: number, ax: number, ay: number, width: number, height: number,
): View {
  const zoom = clamp(view.zoom * factor, ZOOM.min, ZOOM.max);
  const k = 1 - zoom / view.zoom;
  return {
    ...view,
    zoom,
    panX: clampPan(view.panX + (ax - width / 2 - view.panX) * k, width),
    panY: clampPan(view.panY + (ay - height / 2 - view.panY) * k, height),
  };
}

/** Fit the rotated frame to the canvas so nothing clips at any rotation. */
export function makeFrame(view: View, width: number, height: number): Frame {
  const hi = relief(elevationRange.hi);
  const lo = relief(elevationRange.lo);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const u of [0, 1]) {
    for (const v of [0, 1]) {
      for (const h of [lo, hi]) {
        const { rx, rz } = rotate(u, v, view);
        const k = foreshorten(rz, h, view);
        const x = rx * k;
        const y = (rz * Math.sin(view.tilt) - h * Math.cos(view.tilt)) * k;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const scale = Math.min(width * 0.9 / (maxX - minX), height * 0.88 / (maxY - minY)) * view.zoom;
  return {
    scale,
    cx: width / 2 - ((minX + maxX) / 2) * scale + view.panX,
    cy: height / 2 - ((minY + maxY) / 2) * scale + view.panY,
    view,
  };
}

// ---------------------------------------------------------------- palette

/** Hypsometric tint, in the tradition of printed relief atlases. */
const RAMP: [number, number, number, number][] = [
  [0, 96, 122, 88],
  [150, 126, 143, 92],
  [400, 163, 163, 100],
  [750, 189, 172, 108],
  [1150, 190, 150, 96],
  [1700, 173, 122, 84],
  [2300, 166, 132, 112],
  [3000, 205, 200, 198],
  [3900, 236, 240, 244],
];

export function hypsometric(metres: number) {
  let i = 0;
  while (i < RAMP.length - 2 && metres > RAMP[i + 1][0]) i++;
  const [e0, r0, g0, b0] = RAMP[i];
  const [e1, r1, g1, b1] = RAMP[i + 1];
  const t = Math.max(0, Math.min(1, (metres - e0) / (e1 - e0)));
  return [r0 + (r1 - r0) * t, g0 + (g1 - g0) * t, b0 + (b1 - b0) * t];
}

export const STATUS_TINT: Record<StatusKey, [number, number, number]> = {
  italia: [214, 176, 96],     // 意大利本土
  senatorial: [166, 150, 200], // 元老院行省
  imperial: [206, 138, 106],   // 皇帝行省
  client: [150, 186, 150],     // 附庸王国
};

export const JOURNEY_TINT: Record<JourneyKey, [number, number, number]> = {
  first: [232, 176, 74],
  second: [116, 200, 210],
  third: [154, 216, 142],
  rome: [232, 128, 128],
};

// ---------------------------------------------------------------- region index

function pointInRing(lon: number, lat: number, ring: [number, number][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function regionAt(lon: number, lat: number) {
  for (let i = 0; i < regions.length; i++) if (pointInRing(lon, lat, regions[i].ring)) return i;
  return -1;
}

/** Region index per DEM node, computed once — point-in-polygon is far too slow per frame. */
const regionGrid = (() => {
  const g = new Int8Array(DEM_NX * DEM_NY);
  for (let j = 0; j < DEM_NY; j++) {
    const lat = N - j * STEP_Y;
    for (let i = 0; i < DEM_NX; i++) g[j * DEM_NX + i] = regionAt(W + i * STEP_X, lat);
  }
  return g;
})();

// ---------------------------------------------------------------- journeys

const byId = new Map(places.map((p) => [p.id, p]));

/**
 * A journey's stops resampled into a dense line, so the leg drapes over the
 * ground it crosses instead of cutting through a mountain range in one straight
 * segment. 0.15° is roughly one and a half DEM cells — fine enough to follow
 * the relief, coarse enough to stay cheap at every frame.
 */
export const journeyLines: { key: JourneyKey; line: [number, number][] }[] = journeys.map((j) => {
  const stops = j.stops.map((id) => {
    const p = byId.get(id);
    if (!p) throw new Error(`journey ${j.key} names an unknown place: ${id}`);
    return p;
  });
  const line: [number, number][] = [];
  for (let k = 0; k < stops.length - 1; k++) {
    const a = stops[k];
    const b = stops[k + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.lon - a.lon, b.lat - a.lat) / 0.15));
    for (let t = 0; t < steps; t++) {
      line.push([a.lon + ((b.lon - a.lon) * t) / steps, a.lat + ((b.lat - a.lat) * t) / steps]);
    }
  }
  const last = stops[stops.length - 1];
  line.push([last.lon, last.lat]);
  return { key: j.key, line };
});

// ---------------------------------------------------------------- drawing

const SUN = { x: -0.55, y: -0.7, z: 0.45 };
const SUN_LEN = Math.hypot(SUN.x, SUN.y, SUN.z);

export type SceneOptions = {
  stride: number;
  showRegions: boolean;
  highlightRegion: number;
  /** Journeys to draw, in the order they should be painted. */
  showJourneys: JourneyKey[];
  activeJourney: JourneyKey | null;
};

type Cell = { depth: number; pts: Projected[]; r: number; g: number; b: number };

export function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: Frame,
  opts: SceneOptions,
) {
  ctx.clearRect(0, 0, width, height);

  // --- Terrain mesh. Sea cells go into the same depth-sorted list as everything
  //     else, held flat at 0 m, so the water occludes correctly at any tilt and
  //     the coastline needs no separate pass.
  const s = opts.stride;
  const cells: Cell[] = [];
  const hOf = (i: number, j: number) => relief(DEM[j * DEM_NX + i]);
  for (let j = 0; j + s < DEM_NY; j += s) {
    for (let i = 0; i + s < DEM_NX; i += s) {
      const u0 = i / (DEM_NX - 1);
      const u1 = (i + s) / (DEM_NX - 1);
      const v0 = j / (DEM_NY - 1);
      const v1 = (j + s) / (DEM_NY - 1);
      const idx = j * DEM_NX + i;

      const e00 = DEM[idx];
      const e10 = DEM[idx + s];
      const e01 = DEM[idx + s * DEM_NX];
      const e11 = DEM[idx + s * DEM_NX + s];
      const pts = [
        project(u0, v0, hOf(i, j), frame),
        project(u1, v0, hOf(i + s, j), frame),
        project(u1, v1, hOf(i + s, j + s), frame),
        project(u0, v1, hOf(i, j + s), frame),
      ];
      const depth = (pts[0].depth + pts[2].depth) / 2;
      // Cool the far distance slightly so depth reads without a fog overlay.
      const haze = Math.max(0, Math.min(0.34, (0.5 - depth) * 0.34));

      // Water: flat, unshaded, and slightly deeper in tone away from the shore
      // so the shelf around the islands reads.
      if (isSea(e00) && isSea(e10) && isSea(e01) && isSea(e11)) {
        cells.push({
          depth,
          pts,
          r: 18 * (1 - haze) + 30 * haze,
          g: 58 * (1 - haze) + 52 * haze,
          b: 72 * (1 - haze) + 60 * haze,
        });
        continue;
      }

      // Hillshade from the true surface gradient (metres over metres, no exaggeration).
      const dx = (e10 + e11 - e00 - e01) / 2 / (STEP_X * 111_320 * Math.cos(MID_LAT) * s);
      const dy = (e01 + e11 - e00 - e10) / 2 / (STEP_Y * 111_320 * s);
      const nl = Math.hypot(dx, dy, 1);
      const lambert = Math.max(0, (-dx * SUN.x - dy * SUN.y + SUN.z) / (nl * SUN_LEN));
      const shade = 0.42 + 0.95 * lambert;

      const mean = (e00 + e10 + e01 + e11) / 4;
      let [r, g, b] = hypsometric(mean);
      if (opts.showRegions) {
        const reg = regionGrid[idx];
        if (reg >= 0) {
          const tint = STATUS_TINT[regions[reg].status];
          const k = opts.highlightRegion === reg ? 0.55 : 0.26;
          r += (tint[0] - r) * k;
          g += (tint[1] - g) * k;
          b += (tint[2] - b) * k;
        }
      }
      r = r * shade * (1 - haze) + 30 * haze;
      g = g * shade * (1 - haze) + 52 * haze;
      b = b * shade * (1 - haze) + 60 * haze;
      cells.push({ depth, pts, r, g, b });
    }
  }
  cells.sort((a, b) => a.depth - b.depth);
  for (const c of cells) {
    ctx.beginPath();
    ctx.moveTo(c.pts[0].x, c.pts[0].y);
    ctx.lineTo(c.pts[1].x, c.pts[1].y);
    ctx.lineTo(c.pts[2].x, c.pts[2].y);
    ctx.lineTo(c.pts[3].x, c.pts[3].y);
    ctx.closePath();
    ctx.fillStyle = `rgb(${c.r | 0},${c.g | 0},${c.b | 0})`;
    ctx.fill();
    // Hairline of the same colour hides the seams between quads.
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  // --- Provincial borders.
  if (opts.showRegions) {
    ctx.save();
    ctx.setLineDash([5, 4]);
    regions.forEach((region, index) => {
      ctx.beginPath();
      let first = true;
      for (let k = 0; k < region.ring.length; k++) {
        const [x1, y1] = region.ring[k];
        const [x2, y2] = region.ring[(k + 1) % region.ring.length];
        const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 0.2));
        for (let t = 0; t < steps; t++) {
          const lon = x1 + ((x2 - x1) * t) / steps;
          const lat = y1 + ((y2 - y1) * t) / steps;
          const p = projectGeo(lon, lat, relief(elevationAt(lon, lat)) + 0.004, frame);
          if (first) { ctx.moveTo(p.x, p.y); first = false; } else ctx.lineTo(p.x, p.y);
        }
      }
      ctx.closePath();
      const active = opts.highlightRegion === index;
      ctx.strokeStyle = active ? 'rgba(240, 214, 150, .9)' : 'rgba(226, 197, 123, .3)';
      ctx.lineWidth = active ? 1.8 : 1;
      ctx.stroke();
    });
    ctx.restore();
  }

  // --- The journeys, draped on the surface. The selected one is drawn last and
  //     brightest, so a route can be followed through the tangle around Antioch.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const order = journeyLines
    .filter((j) => opts.showJourneys.includes(j.key))
    .sort((a, b) => Number(a.key === opts.activeJourney) - Number(b.key === opts.activeJourney));
  for (const { key, line } of order) {
    const on = opts.activeJourney === null || opts.activeJourney === key;
    const [r, g, b] = JOURNEY_TINT[key];
    ctx.beginPath();
    line.forEach(([lon, lat], k) => {
      const p = projectGeo(lon, lat, relief(elevationAt(lon, lat)) + 0.002, frame);
      if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = `rgba(${r},${g},${b},${on ? 0.92 : 0.2})`;
    ctx.lineWidth = on ? 2.2 : 1.2;
    ctx.stroke();
  }
}
