/**
 * Fill masked pixels from their surroundings (Telea's fast-marching
 * inpainting, the method behind OpenCV's INPAINT_TELEA): the hole is filled
 * from its edge inwards, each pixel a weighted blend of nearby known pixels
 * that favours close pixels along the fill direction. Optional grain puts
 * back some of the surrounding texture so fills don't look plastic.
 * Pure: works on RGBA arrays; unit tested.
 */

const KNOWN = 0;
const BAND = 1;
const INSIDE = 2;

/** Min-heap of pixel indices keyed by arrival time. */
class Heap {
  private idx: number[] = [];
  private key: number[] = [];
  get size() {
    return this.idx.length;
  }
  push(i: number, k: number) {
    this.idx.push(i);
    this.key.push(k);
    let c = this.idx.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (this.key[p] <= this.key[c]) break;
      this.swap(p, c);
      c = p;
    }
  }
  pop(): number {
    const top = this.idx[0];
    const lastI = this.idx.pop()!;
    const lastK = this.key.pop()!;
    if (this.idx.length) {
      this.idx[0] = lastI;
      this.key[0] = lastK;
      let p = 0;
      for (;;) {
        const l = 2 * p + 1;
        const r = l + 1;
        let m = p;
        if (l < this.idx.length && this.key[l] < this.key[m]) m = l;
        if (r < this.idx.length && this.key[r] < this.key[m]) m = r;
        if (m === p) break;
        this.swap(p, m);
        p = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.idx[a], this.idx[b]] = [this.idx[b], this.idx[a]];
    [this.key[a], this.key[b]] = [this.key[b], this.key[a]];
  }
}

export interface InpaintOptions {
  /** Neighbourhood radius in pixels (bigger = smoother, slower). */
  radius?: number;
  /** 0–1: how much of the surrounding texture to add back. */
  grain?: number;
  /** For repeatable tests. */
  seed?: number;
}

/**
 * Inpaint `data` (RGBA, width×height) in place wherever `mask` is non-zero.
 * Returns the number of pixels filled.
 */
export function inpaint(data: Uint8ClampedArray, width: number, height: number, mask: Uint8Array, opts: InpaintOptions = {}): number {
  const radius = Math.max(1, Math.round(opts.radius ?? 5));
  const grain = opts.grain ?? 0;
  const n = width * height;
  const flag = new Uint8Array(n);
  const T = new Float32Array(n);
  const heap = new Heap();
  let holes = 0;

  for (let i = 0; i < n; i++) {
    if (mask[i]) {
      flag[i] = INSIDE;
      T[i] = 1e6;
      holes++;
    }
  }
  if (!holes) return 0;
  // Start from known pixels touching the hole.
  for (let i = 0; i < n; i++) {
    if (flag[i] !== KNOWN) continue;
    const x = i % width;
    const y = (i / width) | 0;
    if ((x > 0 && flag[i - 1] === INSIDE) || (x < width - 1 && flag[i + 1] === INSIDE) || (y > 0 && flag[i - width] === INSIDE) || (y < height - 1 && flag[i + width] === INSIDE)) {
      flag[i] = BAND;
      heap.push(i, 0);
    }
  }

  const solve = (a: number, b: number) => {
    // Eikonal update from two neighbouring arrival times.
    if (a < 1e6 && b < 1e6) {
      const d = 2 - (a - b) * (a - b);
      if (d > 0) {
        const s = (a + b + Math.sqrt(d)) / 2;
        if (s >= a && s >= b) return s;
      }
      return Math.min(a, b) + 1;
    }
    return Math.min(a, b) + 1;
  };
  const tAt = (x: number, y: number) => (x < 0 || y < 0 || x >= width || y >= height || flag[y * width + x] === INSIDE ? 1e6 : T[y * width + x]);

  // Grain: random offsets scaled by local contrast, with a seeded generator.
  let seed = opts.seed ?? 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const gauss = () => {
    const u = Math.max(1e-9, rand());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };

  const fill = (x: number, y: number) => {
    const i = y * width + x;
    // Gradient of T at the pixel (direction the front moves).
    const tx = (tAt(x + 1, y) < 1e6 && tAt(x - 1, y) < 1e6 ? (tAt(x + 1, y) - tAt(x - 1, y)) / 2 : tAt(x + 1, y) < 1e6 ? tAt(x + 1, y) - T[i] : tAt(x - 1, y) < 1e6 ? T[i] - tAt(x - 1, y) : 0);
    const ty = (tAt(x, y + 1) < 1e6 && tAt(x, y - 1) < 1e6 ? (tAt(x, y + 1) - tAt(x, y - 1)) / 2 : tAt(x, y + 1) < 1e6 ? tAt(x, y + 1) - T[i] : tAt(x, y - 1) < 1e6 ? T[i] - tAt(x, y - 1) : 0);
    let sw = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    let s1 = 0;
    let s2 = 0;
    let cnt = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= height) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= width || (!dx && !dy)) continue;
        const j = yy * width + xx;
        if (flag[j] === INSIDE) continue;
        const len2 = dx * dx + dy * dy;
        if (len2 > radius * radius) continue;
        const len = Math.sqrt(len2);
        const dir = Math.max(1e-6, Math.abs((-dx * tx - dy * ty) / len));
        const dst = 1 / (len2 * len);
        const lev = 1 / (1 + Math.abs(T[j] - T[i]));
        const w = dir * dst * lev;
        const k = j * 4;
        r += w * data[k];
        g += w * data[k + 1];
        b += w * data[k + 2];
        sw += w;
        const l = 0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2];
        s1 += l;
        s2 += l * l;
        cnt++;
      }
    }
    if (sw <= 0) return;
    const k = i * 4;
    let noise = 0;
    if (grain > 0 && cnt > 3) {
      const mean = s1 / cnt;
      const sd = Math.sqrt(Math.max(0, s2 / cnt - mean * mean));
      noise = gauss() * sd * grain * 0.6;
    }
    data[k] = r / sw + noise;
    data[k + 1] = g / sw + noise;
    data[k + 2] = b / sw + noise;
    // Keep the pixel as opaque as its surroundings.
    if (data[k + 3] === 0) data[k + 3] = 255;
  };

  let filled = 0;
  while (heap.size) {
    const i = heap.pop();
    if (flag[i] === KNOWN) continue;
    flag[i] = KNOWN;
    const x = i % width;
    const y = (i / width) | 0;
    const around = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of around) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const j = ny * width + nx;
      if (flag[j] !== INSIDE) continue;
      const t = Math.min(solve(tAt(nx - 1, ny), tAt(nx, ny - 1)), solve(tAt(nx + 1, ny), tAt(nx, ny - 1)), solve(tAt(nx - 1, ny), tAt(nx, ny + 1)), solve(tAt(nx + 1, ny), tAt(nx, ny + 1)));
      T[j] = t;
      fill(nx, ny);
      filled++;
      flag[j] = BAND;
      heap.push(j, t);
    }
  }
  return filled;
}

// ─── Mask helpers ───────────────────────────────────────────────────

/** Grow a mask by `r` pixels (square neighbourhood), so fills cover soft edges. */
export function dilate(mask: Uint8Array, width: number, height: number, r: number): Uint8Array {
  if (r <= 0) return mask;
  // Two separable passes.
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    let run = -1e9;
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) run = x;
      if (x - run <= r) tmp[y * width + x] = 1;
    }
    run = 1e9;
    for (let x = width - 1; x >= 0; x--) {
      if (mask[y * width + x]) run = x;
      if (run - x <= r) tmp[y * width + x] = 1;
    }
  }
  for (let x = 0; x < width; x++) {
    let run = -1e9;
    for (let y = 0; y < height; y++) {
      if (tmp[y * width + x]) run = y;
      if (y - run <= r) out[y * width + x] = 1;
    }
    run = 1e9;
    for (let y = height - 1; y >= 0; y--) {
      if (tmp[y * width + x]) run = y;
      if (run - y <= r) out[y * width + x] = 1;
    }
  }
  return out;
}

/**
 * Keep only the masked pixels close to `color` (a watermark usually has one
 * colour), then grow a little to catch anti-aliased edges. `tolerance` 0–100.
 */
export function refineByColor(data: Uint8ClampedArray, width: number, height: number, mask: Uint8Array, color: [number, number, number], tolerance: number, grow = 1): Uint8Array {
  const out = new Uint8Array(mask.length);
  const lim = (tolerance / 100) * 441.7; // max RGB distance
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const k = i * 4;
    const d = Math.hypot(data[k] - color[0], data[k + 1] - color[1], data[k + 2] - color[2]);
    if (d <= lim) out[i] = 1;
  }
  const grown = dilate(out, width, height, grow);
  // Growing never goes outside what the user painted.
  for (let i = 0; i < grown.length; i++) if (!mask[i]) grown[i] = 0;
  return grown;
}

export const maskCount = (mask: Uint8Array) => {
  let n = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) n++;
  return n;
};

// ─── Patch-based fill (for larger areas) ────────────────────────────

export interface PatchOptions {
  /** Patch radius (3 → 7×7 patches). */
  radius?: number;
  seed?: number;
  /** Called with 0–1 as work progresses. */
  onProgress?: (f: number) => void;
}

interface Level {
  w: number;
  h: number;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  hole: Uint8Array;
}

/**
 * Fill the hole by copying texture from elsewhere in the picture, the way
 * content-aware fill works (Wexler et al. with PatchMatch search): coarse to
 * fine, every hole pixel becomes a blend of the best-matching source patches
 * that cover it. Continues edges and texture where smooth fill would smear.
 */
export function patchInpaint(data: Uint8ClampedArray, width: number, height: number, mask: Uint8Array, opts: PatchOptions = {}): number {
  const pr = opts.radius ?? 3;
  let seed = opts.seed ?? 987654321;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Work on a crop around the hole: faster, and nearby texture is what matters.
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  let holes = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (mask[y * width + x]) {
        holes++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (!holes) return 0;
  const margin = Math.max(24, Math.round(Math.max(x1 - x0, y1 - y0) * 1.2));
  const cx0 = Math.max(0, x0 - margin);
  const cy0 = Math.max(0, y0 - margin);
  const cx1 = Math.min(width - 1, x1 + margin);
  const cy1 = Math.min(height - 1, y1 + margin);
  const W = cx1 - cx0 + 1;
  const H = cy1 - cy0 + 1;

  const base: Level = { w: W, h: H, r: new Float32Array(W * H), g: new Float32Array(W * H), b: new Float32Array(W * H), hole: new Uint8Array(W * H) };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const k = ((cy0 + y) * width + cx0 + x) * 4;
      base.r[i] = data[k];
      base.g[i] = data[k + 1];
      base.b[i] = data[k + 2];
      base.hole[i] = mask[(cy0 + y) * width + cx0 + x] ? 1 : 0;
    }

  // Pyramid: halve until the hole is only a few patches across.
  const levels: Level[] = [base];
  while (levels.length < 8) {
    const p = levels[levels.length - 1];
    let hw = 0;
    for (let y = 0; y < p.h; y++) {
      let run = 0;
      for (let x = 0; x < p.w; x++) {
        run = p.hole[y * p.w + x] ? run + 1 : 0;
        if (run > hw) hw = run;
      }
    }
    if (hw <= pr * 3 || p.w / 2 < pr * 6 || p.h / 2 < pr * 6) break;
    const w = p.w >> 1;
    const h = p.h >> 1;
    const l: Level = { w, h, r: new Float32Array(w * h), g: new Float32Array(w * h), b: new Float32Array(w * h), hole: new Uint8Array(w * h) };
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let n = 0;
        let anyHole = 0;
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) {
            const j = (2 * y + dy) * p.w + 2 * x + dx;
            if (p.hole[j]) anyHole = 1;
            else {
              sr += p.r[j];
              sg += p.g[j];
              sb += p.b[j];
              n++;
            }
          }
        const i = y * w + x;
        l.hole[i] = anyHole;
        if (n) {
          l.r[i] = sr / n;
          l.g[i] = sg / n;
          l.b[i] = sb / n;
        }
      }
    levels.push(l);
  }

  // Start the coarsest level with a smooth fill.
  {
    const c = levels[levels.length - 1];
    const tmp = new Uint8ClampedArray(c.w * c.h * 4);
    for (let i = 0; i < c.w * c.h; i++) {
      tmp[i * 4] = c.r[i];
      tmp[i * 4 + 1] = c.g[i];
      tmp[i * 4 + 2] = c.b[i];
      tmp[i * 4 + 3] = 255;
    }
    inpaint(tmp, c.w, c.h, c.hole, { radius: 3 });
    for (let i = 0; i < c.w * c.h; i++) {
      c.r[i] = tmp[i * 4];
      c.g[i] = tmp[i * 4 + 1];
      c.b[i] = tmp[i * 4 + 2];
    }
  }

  let nnX = new Int32Array(0);
  let nnY = new Int32Array(0);
  let prevW = 0;
  // Coarser level: target pixel → its index in nnX/nnY.
  let prevIndex = new Map<number, number>();
  const totalWork = levels.reduce((s, l, i) => s + l.w * l.h * (i === levels.length - 1 ? 6 : 3), 0);
  let done = 0;

  for (let li = levels.length - 1; li >= 0; li--) {
    const L = levels[li];
    const { w, h, r, g, b, hole } = L;
    // Source patches: fully inside the level and touching no hole pixel.
    const near = dilate(hole, w, h, pr);
    const srcOK = new Uint8Array(w * h);
    let sources = 0;
    for (let y = pr; y < h - pr; y++)
      for (let x = pr; x < w - pr; x++)
        if (!near[y * w + x]) {
          srcOK[y * w + x] = 1;
          sources++;
        }
    if (!sources) continue; // hole covers everything; keep the smooth fill
    const srcList = new Int32Array(sources);
    for (let i = 0, k = 0; i < w * h; i++) if (srcOK[i]) srcList[k++] = i;
    const randomSource = () => srcList[(rand() * sources) | 0];

    // Target patches: centres whose patch overlaps the hole.
    const targets: number[] = [];
    for (let y = pr; y < h - pr; y++) for (let x = pr; x < w - pr; x++) if (near[y * w + x]) targets.push(y * w + x);
    const T = targets.length;
    const tX = new Int32Array(w * h).fill(-1);
    targets.forEach((t, k) => (tX[t] = k));

    const newX = new Int32Array(T);
    const newY = new Int32Array(T);
    const dist = new Float64Array(T);
    const patchDist = (tx: number, ty: number, sx: number, sy: number, limit: number) => {
      let d = 0;
      for (let dy = -pr; dy <= pr; dy++) {
        const ro = (ty + dy) * w;
        const so = (sy + dy) * w;
        for (let dx = -pr; dx <= pr; dx++) {
          const a = ro + tx + dx;
          const c = so + sx + dx;
          const er = r[a] - r[c];
          const eg = g[a] - g[c];
          const eb = b[a] - b[c];
          d += er * er + eg * eg + eb * eb;
        }
        if (d >= limit) return d;
      }
      return d;
    };

    // Initialise the nearest-neighbour field (from the coarser level when there is one).
    for (let k = 0; k < T; k++) {
      const t = targets[k];
      const tx = t % w;
      const ty = (t / w) | 0;
      let sx = -1;
      let sy = -1;
      if (prevW && nnX.length) {
        const px = Math.min(prevW - 1, tx >> 1);
        const py = ty >> 1;
        const pk = prevIndex.get(py * prevW + px);
        if (pk !== undefined) {
          sx = Math.min(w - pr - 1, Math.max(pr, nnX[pk] * 2 + (tx & 1)));
          sy = Math.min(h - pr - 1, Math.max(pr, nnY[pk] * 2 + (ty & 1)));
          if (!srcOK[sy * w + sx]) sx = -1;
        }
      }
      if (sx < 0) {
        const s = randomSource();
        sx = s % w;
        sy = (s / w) | 0;
      }
      newX[k] = sx;
      newY[k] = sy;
      dist[k] = patchDist(tx, ty, sx, sy, Infinity);
    }

    const iterations = li === levels.length - 1 ? 6 : 3;
    const accR = new Float64Array(w * h);
    const accG = new Float64Array(w * h);
    const accB = new Float64Array(w * h);
    const accW = new Float64Array(w * h);
    for (let it = 0; it < iterations; it++) {
      // PatchMatch: propagate good matches from neighbours, then search randomly.
      for (let pass = 0; pass < 2; pass++) {
        const fwd = (it + pass) % 2 === 0;
        for (let q = 0; q < T; q++) {
          const k = fwd ? q : T - 1 - q;
          const t = targets[k];
          const tx = t % w;
          const ty = (t / w) | 0;
          const step = fwd ? -1 : 1;
          for (const [nx, ny] of [
            [tx + step, ty],
            [tx, ty + step],
          ]) {
            const nk = nx >= 0 && ny >= 0 && nx < w && ny < h ? tX[ny * w + nx] : -1;
            if (nk < 0) continue;
            const sx = newX[nk] - step * (nx !== tx ? 1 : 0);
            const sy = newY[nk] - step * (ny !== ty ? 1 : 0);
            if (sx < pr || sy < pr || sx >= w - pr || sy >= h - pr || !srcOK[sy * w + sx]) continue;
            const d = patchDist(tx, ty, sx, sy, dist[k]);
            if (d < dist[k]) {
              dist[k] = d;
              newX[k] = sx;
              newY[k] = sy;
            }
          }
          for (let rad = Math.max(w, h); rad >= 1; rad >>= 1) {
            const sx = Math.round(newX[k] + (rand() * 2 - 1) * rad);
            const sy = Math.round(newY[k] + (rand() * 2 - 1) * rad);
            if (sx < pr || sy < pr || sx >= w - pr || sy >= h - pr || !srcOK[sy * w + sx]) continue;
            const d = patchDist(tx, ty, sx, sy, dist[k]);
            if (d < dist[k]) {
              dist[k] = d;
              newX[k] = sx;
              newY[k] = sy;
            }
          }
        }
      }
      // Vote: each hole pixel = weighted blend of the matched patches covering it.
      accR.fill(0);
      accG.fill(0);
      accB.fill(0);
      accW.fill(0);
      const sorted = Float64Array.from(dist).sort();
      const sigma2 = Math.max(1, sorted[Math.floor(sorted.length * 0.75)] ?? 1);
      for (let k = 0; k < T; k++) {
        const t = targets[k];
        const tx = t % w;
        const ty = (t / w) | 0;
        const wt = Math.exp(-dist[k] / (2 * sigma2)) + 1e-6;
        for (let dy = -pr; dy <= pr; dy++)
          for (let dx = -pr; dx <= pr; dx++) {
            const p = (ty + dy) * w + tx + dx;
            if (!hole[p]) continue;
            const s = (newY[k] + dy) * w + newX[k] + dx;
            accR[p] += wt * r[s];
            accG[p] += wt * g[s];
            accB[p] += wt * b[s];
            accW[p] += wt;
          }
      }
      for (let p = 0; p < w * h; p++)
        if (hole[p] && accW[p] > 0) {
          r[p] = accR[p] / accW[p];
          g[p] = accG[p] / accW[p];
          b[p] = accB[p] / accW[p];
        }
      done += w * h;
      opts.onProgress?.(Math.min(1, done / totalWork));
    }

    // Hand the result to the next finer level as its starting guess.
    if (li > 0) {
      const F = levels[li - 1];
      for (let y = 0; y < F.h; y++)
        for (let x = 0; x < F.w; x++) {
          const i = y * F.w + x;
          if (!F.hole[i]) continue;
          const j = Math.min(h - 1, y >> 1) * w + Math.min(w - 1, x >> 1);
          F.r[i] = r[j];
          F.g[i] = g[j];
          F.b[i] = b[j];
        }
    }
    nnX = newX;
    nnY = newY;
    prevW = w;
    prevIndex = new Map(targets.map((t, k) => [t, k]));
  }

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!base.hole[i]) continue;
      const k = ((cy0 + y) * width + cx0 + x) * 4;
      data[k] = base.r[i];
      data[k + 1] = base.g[i];
      data[k + 2] = base.b[i];
      if (data[k + 3] === 0) data[k + 3] = 255;
    }
  return holes;
}

