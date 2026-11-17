// 効果音のオン・オフ（最初から鳴る。設定は端末に保存。決定 #10）

import { load, save } from './storage';

type Listener = () => void;
const listeners = new Set<Listener>();

export function soundOn(): boolean {
  return load('sound') !== 'off';
}

export function setSoundOn(on: boolean): void {
  save('sound', on ? 'on' : 'off');
  for (const fn of listeners) fn();
}

/** 変わったら呼ばれる。戻り値で解除 */
export function onSoundChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
