// 採点（設計書 3.2。重なりの計算は参照実装 sim/score.mjs と同じ結果：T-01。2026-11-17 に「らしさ」を足した：sim/README.md）
// 描いた線と本物の形を、同じ大きさ・同じ中心にそろえ、格子に塗って重なりの割合（IoU）を数える。
// 手描きの線は自分と交差することがあるので、塗り方は「ノンゼロ（ぐるっと囲まれた所は塗る）」にする。
// 画面やデータに依存しないので、ほかの作品（BAKA-069 など）でも使える。

export type Point = readonly [number, number];
export type Transform = (x: number, y: number) => Point;

export interface ShapeStats {
  /** 面積（元の座標の単位の2乗） */
  area: number;
  /** 重心 */
  cx: number;
  cy: number;
}

export interface ScoringConfig {
  grid: number;
  iouZero: number;
  iouFull: number;
  featZero: number;
  featFull: number;
  /** 重なりの重み（0〜1）。残りがらしさの重み */
  weightIou: number;
  /** らしさを比べる前のぼかしの強さ（格子の幅に対する割合） */
  blurFrac: number;
}

/** 多角形（最後の点と最初の点をつなぐ）を N×N の格子に塗る。結果は 1=中 */
export function rasterize(points: readonly Point[], tf: Transform, N: number): Uint8Array {
  const g = new Uint8Array(N * N);
  const P = points.map(([x, y]) => tf(x, y));
  const xs: [number, number][] = []; // [交点の x, 向き]
  for (let row = 0; row < N; row++) {
    const y = row + 0.5;
    xs.length = 0;
    for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i]!;
      const [x2, y2] = P[(i + 1) % P.length]!;
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push([x1 + ((y - y1) * (x2 - x1)) / (y2 - y1), y2 > y1 ? 1 : -1]);
      }
    }
    xs.sort((a, b) => a[0] - b[0]);
    let w = 0;
    for (let k = 0; k < xs.length - 1; k++) {
      w += xs[k]![1];
      if (w !== 0) {
        const a = Math.max(0, Math.ceil(xs[k]![0] - 0.5));
        const b = Math.min(N - 1, Math.floor(xs[k + 1]![0] - 0.5));
        for (let c = a; c <= b; c++) g[row * N + c] = 1;
      }
    }
  }
  return g;
}

/** 形の面積と重心（格子で数える。交差していても正しく出る） */
export function stats(points: readonly Point[], N = 256): ShapeStats {
  if (points.length < 3) return { area: 0, cx: 0, cy: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  const s = N / size;
  const g = rasterize(points, (x, y) => [(x - minX) * s, (y - minY) * s], N);
  let n = 0, sx = 0, sy = 0;
  for (let i = 0; i < g.length; i++) {
    if (g[i]) {
      n++;
      sx += (i % N) + 0.5;
      sy += Math.floor(i / N) + 0.5;
    }
  }
  if (n === 0) return { area: 0, cx: 0, cy: 0 };
  return { area: n / (s * s), cx: sx / n / s + minX, cy: sy / n / s + minY };
}

/**
 * 2つの形を「面積1・重心が原点」にそろえる倍率（答え合わせの絵・日本地図でも同じそろえ方を使う）。
 * 戻り値の k を掛けると面積1になる。r はそろえたあとの、原点から一番遠い点までの距離（縦横の大きい方）
 */
export function normalizer(points: readonly Point[], st: ShapeStats): { k: number; r: number } {
  const k = 1 / Math.sqrt(st.area);
  let r = 0;
  for (const [x, y] of points) r = Math.max(r, Math.abs((x - st.cx) * k), Math.abs((y - st.cy) * k));
  return { k, r };
}

/** 2つの形を面積1・重心が中心にそろえて、同じ N×N の格子に塗る。どちらかが空なら null */
export function alignedGrids(drawn: readonly Point[], truth: readonly Point[], N = 256): { gd: Uint8Array; gt: Uint8Array } | null {
  const a = stats(drawn), b = stats(truth);
  if (a.area === 0 || b.area === 0) return null;
  // どちらも面積1にそろえ、重心を中心に置く。はみ出さないよう、遠い方の点が格子の端の手前に来る倍率を選ぶ
  const na = normalizer(drawn, a), nb = normalizer(truth, b);
  const s = (N / 2 - 2) / Math.max(na.r, nb.r);
  const gd = rasterize(drawn, (x, y) => [(x - a.cx) * na.k * s + N / 2, (y - a.cy) * na.k * s + N / 2], N);
  const gt = rasterize(truth, (x, y) => [(x - b.cx) * nb.k * s + N / 2, (y - b.cy) * nb.k * s + N / 2], N);
  return { gd, gt };
}

function gridIou(ga: Uint8Array, gb: Uint8Array): number {
  let inter = 0, uni = 0;
  for (let i = 0; i < ga.length; i++) {
    if (ga[i] && gb[i]) inter++;
    if (ga[i] || gb[i]) uni++;
  }
  return uni ? inter / uni : 0;
}

/** 重なりの割合（0〜1）。向きはそろえない（どちらも北が上） */
export function iou(drawn: readonly Point[], truth: readonly Point[], N = 256): number {
  const g = alignedGrids(drawn, truth, N);
  return g ? gridIou(g.gd, g.gt) : 0;
}

/**
 * 塗った格子の「だいたいの楕円」：同じ重心・同じ広がり（2次モーメント）・同じ面積の楕円を塗る
 */
export function momentEllipse(g: Uint8Array, N: number): Uint8Array {
  let c = 0, mx = 0, my = 0;
  for (let i = 0; i < g.length; i++) if (g[i]) { c++; mx += (i % N) + 0.5; my += Math.floor(i / N) + 0.5; }
  const e = new Uint8Array(N * N);
  if (!c) return e;
  mx /= c;
  my /= c;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < g.length; i++) {
    if (!g[i]) continue;
    const x = (i % N) + 0.5 - mx, y = Math.floor(i / N) + 0.5 - my;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  sxx /= c;
  syy /= c;
  sxy /= c;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy;
  const d = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + d, l2 = tr / 2 - d;
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let A = 2 * Math.sqrt(l1), B = 2 * Math.sqrt(Math.max(l2, 1e-6));
  const k = Math.sqrt(c / (Math.PI * A * B)); // 面積を元の形とそろえる
  A *= k;
  B *= k;
  const ct = Math.cos(th), st = Math.sin(th);
  for (let i = 0; i < e.length; i++) {
    const x = (i % N) + 0.5 - mx, y = Math.floor(i / N) + 0.5 - my;
    const u = x * ct + y * st, v = -x * st + y * ct;
    if ((u * u) / (A * A) + (v * v) / (B * B) <= 1) e[i] = 1;
  }
  return e;
}

/** 箱型のぼかしを縦横に3回（ガウスぼかしに近い） */
function boxBlur(f: Float32Array, N: number, r: number): Float32Array {
  const a = Float32Array.from(f), b = new Float32Array(f.length);
  const w = 2 * r + 1;
  const cl = (v: number) => Math.min(N - 1, Math.max(0, v));
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < N; y++) {
      let s = 0;
      for (let x = -r; x <= r; x++) s += a[y * N + cl(x)]!;
      for (let x = 0; x < N; x++) {
        b[y * N + x] = s / w;
        s += a[y * N + cl(x + r + 1)]! - a[y * N + cl(x - r)]!;
      }
    }
    for (let x = 0; x < N; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += b[cl(y) * N + x]!;
      for (let y = 0; y < N; y++) {
        a[y * N + x] = s / w;
        s += b[cl(y + r + 1) * N + x]! - b[cl(y - r) * N + x]!;
      }
    }
  }
  return a;
}

/**
 * 「らしさ」の一致（−1〜1）：本物の「だいたいの楕円」E を基準に、出っ張り（＋1）・へこみ（−1）の地図
 * f = 形 − E を、本物と描いた形の両方で作り、少しぼかしてから相関をとる。
 * 丸や楕円を描いただけでは 0 付近、半島や湾が同じ場所にあれば 1 に近づく
 */
export function featureCorr(gd: Uint8Array, gt: Uint8Array, N: number, blurFrac: number): number {
  const e = momentEllipse(gt, N);
  const fd = new Float32Array(gd.length), ft = new Float32Array(gt.length);
  for (let i = 0; i < gd.length; i++) {
    fd[i] = gd[i]! - e[i]!;
    ft[i] = gt[i]! - e[i]!;
  }
  const r = Math.max(1, Math.round(N * blurFrac));
  const bd = boxBlur(fd, N, r), bt = boxBlur(ft, N, r);
  let sdt = 0, sdd = 0, stt = 0;
  for (let i = 0; i < bd.length; i++) {
    sdt += bd[i]! * bt[i]!;
    sdd += bd[i]! * bd[i]!;
    stt += bt[i]! * bt[i]!;
  }
  return sdd && stt ? sdt / Math.sqrt(sdd * stt) : 0;
}

export interface Similarity {
  /** 重なりの割合（0〜1） */
  iou: number;
  /** らしさの一致（−1〜1） */
  feature: number;
}

/** 描いた形と本物の似ている度合い（重なり・らしさ）。どちらかが空なら 0 */
export function similarity(drawn: readonly Point[], truth: readonly Point[], cfg: Pick<ScoringConfig, 'grid' | 'blurFrac'>): Similarity {
  const g = alignedGrids(drawn, truth, cfg.grid);
  if (!g) return { iou: 0, feature: 0 };
  return { iou: gridIou(g.gd, g.gt), feature: featureCorr(g.gd, g.gt, cfg.grid, cfg.blurFrac) };
}

const lin = (v: number, zero: number, full: number) => Math.max(0, Math.min(1, (v - zero) / (full - zero)));

/**
 * 点数（0〜100）＝ 重なりの点 × weightIou ＋ らしさの点 × (1 − weightIou)（2026-11-17 決定：4:6 の方式）。
 * 重なりの点は iouZero 以下で0・iouFull 以上で1、らしさの点は featZero 以下で0・featFull 以上で1、その間はまっすぐ比例
 */
export function toScore(sim: Similarity, cfg: ScoringConfig): number {
  const w = cfg.weightIou;
  return Math.round((w * lin(sim.iou, cfg.iouZero, cfg.iouFull) + (1 - w) * lin(sim.feature, cfg.featZero, cfg.featFull)) * 100);
}
