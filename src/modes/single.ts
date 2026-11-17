// 1問ずつ（設計書 1.1）と、その結果 S3（F-04）。シェア・画像の保存は #7 で足す

import { config, prefectures, type Prefecture } from '../data';
import { pickOther } from '../core/shuffle';
import { undrawn } from '../core/zukan';
import { addToZukan, loadZukan, PREF_IDS } from './zukanStore';
import { t } from '../i18n';
import { button, el } from '../ui/dom';
import { footerNotes, mainAppLinks } from '../ui/parts';
import { showDrawScreen } from '../ui/screens/draw';

let last: Prefecture | undefined;

/** 図鑑でまだ描いていない県を先に出す。そろったら全県から（同じ県が2回続かないように） */
function pickPref(): Prefecture {
  const left = new Set(undrawn(loadZukan(), PREF_IDS));
  const pool = left.size ? prefectures.filter((p) => left.has(p.id)) : prefectures;
  return pickOther(pool, last);
}

export function startSingle(root: HTMLElement, toTitle: () => void, same?: Prefecture): void {
  const pref = same ?? pickPref();
  last = pref;
  showDrawScreen(root, {
    pref,
    revealMs: config.reveal.singleMs,
    onBack: toTitle,
    onRevealed: (outcome, after) => {
      addToZukan(pref.id, outcome.score, outcome.points, outcome.blank);
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
