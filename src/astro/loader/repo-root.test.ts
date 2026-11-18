import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DocsError } from '../../core/errors';
import { findRepoRoot, resolveRepoRoot } from './repo-root';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'docs-root-'));
  await mkdir(path.join(dir, '.git'));
  await mkdir(path.join(dir, 'sites/docs'), { recursive: true });
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('findRepoRoot', () => {
  it('sube hasta el ancestro con .git', async () => {
    expect(await findRepoRoot(path.join(dir, 'sites/docs'))).toBe(dir);
  });

  it('el propio directorio cuenta', async () => {
    expect(await findRepoRoot(dir)).toBe(dir);
  });

  it('sin .git en ningún ancestro devuelve undefined', async () => {
    expect(await findRepoRoot(path.parse(dir).root, ['__no_existe__'])).toBeUndefined();
  });
});

describe('resolveRepoRoot', () => {
  function root() {
    return path.join(dir, 'sites/docs');
  }

  it('sin editUrl no hace falta raíz y no se busca', async () => {
    expect(await resolveRepoRoot({}, root())).toBeUndefined();
  });

  it('con editUrl usa el ancestro con .git', async () => {
    expect(await resolveRepoRoot({ editUrl: 'https://x/edit/main' }, root())).toBe(dir);
  });

  it('repoRoot explícito se resuelve contra la raíz del proyecto y manda', async () => {
    expect(await resolveRepoRoot({ editUrl: 'https://x', repoRoot: '../..' }, root())).toBe(dir);
  });

  it('con editUrl y sin raíz lanza un error accionable', async () => {
    await expect(
      resolveRepoRoot({ editUrl: 'https://x' }, path.parse(dir).root, ['__no_existe__']),
    ).rejects.toSatisfy((error) => error instanceof DocsError && /repoRoot/.test(error.hint ?? ''));
  });
});
