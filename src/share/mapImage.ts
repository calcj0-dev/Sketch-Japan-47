// 「あなたの日本地図」（設計書 6.2。1200×1200。見た目の試し sim/mymap_mock.png）
// 下に本物の46県を薄い灰色、その上に自分の絵を「本物と同じ面積・同じ重心」にそろえて県の位置に置く。
// 塗りの色は点数（低い＝クリーム色〜高い＝緑青）、線は赤。沖縄県は左上の枠に同じ縮尺で置く

import { config, prefectures, type Prefecture } from '../data';
import { stats, type Point } from '../core/score';
import { t } from '../i18n';
import { displayUrl } from './share';
import { COLORS, FONT } from './singleImage';

export interface MapEntry {
  score: number;
  /** 描いた線（描く場所の座標）。白紙なら [] */
  points: readonly Point[];
}

const OKINAWA = 'JP-47';

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 点数の色（0点＝colorLow、100点＝colorHigh） */
export function scoreColor(score: number): string {
  const a = hex(config.map.colorLow), b = hex(config.map.colorHigh);
  const k = Math.max(0, Math.min(1, score / 100));
  const m = a.map((v, i) => Math.round(v + (b[i]! - v) * k));
  return `rgb(${m[0]}, ${m[1]}, ${m[2]})`;
}

type Tf = (x: number, y: number) => Point;

function path(ctx: CanvasRenderingContext2D, pts: readonly Point[], tf: Tf): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const [px, py] = tf(x, y);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

/** 県の本物（km、重心が原点）を、地図の上の位置（km）→ 画像の座標に置く変換 */
function placeTruth(p: Prefecture, toPx: Tf): Tf {
  return (x, y) => toPx(p.mapX + x, p.mapY + y);
}

/** 描いた線を、本物と同じ面積・同じ重心にそろえて置く変換（採点と同じそろえ方。向きはそのまま） */
function placeDrawn(p: Prefecture, drawn: readonly Point[], toPx: Tf): Tf | undefined {
  const a = stats(drawn), b = stats(p.points);
  if (a.area <= 0 || b.area <= 0) return undefined;
  const k = Math.sqrt(b.area / a.area);
  return (x, y) => toPx(p.mapX + b.cx + (x - a.cx) * k, p.mapY + b.cy + (y - a.cy) * k);
}

/** 沖縄県を除く46県の位置と形が、W×H の中に余白 pad を残して収まる変換（km → 画像の座標） */
export function fitMainland(W: number, H: number, pad: number): { toPx: Tf; scale: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of prefectures) {
    if (p.id === OKINAWA) continue;
    for (const [x, y] of p.points) {
      minX = Math.min(minX, p.mapX + x);
      maxX = Math.max(maxX, p.mapX + x);
      minY = Math.min(minY, p.mapY + y);
      maxY = Math.max(maxY, p.mapY + y);
    }
  }
  const scale = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY));
  const offX = (W - (maxX - minX) * scale) / 2, offY = (H - (maxY - minY) * scale) / 2;
  return { toPx: (x, y) => [(x - minX) * scale + offX, (y - minY) * scale + offY], scale };
}

export function renderMapImage(entries: Record<string, MapEntry>, average: number): HTMLCanvasElement {
  const { imageSize: S, padding: pad, okinawaInset: inset } = config.map;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, S, S);

  const { toPx, scale } = fitMainland(S, S, pad);

  // 沖縄県：左上の枠の真ん中に、同じ縮尺で
  const oki = prefectures.find((p) => p.id === OKINAWA)!;
  const okiPx: Tf = (x, y) => [inset.x + inset.size / 2 + (x - oki.mapX) * scale, inset.y + inset.size / 2 + (y - oki.mapY) * scale];
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = '#cfcfcf';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(inset.x, inset.y, inset.size, inset.size);
  ctx.restore();

  const placer = (p: Prefecture): Tf => (p.id === OKINAWA ? okiPx : toPx);

  // 1. 本物（薄い灰色）
  ctx.fillStyle = config.map.truthFill;
  ctx.strokeStyle = '#dddddd';
  ctx.lineWidth = 1;
  for (const p of prefectures) {
    path(ctx, p.points, placeTruth(p, placer(p)));
    ctx.fill('evenodd');
    ctx.stroke();
  }

  // 2. 自分の絵（点数の低い県から描き、高い県が上に来る）
  const drawn = prefectures
    .map((p) => ({ p, e: entries[p.id] }))
    .filter((x): x is { p: Prefecture; e: MapEntry } => !!x.e && x.e.points.length >= 3)
    .sort((a, b) => a.e.score - b.e.score);
  ctx.lineJoin = 'round';
  for (const { p, e } of drawn) {
    const tf = placeDrawn(p, e.points, placer(p));
    if (!tf) continue;
    path(ctx, e.points, tf);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = scoreColor(e.score);
    ctx.fill('nonzero');
    ctx.globalAlpha = 1;
    ctx.strokeStyle = config.map.lineColor;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // 3. 文字：右下に平均点・作品名・URL、左下に島の注意
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 52px ${FONT}`;
  ctx.fillText(t('image.map.average', { score: average }), S - pad, S - 80);
  ctx.font = `400 22px ${FONT}`;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`${t('app.name')}  ${displayUrl()}`, S - pad, S - 44);
  ctx.textAlign = 'left';
  ctx.font = `400 18px ${FONT}`;
  ctx.fillText(t('image.single.footer'), pad, S - 24);
  return c;
}
