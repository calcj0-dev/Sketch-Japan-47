// 採点方法の試作と、手描きをまねた絵の生成
// 座標はすべて y 下向き。形は点の並び [[x,y],...]

export const N = 256;

// ---- 塗る（score.ts と同じノンゼロ） ----
export function rasterize(points, tf, n = N) {
  const g = new Uint8Array(n * n);
  const P = points.map(([x, y]) => tf(x, y));
  const xs = [];
  for (let row = 0; row < n; row++) {
    const y = row + 0.5;
    xs.length = 0;
    for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push([x1 + ((y - y1) * (x2 - x1)) / (y2 - y1), y2 > y1 ? 1 : -1]);
    }
    xs.sort((a, b) => a[0] - b[0]);
    let w = 0;
    for (let k = 0; k < xs.length - 1; k++) {
      w += xs[k][1];
      if (w !== 0) {
        const a = Math.max(0, Math.ceil(xs[k][0] - 0.5)), b = Math.min(n - 1, Math.floor(xs[k + 1][0] - 0.5));
        for (let c = a; c <= b; c++) g[row * n + c] = 1;
      }
    }
  }
  return g;
}

export function stats(points, n = N) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const size = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  const s = n / size;
  const g = rasterize(points, (x, y) => [(x - minX) * s, (y - minY) * s], n);
  let c = 0, sx = 0, sy = 0;
  for (let i = 0; i < g.length; i++) if (g[i]) { c++; sx += (i % n) + 0.5; sy += Math.floor(i / n) + 0.5; }
  if (!c) return { area: 0, cx: 0, cy: 0 };
  return { area: c / (s * s), cx: sx / c / s + minX, cy: sy / c / s + minY };
}

/** 2つの形を面積1・重心が中心にそろえて、同じ格子に塗る */
export function alignedGrids(drawn, truth, n = N) {
  const a = stats(drawn), b = stats(truth);
  if (!a.area || !b.area) return null;
  const ka = 1 / Math.sqrt(a.area), kb = 1 / Math.sqrt(b.area);
  let r = 0;
  for (const [x, y] of drawn) r = Math.max(r, Math.abs((x - a.cx) * ka), Math.abs((y - a.cy) * ka));
  for (const [x, y] of truth) r = Math.max(r, Math.abs((x - b.cx) * kb), Math.abs((y - b.cy) * kb));
  const s = (n / 2 - 2) / r;
  const gd = rasterize(drawn, (x, y) => [(x - a.cx) * ka * s + n / 2, (y - a.cy) * ka * s + n / 2], n);
  const gt = rasterize(truth, (x, y) => [(x - b.cx) * kb * s + n / 2, (y - b.cy) * kb * s + n / 2], n);
  return { gd, gt, s, n };
}

export function iouOf(ga, gb) {
  let i = 0, u = 0;
  for (let k = 0; k < ga.length; k++) { if (ga[k] && gb[k]) i++; if (ga[k] || gb[k]) u++; }
  return u ? i / u : 0;
}

/** 塗った格子の「だいたいの楕円」：同じ重心・同じ広がり（2次モーメント）・同じ面積の楕円を塗る */
export function momentEllipse(g, n = N) {
  let c = 0, mx = 0, my = 0;
  for (let i = 0; i < g.length; i++) if (g[i]) { c++; mx += (i % n) + 0.5; my += Math.floor(i / n) + 0.5; }
  mx /= c; my /= c;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < g.length; i++) if (g[i]) { const x = (i % n) + 0.5 - mx, y = Math.floor(i / n) + 0.5 - my; sxx += x * x; syy += y * y; sxy += x * y; }
  sxx /= c; syy /= c; sxy /= c;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy;
  const l1 = tr / 2 + Math.sqrt(Math.max(0, (tr * tr) / 4 - det)), l2 = tr / 2 - Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let A = 2 * Math.sqrt(l1), B = 2 * Math.sqrt(Math.max(l2, 1e-6));
  const k = Math.sqrt(c / (Math.PI * A * B)); // 面積を元の形とそろえる
  A *= k; B *= k;
  const e = new Uint8Array(n * n), ct = Math.cos(th), st = Math.sin(th);
  for (let i = 0; i < e.length; i++) {
    const x = (i % n) + 0.5 - mx, y = Math.floor(i / n) + 0.5 - my;
    const u = x * ct + y * st, v = -x * st + y * ct;
    if ((u * u) / (A * A) + (v * v) / (B * B) <= 1) e[i] = 1;
  }
  return e;
}

export function boxBlur(f, n, r) {
  let a = Float32Array.from(f), b = new Float32Array(f.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < n; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * n + Math.min(n - 1, Math.max(0, x))]; for (let x = 0; x < n; x++) { b[y * n + x] = s / (2 * r + 1); s += a[y * n + Math.min(n - 1, x + r + 1)] - a[y * n + Math.max(0, x - r)]; } }
    for (let x = 0; x < n; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[Math.min(n - 1, Math.max(0, y)) * n + x]; for (let y = 0; y < n; y++) { a[y * n + x] = s / (2 * r + 1); s += b[Math.min(n - 1, y + r + 1) * n + x] - b[Math.max(0, y - r) * n + x]; } }
  }
  return a;
}

/**
 * 「らしさ」の一致：本物の楕円 E を基準に、f = 形 − E（出っ張り＝+1、へこみ＝−1）を、
 * 本物・描いた形の両方で作り、ぼかしてから相関をとる（−1〜1）
 */
export function featureCorr(gd, gt, n, blurFrac = 0.035) {
  const e = momentEllipse(gt, n);
  const fd = new Float32Array(gd.length), ft = new Float32Array(gt.length);
  for (let i = 0; i < gd.length; i++) { fd[i] = gd[i] - e[i]; ft[i] = gt[i] - e[i]; }
  const r = Math.max(1, Math.round(n * blurFrac));
  const bd = boxBlur(fd, n, r), bt = boxBlur(ft, n, r);
  let sdt = 0, sdd = 0, stt = 0;
  for (let i = 0; i < bd.length; i++) { sdt += bd[i] * bt[i]; sdd += bd[i] * bd[i]; stt += bt[i] * bt[i]; }
  return sdd && stt ? sdt / Math.sqrt(sdd * stt) : 0;
}

// ---- 手描きをまねた絵 ----
export function rng(seed) { let s = seed % 2147483647 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()); }

function dp(pts, eps) {
  if (pts.length < 3) return pts;
  let idx = 0, dmax = 0;
  const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((y2 - y1) * pts[i][0] - (x2 - x1) * pts[i][1] + x2 * y1 - y2 * x1) / L;
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > eps) return dp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(dp(pts.slice(idx), eps));
  return [pts[0], pts[pts.length - 1]];
}

/** 閉じた形を、だいたいの大きさに対する割合 tol で大まかにする */
export function simplifyClosed(pts, tolFrac) {
  const st = stats(pts);
  const eps = Math.sqrt(st.area) * tolFrac;
  // 一番遠い2点で2つに分けて簡略化
  let far = 0, d = 0;
  for (let i = 0; i < pts.length; i++) { const dd = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (dd > d) { d = dd; far = i; } }
  const a = dp(pts.slice(0, far + 1), eps), b = dp(pts.slice(far).concat([pts[0]]), eps);
  return a.slice(0, -1).concat(b.slice(0, -1));
}

/** 点を細かく打ち直す（なめらかな揺れを付けるため） */
function resample(pts, n) {
  const seg = []; let tot = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(l); tot += l; }
  const out = []; let i = 0, acc = 0;
  for (let k = 0; k < n; k++) {
    const t = (k / n) * tot;
    while (acc + seg[i] < t && i < pts.length - 1) { acc += seg[i]; i++; }
    const a = pts[i], b = pts[(i + 1) % pts.length], f = seg[i] ? (t - acc) / seg[i] : 0;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

/**
 * 手描きのまね：大まかにする → 線をなめらかに揺らす（法線方向） → 縦横比のずれ → 少し回る
 */
export function handDraw(truth, level, r) {
  const st = stats(truth); const L = Math.sqrt(st.area);
  let p = simplifyClosed(truth, level.tol);
  p = resample(p, 240);
  const k = Array.from({ length: 4 }, () => r() * 6.283);
  const nPts = p.length;
  p = p.map(([x, y], i) => {
    const a = p[(i - 1 + nPts) % nPts], b = p[(i + 1) % nPts];
    let nx = b[1] - a[1], ny = -(b[0] - a[0]); const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const t = (i / nPts) * 6.283;
    const w = level.wob * L * (0.45 * Math.sin(2 * t + k[0]) + 0.3 * Math.sin(4 * t + k[1]) + 0.15 * Math.sin(7 * t + k[2]) + 0.1 * Math.sin(11 * t + k[3]));
    return [x + nx * w, y + ny * w];
  });
  const asp = Math.exp(gauss(r) * level.asp), rot = (gauss(r) * level.rot * Math.PI) / 180;
  const c = Math.cos(rot), s = Math.sin(rot);
  return p.map(([x, y]) => { const X = (x - st.cx) * asp, Y = (y - st.cy) / asp; return [X * c - Y * s, X * s + Y * c]; });
}

export const LEVELS = {
  'うまい': { tol: 0.02, wob: 0.025, asp: 0.05, rot: 4 },
  'ふつう': { tol: 0.05, wob: 0.05, asp: 0.10, rot: 8 },
  '雑': { tol: 0.10, wob: 0.08, asp: 0.18, rot: 14 },
};

export function circle(n = 64) { return Array.from({ length: n }, (_, i) => [Math.cos((i / n) * 6.283), Math.sin((i / n) * 6.283)]); }

/** 本物の「だいたいの楕円」（縦横比と傾きだけ合わせた絵）を点の並びで */
export function ellipseOf(truth) {
  const st = stats(truth);
  const pts = truth.map(([x, y]) => [x - st.cx, y - st.cy]);
  // 輪郭の点でなく面のモーメントが欲しいので、格子で求める
  const g = alignedGrids(truth, truth);
  let c = 0, mx = 0, my = 0; const n = g.n;
  for (let i = 0; i < g.gt.length; i++) if (g.gt[i]) { c++; mx += i % n; my += Math.floor(i / n); }
  mx /= c; my /= c; let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < g.gt.length; i++) if (g.gt[i]) { const x = (i % n) - mx, y = Math.floor(i / n) - my; sxx += x * x; syy += y * y; sxy += x * y; }
  const tr = (sxx + syy) / c, det = (sxx * syy - sxy * sxy) / (c * c);
  const l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det);
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), A = Math.sqrt(l1), B = Math.sqrt(l2);
  return Array.from({ length: 64 }, (_, i) => { const t = (i / 64) * 6.283; const u = Math.cos(t) * A, v = Math.sin(t) * B; return [u * Math.cos(th) - v * Math.sin(th), u * Math.sin(th) + v * Math.cos(th)]; });
}
