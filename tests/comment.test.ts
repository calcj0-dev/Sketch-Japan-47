import { describe, expect, it } from 'vitest';
import { BLANK_KEY, commentKey } from '../src/core/comment';
import { config, messages } from '../src/data';

describe('T-04 一言（5点刻み）', () => {
  it.each([
    [100, 'c100'], [99, 'c95'], [95, 'c95'], [94, 'c90'], [90, 'c90'], [89, 'c85'], [50, 'c50'], [49, 'c45'],
    [10, 'c10'], [9, 'c5'], [5, 'c5'], [4, 'c1'], [1, 'c1'], [0, 'c0'],
  ])('%i点 → %s', (score, key) => {
    expect(commentKey(score, config.comments)).toBe(key);
  });

  it('0点から100点まで、どの点数にも文がある。100点と95〜99点は別の一言', () => {
    for (let s = 0; s <= 100; s++) expect(messages[`comments.${commentKey(s, config.comments)}`], `${s}点`).toBeTruthy();
    expect(commentKey(100, config.comments)).not.toBe(commentKey(99, config.comments));
  });

  it('白紙だけが「白紙で提出」。描いて0点は別の一言（要件定義書 3.2 #14 の変更）', () => {
    expect(commentKey(0, config.comments, true)).toBe(BLANK_KEY);
    expect(messages[`comments.${BLANK_KEY}`]).toBe('白紙で提出');
    expect(messages[`comments.${commentKey(0, config.comments)}`]).toBe('それは県ではありません');
  });
});
