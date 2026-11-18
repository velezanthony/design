import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { injectedPaths, ROUTES, routesFor, SEO_ON_PAGE_DIR, type RouteOptions } from './routes';

const single: RouteOptions = { locales: ['en'], defaultLocale: 'en' };
const multiple: RouteOptions = { locales: ['en', 'es'], defaultLocale: 'en' };

function patterns(options: RouteOptions) {
  return routesFor(options).map((route) => route.pattern);
}

describe('ROUTES', () => {
  it('cada ruta tiene su contenedor en astro/pages/', () => {
    for (const { file } of ROUTES) {
      expect(existsSync(new URL(file, import.meta.url)), file).toBe(true);
    }
  });

  it('las del panel son tres, todas bajo seo-on-page y solo en desarrollo', () => {
    const panel = ROUTES.filter((route) => route.when === 'dev');
    expect(panel.map((route) => route.pattern)).toEqual([
      '/seo-on-page',
      '/seo-on-page/pages',
      '/seo-on-page/page',
    ]);
    expect(panel.every((route) => route.pattern.startsWith(`/${SEO_ON_PAGE_DIR}`))).toBe(true);
  });
});

describe('routesFor', () => {
  it('lo básico: docs, sitemap, su hoja, favicon y 404', () => {
    expect(patterns(single)).toEqual([
      '/[...slug]',
      '/sitemap.xml',
      '/_design/sitemap.css',
      '/_design/favicon.png',
      '/404',
    ]);
  });

  it('con varios idiomas añade /[locale]/404', () => {
    expect(patterns(multiple)).toContain('/[locale]/404');
    expect(patterns(single)).not.toContain('/[locale]/404');
  });

  it('el sitemap de páginas solo con índice', () => {
    expect(patterns({ ...single, sitemapIndex: true })).toContain('/sitemap-pages.xml');
    expect(patterns(single)).not.toContain('/sitemap-pages.xml');
  });

  it('el panel solo en desarrollo, sin prerenderizar', () => {
    expect(patterns(single).some((pattern) => pattern.includes(SEO_ON_PAGE_DIR))).toBe(false);
    const dev = routesFor({ ...single, seoOnPage: true });
    const panel = dev.filter((route) => route.pattern.includes(SEO_ON_PAGE_DIR));
    expect(panel).toHaveLength(3);
    expect(panel.every((route) => !route.prerender)).toBe(true);
    expect(
      dev
        .filter((route) => !route.pattern.includes(SEO_ON_PAGE_DIR))
        .every((route) => route.prerender),
    ).toBe(true);
  });

  it('la privacidad solo con `privacy.page`, y la de idioma además con varios idiomas', () => {
    expect(patterns(multiple).some((pattern) => pattern.includes('[privacy]'))).toBe(false);
    expect(patterns({ ...single, privacyPage: true })).toContain('/[privacy]');
    expect(patterns({ ...single, privacyPage: true })).not.toContain('/[locale]/[privacy]');
    expect(patterns({ ...multiple, privacyPage: true })).toContain('/[locale]/[privacy]');
  });
});

describe('injectedPaths', () => {
  it('rutas de fichero sin extensión, con la portada de cada idioma', () => {
    expect(injectedPaths(multiple)).toEqual([
      'index',
      'es/index',
      'sitemap.xml',
      '_design/sitemap.css',
      '_design/favicon.png',
      '404',
      'es/404',
    ]);
  });

  it('con un solo idioma no hay prefijo', () => {
    expect(injectedPaths(single)).not.toContain('en/index');
  });

  it('el panel y la privacidad cuentan también como carpeta con index', () => {
    const paths = injectedPaths({ ...multiple, seoOnPage: true, privacyPage: true });
    expect(paths).toContain('seo-on-page/pages');
    expect(paths).toContain('seo-on-page/pages/index');
    expect(paths).toContain('privacy');
    expect(paths).toContain('privacy/index');
  });

  it('la privacidad usa el nombre de cada idioma', () => {
    const paths = injectedPaths({ locales: ['es', 'en'], defaultLocale: 'es', privacyPage: true });
    expect(paths).toContain('privacidad');
    expect(paths).toContain('en/privacy/index');
  });
});
