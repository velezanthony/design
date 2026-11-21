import { describe, expect, it } from 'vitest';
import {
  contentFolders,
  generatedDescription,
  generatedTitle,
  generatesIndex,
  IndexLayout,
  listingOptions,
  resolveIndexes,
  validateIndexFolders,
} from './indexes';

describe('resolveIndexes', () => {
  it('sin nada declarado: lista, con imagen y todas las carpetas (el tamaño depende de la disposición)', () => {
    expect(resolveIndexes({})).toEqual({
      layout: IndexLayout.LIST,
      image: true,
      include: 'all',
      exclude: [],
      overrides: {},
    });
  });

  it('respeta lo declarado', () => {
    const resolved = resolveIndexes({
      layout: 'cards',
      pageSize: 6,
      image: false,
      include: ['articulos'],
      exclude: ['borradores'],
      overrides: { articulos: { layout: 'table' } },
    });
    expect(resolved).toMatchObject({
      layout: 'cards',
      pageSize: 6,
      image: false,
      include: ['articulos'],
      exclude: ['borradores'],
      overrides: { articulos: { layout: 'table' } },
    });
  });
});

describe('contentFolders', () => {
  it('cada carpeta de la que cuelga alguna página, también las intermedias', () => {
    expect(contentFolders(['', 'guia', 'articulos/git', 'a/b/c'])).toEqual([
      'articulos',
      'a',
      'a/b',
    ]);
  });
});

describe('generatesIndex', () => {
  it('`all` genera en todas salvo las excluidas', () => {
    const indexes = resolveIndexes({ exclude: ['b'] });
    expect(generatesIndex(indexes, 'a')).toBe(true);
    expect(generatesIndex(indexes, 'b')).toBe(false);
  });

  it('una lista genera solo en esas carpetas (exactas, no en sus subcarpetas)', () => {
    const indexes = resolveIndexes({ include: ['a'] });
    expect(generatesIndex(indexes, 'a')).toBe(true);
    expect(generatesIndex(indexes, 'a/b')).toBe(false);
    expect(generatesIndex(indexes, 'c')).toBe(false);
  });

  it('sin `indexes` no se genera nada', () => {
    expect(generatesIndex(undefined, 'a')).toBe(false);
  });
});

describe('validateIndexFolders', () => {
  it('una carpeta de include, exclude u overrides que no existe es un error con su ruta', () => {
    const indexes = resolveIndexes({
      include: ['articulos', 'articles'],
      exclude: ['nada'],
      overrides: { otra: { layout: 'cards' } },
    });
    const messages = validateIndexFolders(indexes, new Set(['articulos'])).map(
      (error) => error.message,
    );
    expect(messages).toEqual([
      expect.stringContaining('indexes.include[1]'),
      expect.stringContaining('indexes.exclude[0]'),
      expect.stringContaining('indexes.overrides.otra'),
    ]);
    expect(messages[0]).toContain('«articles»');
  });

  it('carpetas que existen: sin errores', () => {
    const indexes = resolveIndexes({ include: ['a'], overrides: { a: {} } });
    expect(validateIndexFolders(indexes, new Set(['a']))).toEqual([]);
  });
});

describe('listingOptions', () => {
  const indexes = resolveIndexes({
    layout: 'table',
    pageSize: 20,
    image: false,
    overrides: { articulos: { layout: 'cards', pageSize: 6, image: true } },
  });

  it('una página normal no tiene listado', () => {
    expect(listingOptions({ slug: 'articulos/git' }, indexes)).toBeUndefined();
  });

  it('sin `index` propio: la carpeta, luego `indexes`, luego los valores por defecto', () => {
    expect(listingOptions({ slug: 'articulos', listing: true }, indexes)).toEqual({
      folder: 'articulos',
      layout: 'cards',
      pageSize: 6,
      perPageOptions: [6, 12, 24, 48],
      image: true,
    });
    expect(listingOptions({ slug: 'guia', listing: true }, indexes)).toEqual({
      folder: 'guia',
      layout: 'table',
      pageSize: 20,
      perPageOptions: [10, 20, 25, 50],
      image: false,
    });
    expect(listingOptions({ slug: 'guia', listing: true }, undefined)).toEqual({
      folder: 'guia',
      layout: 'list',
      pageSize: 10,
      perPageOptions: [],
      image: true,
    });
  });

  it('el `index` de un _index.md manda sobre la carpeta y sobre `indexes`', () => {
    const page = {
      slug: 'articulos',
      listing: true as const,
      index: { layout: 'list' as const, image: false },
    };
    expect(listingOptions(page, indexes)).toEqual({
      folder: 'articulos',
      layout: 'list',
      pageSize: 6,
      perPageOptions: [],
      image: false,
    });
  });

  it('un _index.md funciona sin `indexes` en la config', () => {
    const page = { slug: 'a', listing: true as const, index: { layout: 'cards' as const } };
    expect(listingOptions(page, undefined)).toEqual({
      folder: 'a',
      layout: 'cards',
      pageSize: 12,
      perPageOptions: [12, 24, 48],
      image: true,
    });
  });

  it('por defecto: tarjetas de 12 en 12 (12, 24, 48) y tabla de 10 en 10 (10, 25, 50)', () => {
    const cards = listingOptions(
      { slug: 'a', listing: true, index: { layout: 'cards' } },
      undefined,
    );
    const table = listingOptions(
      { slug: 'a', listing: true, index: { layout: 'table' } },
      undefined,
    );
    expect(cards).toMatchObject({ pageSize: 12, perPageOptions: [12, 24, 48] });
    expect(table).toMatchObject({ pageSize: 10, perPageOptions: [10, 25, 50] });
  });

  it('`perPageOptions`: el _index.md, luego la carpeta, luego `indexes`', () => {
    const config = resolveIndexes({
      layout: 'cards',
      perPageOptions: [3, 6],
      pageSize: 3,
      overrides: { b: { perPageOptions: [12, 24], pageSize: 12 } },
    });
    expect(listingOptions({ slug: 'a', listing: true }, config)).toMatchObject({
      perPageOptions: [3, 6],
    });
    expect(listingOptions({ slug: 'b', listing: true }, config)).toMatchObject({
      perPageOptions: [12, 24],
    });
    const own = { slug: 'b', listing: true as const, index: { perPageOptions: [5], pageSize: 5 } };
    expect(listingOptions(own, config)).toMatchObject({ pageSize: 5, perPageOptions: [5] });
  });

  it('el tamaño de página siempre es una de las opciones: se añade si falta, ordenado y sin repetir', () => {
    const page = {
      slug: 'a',
      listing: true as const,
      index: { layout: 'cards' as const, pageSize: 12, perPageOptions: [27, 9, 9] },
    };
    expect(listingOptions(page, undefined)).toMatchObject({
      pageSize: 12,
      perPageOptions: [9, 12, 27],
    });
  });
});

describe('generatedTitle y generatedDescription', () => {
  const nav = [
    { label: { es: 'Guía', en: 'Guide' }, dir: 'guia' },
    { label: 'Sin carpeta', sidebar: ['x'] },
  ];

  it('el título de la carpeta en `overrides` va primero, en el idioma pedido', () => {
    const indexes = resolveIndexes({
      overrides: { guia: { title: { es: 'Manual', en: 'Manual EN' } } },
    });
    expect(generatedTitle('guia', 'en', 'es', indexes, nav)).toBe('Manual EN');
  });

  it('sin él, la etiqueta de la sección de `nav` con ese `dir`', () => {
    expect(generatedTitle('guia', 'en', 'es', resolveIndexes({}), nav)).toBe('Guide');
  });

  it('sin sección, el nombre de la carpeta legible', () => {
    expect(generatedTitle('notas-de-version', 'es', 'es', resolveIndexes({}), nav)).toBe(
      'Notas de version',
    );
    expect(generatedTitle('a/mis_notas', 'es', 'es', resolveIndexes({}), undefined)).toBe(
      'Mis notas',
    );
  });

  it('la descripción solo sale de `overrides`', () => {
    const indexes = resolveIndexes({
      overrides: { guia: { description: { es: 'Todo.', en: 'All.' } } },
    });
    expect(generatedDescription('guia', 'en', 'es', indexes)).toBe('All.');
    expect(generatedDescription('otra', 'en', 'es', indexes)).toBeUndefined();
  });
});
