import { describe, expect, it } from 'vitest';
import { isZukanComplete, parseZukan, recordBest, undrawn, zukanCount, type Zukan } from '../src/core/zukan';
import type { Point } from '../src/core/score';
import { prefectures } from '../src/data';

const ids = prefectures.map((p) => p.id);
const tri: Point[] = [[0, 0], [100, 0], [50, 80]];
const sq: Point[] = [[0, 0], [100, 0], [100, 100], [0, 100]];

describe('図鑑', () => {
  it('県ごとに一番点の高い絵を残す（同点は前の絵）', () => {
    let z: Zukan = {};
    z = recordBest(z, 'JP-01', 40, tri, false);
    z = recordBest(z, 'JP-01', 30, sq, false);
    expect(z['JP-01']).toEqual({ score: 40, points: tri });
    z = recordBest(z, 'JP-01', 40, sq, false);
    expect(z['JP-01']!.points).toEqual(tri);
    z = recordBest(z, 'JP-01', 75, sq, false);
    expect(z['JP-01']).toEqual({ score: 75, points: sq });
  });

  it('白紙は入れない。描いて0点は入れる', () => {
    expect(recordBest({}, 'JP-02', 0, [], true)).toEqual({});
    expect(recordBest({}, 'JP-02', 0, tri, false)['JP-02']!.score).toBe(0);
  });

  it('数・そろったか・まだの県', () => {
    let z: Zukan = {};
    for (const id of ids.slice(0, 45)) z = recordBest(z, id, 50, tri, false);
    expect(zukanCount(z, ids)).toBe(45);
    expect(undrawn(z, ids)).toEqual(['JP-46', 'JP-47']);
    expect(isZukanComplete(z, ids)).toBe(false);
    for (const id of ids.slice(45)) z = recordBest(z, id, 50, tri, false);
    expect(isZukanComplete(z, ids)).toBe(true);
  });

  it('保存から戻す。おかしな項目だけ捨てる', () => {
    const z = recordBest(recordBest({}, 'JP-01', 40, tri, false), 'JP-13', 90, sq, false);
    const raw = JSON.stringify({ ...z, 'JP-99': { score: 1, points: tri }, 'JP-02': { score: 500, points: tri } });
    expect(parseZukan(raw, ids)).toEqual(z);
    expect(parseZukan('{', ids)).toEqual({});
    expect(parseZukan(null, ids)).toEqual({});
  });
});
