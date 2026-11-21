import { describe, expect, it } from 'vitest';
import { DocsError } from '../errors';
import { findSlugCollisions, findUrlCollisions, slugProblem, toSlug, urlSlugOf } from './slug';

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

  it('la portada se nombra como «(portada)» y un slug normal por su nombre', () => {
    const [home] = findSlugCollisions([
      { slug: '', locale: 'en', file: 'index.md' },
      { slug: '', locale: 'en', file: 'index/index.md' },
    ]);
    expect(home?.message).toContain('«(portada)»');
    const [named] = findSlugCollisions([
      { slug: 'a', locale: 'en', file: 'a.md' },
      { slug: 'a', locale: 'en', file: 'a/index.md' },
    ]);
    expect(named?.message).toContain('«a»');
    expect(named?.message).not.toContain('portada');
  });

  it('el error apunta al primer archivo y lleva una pista', () => {
    const [error] = findSlugCollisions([
      { slug: 'a', locale: 'en', file: 'a.md' },
      { slug: 'a', locale: 'en', file: 'a/index.md' },
    ]);
    expect(error?.file).toBe('a.md');
    expect(error?.hint).toBeTruthy();
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

describe('urlSlugOf', () => {
  it('sin `slug` propio, la URL sale de la identidad (el nombre del archivo)', () => {
    expect(urlSlugOf({ slug: 'articulos/x' })).toBe('articulos/x');
  });

  it('con `slug` propio, la URL es la suya', () => {
    expect(urlSlugOf({ slug: 'articulos/x', urlSlug: 'articles/y' })).toBe('articles/y');
  });
});

describe('slugProblem', () => {
  const locales = ['es', 'en'];

  it('una ruta relativa al contenido, con o sin carpetas, es válida', () => {
    expect(slugProblem('articles/n-plus-one-queries-django', locales)).toBeUndefined();
    expect(slugProblem('guide', locales)).toBeUndefined();
    expect(slugProblem('notas/v1.2_final', locales)).toBeUndefined();
    expect(slugProblem('artículos/año', locales)).toBeUndefined();
  });

  it('vacío: pide quitarlo o escribir la ruta', () => {
    expect(slugProblem('', locales)?.message).toContain('vacío');
    expect(slugProblem('   ', locales)?.message).toContain('vacío');
  });

  it('absoluto o con barra final: pide la ruta sin barras en los extremos', () => {
    expect(slugProblem('/articles/x', locales)?.message).toContain('`/`');
    expect(slugProblem('articles/x/', locales)?.message).toContain('`/`');
    expect(slugProblem('/articles/x', locales)?.hint).toContain('articles/');
  });

  it('`..` o `.` como segmento', () => {
    expect(slugProblem('articles/../x', locales)?.message).toContain('`..`');
    expect(slugProblem('./x', locales)?.message).toContain('`..`');
  });

  it('con prefijo de idioma: lo añade la librería', () => {
    const problem = slugProblem('en/articles/x', locales);
    expect(problem?.message).toContain('«en»');
    expect(problem?.hint).toContain('prefijo');
    // El idioma por defecto también: su prefijo está reservado a la otra forma de escribir la URL.
    expect(slugProblem('es/x', locales)?.message).toContain('«es»');
    expect(slugProblem('english/x', locales)).toBeUndefined();
  });

  it('terminado en `/index`: se escribe la carpeta', () => {
    expect(slugProblem('guide/index', locales)?.message).toContain('/index');
    expect(slugProblem('index', locales)?.message).toContain('/index');
    expect(slugProblem('guide/reindex', locales)).toBeUndefined();
  });

  it('caracteres no válidos: los nombra', () => {
    const problem = slugProblem('articles/n+1 queries?', locales);
    expect(problem?.message).toContain('+');
    expect(problem?.message).toContain('?');
    expect(slugProblem('articles//x', locales)?.message).toContain('segmento vacío');
    expect(slugProblem('articles\\x', locales)?.message).toContain('\\');
  });
});

describe('findUrlCollisions', () => {
  it('un `slug` que coincide con la URL de otro archivo del mismo idioma nombra ambos', () => {
    const [error, ...rest] = findUrlCollisions([
      { slug: 'guide', locale: 'en', file: 'a.en.md', explicit: true },
      { slug: 'guide', locale: 'en', file: 'guide.en.md', explicit: false },
    ]);
    expect(rest).toEqual([]);
    expect(error).toBeInstanceOf(DocsError);
    expect(error?.message).toContain('«guide» (en)');
    expect(error?.message).toContain('a.en.md (slug)');
    expect(error?.message).toContain('guide.en.md');
    expect(error?.file).toBe('a.en.md');
    expect(error?.hint).toContain('`slug`');
  });

  it('dos `slug` iguales en el mismo idioma también chocan', () => {
    expect(
      findUrlCollisions([
        { slug: 'x', locale: 'en', file: 'a.en.md', explicit: true },
        { slug: 'x', locale: 'en', file: 'b.en.md', explicit: true },
      ]),
    ).toHaveLength(1);
  });

  it('sin ningún `slug` no informa: ese choque ya lo cuenta `findSlugCollisions`', () => {
    expect(
      findUrlCollisions([
        { slug: 'a', locale: 'en', file: 'a.md', explicit: false },
        { slug: 'a', locale: 'en', file: 'a/index.md', explicit: false },
      ]),
    ).toEqual([]);
  });

  it('la misma URL en otro idioma no choca', () => {
    expect(
      findUrlCollisions([
        { slug: 'x', locale: 'en', file: 'a.en.md', explicit: true },
        { slug: 'x', locale: 'es', file: 'x.md', explicit: false },
      ]),
    ).toEqual([]);
  });
});
