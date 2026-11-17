// 1問ずつ（設計書 1.1）。結果の表示は #5 で仕上げる（今は一言とボタンだけ）

import { config, prefectures, type Prefecture } from '../data';
import { pickOther } from '../core/shuffle';
import { t } from '../i18n';
import { button, el } from '../ui/dom';
import { showDrawScreen } from '../ui/screens/draw';

let last: Prefecture | undefined;

export function startSingle(root: HTMLElement, toTitle: () => void, same?: Prefecture): void {
  const pref = same ?? pickOther(prefectures, last);
  last = pref;
  showDrawScreen(root, {
    pref,
    revealMs: config.reveal.singleMs,
    onBack: toTitle,
    onRevealed: (outcome, after) => {
      after.append(
        el('p', { class: 'comment', text: t('result.comment', { comment: t(`comments.${outcome.commentKey}`) }) }),
        el('div', { class: 'buttons' }, [
          button(t('result.next'), () => startSingle(root, toTitle), 'btn primary'),
          button(t('result.retrySame'), () => startSingle(root, toTitle, pref)),
          button(t('result.toTitle'), toTitle, 'btn ghost'),
        ]),
      );
    },
  });
}
