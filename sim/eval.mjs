// 採点方法の候補を、同じ試算データで比べる
import fs from 'node:fs';
const rows = JSON.parse(fs.readFileSync(new URL('./rows.json', import.meta.url)));
const lin = (v, z, f) => Math.max(0, Math.min(1, (v - z) / (f - z)));
const R = (x) => Math.round(x * 100);

const methods = {
  '今（重なりだけ 20→85%）': (r) => R(lin(r.iou, 0.2, 0.85)),
  '旧（重なりだけ 30→95%）': (r) => R(lin(r.iou, 0.3, 0.95)),
  'らしさだけ': (r) => R(lin(r.feat, 0.1, 0.9)),
  '半々 A': (r) => R(0.5 * lin(r.iou, 0.3, 0.9) + 0.5 * lin(r.feat, 0.1, 0.9)),
  '半々 B': (r) => R(0.5 * lin(r.iou, 0.35, 0.9) + 0.5 * lin(r.feat, 0.15, 0.95)),
  '重なり4:らしさ6': (r) => R(0.4 * lin(r.iou, 0.35, 0.9) + 0.6 * lin(r.feat, 0.1, 0.9)),
  '重なり3:らしさ7': (r) => R(0.3 * lin(r.iou, 0.35, 0.9) + 0.7 * lin(r.feat, 0.1, 0.9)),
  '掛け算': (r) => R(Math.sqrt(lin(r.iou, 0.3, 0.9) * lin(r.feat, 0.05, 0.9))),
};
const kinds = ['丸', '楕円', '別の県', '雑', 'ふつう', 'うまい'];
const prefs = [...new Set(rows.map((r) => r.pref))];
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => Math.sqrt(mean(a.map((x) => (x - mean(a)) ** 2)));

for (const [name, f] of Object.entries(methods)) {
  const sc = rows.map((r) => ({ ...r, s: f(r) }));
  const line = kinds.map((k) => {
    const per = prefs.map((p) => mean(sc.filter((r) => r.kind === k && r.pref === p).map((r) => r.s)));
    return `${k} ${Math.round(mean(per))}(${Math.round(Math.min(...per))}-${Math.round(Math.max(...per))})`;
  });
  // 順番が正しい県の割合：うまい > ふつう > 雑 > max(丸, 楕円)
  let ok = 0, okTop = 0;
  const within = [];
  for (const p of prefs) {
    const m = (k) => mean(sc.filter((r) => r.kind === k && r.pref === p).map((r) => r.s));
    if (m('うまい') > m('ふつう') && m('ふつう') > m('雑') && m('雑') > Math.max(m('丸'), m('楕円'))) ok++;
    if (m('ふつう') > Math.max(m('丸'), m('楕円'), m('別の県'))) okTop++;
    for (const k of ['うまい', 'ふつう', '雑']) within.push(sd(sc.filter((r) => r.kind === k && r.pref === p).map((r) => r.s)));
  }
  const fair = ['うまい', 'ふつう'].map((k) => Math.round(sd(prefs.map((p) => mean(sc.filter((r) => r.kind === k && r.pref === p).map((r) => r.s)))))).join('/');
  console.log(`\n■ ${name}\n  ${line.join(' | ')}\n  順番どおりの県 ${ok}/47、ふつう＞丸・楕円・別の県 ${okTop}/47、県による差（うまい/ふつうの標準偏差）${fair}、同じ出来でのぶれ ${mean(within).toFixed(1)}点`);
}
// 苦手な県（順番が崩れる県）を、候補ごとに
const show = (name) => {
  const f = methods[name];
  const bad = prefs.filter((p) => {
    const m = (k) => mean(rows.filter((r) => r.kind === k && r.pref === p).map(f));
    return !(m('ふつう') > Math.max(m('丸'), m('楕円'), m('別の県')));
  });
  console.log(name, '：ふつう が 丸・楕円・別の県 に負ける県', bad.join('、') || 'なし');
};
show('今（重なりだけ 20→85%）');
show('半々 A');
show('重なり4:らしさ6');
show('重なり3:らしさ7');
