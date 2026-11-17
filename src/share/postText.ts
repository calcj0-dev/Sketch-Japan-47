// 投稿文（設計書 1.6）。文面は i18n の share.*。URL は含めない（投稿画面・Web Share に別に渡す）

import { config } from '../data';
import { t } from '../i18n';

const name = (id: string) => t(`prefectures.${id}`);

export function singlePost(id: string, score: number, commentKey: string): string {
  return t('share.single', { name: name(id), score, comment: t(`comments.${commentKey}`), hashtag: config.hashtag });
}

export function challengePost(avg: number, worstId: string, worstScore: number, worstCommentKey: string): string {
  return t('share.challenge', {
    avg,
    worstName: name(worstId),
    worstScore,
    worstComment: t(`comments.${worstCommentKey}`),
    hashtag: config.hashtag,
  });
}

export function zukanPost(avg: number): string {
  return t('share.zukan', { avg, hashtag: config.hashtag });
}

/** X の文字数の数え方：URL は23、下の範囲の文字は1、それ以外（日本語など）は2。上限280（前作と同じ） */
export const X_LIMIT = 280;
const X_URL_WEIGHT = 23;
const LIGHT_RANGES: [number, number][] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];

export function xLength(text: string, withUrl = true): number {
  let n = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    n += LIGHT_RANGES.some(([a, b]) => code >= a && code <= b) ? 1 : 2;
  }
  return withUrl ? n + 1 + X_URL_WEIGHT : n;
}
