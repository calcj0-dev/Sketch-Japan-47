// 試算：描き方×47県×5回で、重なり（IoU）と「らしさ」の相関を出して保存
import fs from 'node:fs';
import { alignedGrids, circle, ellipseOf, featureCorr, handDraw, iouOf, LEVELS, rng } from './lib.mjs';

const prefs = JSON.parse(fs.readFileSync(new URL('../src/data/prefectures.json', import.meta.url))).prefectures;
const REP = 5;
const rows = [];
const t0 = Date.now();
for (const p of prefs) {
  const truth = p.points;
  const r = rng(p.code * 7919);
  const add = (kind, drawn, rep = 0) => {
    const g = alignedGrids(drawn, truth);
    rows.push({ pref: p.nameJa, id: p.id, kind, rep, iou: iouOf(g.gd, g.gt), feat: featureCorr(g.gd, g.gt, g.n) });
  };
  add('丸', circle());
  add('楕円', ellipseOf(truth));
  for (const [lv, cfg] of Object.entries(LEVELS)) for (let k = 0; k < REP; k++) add(lv, handDraw(truth, cfg, r), k);
  // 別の県を上手に描いた絵（その県と形の違う、ランダムな別の県）
  for (let k = 0; k < REP; k++) {
    const other = prefs[Math.floor(r() * prefs.length)];
    if (other.id === p.id) continue;
    add('別の県', handDraw(other.points, LEVELS['うまい'], r), k);
  }
}
fs.writeFileSync(new URL('./rows.json', import.meta.url), JSON.stringify(rows));
console.log('rows', rows.length, 'sec', (Date.now() - t0) / 1000);
