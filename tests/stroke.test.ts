import { describe, expect, it } from 'vitest';
import { isTooShort, judgeStroke } from '../src/core/stroke';
import type { Point } from '../src/core/score';
import { config, prefectures } from '../src/data';

const PAD = 390;
const square = (size: number, n = 40): Point[] =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 4, side = Math.floor(t), f = t - side;
    return ([[f, 0], [1, f], [1 - f, 1], [0, 1 - f]][side] as [number, number]).map((v) => v * size) as unknown as Point;
  });

describe('T-05 短すぎる線', () => {
  it('点が minPoints（8）より少ないと短すぎる', () => {
    expect(isTooShort(square(200, 7), PAD, config.stroke)).toBe(true);
    expect(isTooShort(square(200, 8), PAD, config.stroke)).toBe(false);
  });

  it('縦横の大きい方が短い辺の12%より小さいと短すぎる', () => {
    const limit = PAD * config.stroke.minSizeRatio; // 46.8px
    expect(isTooShort(square(limit - 0.1), PAD, config.stroke)).toBe(true);
    expect(isTooShort(square(limit), PAD, config.stroke)).toBe(false);
  });

  it('時間切れで線がない・短すぎるときは0点の白紙', () => {
    const truth = prefectures[0]!.points;
    expect(judgeStroke([], truth, PAD, config.stroke, config.scoring)).toEqual({ iou: 0, score: 0, blank: true });
    expect(judgeStroke(square(20), truth, PAD, config.stroke, config.scoring).blank).toBe(true);
  });

  it('ふつうの線は採点される', () => {
    const r = judgeStroke(square(200), prefectures[0]!.points, PAD, config.stroke, config.scoring);
    expect(r.blank).toBe(false);
    expect(r.iou).toBeGreaterThan(0);
  });
});
