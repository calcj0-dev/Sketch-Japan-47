import { describe, expect, it } from 'vitest';
import { commentKey } from '../src/core/comment';
import { config, messages } from '../src/data';

describe('T-04 一言', () => {
  it.each([
    [0, 'c0'], [1, 'c1'], [19, 'c1'], [20, 'c20'], [39, 'c20'], [40, 'c40'], [59, 'c40'],
    [60, 'c60'], [74, 'c60'], [75, 'c75'], [89, 'c75'], [90, 'c90'], [100, 'c90'],
  ])('%i点 → %s', (score, key) => {
    expect(commentKey(score, config.comments)).toBe(key);
  });

  it('0点は「白紙で提出」（描いて0点でも同じ。要件定義書 3.2 #14）', () => {
    expect(messages[`comments.${commentKey(0, config.comments)}`]).toBe('白紙で提出');
  });
});
