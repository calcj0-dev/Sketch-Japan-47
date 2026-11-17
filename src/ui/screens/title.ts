// S1 タイトル（F-01）。日本地図の絵、遊び方の3ステップ、説明付きのボタン（フリープレイ・47県チャレンジ・図鑑）

import { config } from '../../data';
import { doneCount, type ChallengeState } from '../../core/challenge';
import { t } from '../../i18n';
import { el } from '../dom';
import { footerNotes, topBar } from '../parts';
import { titleHero } from '../titleHero';

export interface TitleActions {
  onSingle: () => void;
  onChallenge: () => void;
  onZukan: () => void;
  /** 途中のチャレンジ（あれば「続きから n/47」） */
  saved?: ChallengeState;
  /** 図鑑に入っている県の数 */
  zukanCount: number;
}

function modeCard(label: string, desc: Node[], onClick: () => void, cls: string, tag?: string): HTMLButtonElement {
  const b = el('button', { class: `mode-card ${cls}`, type: 'button' }, [
    el('span', { class: 'mode-head' }, [el('span', { class: 'mode-label', text: label }), ...(tag ? [el('span', { class: 'mode-tag', text: tag })] : [])]),
    ...desc,
  ]);
  b.addEventListener('click', onClick);
  return b;
}

export function showTitleScreen(root: HTMLElement, a: TitleActions): void {
  const heroSize = Math.min(320, (root.clientWidth || window.innerWidth) - 32);

  const steps = el('ol', { class: 'steps' }, [
    el('li', { text: t('title.step1') }),
    el('li', { text: t('title.step2', { sec: config.timeLimitSec }) }),
    el('li', { text: t('title.step3') }),
  ]);

  const zukanFill = el('span', { class: 'zukan-bar-fill' });
  zukanFill.style.width = `${(a.zukanCount / 47) * 100}%`;

  root.replaceChildren(
    el('main', { class: 'screen title' }, [
      topBar(),
      titleHero(heroSize),
      el('h1', { text: t('app.name') }),
      el('p', { class: 'tagline', text: t('app.tagline') }),
      steps,
      el('div', { class: 'mode-list' }, [
        modeCard(t('title.single'), [el('span', { class: 'mode-desc', text: t('title.singleDesc') })], a.onSingle, 'primary'),
        modeCard(
          t('title.challenge'),
          [el('span', { class: 'mode-desc', text: t('title.challengeDesc') })],
          a.onChallenge,
          '',
          a.saved ? t('title.resumeTag', { n: doneCount(a.saved) }) : undefined,
        ),
        modeCard(
          t('title.zukan'),
          [el('span', { class: 'zukan-bar' }, [zukanFill])],
          a.onZukan,
          '',
          t('title.zukanCount', { n: a.zukanCount }),
        ),
      ]),
      el('p', { class: 'note', text: t('common.islandsNote') }),
      footerNotes(true),
    ]),
  );
  window.scrollTo(0, 0);
}
