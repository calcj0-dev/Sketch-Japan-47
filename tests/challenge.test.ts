import { describe, expect, it } from 'vitest';
import {
  decimate, doneCount, isComplete, MAX_STROKE_POINTS, newChallenge, nextId, parseChallenge, record, summarize,
} from '../src/core/challenge';
import type { Point } from '../src/core/score';
import { prefectures } from '../src/data';

const ids = prefectures.map((p) => p.id);
const seeded = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

describe('T-07 47都道府県チャレンジ', () => {
  it('47県が重ならずに全部出る（ランダムな順）', () => {
    const s = newChallenge(ids, seeded(1));
    expect(new Set(s.order).size).toBe(47);
    expect([...s.order].sort()).toEqual([...ids].sort());
    expect(s.order).not.toEqual(ids);
  });

  it('1県ずつ記録すると、次の県が順に出て、47県で終わる', () => {
    let s = newChallenge(ids, seeded(2));
    const seen: string[] = [];
    while (!isComplete(s)) {
      const id = nextId(s)!;
      seen.push(id);
      s = record(s, id, 50, []);
    }
    expect(seen).toEqual(s.order);
    expect(doneCount(s)).toBe(47);
  });

  it('途中で保存して再開すると続きから', () => {
    let s = newChallenge(ids, seeded(3));
    for (let i = 0; i < 12; i++) s = record(s, nextId(s)!, i * 5, [[0, 0], [10, 0], [10, 10]]);
    const restored = parseChallenge(JSON.stringify(s), ids)!;
    expect(doneCount(restored)).toBe(12);
    expect(nextId(restored)).toBe(s.order[12]);
    expect(restored.strokes[s.order[0]!]).toEqual([[0, 0], [10, 0], [10, 10]]);
  });

  it('壊れた保存データは捨てて新しく始める', () => {
    expect(parseChallenge(null, ids)).toBeUndefined();
    expect(parseChallenge('{', ids)).toBeUndefined();
    expect(parseChallenge(JSON.stringify({ order: ids.slice(1), scores: {}, strokes: {} }), ids)).toBeUndefined();
    const s = newChallenge(ids, seeded(4));
    expect(parseChallenge(JSON.stringify({ ...s, scores: { [s.order[0]!]: 101 } }), ids)).toBeUndefined();
  });

  it('線は200点以下に間引く（47県で約100KB以内）', () => {
    const many: Point[] = Array.from({ length: 1500 }, (_, i) => [Math.cos(i) * 180.123, Math.sin(i) * 180.456]);
    expect(decimate(many).length).toBe(MAX_STROKE_POINTS);
    let s = newChallenge(ids, seeded(5));
    while (!isComplete(s)) s = record(s, nextId(s)!, 100, many);
    expect(JSON.stringify(s).length).toBeLessThan(150_000);
  });

  it('まとめ：平均・一番うまい県・一番ひどい県（同点は北の県）', () => {
    let s = newChallenge(ids, seeded(6));
    for (const id of ids) s = record(s, id, id === 'JP-42' ? 8 : id === 'JP-33' || id === 'JP-09' ? 95 : 50, []);
    const sum = summarize(s, ids);
    expect(sum.worst).toEqual({ id: 'JP-42', score: 8 });
    expect(sum.best).toEqual({ id: 'JP-09', score: 95 });
    expect(sum.average).toBe(Math.round((8 + 95 * 2 + 50 * 44) / 47));
  });
});
