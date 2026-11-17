// 順番を混ぜる・1つ選ぶ。rand は差し替えられる（テスト用）

export type Rand = () => number;

/** フィッシャー–イェーツで混ぜた新しい配列 */
export function shuffle<T>(items: readonly T[], rand: Rand = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** ランダムに1つ。avoid と同じものは（ほかに候補があれば）選ばない */
export function pickOther<T>(items: readonly T[], avoid: T | undefined, rand: Rand = Math.random): T {
  const pool = items.length > 1 && avoid !== undefined ? items.filter((x) => x !== avoid) : items;
  return pool[Math.floor(rand() * pool.length)]!;
}
