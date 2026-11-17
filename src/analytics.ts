// 計測：ページの表示だけを Vercel Analytics で数える（GA4 は使わない。2026-11-17 決定）。
// 描いた線・点数はどこにも送らない。読み込めなくても遊べる

import { inject } from '@vercel/analytics';

export function initAnalytics(): void {
  try {
    if (import.meta.env.PROD) inject({ mode: 'production', framework: 'vanilla' });
  } catch {
    // 広告ブロックなどで読み込めなくても遊べる
  }
}
