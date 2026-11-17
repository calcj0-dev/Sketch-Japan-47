import fs from 'node:fs';
import { alignedGrids, featureCorr, iouOf, stats } from './lib.mjs';
const prefs = JSON.parse(fs.readFileSync(new URL('../src/data/prefectures.json', import.meta.url))).prefectures;
const lin = (v, z, f) => Math.max(0, Math.min(1, (v - z) / (f - z)));
const M = {
  '今': (i, f) => Math.round(lin(i, 0.2, 0.85) * 100),
  '4:6': (i, f) => Math.round((0.4 * lin(i, 0.35, 0.9) + 0.6 * lin(f, 0.1, 0.9)) * 100),
  '半々A': (i, f) => Math.round((0.5 * lin(i, 0.3, 0.9) + 0.5 * lin(f, 0.1, 0.9)) * 100),
};
const tf = (pts, fn) => { const s = stats(pts); return pts.map(([x, y]) => fn(x - s.cx, y - s.cy)); };
const rot = (d) => (x, y) => { const a = d * Math.PI / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; };
const cases = {
  '本物そのまま': (p) => p,
  '10度回す': (p) => tf(p, rot(10)),
  '20度回す': (p) => tf(p, rot(20)),
  '横に1.2倍': (p) => tf(p, (x, y) => [x * 1.2, y]),
  '横に1.4倍': (p) => tf(p, (x, y) => [x * 1.4, y]),
  '左右反対': (p) => tf(p, (x, y) => [-x, y]),
  '特徴を大げさに(1.3倍)': (p) => { const s = stats(p); const R = Math.sqrt(s.area / Math.PI); return tf(p, (x, y) => { const d = Math.hypot(x, y) || 1; const k = (R + (d - R) * 1.3) / d; return [x * k, y * k]; }); },
};
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
for (const [name, fn] of Object.entries(cases)) {
  const res = Object.fromEntries(Object.keys(M).map((m) => [m, []]));
  for (const p of prefs) { const g = alignedGrids(fn(p.points), p.points); const i = iouOf(g.gd, g.gt), f = featureCorr(g.gd, g.gt, g.n); for (const m in M) res[m].push(M[m](i, f)); }
  console.log(name.padEnd(12), Object.entries(res).map(([m, v]) => `${m} ${Math.round(mean(v))}(${Math.min(...v)}-${Math.max(...v)})`).join(' | '));
}
// ぼかしの強さを変えても結果がほぼ同じか（ふつう の平均）
