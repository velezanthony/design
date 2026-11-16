import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkFavicon } from './favicon';

let dir: string;
let publicDir: URL;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'docs-favicon-'));
  await mkdir(path.join(dir, 'public'), { recursive: true });
  publicDir = pathToFileURL(`${path.join(dir, 'public')}/`);
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('checkFavicon', () => {
  it('un favicon de public/ que existe (con o sin barra) no da errores', async () => {
    await writeFile(path.join(dir, 'public/favicon.svg'), '<svg/>');
    expect(await checkFavicon('favicon.svg', publicDir)).toEqual([]);
    expect(await checkFavicon('/favicon.svg', publicDir)).toEqual([]);
  });

  it('uno ausente falla nombrando el campo y el archivo', async () => {
    const [error] = await checkFavicon('/falta.svg', publicDir);
    expect(error.describe()).toContain('favicon');
    expect(error.describe()).toContain('/falta.svg');
  });

  it('una ruta que se sale de public/ cuenta como ausente', async () => {
    await writeFile(path.join(dir, 'secreto.svg'), '<svg/>');
    expect(await checkFavicon('/../secreto.svg', publicDir)).toHaveLength(1);
  });

  it('https y sin definir no se comprueban', async () => {
    expect(await checkFavicon('https://x.dev/a.svg', publicDir)).toEqual([]);
    expect(await checkFavicon(undefined, publicDir)).toEqual([]);
  });
});
