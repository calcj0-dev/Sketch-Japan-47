// S1 タイトル（仮。#5 でチャレンジ・採点のしくみ・プライバシー・導線を足す）

import { t } from '../../i18n';
import { APP_VERSION } from '../../version';
import { button, el } from '../dom';

export function showTitleScreen(root: HTMLElement, onSingle: () => void): void {
  root.replaceChildren(
    el('main', { class: 'screen title' }, [
      el('header', { class: 'bar' }, [el('span'), el('span', { class: 'version', text: t('app.version', { version: APP_VERSION }) })]),
      el('h1', { text: t('app.name') }),
      el('p', { class: 'tagline', text: t('app.tagline') }),
      el('div', { class: 'buttons' }, [button(t('title.single'), onSingle, 'btn primary')]),
      el('p', { class: 'note', text: t('common.islandsNote') }),
      el('p', { class: 'note', text: t('common.disclaimer') }),
    ]),
  );
}
