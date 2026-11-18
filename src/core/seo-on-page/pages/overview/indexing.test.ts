import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import type { SeoPage } from '../../tree/types';
import { indexing } from './indexing';

function entry(slug: string, locale = 'en', over: Partial<SeoPage['meta']> = {}): SeoPage {
  const base = seoPage({ slug, locale });
  return {
    ...base,
    meta: { ...base.meta, canonical: `/${locale}/${slug}/`, ...over },
    locales: [{ locale, status: 'present', url: `/${locale}/${slug}/` }],
  };
}
function noindex(slug: string, locale = 'en') {
  return entry(slug, locale, { noindex: true });
}

const base = { sitemapUrls: 0, fallbacks: 0 };

describe('indexing', () => {
  it('separa páginas indexables de las que declaran noindex en algún idioma', () => {
    const pages = [entry('a'), entry('b'), noindex('c'), entry('c', 'es')];
    expect(indexing({ pages }, { ...base, sitemapUrls: 3 })).toMatchObject({
      pages: 3,
      indexable: 2,
      noindex: 1,
    });
  });

  it('cuenta las entradas y las que tienen canonical propio (el de su propia URL)', () => {
    const pages = [entry('a'), entry('b', 'en', { canonical: '/otra/' })];
    expect(indexing({ pages }, base)).toMatchObject({ entries: 2, ownCanonical: 1 });
  });

  it('el sitemap lleva las URLs que se le dan, sin tocarlas', () => {
    expect(indexing({ pages: [entry('a')] }, { ...base, sitemapUrls: 1 }).sitemapUrls).toBe(1);
  });

  describe('por qué no se indexa (entradas)', () => {
    it('noindex declarado: las entradas con noindex', () => {
      const pages = [noindex('a'), noindex('a', 'es'), entry('b')];
      expect(indexing({ pages }, { ...base, sitemapUrls: 1 }).reasons.noindex).toBe(2);
    });

    it('respaldo de traducción: lo que se le pasa de la matriz', () => {
      expect(
        indexing({ pages: [entry('a')] }, { ...base, sitemapUrls: 1, fallbacks: 4 }).reasons
          .fallback,
      ).toBe(4);
    });

    it('fuera del sitemap: indexables que el sitemap no lleva', () => {
      const pages = [entry('a'), entry('b'), noindex('c')];
      expect(indexing({ pages }, { ...base, sitemapUrls: 1 }).reasons.outOfSitemap).toBe(1);
    });

    it('nunca sale negativo si el sitemap lleva de más', () => {
      expect(
        indexing({ pages: [entry('a')] }, { ...base, sitemapUrls: 9 }).reasons.outOfSitemap,
      ).toBe(0);
    });
  });
});
