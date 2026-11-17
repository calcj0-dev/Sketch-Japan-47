// S1 タイトル（F-01）。47都道府県チャレンジのボタンは #6 で足す

import { t } from '../../i18n';
import { button, el } from '../dom';
import { footerNotes, topBar } from '../parts';

export function showTitleScreen(root: HTMLElement, onSingle: () => void): void {
  root.replaceChildren(
    el('main', { class: 'screen title' }, [
      topBar(),
      el('h1', { text: t('app.name') }),
      el('p', { class: 'tagline', text: t('app.tagline') }),
      el('div', { class: 'buttons' }, [button(t('title.single'), onSingle, 'btn primary')]),
      el('p', { class: 'note', text: t('common.islandsNote') }),
      footerNotes(true),
    ]),
  );
}
