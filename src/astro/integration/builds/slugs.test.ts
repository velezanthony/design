import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parseHTML } from 'linkedom';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture, type BuiltSite } from '../../../testing/build';
import { buildFailingCase } from '../../../testing/case';

/* URLs traducidas en un sitio real (`fixtures/slugs`): una pareja con `slug` en inglés, un
   `_index.en.md` con `slug`, una página sin traducción (reserva) y una pareja sin `slug`. */

const root = resolve('src/astro/integration/builds/fixtures/slugs/site');
let site: BuiltSite;

beforeAll(async () => {
  site = await buildFixture(root);
}, 180_000);

async function page(file: string) {
  return parseHTML(await site.read(file)).document;
}

async function exists(file: string) {
  const parts = file.split('/');
  const name = parts.pop()!;
  const entries = await readdir(resolve(site.dist, ...parts)).catch(() => [] as string[]);
  return entries.includes(name);
}

function hrefs(nodes: Iterable<Element>) {
  return [...nodes].map((node) => node.getAttribute('href'));
}

/** El selector de idioma de la cabecera: idioma → URL. */
function switcher(document: Document) {
  return Object.fromEntries(
    [...document.querySelectorAll('nav ul.label a[hreflang]')].map((link) => [
      link.getAttribute('hreflang'),
      link.getAttribute('href'),
    ]),
  );
}

function alternates(document: Document) {
  return Object.fromEntries(
    [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((link) => [
      link.getAttribute('hreflang'),
      link.getAttribute('href'),
    ]),
  );
}

const QUERIES_ES = 'articulos/consultas-n-mas-1-django/index.html';
const QUERIES_EN = 'en/articles/n-plus-one-queries-django/index.html';

describe('una pareja con `slug` en inglés', () => {
  it('la traducción vive en su URL y no en la del archivo; el original no cambia', async () => {
    expect(await exists(QUERIES_EN)).toBe(true);
    expect(await exists('en/articulos/consultas-n-mas-1-django/index.html')).toBe(false);
    expect(await exists(QUERIES_ES)).toBe(true);
  });

  it('el selector de idioma enlaza las dos URLs desde cada lado', async () => {
    const expected = {
      es: '/sl/articulos/consultas-n-mas-1-django/',
      en: '/sl/en/articles/n-plus-one-queries-django/',
    };
    expect(switcher(await page(QUERIES_EN))).toEqual(expected);
    expect(switcher(await page(QUERIES_ES))).toEqual(expected);
  });

  it('canonical y hreflang recíprocos con las URLs traducidas', async () => {
    const english = await page(QUERIES_EN);
    expect(english.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      'https://example.dev/sl/en/articles/n-plus-one-queries-django/',
    );
    const expected = {
      es: 'https://example.dev/sl/articulos/consultas-n-mas-1-django/',
      en: 'https://example.dev/sl/en/articles/n-plus-one-queries-django/',
      'x-default': 'https://example.dev/sl/articulos/consultas-n-mas-1-django/',
    };
    expect(alternates(english)).toEqual(expected);
    expect(alternates(await page(QUERIES_ES))).toEqual(expected);
  });

  it('el sitemap lista la URL traducida con sus alternates', async () => {
    const xml = await site.read('sitemap.xml');
    expect(xml).toContain(
      '<loc>https://example.dev/sl/en/articles/n-plus-one-queries-django/</loc>',
    );
    expect(xml).toContain(
      'hreflang="en" href="https://example.dev/sl/en/articles/n-plus-one-queries-django/"',
    );
    expect(xml).not.toContain('/sl/en/articulos/consultas-n-mas-1-django/');
  });

  it('la barra lateral de /en/ enlaza las URLs traducidas que la config nombra por su archivo', async () => {
    const links = hrefs((await page('en/index.html')).querySelectorAll('aside a'));
    expect(links).toEqual(
      expect.arrayContaining([
        '/sl/en/articles/',
        '/sl/en/articles/n-plus-one-queries-django/',
        '/sl/en/articles/dns-change/',
        '/sl/en/articulos/nginx/',
        '/sl/en/guia/a/',
      ]),
    );
  });

  it('anterior y siguiente siguen el orden de la barra lateral con las URLs en inglés', async () => {
    const english = await page(QUERIES_EN);
    expect(english.querySelector('a[rel="prev"]')!.getAttribute('href')).toBe('/sl/en/articles/');
    expect(english.querySelector('a[rel="next"]')!.getAttribute('href')).toBe(
      '/sl/en/articles/dns-change/',
    );
  });

  it('un enlace relativo (`dns.md#ttl` o `dns.en.md`) lleva a la URL traducida de la gemela', async () => {
    const links = hrefs((await page(QUERIES_EN)).querySelectorAll('main .prose a'));
    expect(links).toContain('/sl/en/articles/dns-change/#ttl');
    expect(links).toContain('/sl/en/articles/dns-change/');
    const spanish = hrefs((await page(QUERIES_ES)).querySelectorAll('main .prose a'));
    expect(spanish).toContain('/sl/articulos/dns/#ttl');
    const home = hrefs((await page('en/index.html')).querySelectorAll('main .prose a'));
    expect(home).toContain('/sl/en/articles/n-plus-one-queries-django/');
  });

  it('Pagefind indexa las páginas en sus URLs traducidas', async () => {
    const directory = resolve(site.dist, 'pagefind/fragment');
    const urls = await Promise.all(
      (await readdir(directory)).map(async (file) => {
        const text = gunzipSync(await readFile(resolve(directory, file))).toString('utf8');
        return (JSON.parse(text.slice(text.indexOf('{'))) as { url: string }).url;
      }),
    );
    expect(urls).toContain('/en/articles/n-plus-one-queries-django/');
    expect(urls).toContain('/en/articles/');
    expect(urls.some((url) => url.startsWith('/en/articulos/consultas'))).toBe(false);
  });
});

describe('`_index.en.md` con `slug`', () => {
  it('el listado de la carpeta vive en /en/articles/ y pagina debajo', async () => {
    for (const file of [
      'en/articles/index.html',
      'en/articles/2/index.html',
      'en/articles/3/index.html',
    ]) {
      expect(await exists(file)).toBe(true);
    }
    expect(await exists('en/articulos/index.html')).toBe(false);
    expect(await exists('articulos/2/index.html')).toBe(true);
  });

  it('sus entradas enlazan las URLs en inglés y la reserva de la que falta', async () => {
    const document = await page('en/articles/index.html');
    const links = hrefs(document.querySelectorAll('[data-index-card] h2 a'));
    expect(links).toEqual(
      expect.arrayContaining([
        '/sl/en/articles/n-plus-one-queries-django/',
        '/sl/en/articles/dns-change/',
        '/sl/en/articulos/nginx/',
      ]),
    );
    expect(switcher(document)).toEqual({ es: '/sl/articulos/', en: '/sl/en/articles/' });
  });
});

describe('una traducción que falta', () => {
  it('la reserva sigue en el prefijo del idioma más la URL del original, como siempre', async () => {
    const document = await page('en/articulos/nginx/index.html');
    expect(document.querySelector('html')!.getAttribute('lang')).toBe('en');
    expect(document.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      'https://example.dev/sl/articulos/nginx/',
    );
    expect(document.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
  });

  it('una pareja sin `slug` se publica en la URL de su archivo', async () => {
    expect(switcher(await page('en/guia/a/index.html'))).toEqual({
      es: '/sl/guia/a/',
      en: '/sl/en/guia/a/',
    });
  });
});

describe('un `slug` que choca con otra URL', { timeout: 120_000 }, () => {
  it('rompe la build nombrando los dos archivos', async () => {
    const { code, output } = await buildFailingCase({
      name: 'slug-collision',
      config: { name: 'Slugs', locales: ['es', 'en'], defaultLocale: 'es' },
      docs: {
        'index.md': '# Inicio\n',
        'a.md': '# A\n',
        'a.en.md': '---\nslug: guide\n---\n\n# A\n',
        'guide.md': '# Guía\n',
        'guide.en.md': '# Guide\n',
      },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('a.en.md (slug)');
    expect(output).toContain('guide.en.md');
    expect(output).toContain('Cambia el `slug`');
  });
});
