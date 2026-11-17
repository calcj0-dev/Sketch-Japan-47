// S4 47県の結果（F-06）。「あなたの日本地図」はこの回の47枚で作る

import { config, prefectures } from '../../data';
import { summarize, type ChallengeState } from '../../core/challenge';
import { commentKey } from '../../core/comment';
import { t } from '../../i18n';
import { button, el } from '../dom';
import { footerNotes, mainAppLinks, topBar } from '../parts';
import { imagePreview, shareButtons } from '../shareButtons';
import { challengePost } from '../../share/postText';
import { renderMapImage, type MapEntry } from '../../share/mapImage';

export interface ChallengeResultActions {
  onAgain: () => void;
  onTitle: () => void;
}

export function showChallengeResult(root: HTMLElement, s: ChallengeState, actions: ChallengeResultActions): void {
  const north = prefectures.map((p) => p.id);
  const sum = summarize(s, north);
  const name = (id: string) => t(`prefectures.${id}`);
  // 白紙（線がない）の県は「白紙で提出」
  const keyOf = (id: string) => commentKey(s.scores[id] ?? 0, config.comments, (s.strokes[id]?.length ?? 0) < 3);
  const comment = (id: string) => t(`comments.${keyOf(id)}`);

  const entries: Record<string, MapEntry> = {};
  for (const id of north) entries[id] = { score: s.scores[id] ?? 0, points: s.strokes[id] ?? [] };
  const map = renderMapImage(entries, sum.average);

  const list = el('ol', { class: 'score-list' },
    prefectures.map((p) => {
      const sc = s.scores[p.id] ?? 0;
      const item = el('li', {}, [
        el('span', { class: 'name', text: name(p.id) }),
        el('span', { class: 'bar-mini' }, [el('span', { class: 'bar-mini-fill' })]),
        el('span', { class: 'pt', text: t('challengeResult.item', { score: sc }) }),
      ]);
      (item.querySelector('.bar-mini-fill') as HTMLElement).style.width = `${sc}%`;
      return item;
    }),
  );

  root.replaceChildren(
    el('main', { class: 'screen challenge-result' }, [
      topBar(),
      el('h2', { class: 'result-heading', text: t('challengeResult.heading') }),
      el('p', { class: 'score', text: t('challengeResult.average', { score: sum.average }) }),
      el('p', { class: 'best-worst', text: t('challengeResult.best', { name: name(sum.best.id), score: sum.best.score, comment: comment(sum.best.id) }) }),
      el('p', { class: 'best-worst', text: t('challengeResult.worst', { name: name(sum.worst.id), score: sum.worst.score, comment: comment(sum.worst.id) }) }),
      el('h3', { class: 'list-heading', text: t('map.heading') }),
      imagePreview(map, t('map.heading')),
      shareButtons(
        challengePost(sum.average, sum.worst.id, sum.worst.score, keyOf(sum.worst.id)),
        map,
        'sketch-japan-47-map.png',
      ),
      el('div', { class: 'buttons' }, [
        button(t('challengeResult.again'), actions.onAgain, 'btn primary'),
        button(t('result.toTitle'), actions.onTitle, 'btn ghost'),
      ]),
      el('h3', { class: 'list-heading', text: t('challengeResult.list') }),
      list,
      mainAppLinks(),
      footerNotes(false),
    ]),
  );
  window.scrollTo(0, 0);
}
