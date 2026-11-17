// 採点の参照実装（ブラウザでもそのまま動く。ライブラリなし）
// 描いた線と本物の形を、同じ大きさ・同じ中心にそろえ、格子に塗って重なりの割合（IoU）を数える
// 手描きの線は自分と交差することがあるので、塗り方は「ノンゼロ（ぐるっと囲まれた所は塗る）」にする

// 多角形を N×N の格子に塗る。tf(x,y)→[gx,gy]。結果は Uint8Array（1=中）
export function rasterize(points, tf, N) {
  const g = new Uint8Array(N * N);
  const P = points.map(([x, y]) => tf(x, y));
  for (let row = 0; row < N; row++) {
    const y = row + 0.5;
    const xs = []; // [交点の x, 向き]
    for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push([x1 + (y - y1) * (x2 - x1) / (y2 - y1), y2 > y1 ? 1 : -1]);
      }
    }
    xs.sort((a, b) => a[0] - b[0]);
    let w = 0;
    for (let k = 0; k < xs.length - 1; k++) {
      w += xs[k][1];
      if (w !== 0) {
        const a = Math.max(0, Math.ceil(xs[k][0] - 0.5)), b = Math.min(N - 1, Math.floor(xs[k + 1][0] - 0.5));
        for (let c = a; c <= b; c++) g[row * N + c] = 1;
      }
    }
  }
  return g;
}

// 形の面積と重心（格子で数える。交差していても正しく出る）
export function stats(points, N = 256) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const size = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  const s = N / size;
  const g = rasterize(points, (x, y) => [(x - minX) * s, (y - minY) * s], N);
  let n = 0, sx = 0, sy = 0;
  for (let i = 0; i < g.length; i++) if (g[i]) { n++; sx += (i % N) + 0.5; sy += Math.floor(i / N) + 0.5; }
  if (n === 0) return { area: 0, cx: 0, cy: 0 };
  return { area: n / (s * s), cx: sx / n / s + minX, cy: sy / n / s + minY };
}

// 重なりの割合（0〜1）。向きはそろえない（どちらも北が上）
export function iou(drawn, truth, N = 256) {
  const a = stats(drawn), b = stats(truth);
  if (a.area === 0 || b.area === 0) return 0;
  // どちらも面積1にそろえ、重心を中心に置く。はみ出さないよう、遠い方の点が格子の端の手前に来る倍率を選ぶ
  const ka = 1 / Math.sqrt(a.area), kb = 1 / Math.sqrt(b.area);
  let r = 0;
  for (const [x, y] of drawn) r = Math.max(r, Math.abs((x - a.cx) * ka), Math.abs((y - a.cy) * ka));
  for (const [x, y] of truth) r = Math.max(r, Math.abs((x - b.cx) * kb), Math.abs((y - b.cy) * kb));
  const s = (N / 2 - 2) / r;
  const ga = rasterize(drawn, (x, y) => [(x - a.cx) * ka * s + N / 2, (y - a.cy) * ka * s + N / 2], N);
  const gb = rasterize(truth, (x, y) => [(x - b.cx) * kb * s + N / 2, (y - b.cy) * kb * s + N / 2], N);
  let inter = 0, uni = 0;
  for (let i = 0; i < ga.length; i++) { if (ga[i] && gb[i]) inter++; if (ga[i] || gb[i]) uni++; }
  return uni ? inter / uni : 0;
}

// 点数（0〜100）：重なり iouZero 以下は0点、iouFull 以上は100点、その間はまっすぐ比例（決定：A 方式）
export function toScore(v, cfg = { iouZero: 0.30, iouFull: 0.95 }) {
  const t = (v - cfg.iouZero) / (cfg.iouFull - cfg.iouZero);
  return Math.round(Math.max(0, Math.min(1, t)) * 100);
}
