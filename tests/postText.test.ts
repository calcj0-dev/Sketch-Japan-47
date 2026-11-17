import { describe, expect, it } from 'vitest';
import { challengePost, singlePost, X_LIMIT, xLength, zukanPost } from '../src/share/postText';
import { config, messages, prefectures } from '../src/data';

const ids = prefectures.map((p) => p.id);
const keys = config.comments.map((c) => c.key);
const longest = <T>(xs: T[], len: (x: T) => number) => xs.reduce((a, b) => (len(b) > len(a) ? b : a));
const longestId = longest(ids, (id) => messages[`prefectures.${id}`]!.length);
const longestKey = longest(keys, (k) => messages[`comments.${k}`]!.length);

describe('T-08 投稿文', () => {
  it('1問ずつ：例のとおりの文になる', () => {
    expect(singlePost('JP-01', 52, 'c50')).toBe('北海道を描いたら52点「雰囲気だけは伝わった」 #都道府県お絵かき採点');
  });

  it('47県：例のとおりの文になる', () => {
    expect(challengePost(52, 'JP-42', 17, 'c15')).toBe(
      '47都道府県を描いたら平均52点。一番ひどかったのは長崎県（17点「新しい県が誕生しました」） #都道府県お絵かき採点',
    );
  });

  it('一番長い県名・一言・点数でも、URL込みで X の上限（280）に収まる', () => {
    expect(xLength(singlePost(longestId, 100, longestKey))).toBeLessThanOrEqual(X_LIMIT);
    expect(xLength(challengePost(100, longestId, 100, longestKey))).toBeLessThanOrEqual(X_LIMIT);
    expect(xLength(zukanPost(100))).toBeLessThanOrEqual(X_LIMIT);
  });
});
