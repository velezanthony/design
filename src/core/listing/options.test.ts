import { describe, expect, it } from 'vitest';
import { resolveIndexes } from '../config/indexes';
import { resolveListing } from './options';

describe('resolveListing', () => {
  const indexes = resolveIndexes({
    layout: 'table',
    pageSize: 20,
    covers: false,
    overrides: { tutoriales: { layout: 'cards', pageSize: 6, covers: true } },
  });

  it('una lista no tiene tamaño de página ni opciones: no se pagina', () => {
    const list = resolveListing({ folder: 'a', own: { layout: 'list', pageSize: 5 }, indexes });
    expect(list).not.toHaveProperty('pageSize');
    expect(list).not.toHaveProperty('perPageOptions');
  });

  it('una tabla sin opciones toma las suyas por defecto, con su `pageSize` dentro', () => {
    expect(
      resolveListing({ folder: 'a', own: { layout: 'table', pageSize: 15 }, indexes: undefined }),
    ).toEqual({
      folder: 'a',
      layout: 'table',
      pageSize: 15,
      perPageOptions: [10, 15, 25, 50],
      covers: true,
    });
  });

  it('sin `listing` propio: la carpeta, luego `indexes`, luego los valores por defecto', () => {
    expect(resolveListing({ folder: 'tutoriales', own: {}, indexes })).toEqual({
      folder: 'tutoriales',
      layout: 'cards',
      pageSize: 6,
      perPageOptions: [6, 12, 24, 48],
      covers: true,
    });
    expect(resolveListing({ folder: 'guia', own: {}, indexes })).toEqual({
      folder: 'guia',
      layout: 'table',
      pageSize: 20,
      perPageOptions: [10, 20, 25, 50],
      covers: false,
    });
    expect(resolveListing({ folder: 'guia', own: {}, indexes: undefined })).toEqual({
      folder: 'guia',
      layout: 'list',
      covers: true,
    });
  });

  it('el `listing` de un _index.md manda sobre la carpeta y sobre `indexes`', () => {
    const page = {
      slug: 'tutoriales',
      listing: { layout: 'list' as const, covers: false },
    };
    expect(resolveListing({ folder: page.slug, own: page.listing, indexes })).toEqual({
      folder: 'tutoriales',
      layout: 'list',
      covers: false,
    });
  });

  it('un _index.md funciona sin `indexes` en la config', () => {
    const page = { slug: 'a', listing: { layout: 'cards' as const } };
    expect(resolveListing({ folder: page.slug, own: page.listing, indexes: undefined })).toEqual({
      folder: 'a',
      layout: 'cards',
      pageSize: 12,
      perPageOptions: [12, 24, 48],
      covers: true,
    });
  });

  it('por defecto: tarjetas de 12 en 12 (12, 24, 48) y tabla de 10 en 10 (10, 25, 50)', () => {
    const cards = resolveListing({ folder: 'a', own: { layout: 'cards' }, indexes: undefined });
    const table = resolveListing({ folder: 'a', own: { layout: 'table' }, indexes: undefined });
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
    expect(resolveListing({ folder: 'a', own: {}, indexes: config })).toMatchObject({
      perPageOptions: [3, 6],
    });
    expect(resolveListing({ folder: 'b', own: {}, indexes: config })).toMatchObject({
      perPageOptions: [12, 24],
    });
    const own = { slug: 'b', listing: { perPageOptions: [5], pageSize: 5 } };
    expect(resolveListing({ folder: own.slug, own: own.listing, indexes: config })).toMatchObject({
      pageSize: 5,
      perPageOptions: [5],
    });
  });

  it('el tamaño de página siempre es una de las opciones: se añade si falta, ordenado y sin repetir', () => {
    const page = {
      slug: 'a',
      listing: { layout: 'cards' as const, pageSize: 12, perPageOptions: [27, 9, 9] },
    };
    expect(
      resolveListing({ folder: page.slug, own: page.listing, indexes: undefined }),
    ).toMatchObject({
      pageSize: 12,
      perPageOptions: [9, 12, 27],
    });
  });
});
