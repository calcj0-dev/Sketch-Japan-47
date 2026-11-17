// 図鑑（要件定義書 3.2 #16）：県ごとに一番点の高い絵を残す。画面に依存しない

import { decimate } from './challenge';
import type { Point } from './score';

export interface ZukanEntry {
  score: number;
  /** 間引いた線（描く場所の座標） */
  points: Point[];
}

export type Zukan = Record<string, ZukanEntry>;

/**
 * 1県の結果を入れた新しい図鑑。白紙は入れない。前より点が高いときだけ置き換える（同点は前の絵を残す）
 */
export function recordBest(z: Zukan, id: string, score: number, points: readonly Point[], blank: boolean): Zukan {
  if (blank || points.length < 3) return z;
  const prev = z[id];
  if (prev && prev.score >= score) return z;
  return { ...z, [id]: { score, points: decimate(points) } };
}

export function zukanCount(z: Zukan, ids: readonly string[]): number {
  return ids.filter((id) => id in z).length;
}

export function isZukanComplete(z: Zukan, ids: readonly string[]): boolean {
  return zukanCount(z, ids) === ids.length;
}

/** まだ描いていない県（ids の順） */
export function undrawn(z: Zukan, ids: readonly string[]): string[] {
  return ids.filter((id) => !(id in z));
}

/** 保存した文字列から戻す。おかしな項目は捨てる（全部は捨てない） */
export function parseZukan(raw: string | null, ids: readonly string[]): Zukan {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (typeof v !== 'object' || v === null) return {};
    const want = new Set(ids);
    const out: Zukan = {};
    for (const [id, e] of Object.entries(v)) {
      const entry = e as Partial<ZukanEntry>;
      if (!want.has(id) || typeof entry?.score !== 'number' || entry.score < 0 || entry.score > 100) continue;
      if (!Array.isArray(entry.points) || entry.points.length < 3) continue;
      out[id] = { score: entry.score, points: entry.points };
    }
    return out;
  } catch {
    return {};
  }
}
