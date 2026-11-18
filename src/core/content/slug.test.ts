import { describe, expect, it } from 'vitest';
import { DocsError } from '../errors';
import { findSlugCollisions, toSlug } from './slug';

describe('toSlug', () => {
  it('conserva la ruta sin extensión', () => {
    expect(toSlug('guide/install')).toBe('guide/install');
    expect(toSlug('a')).toBe('a');
  });

  it('colapsa index a su directorio', () => {
    expect(toSlug('guide/index')).toBe('guide');
    expect(toSlug('a/b/index')).toBe('a/b');
  });

  it('el index de la raíz es el slug vacío', () => {
    expect(toSlug('index')).toBe('');
  });

  it('solo colapsa el segmento completo `index`', () => {
    expect(toSlug('guide/reindex')).toBe('guide/reindex');
    expect(toSlug('index-of')).toBe('index-of');
  });
});

describe('findSlugCollisions', () => {
  it('sin repetidos no hay errores', () => {
    expect(
      findSlugCollisions([
        { slug: 'a', locale: 'en', file: 'a.md' },
        { slug: 'b', locale: 'en', file: 'b.md' },
      ]),
    ).toEqual([]);
  });

  it('el mismo slug en el mismo idioma nombra ambos archivos', () => {
    const [error, ...rest] = findSlugCollisions([
      { slug: 'a', locale: 'en', file: 'a.md' },
      { slug: 'a', locale: 'en', file: 'a/index.md' },
    ]);
    expect(rest).toEqual([]);
    expect(error).toBeInstanceOf(DocsError);
    expect(error?.message).toContain('a.md');
    expect(error?.message).toContain('a/index.md');
  });

  it('el mismo slug en otro idioma no choca', () => {
    expect(
      findSlugCollisions([
        { slug: 'a', locale: 'en', file: 'a.md' },
        { slug: 'a', locale: 'es', file: 'a.es.md' },
      ]),
    ).toEqual([]);
  });
});
