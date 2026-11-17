// 図鑑の読み書き（端末に保存）

import { prefectures } from '../data';
import type { Point } from '../core/score';
import { parseZukan, recordBest, type Zukan } from '../core/zukan';
import { load, save } from '../storage';

export const PREF_IDS = prefectures.map((p) => p.id);

export function loadZukan(): Zukan {
  return parseZukan(load('zukan'), PREF_IDS);
}

/** 描いた結果を図鑑に入れる（前より点が高いときだけ） */
export function addToZukan(id: string, score: number, points: readonly Point[], blank: boolean): void {
  const before = loadZukan();
  const after = recordBest(before, id, score, points, blank);
  if (after !== before) save('zukan', JSON.stringify(after));
}
