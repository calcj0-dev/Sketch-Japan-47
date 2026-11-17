// 画面の共通の部品：上の帯（バージョン・音）、つくった人のアプリへの導線、下の注意書き、小窓（採点のしくみ・プライバシー）

import { config } from '../data';
import { t } from '../i18n';
import { onSoundChange, setSoundOn, soundOn } from '../settings';
import { APP_VERSION } from '../version';
import { button, el } from './dom';

/** 上の帯。left は左に置くもの（戻るボタン・47県の進み具合など） */
export function topBar(left: (Node | string)[] = []): HTMLElement {
  const sound = el('button', { class: 'sound-btn', type: 'button' });
  const sync = () => {
    const on = soundOn();
    sound.textContent = on ? '🔊' : '🔇';
    sound.setAttribute('aria-label', on ? t('common.soundOn') : t('common.soundOff'));
    sound.setAttribute('aria-pressed', String(on));
  };
  sync();
  sound.addEventListener('click', () => setSoundOn(!soundOn()));
  const bar = el('header', { class: 'bar' }, [
    el('div', { class: 'bar-left' }, left),
    el('div', { class: 'bar-right' }, [el('span', { class: 'version', text: t('app.version', { version: APP_VERSION }) }), sound]),
  ]);
  // 画面が替わって外れていたら、次の変更のときに購読をやめる
  const off = onSoundChange(() => (bar.isConnected ? sync() : off()));
  return bar;
}

function link(text: string, href: string, cls = 'link'): HTMLAnchorElement {
  const a = el('a', { class: cls, text });
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

/** つくった人のアプリへの導線（F-07。Ted App Lab と X だけ：U4。UTM は config.links に付いている） */
export function mainAppLinks(): HTMLElement {
  return el('section', { class: 'links' }, [
    el('h3', { text: t('links.heading') }),
    link(t('links.portal'), config.links.portal, 'btn'),
    link(t('links.follow'), config.links.follow),
  ]);
}

/** 小窓を開く。閉じるボタン・背景のクリック・Esc で閉じる */
export function openModal(heading: string, body: Node[]): void {
  const dialog = el('dialog', { class: 'modal' });
  const close = () => {
    dialog.close();
    dialog.remove();
  };
  dialog.append(el('h2', { text: heading }), ...body, button(t('common.close'), close, 'btn'));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

export function openBasis(): void {
  openModal(t('basis.heading'), [
    el('p', { text: t('basis.body') }),
    el('p', { text: t('basis.islands') }),
    el('p', { text: t('basis.source') }),
  ]);
}

const VERCEL_POLICY_URL = 'https://vercel.com/legal/privacy-policy';

/** プライバシー（U5。計測は Vercel Analytics だけ。GA4 は使わない） */
export function openPrivacy(): void {
  openModal(t('privacy.heading'), [
    ...(['p1', 'p2', 'p3', 'p4'] as const).map((k) => el('p', { text: t(`privacy.${k}`) })),
    el('p', { class: 'modal-links' }, [link(t('privacy.vercelPolicy'), VERCEL_POLICY_URL)]),
  ]);
}

/** 下の注意書き（タイトルでは採点のしくみ・プライバシー・クレジット。免責は出さない：U3） */
export function footerNotes(withMenu: boolean): HTMLElement {
  const children: Node[] = [];
  if (withMenu) {
    children.push(
      el('p', { class: 'footer-menu' }, [
        button(t('common.basisLink'), openBasis, 'text-btn'),
        button(t('common.privacyLink'), openPrivacy, 'text-btn'),
      ]),
      // つくった人（X へのリンク）と、その下に Ted App Lab
      el('p', { class: 'footer-link' }, [link(t('app.credit'), config.links.follow)]),
      el('p', { class: 'footer-link' }, [link(t('links.portal'), config.links.portal)]),
    );
  }
  return el('footer', { class: 'footer' }, children);
}
