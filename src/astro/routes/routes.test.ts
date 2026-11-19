import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { injectedPaths, ROUTES, routesFor, SEO_ON_PAGE_DIR, type RouteOptions } from './routes';

const single: RouteOptions = { locales: ['en'], defaultLocale: 'en' };
const multiple: RouteOptions = { locales: ['en', 'es'], defaultLocale: 'en' };

function patterns(options: RouteOptions) {
  return routesFor(options).map((route) => route.pattern);
}

describe('ROUTES', () => {
  it('cada ruta tiene su contenedor en astro/routes/', () => {
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
  it('lo básico: docs, sitemap, su hoja y favicon', () => {
    expect(patterns(single)).toEqual([
      '/[...slug]',
      '/sitemap.xml',
      '/_design/sitemap.css',
      '/_design/favicon.png',
    ]);
  });

  it('con varios idiomas las rutas son las mismas: la 404 y la privacidad son del sitio', () => {
    expect(patterns(multiple)).toEqual(patterns(single));
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
});

describe('injectedPaths', () => {
  it('rutas de fichero sin extensión, con la portada de cada idioma', () => {
    expect(injectedPaths(multiple)).toEqual([
      'index',
      'es/index',
      'sitemap.xml',
      '_design/sitemap.css',
      '_design/favicon.png',
    ]);
  });

  it('con un solo idioma no hay prefijo', () => {
    expect(injectedPaths(single)).not.toContain('en/index');
  });

  it('el panel cuenta también como carpeta con index', () => {
    const paths = injectedPaths({ ...multiple, seoOnPage: true });
    expect(paths).toContain('seo-on-page/pages');
    expect(paths).toContain('seo-on-page/pages/index');
  });
});
