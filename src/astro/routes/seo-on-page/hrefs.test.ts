import { describe, expect, it } from 'vitest';
import { IssueKind, IssueSeverity } from '../../../core/seo-on-page/tree/types';
import { assetHref, devHrefs, SEO_ON_PAGE_ROUTES } from './hrefs';

const policy = { base: '/repo', trailingSlash: 'always' as const, defaultLocale: 'en' };

describe('devHrefs', () => {
  it('cuelga las rutas del panel de la base, con barra final si la config la pide', () => {
    const hrefs = devHrefs(policy);
    expect(hrefs.overview()).toBe('/repo/seo-on-page/');
    expect(hrefs.pages()).toBe('/repo/seo-on-page/pages/');
    expect(hrefs.inspector({ slug: 'guide', locale: 'es' })).toBe(
      '/repo/seo-on-page/page/?slug=guide&locale=es',
    );
  });

  it('la portada del sitio, para volver desde el panel', () => {
    expect(devHrefs(policy).siteHome()).toBe('/repo/');
    expect(devHrefs({ ...policy, base: '/' }).siteHome()).toBe('/');
  });

  it('sin barra final cuando la config la quita', () => {
    const hrefs = devHrefs({ ...policy, trailingSlash: 'never' });
    expect(hrefs.pages()).toBe('/repo/seo-on-page/pages');
  });

  it('la portada (slug vacío) conserva el parámetro vacío', () => {
    expect(devHrefs(policy).inspector({ slug: '', locale: 'en' })).toBe(
      '/repo/seo-on-page/page/?slug=&locale=en',
    );
  });

  it('la tabla lleva los filtros serializados en la query', () => {
    const filters = {
      kinds: [IssueKind.NO_H1],
      severities: [IssueSeverity.ERROR],
      locales: ['es'],
      text: 'a b',
    };
    expect(devHrefs(policy).pages(filters)).toBe(
      '/repo/seo-on-page/pages/?kind=no-h1&severity=error&locale=es&q=a+b',
    );
  });

  it('la página se añade tras los filtros y la 1 no se escribe', () => {
    const filters = { kinds: [], severities: [IssueSeverity.INFO], locales: [], text: '' };
    expect(devHrefs(policy).pages(filters, 2)).toBe(
      '/repo/seo-on-page/pages/?severity=info&page=2',
    );
    expect(devHrefs(policy).pages(filters, 1)).toBe('/repo/seo-on-page/pages/?severity=info');
    expect(devHrefs(policy).pages(undefined, 3)).toBe('/repo/seo-on-page/pages/?page=3');
  });

  it('sin filtros no deja un `?` colgando', () => {
    const empty = { kinds: [], severities: [], locales: [], text: '' };
    expect(devHrefs(policy).pages(empty)).toBe('/repo/seo-on-page/pages/');
  });
});

describe('SEO_ON_PAGE_ROUTES', () => {
  it('son tres rutas, todas bajo seo-on-page', () => {
    expect(SEO_ON_PAGE_ROUTES.map((route) => route.pattern)).toEqual([
      '/seo-on-page',
      '/seo-on-page/pages',
      '/seo-on-page/page',
    ]);
  });
});

describe('assetHref', () => {
  it('cuelga la imagen local de la base, como hace og:image', () => {
    expect(assetHref('/repo', '/og.png')).toBe('/repo/og.png');
    expect(assetHref('/repo/', '/og.png')).toBe('/repo/og.png');
    expect(assetHref('/', '/og.png')).toBe('/og.png');
  });

  it('una URL https se deja tal cual', () => {
    expect(assetHref('/repo', 'https://cdn.x.dev/og.png')).toBe('https://cdn.x.dev/og.png');
  });
});
