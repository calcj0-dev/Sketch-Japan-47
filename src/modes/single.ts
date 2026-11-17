// 1問ずつ（設計書 1.1）と、その結果 S3（F-04）。シェア・画像の保存は #7 で足す

import { config, prefectures, type Prefecture } from '../data';
import { pickOther } from '../core/shuffle';
import { t } from '../i18n';
import { button, el } from '../ui/dom';
import { footerNotes, mainAppLinks } from '../ui/parts';
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
        mainAppLinks(),
        footerNotes(false),
      );
    },
  });
}
