// 描いた線の判定と採点（設計書 1.3・3.2）。画面に依存しない

import { iou, toScore, type Point, type ScoringConfig } from './score';

export interface StrokeConfig {
  minPoints: number;
  minSizeRatio: number;
  sampleMinDistPx: number;
}

/** 短すぎる線か：点が minPoints より少ない、または線の縦横の大きい方が描く場所の短い辺の minSizeRatio より小さい */
export function isTooShort(points: readonly Point[], padSize: number, cfg: StrokeConfig): boolean {
  if (points.length < cfg.minPoints) return true;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return Math.max(maxX - minX, maxY - minY) < padSize * cfg.minSizeRatio;
}

export interface StrokeResult {
  /** 重なりの割合（白紙なら 0） */
  iou: number;
  score: number;
  /** 線がない・短すぎるまま時間切れになった（0点・「白紙で提出」。要件定義書 v1.2） */
  blank: boolean;
}

/**
 * 1県の採点。timeout が false で短すぎる線は呼ぶ側で「もう一度」にするので、ここには来ない前提。
 * 時間切れで線がない・短すぎるときは白紙として0点
 */
export function judgeStroke(
  points: readonly Point[],
  truth: readonly Point[],
  padSize: number,
  stroke: StrokeConfig,
  scoring: ScoringConfig,
): StrokeResult {
  if (isTooShort(points, padSize, stroke)) return { iou: 0, score: 0, blank: true };
  const v = iou(points, truth, scoring.grid);
  return { iou: v, score: toScore(v, scoring), blank: false };
}
