// T-09 文言の直書きがない：src/ の .ts に日本語の文字列がない（コメントは除く。文言は JSON に置く）
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const JAPANESE = /[　-ヿ㐀-鿿＀-￯]/;

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return tsFiles(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

/** 開発者向けのエラー（データがおかしいときに起動で止める文。遊ぶ人の画面には出ない）は対象外 */
const DEV_ERROR = /\bfail\(|new (Data)?Error\(|^\s*throw /;

/** コメントを取り除く（// の後ろは URL でも消えるが、日本語の検出には影響しない） */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('T-09 文言の直書きがない', () => {
  it('src/ の .ts に日本語の文字列がない', () => {
    const files = tsFiles(SRC);
    expect(files.length).toBeGreaterThan(10);
    const found: string[] = [];
    for (const f of files) {
      stripComments(readFileSync(f, 'utf-8'))
        .split('\n')
        .forEach((line, i) => {
          if (JAPANESE.test(line) && !DEV_ERROR.test(line)) found.push(`${f}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(found).toEqual([]);
  });
});
