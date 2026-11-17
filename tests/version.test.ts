import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('バージョン', () => {
  it('package.json は 0.x.y か 1.x.y の形', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')) as { version: string };
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
