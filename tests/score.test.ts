import { describe, expect, it } from 'vitest';
import cases from './fixtures/compare_cases.json';
// 参照実装（設計資料 sim/score.mjs のコピー）
import * as ref from './fixtures/score.mjs';
import { iou, similarity, toScore, type Point } from '../src/core/score';
import { config, prefectures } from '../src/data';

type Case = { name: string; kind: string; truth: Point[]; drawn: Point[]; shapely: number };
const S = config.scoring;
const byName = (n: string) => prefectures.find((p) => p.nameJa === n)!.points;
const score = (drawn: readonly Point[], truth: readonly Point[]) => toScore(similarity(drawn, truth, S), S);
const circle: Point[] = Array.from({ length: 64 }, (_, i) => [Math.cos((i / 64) * 2 * Math.PI) * 100, Math.sin((i / 64) * 2 * Math.PI) * 100]);

describe('T-01 採点', () => {
  it('重なり：compare_cases の36通りで shapely との差が0.005以内、参照実装と同じ値', () => {
    expect(cases.length).toBe(36);
    for (const c of cases as unknown as Case[]) {
      const v = iou(c.drawn, c.truth);
      expect(Math.abs(v - c.shapely), `${c.name} ${c.kind}`).toBeLessThanOrEqual(0.005);
      expect(v).toBe(ref.iou(c.drawn, c.truth));
    }
  });

  it('本物と同じ形は100点。位置・大きさを変えても同じ点', () => {
    for (const p of prefectures) {
      expect(score(p.points, p.points), p.nameJa).toBe(100);
      const moved = p.points.map(([x, y]) => [x * 3.7 + 120, y * 3.7 - 45] as Point);
      expect(score(moved, p.points), p.nameJa).toBe(100);
    }
  });

  it('丸を描いただけでは、どの県でも高い点にならない（丸い県でも50点未満）', () => {
    for (const p of prefectures) expect(score(circle, p.points), p.nameJa).toBeLessThan(50);
    // 今までの方式では満点近くが出ていた岡山県・栃木県
    expect(score(circle, byName('岡山県'))).toBeLessThan(50);
    expect(score(circle, byName('栃木県'))).toBeLessThan(50);
  });

  it('左右反対に描くと点が大きく下がる', () => {
    const p = byName('北海道');
    const mirror = p.map(([x, y]) => [-x, y] as Point);
    expect(score(mirror, p)).toBeLessThan(60);
  });

  it('白紙・点が足りない線は0', () => {
    expect(similarity([], prefectures[0]!.points, S)).toEqual({ iou: 0, feature: 0 });
    expect(score([[0, 0], [1, 1]], prefectures[0]!.points)).toBe(0);
  });

  it('1回の採点は0.1秒より十分短い', () => {
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) score(circle, prefectures[i]!.points);
    expect((performance.now() - t0) / 10).toBeLessThan(50);
  });
});

describe('T-02 自分と交差する線', () => {
  it('8の字でも塗れて、自分自身との重なりは1', () => {
    const eight: Point[] = [[0, 0], [10, 10], [20, 0], [10, -10], [0, 0], [-10, 10], [-20, 0], [-10, -10]];
    expect(iou(eight, eight)).toBeCloseTo(1, 6);
    expect(() => score(eight, byName('岡山県'))).not.toThrow();
  });
});

describe('T-03 点数の換え方（重なり4：らしさ6）', () => {
  const cfg = { ...S, iouZero: 0.35, iouFull: 0.9, featZero: 0.1, featFull: 0.9, weightIou: 0.4 };
  it.each([
    [{ iou: 1, feature: 1 }, 100],
    [{ iou: 0.9, feature: 0.9 }, 100],
    [{ iou: 0.35, feature: 0.1 }, 0],
    [{ iou: 0, feature: -1 }, 0],
    [{ iou: 0.9, feature: 0.1 }, 40],
    [{ iou: 0.35, feature: 0.9 }, 60],
    [{ iou: 0.625, feature: 0.5 }, 50],
  ])('%o → %i点', (sim, s) => {
    expect(toScore(sim, cfg)).toBe(s);
  });
});
