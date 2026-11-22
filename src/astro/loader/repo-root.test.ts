import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DocsError } from '../../core/errors';
import { findRepoRoot, resolveRepoRoot } from './repo-root';

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'docs-root-'));
  await mkdir(path.join(directory, '.git'));
  await mkdir(path.join(directory, 'sites/docs'), { recursive: true });
});
afterEach(() => rm(directory, { recursive: true, force: true }));

describe('findRepoRoot', () => {
  it('sube hasta el ancestro con .git', async () => {
    expect(await findRepoRoot(path.join(directory, 'sites/docs'))).toBe(directory);
  });

  it('el propio directorio cuenta', async () => {
    expect(await findRepoRoot(directory)).toBe(directory);
  });

  it('sin .git en ningún ancestro devuelve undefined', async () => {
    expect(await findRepoRoot(path.parse(directory).root, ['__no_existe__'])).toBeUndefined();
  });
});

describe('resolveRepoRoot', () => {
  function root() {
    return path.join(directory, 'sites/docs');
  }

  it('sin editUrl no hace falta raíz y no se busca', async () => {
    expect(await resolveRepoRoot({ content: {} }, root())).toBeUndefined();
  });

  it('con editUrl usa el ancestro con .git', async () => {
    expect(await resolveRepoRoot({ content: { editUrl: 'https://x/edit/main' } }, root())).toBe(
      directory,
    );
  });

  it('repoRoot explícito se resuelve contra la raíz del proyecto y manda', async () => {
    expect(
      await resolveRepoRoot({ content: { editUrl: 'https://x', repoRoot: '../..' } }, root()),
    ).toBe(directory);
  });

  it('con editUrl y sin raíz lanza un error accionable', async () => {
    await expect(
      resolveRepoRoot({ content: { editUrl: 'https://x' } }, path.parse(directory).root, [
        '__no_existe__',
      ]),
    ).rejects.toSatisfy((error) => error instanceof DocsError && /repoRoot/.test(error.hint ?? ''));
  });
});
