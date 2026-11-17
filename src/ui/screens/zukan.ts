// 図鑑の画面（要件定義書 3.2 #16）。47県のマス（北から順）。「あなたの日本地図」は #7 で足す

import { prefectures } from '../../data';
import { isZukanComplete, zukanCount, type Zukan } from '../../core/zukan';
import { t } from '../../i18n';
import { el } from '../dom';
import { footerNotes, topBar } from '../parts';
import { DEFAULT_OVERLAY, drawOverlay } from '../reveal';

const THUMB = 88;

function thumbnail(drawn: Zukan[string], truth: (typeof prefectures)[number]['points']): HTMLCanvasElement {
  const c = el('canvas', { class: 'thumb' });
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  c.width = Math.round(THUMB * dpr);
  c.height = Math.round(THUMB * dpr);
  c.style.width = `${THUMB}px`;
  c.style.height = `${THUMB}px`;
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawOverlay(ctx, drawn!.points, truth, THUMB, 1, { ...DEFAULT_OVERLAY, lineWidth: 2 });
  return c;
}

export function showZukanScreen(root: HTMLElement, z: Zukan, onBack: () => void): void {
  const ids = prefectures.map((p) => p.id);
  const back = el('button', { class: 'icon-btn', text: '←', type: 'button', ariaLabel: t('result.toTitle') });
  back.addEventListener('click', onBack);

  const grid = el('ol', { class: 'zukan-grid' },
    prefectures.map((p) => {
      const e = z[p.id];
      const name = t(`prefectures.${p.id}`);
      return el('li', { class: e ? 'cell' : 'cell empty' }, [
        e ? thumbnail(e, p.points) : el('div', { class: 'thumb unknown', text: t('zukan.unknown') }),
        el('span', { class: 'cell-name', text: name }),
        el('span', { class: 'cell-score', text: e ? t('result.score', { score: e.score }) : '' }),
      ]);
    }),
  );

  const complete = isZukanComplete(z, ids);
  root.replaceChildren(
    el('main', { class: 'screen zukan' }, [
      topBar([back]),
      el('h2', { class: 'result-heading', text: t('zukan.heading') }),
      el('p', { class: 'zukan-count', text: t('zukan.count', { n: zukanCount(z, ids) }) }),
      el('p', { class: 'note', text: complete ? t('zukan.complete') : t('zukan.hint') }),
      // 47県そろったら「あなたの日本地図」（#7）
      grid,
      footerNotes(false),
    ]),
  );
  window.scrollTo(0, 0);
}
