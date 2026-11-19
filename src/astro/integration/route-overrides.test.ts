import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import type { RouteOptions } from '../routes/routes';
import { overrideWarning, routeOverrides } from './route-overrides';

const directories: string[] = [];

/** Crea un `src/pages/` temporal con los ficheros dados y devuelve su URL. */
function pagesWith(...files: string[]): URL {
  const root = mkdtempSync(join(tmpdir(), 'design-pages-'));
  directories.push(root);
  for (const file of files) {
    const path = join(root, 'pages', file);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, '');
  }
  return pathToFileURL(join(root, 'pages') + '/');
}

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

const site: RouteOptions = { locales: ['en', 'es'], defaultLocale: 'en' };
function files(pages: URL, options: RouteOptions = site) {
  return routeOverrides(pages, options).map(({ file }) => file);
}
function routes(pages: URL, options: RouteOptions = site) {
  return routeOverrides(pages, options).map(({ route }) => route);
}

describe('routeOverrides', () => {
  it('sin src/pages/ no hay nada que sustituya', () => {
    expect(routeOverrides(new URL('file:///no/such/pages/'), site)).toEqual([]);
  });

  it('las páginas propias que no tocan ninguna ruta de la librería no cuentan', () => {
    expect(files(pagesWith('about.astro', 'blog/index.astro', 'api/data.json.ts'))).toEqual([]);
  });

  it('la portada propia sustituye a la de la documentación', () => {
    expect(routeOverrides(pagesWith('index.astro'), site)).toEqual([
      { file: 'src/pages/index.astro', route: 'index' },
    ]);
  });

  it.each(['index.md', 'index.mdx', 'index.html', 'index.ts'])(
    '%s también es la portada',
    (file) => {
      expect(routes(pagesWith(file))).toEqual(['index']);
    },
  );

  it('el sitemap propio, y el sitemap de páginas solo cuando hay índice', () => {
    expect(routes(pagesWith('sitemap.xml.ts', 'sitemap-pages.xml.ts'))).toEqual(['sitemap.xml']);
    expect(routes(pagesWith('sitemap-pages.xml.ts'), { ...site, sitemapIndex: true })).toEqual([
      'sitemap-pages.xml',
    ]);
  });

  it('las rutas propias de la librería bajo /_design/ (favicon y hoja del sitemap)', () => {
    expect(routes(pagesWith('_design/favicon.png.ts', '_design/sitemap.css'))).toEqual([
      '_design/sitemap.css',
      '_design/favicon.png',
    ]);
  });

  it('la 404 y la privacidad son del sitio: sus ficheros no sustituyen nada', () => {
    const pages = pagesWith(
      '404.astro',
      'es/404.astro',
      'privacidad.astro',
      'en/privacy/index.astro',
    );
    expect(files(pages)).toEqual([]);
  });

  it('con un solo idioma no hay `/es/` de la librería: `es/index.astro` es solo del sitio', () => {
    expect(files(pagesWith('es/index.astro'), { locales: ['en'], defaultLocale: 'en' })).toEqual(
      [],
    );
  });

  it('las rutas del panel SEO on page solo cuentan en desarrollo', () => {
    const pages = pagesWith('seo-on-page/index.astro');
    expect(files(pages, { ...site, seoOnPage: true })).toEqual([
      'src/pages/seo-on-page/index.astro',
    ]);
    expect(files(pages, site)).toEqual([]);
  });
});

describe('overrideWarning', () => {
  it('sin sustituciones no hay nada que avisar', () => {
    expect(overrideWarning([])).toBeUndefined();
  });

  it('dice cuántas rutas sustituye el sitio y con qué ficheros', () => {
    expect(
      overrideWarning([
        { file: 'src/pages/index.astro', route: 'index' },
        { file: 'src/pages/404.astro', route: '404' },
      ]),
    ).toBe(
      'Tu sitio sustituye 2 rutas de @velezanthony/design: src/pages/index.astro, src/pages/404.astro. Se publican tus páginas en su lugar.',
    );
  });

  it('concuerda en singular con una sola', () => {
    expect(overrideWarning([{ file: 'src/pages/index.astro', route: 'index' }])).toMatch(
      /^Tu sitio sustituye 1 ruta de/,
    );
  });
});
