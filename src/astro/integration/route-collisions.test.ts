import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AstroError } from 'astro/errors';
import { afterEach, describe, expect, it } from 'vitest';
import { assertNoRouteCollision } from './route-collisions';

const dirs: string[] = [];

/** Crea un `src/pages/` temporal con los ficheros dados y devuelve su URL. */
function pagesWith(...files: string[]): URL {
  const root = mkdtempSync(join(tmpdir(), 'design-pages-'));
  dirs.push(root);
  for (const file of files) {
    const path = join(root, 'pages', file);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, '');
  }
  return pathToFileURL(join(root, 'pages') + '/');
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const locales = ['en', 'es'];

describe('assertNoRouteCollision', () => {
  it('no hace nada si no existe src/pages/', () => {
    expect(() =>
      assertNoRouteCollision(new URL('file:///no/such/pages/'), locales, 'en'),
    ).not.toThrow();
  });

  it('deja pasar páginas propias que no pisan ninguna ruta inyectada', () => {
    const pages = pagesWith('about.astro', 'blog/index.astro', 'api/data.json.ts');
    expect(() => assertNoRouteCollision(pages, locales, 'en')).not.toThrow();
  });

  it('falla si una página del consumidor pisa la home (el andamio de `npm create astro`)', () => {
    const pages = pagesWith('index.astro');
    const run = () => assertNoRouteCollision(pages, locales, 'en');
    expect(run).toThrow(AstroError);
    expect(run).toThrow(/index\.astro/);
    expect(run).toThrow(
      expect.objectContaining({ hint: expect.stringContaining('src/content/docs/index.md') }),
    );
  });

  it.each(['index.md', 'index.mdx', 'index.html', 'index.ts'])('detecta %s como home', (file) => {
    expect(() => assertNoRouteCollision(pagesWith(file), locales, 'en')).toThrow(AstroError);
  });

  it('detecta 404 y sitemap.xml propios', () => {
    expect(() => assertNoRouteCollision(pagesWith('404.astro'), locales, 'en')).toThrow(/404/);
    expect(() => assertNoRouteCollision(pagesWith('sitemap.xml.ts'), locales, 'en')).toThrow(
      /sitemap\.xml/,
    );
  });

  it('detecta las rutas de los idiomas sin prefijo: `es/index.astro` y `es/404.astro`', () => {
    expect(() => assertNoRouteCollision(pagesWith('es/index.astro'), locales, 'en')).toThrow(
      /es\/index\.astro/,
    );
    expect(() => assertNoRouteCollision(pagesWith('es/404.astro'), locales, 'en')).toThrow(
      /es\/404\.astro/,
    );
  });

  it('con un solo idioma no hay `/es/` inyectado: `es/index.astro` es del consumidor', () => {
    expect(() => assertNoRouteCollision(pagesWith('es/index.astro'), ['en'], 'en')).not.toThrow();
  });

  it('agrupa todas las colisiones en un solo error', () => {
    const pages = pagesWith('index.astro', '404.astro');
    expect(() => assertNoRouteCollision(pages, locales, 'en')).toThrow(/index\.astro[\s\S]*404/);
  });
});

describe('assertNoRouteCollision: página de privacidad', () => {
  const run = (file: string, privacyPage: boolean) =>
    assertNoRouteCollision(pagesWith(file), ['es', 'en'], 'es', privacyPage);

  it('con `page: true` detecta los ficheros que pisan las rutas de privacidad', () => {
    expect(() => run('privacidad.astro', true)).toThrow(/privacidad\.astro/);
    expect(() => run('en/privacy/index.astro', true)).toThrow(/en\/privacy\/index\.astro/);
  });

  it('con `page: false` esas rutas son del consumidor', () => {
    expect(() => run('privacidad.astro', false)).not.toThrow();
    expect(() => run('en/privacy/index.astro', false)).not.toThrow();
  });
});

describe('assertNoRouteCollision: panel SEO on page', () => {
  const run = (file: string, panel: boolean) =>
    assertNoRouteCollision(pagesWith(file), ['en'], 'en', false, panel);

  it.each([
    'seo-on-page.astro',
    'seo-on-page/index.astro',
    'seo-on-page/pages.astro',
    'seo-on-page/pages/index.astro',
    'seo-on-page/page.ts',
  ])('en desarrollo detecta %s', (file) => {
    expect(() => run(file, true)).toThrow(/seo-on-page/);
  });

  it('fuera de desarrollo esas rutas son del consumidor', () => {
    expect(() => run('seo-on-page/index.astro', false)).not.toThrow();
  });
});
