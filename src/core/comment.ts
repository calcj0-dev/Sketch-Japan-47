// 一言コメント（設計書 1.4。段階は config.json の comments、文は i18n の comments.*）

export interface CommentRule {
  min: number;
  key: string;
}

/** 点数に合う一言のキー（例 "c40"）。rules は min の大きい順でなくてもよい */
export function commentKey(score: number, rules: readonly CommentRule[]): string {
  const sorted = [...rules].sort((a, b) => b.min - a.min);
  for (const r of sorted) if (score >= r.min) return r.key;
  return sorted[sorted.length - 1]!.key;
}
