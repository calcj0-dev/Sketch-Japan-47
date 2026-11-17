// S1 タイトル（F-01）

import { doneCount, type ChallengeState } from '../../core/challenge';
import { t } from '../../i18n';
import { button, el } from '../dom';
import { footerNotes, topBar } from '../parts';

export interface TitleActions {
  onSingle: () => void;
  onChallenge: () => void;
  /** 途中のチャレンジ（あれば「続きから n/47」） */
  saved?: ChallengeState;
}

export function showTitleScreen(root: HTMLElement, a: TitleActions): void {
  const challengeLabel = a.saved ? t('title.challengeResume', { n: doneCount(a.saved) }) : t('title.challenge');
  root.replaceChildren(
    el('main', { class: 'screen title' }, [
      topBar(),
      el('h1', { text: t('app.name') }),
      el('p', { class: 'tagline', text: t('app.tagline') }),
      el('div', { class: 'buttons' }, [
        button(t('title.single'), a.onSingle, 'btn primary'),
        button(challengeLabel, a.onChallenge, 'btn'),
      ]),
      el('p', { class: 'note', text: t('common.islandsNote') }),
      footerNotes(true),
    ]),
  );
  window.scrollTo(0, 0);
}
