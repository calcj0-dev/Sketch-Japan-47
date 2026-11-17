// 採点（設計書 3.2。参照実装 sim/score.mjs をそのまま移したもの。結果は同じになる：T-01）
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

/** 重なりの割合（0〜1）。向きはそろえない（どちらも北が上） */
export function iou(drawn: readonly Point[], truth: readonly Point[], N = 256): number {
  const a = stats(drawn), b = stats(truth);
  if (a.area === 0 || b.area === 0) return 0;
  // どちらも面積1にそろえ、重心を中心に置く。はみ出さないよう、遠い方の点が格子の端の手前に来る倍率を選ぶ
  const na = normalizer(drawn, a), nb = normalizer(truth, b);
  const s = (N / 2 - 2) / Math.max(na.r, nb.r);
  const ga = rasterize(drawn, (x, y) => [(x - a.cx) * na.k * s + N / 2, (y - a.cy) * na.k * s + N / 2], N);
  const gb = rasterize(truth, (x, y) => [(x - b.cx) * nb.k * s + N / 2, (y - b.cy) * nb.k * s + N / 2], N);
  let inter = 0, uni = 0;
  for (let i = 0; i < ga.length; i++) {
    if (ga[i] && gb[i]) inter++;
    if (ga[i] || gb[i]) uni++;
  }
  return uni ? inter / uni : 0;
}

/** 点数（0〜100）：重なり iouZero 以下は0点、iouFull 以上は100点、その間はまっすぐ比例（決定 #5：A 方式） */
export function toScore(v: number, cfg: Pick<ScoringConfig, 'iouZero' | 'iouFull'>): number {
  const t = (v - cfg.iouZero) / (cfg.iouFull - cfg.iouZero);
  return Math.round(Math.max(0, Math.min(1, t)) * 100);
}
