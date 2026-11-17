// S2 描く画面（設計書 2章・1.3）。指を離したら採点し、そのまま本物を重ねる演出まで行う

import { config, type Prefecture } from '../../data';
import { commentKey } from '../../core/comment';
import type { Point } from '../../core/score';
import { isTooShort, judgeStroke, type StrokeResult } from '../../core/stroke';
import { t } from '../../i18n';
import { el, padSizeFor } from '../dom';
import { topBar } from '../parts';
import { DrawPad } from '../drawPad';
import { animateReveal, DEFAULT_OVERLAY } from '../reveal';

export interface DrawOutcome extends StrokeResult {
  points: Point[];
  timeout: boolean;
  commentKey: string;
}

export interface DrawScreenOptions {
  pref: Prefecture;
  /** 47県チャレンジのときだけ（例 12/47） */
  progress?: { n: number; total: number };
  revealMs: number;
  onBack: () => void;
  /** 演出が終わった。after に結果のボタンなどを足せる */
  onRevealed: (outcome: DrawOutcome, after: HTMLElement) => void;
}

export function showDrawScreen(root: HTMLElement, opts: DrawScreenOptions): () => void {
  const { pref } = opts;
  const name = t(`prefectures.${pref.id}`);
  const limitMs = config.timeLimitSec * 1000;

  const back = el('button', { class: 'icon-btn', text: '←', type: 'button', ariaLabel: t('result.toTitle') });
  const progress = el('span', { class: 'progress', text: opts.progress ? t('draw.progress', { n: opts.progress.n }) : '' });
  const header = topBar([back, progress]);

  const title = el('h2', { class: 'pref-name', text: t('draw.prompt', { name }) });
  const fill = el('div', { class: 'timer-fill' });
  const timeText = el('span', { class: 'timer-text', text: t('draw.timeLeft', { sec: config.timeLimitSec }) });
  const timer = el('div', { class: 'timer' }, [el('div', { class: 'timer-track' }, [fill]), timeText]);

  const size = padSizeFor(root);
  const stage = el('div', { class: 'stage' });
  stage.style.width = `${size}px`;
  stage.style.height = `${size}px`;
  const message = el('p', { class: 'message', text: '' });
  const hint = el('p', { class: 'hint', text: t('draw.hint') });
  const note = el('p', { class: 'note', text: t('common.islandsNote') });
  const scoreEl = el('p', { class: 'score hidden' });
  const after = el('div', { class: 'after' });

  const screen = el('main', { class: 'screen draw' }, [header, title, timer, stage, message, scoreEl, hint, after, note]);
  root.replaceChildren(screen);

  let finished = false;
  let raf = 0;
  let startAt = 0;
  let lastSec = -1;

  const pad = new DrawPad({
    minDist: config.stroke.sampleMinDistPx,
    lineColor: DEFAULT_OVERLAY.lineColor,
    lineWidth: DEFAULT_OVERLAY.lineWidth,
    onEnd: (points) => {
      if (finished) return;
      if (isTooShort(points, pad.padSize, config.stroke)) {
        // 採点せず「もう一度」。時間は止めない
        message.textContent = t('draw.tooShort');
        pad.clear();
        return;
      }
      finish(points, false);
    },
  });
  pad.resize(size);
  stage.append(pad.canvas);
  pad.setEnabled(true);
  pad.canvas.addEventListener('pointerdown', () => {
    message.textContent = '';
  });

  const tick = (now: number) => {
    if (finished) return;
    const left = Math.max(0, limitMs - (now - startAt));
    fill.style.transform = `scaleX(${left / limitMs})`;
    const sec = Math.ceil(left / 1000);
    if (sec !== lastSec) {
      lastSec = sec;
      timeText.textContent = t('draw.timeLeft', { sec });
      timer.classList.toggle('warn', sec <= config.warnAtSec);
      // 残り5秒の「チックタック」は #8
    }
    if (left <= 0) {
      const points = pad.drawing ? pad.cancel() : [];
      message.textContent = t('draw.timeUp');
      finish(points, true);
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  function finish(points: Point[], timeout: boolean): void {
    finished = true;
    cancelAnimationFrame(raf);
    pad.setEnabled(false);
    const r = judgeStroke(points, pref.points, size, config.stroke, config.scoring);
    const outcome: DrawOutcome = { ...r, points, timeout, commentKey: commentKey(r.score, config.comments) };
    screen.classList.add('revealing');
    hint.classList.add('hidden');
    // 描いた線を消して、そろえた絵に描き直す
    const canvas = pad.canvas;
    scoreEl.classList.remove('hidden');
    void animateReveal(canvas, size, r.blank ? [] : points, pref.points, r.score, opts.revealMs, (n) => {
      scoreEl.textContent = t('result.score', { score: n });
    }).then(() => {
      if (!screen.isConnected) return;
      opts.onRevealed(outcome, after);
    });
  }

  back.addEventListener('click', () => {
    finished = true;
    cancelAnimationFrame(raf);
    pad.cancel();
    opts.onBack();
  });

  startAt = performance.now();
  raf = requestAnimationFrame(tick);

  return () => {
    finished = true;
    cancelAnimationFrame(raf);
  };
}
