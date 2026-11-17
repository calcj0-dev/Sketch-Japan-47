// 47都道府県チャレンジ（設計書 1.2。決定 #7 の変更：1県ごとに結果を挟む）
// 1県描くたびに端末に保存し、途中でやめても続きから描ける

import { config, prefectures } from '../data';
import {
  doneCount, isComplete, newChallenge, nextId, parseChallenge, record, type ChallengeState,
} from '../core/challenge';
import { t } from '../i18n';
import { load, remove, save } from '../storage';
import { button, el } from '../ui/dom';
import { showChallengeResult } from '../ui/screens/challengeResult';
import { showDrawScreen } from '../ui/screens/draw';

const ids = prefectures.map((p) => p.id);
const byId = new Map(prefectures.map((p) => [p.id, p]));

/** 途中のチャレンジ（なければ undefined） */
export function savedChallenge(): ChallengeState | undefined {
  const s = parseChallenge(load('challenge'), ids);
  return s && !isComplete(s) && doneCount(s) > 0 ? s : undefined;
}

function persist(s: ChallengeState): void {
  save('challenge', JSON.stringify(s));
}

/** 続きがあれば続きから、なければ新しく始める */
export function startChallenge(root: HTMLElement, toTitle: () => void, fresh = false): void {
  const s = (!fresh && savedChallenge()) || newChallenge(ids);
  persist(s);
  drawNext(root, toTitle, s);
}

function drawNext(root: HTMLElement, toTitle: () => void, s: ChallengeState): void {
  const id = nextId(s);
  if (!id) {
    // 結果を出したあとで消す（もう一回のときは新しく始める。設計書 5.3）
    showChallengeResult(root, s, { onAgain: () => startChallenge(root, toTitle, true), onTitle: toTitle });
    remove('challenge');
    return;
  }
  const pref = byId.get(id)!;
  const n = doneCount(s) + 1;
  showDrawScreen(root, {
    pref,
    progress: { n, total: ids.length },
    revealMs: config.reveal.challengeMs,
    onBack: toTitle,
    onRevealed: (outcome, after) => {
      const next = record(s, id, outcome.score, outcome.blank ? [] : outcome.points);
      persist(next);
      const last = isComplete(next);
      after.append(
        el('p', { class: 'comment', text: t('result.comment', { comment: t(`comments.${outcome.commentKey}`) }) }),
        el('div', { class: 'buttons' }, [
          button(
            last ? t('challenge.toResult') : t('challenge.next', { n: n + 1 }),
            () => drawNext(root, toTitle, next),
            'btn primary',
          ),
          ...(last ? [] : [button(t('challenge.quit'), toTitle, 'btn ghost')]),
        ]),
      );
    },
  });
}
