// 答え合わせの絵（設計書 2章）：自分の線と本物を、それぞれ採点と同じそろえ方（面積1・重心が中心）で重ねる
// 本物は灰色の塗り、自分は赤い線＋うすい赤の塗り。結果画像（#7）でも drawOverlay を使う

import { normalizer, stats, type Point } from '../core/score';

export interface OverlayStyle {
  truthFill: string;
  lineColor: string;
  lineFill: string;
  lineWidth: number;
}

export const DEFAULT_OVERLAY: OverlayStyle = {
  truthFill: '#b9b9b9',
  lineColor: '#c0392b',
  lineFill: 'rgba(192, 57, 43, 0.15)',
  lineWidth: 4,
};

/** 2つの形を size×size の中に、そろえて置くための座標変換を作る */
export function overlayTransforms(drawn: readonly Point[], truth: readonly Point[], size: number, margin = 0.08) {
  const a = stats(drawn), b = stats(truth);
  const nb = normalizer(truth, b);
  const na = a.area > 0 ? normalizer(drawn, a) : { k: 0, r: 0 };
  const half = size / 2;
  const s = (half * (1 - margin * 2)) / Math.max(na.r, nb.r);
  const tfDrawn = (x: number, y: number): Point => [(x - a.cx) * na.k * s + half, (y - a.cy) * na.k * s + half];
  const tfTruth = (x: number, y: number): Point => [(x - b.cx) * nb.k * s + half, (y - b.cy) * nb.k * s + half];
  return { tfDrawn, tfTruth, hasDrawn: a.area > 0 };
}

function path(ctx: CanvasRenderingContext2D, pts: readonly Point[], tf: (x: number, y: number) => Point): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const [px, py] = tf(x, y);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

/**
 * ctx の (0,0)〜(size,size) に重ねた絵を描く。truthAlpha は本物の濃さ（演出で 0→1）
 */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  drawn: readonly Point[],
  truth: readonly Point[],
  size: number,
  truthAlpha = 1,
  style: OverlayStyle = DEFAULT_OVERLAY,
): void {
  const { tfDrawn, tfTruth, hasDrawn } = overlayTransforms(drawn, truth, size);
  ctx.save();
  if (truthAlpha > 0) {
    ctx.globalAlpha = truthAlpha;
    ctx.fillStyle = style.truthFill;
    path(ctx, truth, tfTruth);
    ctx.fill('evenodd');
    ctx.globalAlpha = 1;
  }
  if (hasDrawn) {
    path(ctx, drawn, tfDrawn);
    ctx.fillStyle = style.lineFill;
    ctx.fill('nonzero');
    ctx.strokeStyle = style.lineColor;
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 演出：本物がふわっと重なり、点数が0から数え上がる。終わったら resolve
 * onCount には途中の点数が渡る
 */
export function animateReveal(
  canvas: HTMLCanvasElement,
  size: number,
  drawn: readonly Point[],
  truth: readonly Point[],
  score: number,
  ms: number,
  onCount: (n: number) => void,
): Promise<void> {
  const ctx = canvas.getContext('2d')!;
  const dpr = canvas.width / size;
  return new Promise((resolve) => {
    const t0 = performance.now();
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / Math.max(1, ms));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      // 前半の4割で本物が出て、点数は全体で数え上がる（最後はゆっくり）
      drawOverlay(ctx, drawn, truth, size, Math.min(1, p / 0.4));
      const eased = 1 - Math.pow(1 - p, 3);
      onCount(Math.round(score * eased));
      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
