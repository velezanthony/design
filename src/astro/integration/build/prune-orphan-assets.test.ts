import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { orphanAssets, pruneOrphanAssets } from './prune-orphan-assets';

describe('orphanAssets', () => {
  const files = ['_astro/hero.Ab12.webp', '_astro/hero.Ab12.png', '_astro/icon.Cd34.svg'];

  it('son los recursos cuyo nombre no aparece en ningún texto del build', () => {
    const text = '<img src="/_astro/hero.Ab12.webp">\nbackground:url(/_astro/icon.Cd34.svg)';
    expect(orphanAssets(files, text)).toEqual(['_astro/hero.Ab12.png']);
  });

  it('conserva todo si todo está referenciado', () => {
    expect(orphanAssets(files, files.join(' '))).toEqual([]);
  });
});

describe('pruneOrphanAssets', () => {
  const directories: string[] = [];
  afterEach(async () => {
    for (const directory of directories.splice(0)) {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('borra del disco el original sin enlaces, conserva el referenciado y avisa', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'prune-'));
    directories.push(directory);
    await mkdir(path.join(directory, '_astro'));
    await writeFile(path.join(directory, 'index.html'), '<img src="/_astro/hero.Ab12.webp">');
    await writeFile(path.join(directory, '_astro/hero.Ab12.webp'), 'a'.repeat(2048));
    await writeFile(path.join(directory, '_astro/hero.Ab12.png'), 'b'.repeat(2048));
    const info = vi.fn();

    await pruneOrphanAssets(pathToFileURL(`${directory}/`), { info } as never);

    expect(existsSync(path.join(directory, '_astro/hero.Ab12.webp'))).toBe(true);
    expect(existsSync(path.join(directory, '_astro/hero.Ab12.png'))).toBe(false);
    expect(info).toHaveBeenCalledWith('2 KB de recursos sin referencias eliminados');
  });
});
