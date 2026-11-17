// 一言コメント（設計書 1.4。5点刻みの段階は config.json の comments、文は i18n の comments.*）
// 線を描かずに時間切れ（白紙）は、点数の段階とは別の BLANK_KEY（要件定義書 3.2 #14 の変更）

export interface CommentRule {
  min: number;
  key: string;
}

/** 白紙のときの一言のキー（comments.blank） */
export const BLANK_KEY = 'blank';

/** 点数に合う一言のキー（例 "c40"）。blank なら白紙の一言。rules は min の大きい順でなくてもよい */
export function commentKey(score: number, rules: readonly CommentRule[], blank = false): string {
  if (blank) return BLANK_KEY;
  const sorted = [...rules].sort((a, b) => b.min - a.min);
  for (const r of sorted) if (score >= r.min) return r.key;
  return sorted[sorted.length - 1]!.key;
}
