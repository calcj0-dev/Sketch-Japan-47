import { describe, expect, it } from 'vitest';
import {
  config, DataError, messages, prefData, prefectures,
  validateConfig, validateMessages, validatePrefectures, type Config, type PrefectureData,
} from '../src/data';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe('T-06 形のデータの検査', () => {
  it('今のデータは公開用の検査を通る（47県、北から順）', () => {
    expect(() => validatePrefectures(prefData, true)).not.toThrow();
    expect(prefectures.map((p) => p.code)).toEqual(Array.from({ length: 47 }, (_, i) => i + 1));
  });

  it('sample: true は公開用のビルドで止まる（開発中は通る）', () => {
    const d = { ...clone(prefData), sample: true } as PrefectureData;
    expect(() => validatePrefectures(d, true)).toThrow(DataError);
    expect(() => validatePrefectures(d, false)).not.toThrow();
  });

  it('県が足りない・code が重なる・点が少ない・面積が0 は止まる', () => {
    const bad: ((d: PrefectureData) => void)[] = [
      (d) => d.prefectures.pop(),
      (d) => { d.prefectures[1]!.code = 1; },
      (d) => { d.prefectures[0]!.points = d.prefectures[0]!.points.slice(0, 2); },
      (d) => { d.prefectures[0]!.areaKm2 = 0; },
      (d) => { d.prefectures[0]!.id = 'JP-1'; },
    ];
    for (const f of bad) {
      const d = clone(prefData);
      f(d);
      expect(() => validatePrefectures(d, false)).toThrow(DataError);
    }
  });

  it('i18n に全県の名前・全段階の一言がない と止まる', () => {
    expect(() => validateMessages(messages, config, prefData)).not.toThrow();
    for (const k of ['prefectures.JP-47', 'comments.c0', 'comments.blank', 'draw.hint']) {
      const m = { ...messages };
      delete m[k];
      expect(() => validateMessages(m, config, prefData), k).toThrow(DataError);
    }
  });

  it('設定のおかしな値は止まる', () => {
    expect(() => validateConfig(config)).not.toThrow();
    const bad: ((c: Config) => void)[] = [
      (c) => { c.scoring.iouZero = 0.96; },
      (c) => { c.timeLimitSec = 0; },
      (c) => { c.comments = c.comments.filter((r) => r.min !== 0); },
      (c) => { c.stroke.minPoints = 2; },
    ];
    for (const f of bad) {
      const c = clone(config);
      f(c);
      expect(() => validateConfig(c)).toThrow(DataError);
    }
  });

  it('出典の文は持たない（要件定義書 3.2 #8）', () => {
    expect(messages['common.attribution']).toBeUndefined();
    expect(Object.values(messages).some((v) => v.includes('国土数値情報'))).toBe(false);
  });
});
