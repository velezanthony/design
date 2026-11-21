import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import type { UrlPolicy } from '../i18n/availability';
import { pageLastmods, parseCommitDates } from './lastmod';

const RECORD = '\u001e';

describe('parseCommitDates', () => {
  it('de cada archivo se queda con el commit más reciente (el git log va de nuevo a viejo)', () => {
    const log = [
      `${RECORD}2026-09-07T00:06:43+02:00`,
      '',
      'docs/a.md',
      'src/pages/cv.astro',
      '',
      `${RECORD}2026-08-08T14:01:37+02:00`,
      '',
      'docs/a.md',
      'docs/b.md',
      '',
    ].join('\n');
    expect(parseCommitDates(log)).toEqual(
      new Map([
        ['docs/a.md', '2026-09-07T00:06:43+02:00'],
        ['src/pages/cv.astro', '2026-09-07T00:06:43+02:00'],
        ['docs/b.md', '2026-08-08T14:01:37+02:00'],
      ]),
    );
  });

  it('la hora UTC sale igual escriba git `Z` o `+00:00`', () => {
    const log = [`${RECORD}2026-02-02T10:00:00Z`, '', 'docs/a.md', ''].join('\n');
    expect(parseCommitDates(log).get('docs/a.md')).toBe('2026-02-02T10:00:00+00:00');
  });

  it('un commit sin archivos (una fusión) no inventa nada', () => {
    const log = `${RECORD}2026-09-07T00:06:43+02:00\n\n${RECORD}2026-08-08T14:01:37+02:00\n\na.md\n`;
    expect(parseCommitDates(log)).toEqual(new Map([['a.md', '2026-08-08T14:01:37+02:00']]));
  });

  it('un historial vacío no da fechas', () => {
    expect(parseCommitDates('')).toEqual(new Map());
  });

  it('respeta los espacios y los acentos de los nombres', () => {
    const log = `${RECORD}2026-09-07T00:06:43+02:00\n\ndocs/guía rápida.md\n`;
    expect(parseCommitDates(log).get('docs/guía rápida.md')).toBe('2026-09-07T00:06:43+02:00');
  });
});

describe('pageLastmods', () => {
  const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' };
  function page(slug: string, locale: 'en' | 'es', sourcePath: string): Page {
    return { slug, locale, title: slug, kind: 'native', sourcePath, body: '' };
  }

  it('asocia la URL de cada página con la fecha de su archivo', () => {
    const dates = new Map([
      ['a.md', '2026-01-01T00:00:00.000Z'],
      ['a.es.md', '2026-02-02T00:00:00.000Z'],
    ]);
    const pages = [page('a', 'en', 'a.md'), page('a', 'es', 'a.es.md')];
    expect(pageLastmods(pages, url, dates)).toEqual(
      new Map([
        ['/repo/a/', '2026-01-01T00:00:00.000Z'],
        ['/repo/es/a/', '2026-02-02T00:00:00.000Z'],
      ]),
    );
  });

  it('una página sin fecha se queda fuera: sin lastmod, no un lastmod inventado', () => {
    expect(pageLastmods([page('a', 'en', 'a.md')], url, new Map())).toEqual(new Map());
  });

  it('una página con listado cambia cuando cambia la página más reciente de su carpeta', () => {
    const dates = new Map([
      ['b/_index.md', '2026-01-01T00:00:00+00:00'],
      ['b/x.md', '2026-05-01T00:00:00+00:00'],
      ['b/y.md', '2026-03-01T00:00:00+00:00'],
      ['c.md', '2026-09-01T00:00:00+00:00'],
    ]);
    const pages = [
      { ...page('b', 'en', 'b/_index.md'), listing: true as const },
      page('b/x', 'en', 'b/x.md'),
      page('b/y', 'en', 'b/y.md'),
      page('c', 'en', 'c.md'),
    ];
    expect(pageLastmods(pages, url, dates).get('/repo/b/')).toBe('2026-05-01T00:00:00+00:00');
  });

  it('un índice generado (sin archivo) toma la fecha de su página más reciente', () => {
    const dates = new Map([['b/x.md', '2026-05-01T00:00:00+00:00']]);
    const pages = [
      { ...page('b', 'en', 'b/_index.md'), kind: 'generated' as const, listing: true as const },
      page('b/x', 'en', 'b/x.md'),
    ];
    expect(pageLastmods(pages, url, dates).get('/repo/b/')).toBe('2026-05-01T00:00:00+00:00');
  });
});

describe('pageLastmods: `slug` propio', () => {
  it('la fecha va a la URL traducida y el listado mira su carpeta por identidad', () => {
    const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' };
    const pages: Page[] = [
      {
        slug: 'articulos',
        locale: 'es',
        title: 'A',
        kind: 'native',
        sourcePath: 'articulos/_index.es.md',
        body: '',
        listing: true,
        urlSlug: 'articles-es',
      },
      {
        slug: 'articulos/x',
        locale: 'es',
        title: 'X',
        kind: 'native',
        sourcePath: 'articulos/x.es.md',
        body: '',
        urlSlug: 'blog/x',
      },
    ];
    const dates = new Map([
      ['articulos/_index.es.md', '2026-01-01T00:00:00+00:00'],
      ['articulos/x.es.md', '2026-03-01T00:00:00+00:00'],
    ]);
    expect(pageLastmods(pages, url, dates)).toEqual(
      new Map([
        ['/repo/es/articles-es/', '2026-03-01T00:00:00+00:00'],
        ['/repo/es/blog/x/', '2026-03-01T00:00:00+00:00'],
      ]),
    );
  });
});
