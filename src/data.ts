// データの読み込みと検査（設計書 4.3）。おかしなデータなら起動時に止める

import configJson from './data/config.json';
import prefJson from './data/prefectures.json';
import jaJson from './data/i18n/ja.json';
import type { CommentRule } from './core/comment';
import type { Point, ScoringConfig } from './core/score';
import type { StrokeConfig } from './core/stroke';
import { flatten, setMessages, type Messages } from './i18n';

export interface Config {
  version: number;
  timeLimitSec: number;
  warnAtSec: number;
  scoring: ScoringConfig & { method: string };
  stroke: StrokeConfig;
  comments: CommentRule[];
  reveal: { singleMs: number; challengeMs: number };
  challenge: { order: string };
  map: {
    imageSize: number;
    padding: number;
    okinawaInset: { x: number; y: number; size: number };
    colorLow: string;
    colorHigh: string;
    truthFill: string;
    lineColor: string;
  };
  sounds: unknown;
  hashtag: string;
  storageKey: string;
  links: { portal: string; follow: string };
}

export interface Prefecture {
  code: number;
  id: string;
  nameJa: string;
  areaKm2: number;
  islandsDropped: number;
  mainShare: number;
  mapX: number;
  mapY: number;
  points: Point[];
}

export interface PrefectureData {
  version: number;
  source: string;
  sample: boolean;
  prefectures: Prefecture[];
}

/** 画面に出す文言で、必ずなければならないもの（comments.* と prefectures.* は別に確かめる） */
export const REQUIRED_MESSAGES = [
  'app.name', 'app.tagline', 'app.version', 'app.credit',
  'common.soundOn', 'common.soundOff', 'common.close', 'common.islandsNote', 'common.basisLink', 'common.privacyLink',
  'title.single', 'title.singleDesc', 'title.challenge', 'title.challengeDesc', 'title.resumeTag', 'title.zukan', 'title.zukanCount',
  'title.step1', 'title.step2', 'title.step3',
  'zukan.heading', 'zukan.count', 'zukan.hint', 'zukan.complete', 'zukan.unknown',
  'challenge.next', 'challenge.toResult', 'challenge.quit',
  'draw.prompt', 'draw.hint', 'draw.timeLeft', 'draw.tooShort', 'draw.timeUp', 'draw.progress',
  'result.score', 'result.comment', 'result.next', 'result.retrySame', 'result.share', 'result.shareImage', 'result.saveImage', 'result.toTitle',
  'challengeResult.heading', 'challengeResult.average', 'challengeResult.best', 'challengeResult.worst', 'challengeResult.list', 'challengeResult.item', 'challengeResult.again',
  'share.single', 'share.challenge', 'share.zukan', 'map.heading',
  'image.single.score', 'image.single.footer', 'image.map.average',
  'links.heading', 'links.portal', 'links.follow',
  'basis.heading', 'basis.body', 'basis.islands', 'basis.source',
  'privacy.heading', 'privacy.p1', 'privacy.p2', 'privacy.p3', 'privacy.p4', 'privacy.vercelPolicy',
] as const;

export class DataError extends Error {}

function fail(msg: string): never {
  throw new DataError(msg);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function validateConfig(c: Config): void {
  if (!isNum(c.timeLimitSec) || c.timeLimitSec <= 0) fail('config.timeLimitSec は正の数');
  if (!isNum(c.warnAtSec) || c.warnAtSec < 0 || c.warnAtSec > c.timeLimitSec) fail('config.warnAtSec は 0〜timeLimitSec');
  const s = c.scoring;
  if (!Number.isInteger(s.grid) || s.grid < 16) fail('config.scoring.grid は16以上の整数');
  if (!(isNum(s.iouZero) && isNum(s.iouFull) && 0 <= s.iouZero && s.iouZero < s.iouFull && s.iouFull <= 1)) {
    fail('config.scoring は 0 ≤ iouZero < iouFull ≤ 1');
  }
  const st = c.stroke;
  if (!Number.isInteger(st.minPoints) || st.minPoints < 3) fail('config.stroke.minPoints は3以上の整数');
  if (!isNum(st.minSizeRatio) || st.minSizeRatio < 0 || st.minSizeRatio >= 1) fail('config.stroke.minSizeRatio は 0〜1');
  if (!isNum(st.sampleMinDistPx) || st.sampleMinDistPx < 0) fail('config.stroke.sampleMinDistPx は0以上');
  if (!Array.isArray(c.comments) || c.comments.length === 0) fail('config.comments が空');
  if (!c.comments.some((r) => r.min === 0)) fail('config.comments に min: 0 の段階が必要');
  const mins = new Set<number>();
  for (const r of c.comments) {
    if (!Number.isInteger(r.min) || r.min < 0 || r.min > 100) fail(`config.comments の min は0〜100の整数（${r.min}）`);
    if (mins.has(r.min)) fail(`config.comments の min が重なっている（${r.min}）`);
    mins.add(r.min);
  }
  if (!c.storageKey) fail('config.storageKey が空');
  if (!c.hashtag) fail('config.hashtag が空');
}

/** production が true（公開用のビルド）なら、試しのデータ（sample: true）を通さない */
export function validatePrefectures(d: PrefectureData, production: boolean): void {
  if (production && d.sample !== false) fail('prefectures.json は試しのデータ（sample: true）。公開用には使えない');
  const list = d.prefectures;
  if (!Array.isArray(list) || list.length !== 47) fail(`prefectures は47県（今は ${list?.length}）`);
  const codes = new Set<number>();
  list.forEach((p, i) => {
    const where = `prefectures[${i}]`;
    if (!Number.isInteger(p.code) || p.code < 1 || p.code > 47) fail(`${where}.code は1〜47`);
    if (codes.has(p.code)) fail(`${where}.code が重なっている（${p.code}）`);
    codes.add(p.code);
    if (p.id !== `JP-${String(p.code).padStart(2, '0')}`) fail(`${where}.id が code と合わない（${p.id}）`);
    if (!isNum(p.areaKm2) || p.areaKm2 <= 0) fail(`${where}.areaKm2 は正の数`);
    if (!isNum(p.mapX) || !isNum(p.mapY)) fail(`${where}.mapX・mapY は数`);
    if (!Array.isArray(p.points) || p.points.length < 3) fail(`${where}.points は3点以上`);
    for (const pt of p.points) {
      if (!Array.isArray(pt) || pt.length !== 2 || !isNum(pt[0]) || !isNum(pt[1])) fail(`${where}.points に数の組でないものがある`);
    }
  });
}

export function validateMessages(m: Messages, c: Config, d: PrefectureData): void {
  const missing: string[] = [];
  for (const k of REQUIRED_MESSAGES) if (!m[k]) missing.push(k);
  for (const r of c.comments) if (!m[`comments.${r.key}`]) missing.push(`comments.${r.key}`);
  for (const p of d.prefectures) if (!m[`prefectures.${p.id}`]) missing.push(`prefectures.${p.id}`);
  if (missing.length) fail(`i18n に足りない文言：${missing.join(', ')}`);
}

export const config = configJson as unknown as Config;
export const prefData = prefJson as unknown as PrefectureData;
export const messages: Messages = flatten(jaJson);

validateConfig(config);
validatePrefectures(prefData, import.meta.env.PROD);
validateMessages(messages, config, prefData);
setMessages(messages);

export const prefectures: readonly Prefecture[] = [...prefData.prefectures].sort((a, b) => a.code - b.code);
