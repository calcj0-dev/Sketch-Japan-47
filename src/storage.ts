// 端末への保存（設計書 5.3）。保存するのは音の設定・途中のチャレンジ・図鑑だけ。
// 保存できない環境（プライベートブラウズなど）では初期値で動く

import { config } from './data';

export type StorageKey = 'sound' | 'challenge' | 'zukan';

const key = (k: StorageKey) => `${config.storageKey}.${k}`;

export function load(k: StorageKey): string | null {
  try {
    return globalThis.localStorage?.getItem(key(k)) ?? null;
  } catch {
    return null;
  }
}

export function save(k: StorageKey, value: string): void {
  try {
    globalThis.localStorage?.setItem(key(k), value);
  } catch {
    // 保存できなくても遊べるようにする
  }
}

export function remove(k: StorageKey): void {
  try {
    globalThis.localStorage?.removeItem(key(k));
  } catch {
    // 消せなくても遊べる
  }
}
