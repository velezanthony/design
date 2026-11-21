import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveCover } from './covers';

let directory: string;
let publicDir: URL;
let page: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'docs-covers-'));
  await mkdir(path.join(directory, 'public/portadas'), { recursive: true });
  await mkdir(path.join(directory, 'docs/articulos/img'), { recursive: true });
  await writeFile(path.join(directory, 'public/portadas/git.png'), 'png');
  await writeFile(path.join(directory, 'docs/articulos/img/git.png'), 'png');
  publicDir = pathToFileURL(`${path.join(directory, 'public')}/`);
  page = path.join(directory, 'docs/articulos/git.md');
});
afterEach(() => rm(directory, { recursive: true, force: true }));

describe('resolveCover', () => {
  it('sin `index.image` no hay nada que resolver: decide la política del listado', async () => {
    expect(await resolveCover(undefined, page, publicDir, 'articulos/git.md')).toEqual({});
  });

  it('`false`: sin imagen', async () => {
    expect(await resolveCover(false, page, publicDir, 'articulos/git.md')).toEqual({
      cover: false,
    });
  });

  it('una ruta relativa al .md que existe: imagen procesada, siempre con `./`', async () => {
    for (const image of ['./img/git.png', 'img/git.png']) {
      expect(await resolveCover(image, page, publicDir, 'articulos/git.md')).toEqual({
        cover: { asset: './img/git.png' },
      });
    }
    expect(
      await resolveCover('../articulos/img/git.png', page, publicDir, 'articulos/git.md'),
    ).toEqual({ cover: { asset: '../articulos/img/git.png' } });
  });

  it('una ruta de public/ que existe: se sirve tal cual', async () => {
    expect(await resolveCover('/portadas/git.png', page, publicDir, 'articulos/git.md')).toEqual({
      cover: { src: '/portadas/git.png' },
    });
  });

  it('una imagen que no existe: aviso con archivo y ruta, y la portada de la librería', async () => {
    for (const image of ['./nada.png', '/portadas/nada.png']) {
      const resolved = await resolveCover(image, page, publicDir, 'articulos/git.md');
      expect(resolved.cover).toBe('missing');
      expect(resolved.warning).toContain('articulos/git.md');
      expect(resolved.warning).toContain(`«${image}»`);
    }
  });

  it('una ruta de public/ que se sale de public/ cuenta como que no existe', async () => {
    const resolved = await resolveCover('/../docs/articulos/img/git.png', page, publicDir, 'x.md');
    expect(resolved.cover).toBe('missing');
  });
});
