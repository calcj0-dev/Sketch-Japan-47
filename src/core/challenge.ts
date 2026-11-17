// 47都道府県チャレンジの状態（設計書 1.2・5.3）。画面に依存しない。端末への保存は JSON の文字列で行う

import type { Point } from './score';
import { shuffle, type Rand } from './shuffle';

export interface ChallengeState {
  /** 出す順（県ID） */
  order: string[];
  /** 描き終えた県の点数 */
  scores: Record<string, number>;
  /** 描き終えた県の線（間引いたもの。白紙は []） */
  strokes: Record<string, Point[]>;
  startedAt: number;
}

/** 1県あたりに残す点の数の上限（47県で約100KB） */
export const MAX_STROKE_POINTS = 200;

export function newChallenge(ids: readonly string[], rand: Rand = Math.random, now = Date.now()): ChallengeState {
  return { order: shuffle(ids, rand), scores: {}, strokes: {}, startedAt: now };
}

export function doneCount(s: ChallengeState): number {
  return s.order.filter((id) => id in s.scores).length;
}

/** 次に描く県。全部終わっていれば undefined */
export function nextId(s: ChallengeState): string | undefined {
  return s.order.find((id) => !(id in s.scores));
}

export function isComplete(s: ChallengeState): boolean {
  return nextId(s) === undefined;
}

/** 線を max 点以下に、なるべく均等に間引く。座標は小数1桁に丸める */
export function decimate(points: readonly Point[], max = MAX_STROKE_POINTS): Point[] {
  const round = (v: number) => Math.round(v * 10) / 10;
  const pick: Point[] = [];
  if (points.length <= max) {
    for (const [x, y] of points) pick.push([round(x), round(y)]);
    return pick;
  }
  for (let i = 0; i < max; i++) {
    const [x, y] = points[Math.floor((i * points.length) / max)]!;
    pick.push([round(x), round(y)]);
  }
  return pick;
}

/** 1県の結果を記録した新しい状態 */
export function record(s: ChallengeState, id: string, score: number, points: readonly Point[]): ChallengeState {
  return {
    ...s,
    scores: { ...s.scores, [id]: score },
    strokes: { ...s.strokes, [id]: decimate(points) },
  };
}

/** 保存した文字列から戻す。壊れている・県の集まりが違う場合は undefined（新しく始める） */
export function parseChallenge(raw: string | null, ids: readonly string[]): ChallengeState | undefined {
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw) as Partial<ChallengeState>;
    if (!Array.isArray(v.order) || v.order.length !== ids.length) return undefined;
    const want = new Set(ids);
    if (new Set(v.order).size !== ids.length || !v.order.every((id) => want.has(id))) return undefined;
    if (typeof v.scores !== 'object' || v.scores === null || typeof v.strokes !== 'object' || v.strokes === null) return undefined;
    for (const [id, sc] of Object.entries(v.scores)) {
      if (!want.has(id) || typeof sc !== 'number' || sc < 0 || sc > 100) return undefined;
    }
    for (const pts of Object.values(v.strokes)) {
      if (!Array.isArray(pts)) return undefined;
    }
    return { order: v.order, scores: v.scores, strokes: v.strokes as Record<string, Point[]>, startedAt: Number(v.startedAt) || 0 };
  } catch {
    return undefined;
  }
}

export interface ChallengeSummary {
  average: number;
  best: { id: string; score: number };
  worst: { id: string; score: number };
}

/**
 * まとめ。同じ点の県が複数あれば、northOrder（北から順の県ID）で先に来る県を選ぶ
 */
export function summarize(s: ChallengeState, northOrder: readonly string[]): ChallengeSummary {
  const ids = northOrder.filter((id) => id in s.scores);
  let best = ids[0]!, worst = ids[0]!, sum = 0;
  for (const id of ids) {
    const sc = s.scores[id]!;
    sum += sc;
    if (sc > s.scores[best]!) best = id;
    if (sc < s.scores[worst]!) worst = id;
  }
  return {
    average: Math.round(sum / Math.max(1, ids.length)),
    best: { id: best, score: s.scores[best]! },
    worst: { id: worst, score: s.scores[worst]! },
  };
}
