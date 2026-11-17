import { describe, expect, it } from 'vitest';

import { pagesOf, sitemapXml, urlPolicyOf, type DocData } from './pages';

const cfg = {
  base: '/repo',
  site: 'https://x.dev',
  trailingSlash: 'always' as const,
  defaultLocale: 'en',
};

const data = (slug: string, locale: string, extra: Partial<DocData> = {}): DocData => ({
  slug,
  locale,
  title: slug || 'Home',
  sourcePath: `${slug || 'index'}.md`,
  ...extra,
});

describe('urlPolicyOf', () => {
  it('toma base, barra final e idioma por defecto de la config', () => {
    expect(urlPolicyOf(cfg)).toEqual({
      base: '/repo',
      trailingSlash: 'always',
      defaultLocale: 'en',
    });
  });
});

describe('pagesOf', () => {
  it('reconstruye Page desde los datos de la colección', () => {
    const [page] = pagesOf([data('guide', 'es', { seo: { noindex: true }, translations: 'omit' })]);
    expect(page).toMatchObject({
      slug: 'guide',
      locale: 'es',
      seo: { noindex: true },
      translations: 'omit',
    });
  });
});

describe('sitemapXml', () => {
  it('lista solo páginas reales, con alternates y base', () => {
    const xml = sitemapXml([data('guide', 'en'), data('guide', 'es')], cfg);
    expect(xml).toContain('<loc>https://x.dev/repo/guide/</loc>');
    expect(xml).toContain('hreflang="es" href="https://x.dev/repo/es/guide/"');
  });

  it('excluye las noindex y las quita de los alternates de su gemela', () => {
    const xml = sitemapXml(
      [data('guide', 'en'), data('guide', 'es', { seo: { noindex: true } })],
      cfg,
    );
    expect(xml).toContain('<loc>https://x.dev/repo/guide/</loc>');
    expect(xml).not.toContain('/repo/es/guide/');
    expect(xml).not.toContain('xhtml:link');
  });

  it('nunca incluye rutas de reserva ni 404 (no son páginas)', () => {
    const xml = sitemapXml([data('guide', 'en')], cfg);
    expect(xml).not.toContain('404');
    expect(xml.match(/<url>/g)).toHaveLength(1);
  });

  it('un error del núcleo llega como AstroError con contexto', () => {
    const many = Array.from({ length: 50_001 }, (_, i) => data(`p${i}`, 'en'));
    expect(() => sitemapXml(many, cfg)).toThrow(/50000|50 000|sitemap/i);
  });
});

describe('sitemapXml: página de privacidad', () => {
  const withPrivacy = {
    ...cfg,
    defaultLocale: 'es',
    locales: ['es', 'en'],
    privacy: { page: true },
  };

  it('con `page: true` la incluye en cada idioma, con hreflang entre ellas', () => {
    const xml = sitemapXml([data('guide', 'es')], withPrivacy);
    expect(xml).toContain('<loc>https://x.dev/repo/privacidad/</loc>');
    expect(xml).toContain('<loc>https://x.dev/repo/en/privacy/</loc>');
    expect(xml).toContain('hreflang="en" href="https://x.dev/repo/en/privacy/"');
    expect(xml).toContain('hreflang="es" href="https://x.dev/repo/privacidad/"');
  });

  it('sin `page` no aparece', () => {
    const xml = sitemapXml([data('guide', 'es')], {
      ...withPrivacy,
      privacy: { page: false },
    });
    expect(xml).not.toContain('privacidad');
    expect(xml).not.toContain('privacy');
  });
});
