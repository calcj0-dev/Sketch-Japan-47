// 効果音（決定 #10・設計書 1.5。前作の audio.ts を流用）。素材ファイルは使わず Web Audio で合成する。
// iOS は利用者が触ったときに AudioContext を作り直す・再開する必要がある

import { config } from './data';
import { soundOn } from './settings';

let ctx: AudioContext | null = null;

/** 最初のタッチ・クリックで呼ぶ。以後は鳴らせるようになる */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

type Tone = {
  freq: number;
  /** 終わりの周波数（音の高さを動かすとき） */
  to?: number;
  type?: OscillatorType;
  /** 開始までの遅れ（秒） */
  at?: number;
  dur: number;
  gain?: number;
};

function play(tones: Tone[]): void {
  if (!soundOn() || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  for (const tone of tones) {
    const t0 = now + (tone.at ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.freq, t0);
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, t0 + tone.dur);
    const peak = tone.gain ?? 0.15;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + tone.dur + 0.02);
  }
}

let tickTock = false;

export const sfx = {
  /** 残り5秒の「チックタック」（呼ぶたびに高い音・低い音を交互に） */
  tick: () => {
    tickTock = !tickTock;
    play([{ freq: tickTock ? 1500 : 1100, type: 'square', dur: 0.05, gain: 0.06 }]);
  },
  /** 本物が重なり、点数が数え上がる間の「ジャラララ…」（ms の長さ） */
  rattle: (ms: number) => {
    const n = Math.max(4, Math.floor(ms / 55));
    const tones: Tone[] = [];
    for (let i = 0; i < n; i++) {
      // だんだん高く、最後は少し間をあける
      const f = 700 + (i / n) * 700 + (i % 2) * 120;
      tones.push({ freq: f, type: 'triangle', at: (i * ms) / 1000 / n, dur: 0.04, gain: 0.07 });
    }
    play(tones);
  },
  /** 90点以上：ファンファーレ */
  fanfare: () =>
    play([
      { freq: 523.25, type: 'triangle', dur: 0.14, gain: 0.14 },
      { freq: 659.25, type: 'triangle', dur: 0.14, at: 0.12, gain: 0.14 },
      { freq: 783.99, type: 'triangle', dur: 0.14, at: 0.24, gain: 0.14 },
      { freq: 1046.5, type: 'triangle', dur: 0.7, at: 0.36, gain: 0.16 },
      { freq: 783.99, type: 'triangle', dur: 0.7, at: 0.36, gain: 0.08 },
    ]),
  /** 40〜89点：「ピンポン」 */
  pinpon: () =>
    play([
      { freq: 987.77, dur: 0.18, gain: 0.14 },
      { freq: 783.99, dur: 0.45, at: 0.16, gain: 0.14 },
    ]),
  /** 40点未満：「ポワーン」と下がる音 */
  powan: () =>
    play([
      { freq: 440, to: 330, type: 'triangle', dur: 0.25, gain: 0.12 },
      { freq: 330, to: 196, type: 'triangle', dur: 0.6, at: 0.22, gain: 0.12 },
    ]),
};

/** 点数に合う音を鳴らす（config.sounds.result） */
export function playResult(score: number): void {
  const r = (config.sounds as { result: { high: { min: number }; low: { max: number } } }).result;
  if (score >= r.high.min) sfx.fanfare();
  else if (score <= r.low.max) sfx.powan();
  else sfx.pinpon();
}
