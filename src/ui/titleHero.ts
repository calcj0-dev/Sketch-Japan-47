// タイトルの絵：日本地図の1色のシルエット（県境・県ごとの色分けはなし。答えにならないように）に、
// 赤い手描き風の「ぐるっと描いた輪」がゆっくり描かれて重なる。輪の形は県の形と関係のない、ゆがんだ楕円。
// 数秒ごとに別の場所へ。動きを減らす設定の端末では、輪を描いたままにする

import { prefectures, type Prefecture } from '../data';
import type { Point } from '../core/score';
import { fitMainland } from '../share/mapImage';

const OKINAWA = 'JP-47';
const FILL = '#a9d6cf';
const LINE = '#c0392b';
const DRAW_MS = 1800;
const HOLD_MS = 1600;

/** 県の面積くらいの大きさの、でたらめにゆがんだ輪（km、中心が原点）。少し行き過ぎて終わる */
function scribble(areaKm2: number, rand: () => number): Point[] {
  const R = Math.sqrt(areaKm2 / Math.PI) * 1.15;
  const a = 0.75 + rand() * 0.55;
  const rot = rand() * Math.PI;
  const k = [rand() * 6, rand() * 6, rand() * 6];
  const n = 72, turns = 1.08;
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2 * turns;
    const r = 1 + 0.1 * (Math.sin(2 * t + k[0]!) * 0.5 + Math.sin(3 * t + k[1]!) * 0.3 + Math.sin(5 * t + k[2]!) * 0.2);
    const x = Math.cos(t) * R * a * r, y = Math.sin(t) * (R / a) * r;
    out.push([x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
}

export function titleHero(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.className = 'title-hero';
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  c.width = Math.round(size * dpr);
  c.height = Math.round(size * dpr);
  c.style.width = `${size}px`;
  c.style.height = `${size}px`;
  c.setAttribute('aria-hidden', 'true');
  const ctx = c.getContext('2d')!;

  const { toPx } = fitMainland(size, size, size * 0.04);
  const main = prefectures.filter((p) => p.id !== OKINAWA);
  // 小さすぎる県は輪が見えにくいので、ある程度大きい県の場所から選ぶ
  const candidates = main.filter((p) => p.areaKm2 > 3000);
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // シルエットは1回だけ描いて取っておく。県と県のすき間が線に見えないよう、同じ色で縁も塗る
  const sil = document.createElement('canvas');
  sil.width = c.width;
  sil.height = c.height;
  const sctx = sil.getContext('2d')!;
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.fillStyle = FILL;
  sctx.strokeStyle = FILL;
  sctx.lineWidth = 1.2;
  sctx.lineJoin = 'round';
  for (const p of main) {
    sctx.beginPath();
    p.points.forEach(([x, y], j) => {
      const [px, py] = toPx(p.mapX + x, p.mapY + y);
      if (j) sctx.lineTo(px, py);
      else sctx.moveTo(px, py);
    });
    sctx.closePath();
    sctx.fill();
    sctx.stroke();
  }

  const base = (): void => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(sil, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const stroke = (p: Prefecture, line: Point[], upTo: number): void => {
    const n = Math.max(2, Math.floor(line.length * upTo));
    ctx.beginPath();
    for (let j = 0; j < n; j++) {
      const [x, y] = line[j]!;
      const [px, py] = toPx(p.mapX + x, p.mapY + y);
      if (j) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  let last: Prefecture | undefined;
  const pick = (): Prefecture => {
    let p: Prefecture;
    do p = candidates[Math.floor(Math.random() * candidates.length)]!;
    while (p === last && candidates.length > 1);
    last = p;
    return p;
  };

  let started = false;
  const cycle = (): void => {
    if (started && !c.isConnected) return; // 画面が替わったら止める
    started = true;
    const p = pick();
    const line = scribble(p.areaKm2, Math.random);
    if (reduce) {
      base();
      stroke(p, line, 1);
      return;
    }
    const t0 = performance.now();
    const frame = (now: number): void => {
      if (!c.isConnected) return;
      const k = Math.min(1, (now - t0) / DRAW_MS);
      base();
      stroke(p, line, k);
      if (k < 1) requestAnimationFrame(frame);
      else setTimeout(cycle, HOLD_MS);
    };
    requestAnimationFrame(frame);
  };
  base();
  // 画面に置かれてから動かし始める
  requestAnimationFrame(() => cycle());
  return c;
}
