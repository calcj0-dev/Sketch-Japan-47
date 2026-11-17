// タイトルの絵：日本地図のシルエット（県の形のデータから描く）に、1県だけ赤い手描き風の線がゆっくり描かれて重なる。
// 数秒ごとに別の県へ。動きを減らす設定の端末では、線を描いたままにする

import { prefectures, type Prefecture } from '../data';
import type { Point } from '../core/score';
import { fitMainland } from '../share/mapImage';

const OKINAWA = 'JP-47';
const FILLS = ['#a9d6cf', '#c8e6e1', '#8fcac0'];
const LINE = '#c0392b';
const DRAW_MS = 1800;
const HOLD_MS = 1600;

/** 手描き風にゆがめた輪郭（なめらかに揺らす） */
function wobble(points: readonly Point[], seed: number): Point[] {
  const k = [seed * 1.3, seed * 2.1, seed * 0.7];
  return points.map(([x, y], i) => {
    const t = (i / points.length) * Math.PI * 2;
    const r = 1 + 0.12 * (Math.sin(3 * t + k[0]!) * 0.5 + Math.sin(5 * t + k[1]!) * 0.3 + Math.sin(8 * t + k[2]!) * 0.2);
    return [x * r, y * r] as Point;
  });
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
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const { toPx } = fitMainland(size, size, size * 0.04);
  const main = prefectures.filter((p) => p.id !== OKINAWA);
  // 小さすぎる県は線が見えにくいので、ある程度大きい県から選ぶ
  const candidates = main.filter((p) => p.areaKm2 > 3000);
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const base = (): void => {
    ctx.clearRect(0, 0, size, size);
    main.forEach((p, i) => {
      ctx.beginPath();
      p.points.forEach(([x, y], j) => {
        const [px, py] = toPx(p.mapX + x, p.mapY + y);
        if (j) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = FILLS[i % FILLS.length]!;
      ctx.fill();
      ctx.strokeStyle = '#fdf8ee';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
  };

  const stroke = (p: Prefecture, line: Point[], upTo: number): void => {
    // 手描きの線は、本物より少し大きめに見えるよう 1.15 倍にして目立たせる
    const n = Math.max(2, Math.floor(line.length * upTo));
    ctx.beginPath();
    for (let j = 0; j < n; j++) {
      const [x, y] = line[j]!;
      const [px, py] = toPx(p.mapX + x * 1.15, p.mapY + y * 1.15);
      if (j) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    if (upTo >= 1) ctx.closePath();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  let seed = 1;
  let last: Prefecture | undefined;
  const pick = (): Prefecture => {
    let p: Prefecture;
    do p = candidates[Math.floor(Math.random() * candidates.length)]!;
    while (p === last && candidates.length > 1);
    last = p;
    return p;
  };

  const cycle = (): void => {
    if (!c.isConnected && seed > 1) return; // 画面が替わったら止める
    const p = pick();
    const line = wobble(p.points, seed++);
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
