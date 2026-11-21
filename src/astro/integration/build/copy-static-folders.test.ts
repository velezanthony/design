import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { AstroError } from 'astro/errors';
import { describe, expect, it, vi } from 'vitest';
import { copyStaticFolders } from './copy-static-folders';

function project() {
  const root = mkdtempSync(path.join(tmpdir(), 'static-folders-'));
  mkdirSync(path.join(root, 'htmlcov/assets'), { recursive: true });
  writeFileSync(path.join(root, 'htmlcov/index.html'), '<h1>cov</h1>');
  writeFileSync(path.join(root, 'htmlcov/assets/app.js'), 'x');
  const dist = path.join(root, 'dist');
  mkdirSync(dist);
  return { root, dist, dir: pathToFileURL(`${dist}/`) };
}
const logger = { info: vi.fn() } as never;

describe('copyStaticFolders', () => {
  it('copia la carpeta entera, tal cual, a su destino bajo dist/', async () => {
    const { root, dist, dir } = project();
    await copyStaticFolders({
      root,
      dir,
      folders: [{ from: 'htmlcov', to: 'reports/cov' }],
      logger,
    });
    expect(readFileSync(path.join(dist, 'reports/cov/index.html'), 'utf8')).toBe('<h1>cov</h1>');
    expect(readFileSync(path.join(dist, 'reports/cov/assets/app.js'), 'utf8')).toBe('x');
  });

  it('no copia lo que casa con su `exclude`, relativo a `from`', async () => {
    const { root, dist, dir } = project();
    mkdirSync(path.join(root, 'htmlcov/assets/script'));
    writeFileSync(path.join(root, 'htmlcov/assets/script/history.py'), 'print()');
    writeFileSync(path.join(root, 'htmlcov/notes.py'), 'print()');
    await copyStaticFolders({
      root,
      dir,
      folders: [{ from: 'htmlcov', to: 'cov', exclude: ['assets/script/', '/notes.py'] }],
      logger,
    });
    expect(existsSync(path.join(dist, 'cov/assets/script/history.py'))).toBe(false);
    expect(existsSync(path.join(dist, 'cov/notes.py'))).toBe(false);
    expect(readFileSync(path.join(dist, 'cov/assets/app.js'), 'utf8')).toBe('x');
  });

  it('una carpeta que no existe falla nombrando `from`', async () => {
    const { root, dir } = project();
    const run = copyStaticFolders({ root, dir, folders: [{ from: 'nope', to: 'c' }], logger });
    await expect(run).rejects.toBeInstanceOf(AstroError);
    await expect(run).rejects.toThrow(/nope/);
  });

  it('sin carpetas no hace nada', async () => {
    const { root, dir } = project();
    await expect(copyStaticFolders({ root, dir, folders: [], logger })).resolves.toBeUndefined();
  });
});
