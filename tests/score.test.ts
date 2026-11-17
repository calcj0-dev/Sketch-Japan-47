import { describe, expect, it } from 'vitest';
import cases from './fixtures/compare_cases.json';
// 参照実装（設計資料 sim/score.mjs のコピー）
import * as ref from './fixtures/score.mjs';
import { iou, toScore, type Point } from '../src/core/score';
import { prefectures } from '../src/data';

type Case = { name: string; kind: string; truth: Point[]; drawn: Point[]; shapely: number };
const CFG = { iouZero: 0.3, iouFull: 0.95 };

describe('T-01 採点', () => {
  it('compare_cases の36通りで shapely との差が0.005以内、参照実装と同じ値', () => {
    expect(cases.length).toBe(36);
    for (const c of cases as unknown as Case[]) {
      const v = iou(c.drawn, c.truth);
      expect(Math.abs(v - c.shapely), `${c.name} ${c.kind}`).toBeLessThanOrEqual(0.005);
      expect(v).toBe(ref.iou(c.drawn, c.truth));
    }
  });

  it('本物と同じ形は100点。位置・大きさを変えても同じ点', () => {
    for (const p of prefectures) {
      const truth = p.points;
      expect(toScore(iou(truth, truth), CFG), p.nameJa).toBe(100);
      const moved = truth.map(([x, y]) => [x * 3.7 + 120, y * 3.7 - 45] as Point);
      expect(toScore(iou(moved, truth), CFG), p.nameJa).toBe(100);
    }
  });

  it('丸を描くと、丸い県は細長い県より点が高い', () => {
    const circle: Point[] = Array.from({ length: 64 }, (_, i) => [Math.cos((i / 64) * 2 * Math.PI) * 100, Math.sin((i / 64) * 2 * Math.PI) * 100]);
    const byName = (n: string) => prefectures.find((p) => p.nameJa === n)!.points;
    expect(iou(circle, byName('岡山県'))).toBeGreaterThan(iou(circle, byName('石川県')));
  });

  it('白紙・点が足りない線は重なり0', () => {
    expect(iou([], prefectures[0]!.points)).toBe(0);
    expect(iou([[0, 0], [1, 1]], prefectures[0]!.points)).toBe(0);
  });
});

describe('T-02 自分と交差する線', () => {
  it('8の字でも塗れて、自分自身との重なりは1', () => {
    const eight: Point[] = [[0, 0], [10, 10], [20, 0], [10, -10], [0, 0], [-10, 10], [-20, 0], [-10, -10]];
    expect(iou(eight, eight)).toBeCloseTo(1, 6);
  });
});

describe('T-03 点数の換え方', () => {
  it.each([
    [0, 0], [0.2, 0], [0.3, 0], [0.5, 31], [0.62, 49], [0.8, 77], [0.95, 100], [1, 100],
  ])('IoU %f → %i点', (v, s) => {
    expect(toScore(v, CFG)).toBe(s);
  });
});
