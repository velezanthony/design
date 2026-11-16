import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import type { Availability, UrlPolicy } from '../i18n/availability';
import { excludeNoindex, noindexUrls } from './indexable';

const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' };
const page = (slug: string, locale: string, noindex?: boolean): Page => ({
  slug,
  locale,
  title: slug,
  kind: 'native',
  body: '',
  sourcePath: `${slug}.${locale}.md`,
  ...(noindex !== undefined && { seo: { noindex } }),
});

describe('noindexUrls', () => {
  it('reúne la URL de cada página con seo.noindex', () => {
    const pages = [page('a', 'en'), page('a', 'es', true), page('b', 'en', false)];
    expect([...noindexUrls(pages, url)]).toEqual(['/repo/es/a/']);
  });
});

describe('excludeNoindex', () => {
  const av: Availability = new Map([
    ['a', { en: '/repo/a/', es: '/repo/es/a/' }],
    ['b', { en: '/repo/b/' }],
  ]);

  it('quita las URLs excluidas, también de los alternates de sus gemelas', () => {
    const result = excludeNoindex(av, new Set(['/repo/es/a/']));
    expect(result.get('a')).toEqual({ en: '/repo/a/' });
  });

  it('un grupo que se queda sin idiomas desaparece', () => {
    expect(excludeNoindex(av, new Set(['/repo/b/'])).has('b')).toBe(false);
  });

  it('no muta la entrada', () => {
    excludeNoindex(av, new Set(['/repo/es/a/']));
    expect(av.get('a')).toEqual({ en: '/repo/a/', es: '/repo/es/a/' });
  });
});
