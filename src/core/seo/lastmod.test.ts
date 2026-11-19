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
});
