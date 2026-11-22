import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import type { Availability, UrlPolicy } from '../i18n/availability';
import { excludeNoindex, noindexUrls } from './indexable';

const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' };
function page(slug: string, locale: string, noindex?: boolean): Page {
  return {
    slug,
    locale,
    title: slug,
    kind: 'native',
    body: '',
    sourcePath: `${slug}.${locale}.md`,
    ...(noindex !== undefined && { seo: { noindex } }),
  };
}

describe('noindexUrls', () => {
  it('reúne la URL de cada página con seo.noindex', () => {
    const pages = [page('a', 'en'), page('a', 'es', true), page('b', 'en', false)];
    expect([...noindexUrls(pages, url)]).toEqual(['/repo/es/a/']);
  });
});

describe('excludeNoindex', () => {
  const availability: Availability = new Map([
    ['a', { en: '/repo/a/', es: '/repo/es/a/' }],
    ['b', { en: '/repo/b/' }],
  ]);

  it('quita las URLs excluidas, también de los alternates de sus gemelas', () => {
    const result = excludeNoindex(availability, new Set(['/repo/es/a/']));
    expect(result.get('a')).toEqual({ en: '/repo/a/' });
  });

  it('un grupo que se queda sin idiomas desaparece', () => {
    expect(excludeNoindex(availability, new Set(['/repo/b/'])).has('b')).toBe(false);
  });

  it('no muta la entrada', () => {
    excludeNoindex(availability, new Set(['/repo/es/a/']));
    expect(availability.get('a')).toEqual({ en: '/repo/a/', es: '/repo/es/a/' });
  });
});

describe('noindexUrls: `slug` propio', () => {
  it('excluye la URL traducida, la que de verdad está en el sitemap', () => {
    const pages = [{ ...page('a', 'es', true), urlSlug: 'b' }];
    expect([...noindexUrls(pages, url)]).toEqual(['/repo/es/b/']);
  });
});
