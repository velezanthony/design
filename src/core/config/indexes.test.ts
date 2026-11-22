import { describe, expect, it } from 'vitest';
import { ListingView } from './folders';
import { generatesIndex, resolveIndexes, validateIndexFolders } from './indexes';

describe('resolveIndexes', () => {
  it('sin nada declarado: lista, con portadas y todas las carpetas (el tamaño depende de la disposición)', () => {
    expect(resolveIndexes({})).toEqual({
      layout: ListingView.LIST,
      covers: true,
      include: 'all',
      exclude: [],
      overrides: {},
    });
  });

  it('respeta lo declarado', () => {
    const resolved = resolveIndexes({
      layout: 'cards',
      pageSize: 6,
      covers: false,
      include: ['tutoriales'],
      exclude: ['borradores'],
      overrides: { tutoriales: { layout: 'table' } },
    });
    expect(resolved).toMatchObject({
      layout: 'cards',
      pageSize: 6,
      covers: false,
      include: ['tutoriales'],
      exclude: ['borradores'],
      overrides: { tutoriales: { layout: 'table' } },
    });
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
      include: ['tutoriales', 'tutorials'],
      exclude: ['nada'],
      overrides: { otra: { layout: 'cards' } },
    });
    const messages = validateIndexFolders(indexes, new Set(['tutoriales'])).map(
      (error) => error.message,
    );
    expect(messages).toEqual([
      expect.stringContaining('indexes.include[1]'),
      expect.stringContaining('indexes.exclude[0]'),
      expect.stringContaining('indexes.overrides.otra'),
    ]);
    expect(messages[0]).toContain('«tutorials»');
  });

  it('carpetas que existen: sin errores', () => {
    const indexes = resolveIndexes({ include: ['a'], overrides: { a: {} } });
    expect(validateIndexFolders(indexes, new Set(['a']))).toEqual([]);
  });
});
