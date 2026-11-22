import { describe, expect, it } from 'vitest';
import { resolveFolders, type FoldersUserConfig } from '../config/folders';
import { resolveListing } from './options';

function listing(folder: string, user?: FoldersUserConfig) {
  return resolveListing({ folder, folders: resolveFolders(user) });
}

describe('resolveListing', () => {
  it('sin `folders`: lista con portadas, sin paginar', () => {
    expect(listing('guia')).toEqual({ folder: 'guia', view: 'list', covers: true });
  });

  it('una lista no tiene tamaño de página ni opciones aunque se declaren', () => {
    const list = listing('a', { a: { listing: { view: 'list', pageSize: 5 } } });
    expect(list).not.toHaveProperty('pageSize');
    expect(list).not.toHaveProperty('perPageOptions');
  });

  it("la vista se hereda de `'*'`", () => {
    expect(listing('guia', { '*': { listing: { view: 'table' } } })).toMatchObject({
      view: 'table',
    });
  });

  it('`pageSize` por defecto según la vista efectiva: tarjetas de 12 en 12 y tabla de 10 en 10', () => {
    expect(listing('a', { '*': { listing: { view: 'cards' } } })).toMatchObject({
      pageSize: 12,
      perPageOptions: [12, 24, 48],
    });
    expect(listing('a', { a: { listing: { view: 'table' } } })).toMatchObject({
      pageSize: 10,
      perPageOptions: [10, 25, 50],
    });
  });

  it('la vista del padre y el tamaño del hijo se combinan (herencia por hoja)', () => {
    const folders = {
      '*': { listing: { view: 'table' as const, covers: false } },
      tutoriales: { listing: { view: 'cards' as const } },
      'tutoriales/avanzado': { listing: { pageSize: 6 } },
    };
    expect(listing('tutoriales/avanzado', folders)).toEqual({
      folder: 'tutoriales/avanzado',
      view: 'cards',
      pageSize: 6,
      perPageOptions: [6, 12, 24, 48],
      covers: false,
    });
    expect(listing('guia', folders)).toEqual({
      folder: 'guia',
      view: 'table',
      pageSize: 10,
      perPageOptions: [10, 25, 50],
      covers: false,
    });
  });

  it('`perPageOptions` de la carpeta más cercana que lo declara', () => {
    const folders = {
      '*': { listing: { view: 'cards' as const, perPageOptions: [3, 6], pageSize: 3 } },
      b: { listing: { perPageOptions: [12, 24], pageSize: 12 } },
    };
    expect(listing('a', folders)).toMatchObject({ perPageOptions: [3, 6] });
    expect(listing('b', folders)).toMatchObject({ perPageOptions: [12, 24] });
  });

  it('el tamaño de página siempre es una de las opciones: se añade si falta, ordenado y sin repetir', () => {
    const folders = {
      a: { listing: { view: 'cards' as const, pageSize: 12, perPageOptions: [27, 9, 9] } },
    };
    expect(listing('a', folders)).toMatchObject({ pageSize: 12, perPageOptions: [9, 12, 27] });
  });
});
