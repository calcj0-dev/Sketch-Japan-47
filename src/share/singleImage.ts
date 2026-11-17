// 1問ずつの結果画像（設計書 6.1。1200×630）：左に重ねた絵、右に県名・点数・一言、下に島の注意と作品名・URL

import type { Prefecture } from '../data';
import type { Point } from '../core/score';
import { t } from '../i18n';
import { drawOverlay, DEFAULT_OVERLAY } from '../ui/reveal';
import { displayUrl } from './share';

export const FONT = 'system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif';
export const COLORS = { bg: '#fdf8ee', ink: '#2b2b2b', muted: '#7a7468', accent: '#0d9488', border: '#e6dcc8' };

/** 横幅に収まるよう文字を小さくして書く */
export function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, weight = 700): void {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > maxW && s > 12) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  ctx.fillText(text, x, y);
}

export function renderSingleImage(pref: Prefecture, drawn: readonly Point[], score: number, commentKey: string): HTMLCanvasElement {
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // 左：重ねた絵
  const box = 520, bx = 40, by = 40;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(bx, by, box, box, 20);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(bx, by);
  drawOverlay(ctx, drawn, pref.points, box, 1, { ...DEFAULT_OVERLAY, lineWidth: 6 });
  ctx.restore();

  // 右：県名・点数・一言
  const rx = 610, rw = W - rx - 40;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.ink;
  fitText(ctx, t(`prefectures.${pref.id}`), rx, 150, rw, 72, 800);
  ctx.fillStyle = COLORS.accent;
  fitText(ctx, t('image.single.score', { score }), rx, 310, rw, 140, 800);
  ctx.fillStyle = COLORS.ink;
  fitText(ctx, t('result.comment', { comment: t(`comments.${commentKey}`) }), rx - 12, 400, rw + 12, 40, 700);

  // 下：島の注意（左）と作品名・URL（右）
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText(t('image.single.footer'), bx, 600);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(t('app.name'), W - 40, 560);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText(displayUrl(), W - 40, 600);
  return c;
}
