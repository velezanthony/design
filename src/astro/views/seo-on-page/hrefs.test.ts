import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS } from '../../../core/seo-on-page/queries/url-filters';
import { IssueKind, IssueSeverity } from '../../../core/seo-on-page/tree/types';
import { assetHref, devHrefs } from './hrefs';

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
      hideNoindex: false,
    };
    expect(devHrefs(policy).pages(filters)).toBe(
      '/repo/seo-on-page/pages/?kind=no-h1&severity=error&locale=es&q=a+b',
    );
  });

  it('la página se añade tras los filtros y la 1 no se escribe', () => {
    const filters = { ...EMPTY_FILTERS, severities: [IssueSeverity.INFO] };
    expect(devHrefs(policy).pages(filters, 2)).toBe(
      '/repo/seo-on-page/pages/?severity=info&page=2',
    );
    expect(devHrefs(policy).pages(filters, 1)).toBe('/repo/seo-on-page/pages/?severity=info');
    expect(devHrefs(policy).pages(undefined, 3)).toBe('/repo/seo-on-page/pages/?page=3');
    expect(devHrefs(policy).pages(filters, 2, 50)).toBe(
      '/repo/seo-on-page/pages/?severity=info&page=2&per=50',
    );
    expect(devHrefs(policy).pages(filters, 1, 10)).toBe(
      '/repo/seo-on-page/pages/?severity=info&per=10',
    );
    expect(devHrefs(policy).pages(filters, 1, 25)).toBe('/repo/seo-on-page/pages/?severity=info');
  });

  it('la vista va en la query y la de por página no se escribe', () => {
    expect(devHrefs(policy).pages(undefined, 1, undefined, { view: 'matrix' })).toBe(
      '/repo/seo-on-page/pages/?view=matrix',
    );
    expect(devHrefs(policy).pages(undefined, 2, undefined, { view: 'have', lacks: 'og' })).toBe(
      '/repo/seo-on-page/pages/?view=have&lacks=og&page=2',
    );
    expect(devHrefs(policy).pages(undefined, 1, undefined, { view: 'page' })).toBe(
      '/repo/seo-on-page/pages/',
    );
  });

  it('sin filtros no deja un `?` colgando', () => {
    const empty = EMPTY_FILTERS;
    expect(devHrefs(policy).pages(empty)).toBe('/repo/seo-on-page/pages/');
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
