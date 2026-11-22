import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseHTML } from 'linkedom';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture, type BuiltSite } from '../../../testing/build';

/* Índices generados en un sitio real (`fixtures/indexes`): `_index.md` con tarjetas y su traducción,
   una carpeta sin `_index.md` que genera `folders` (tabla), una lista, un `index.md` que gana a su
   `_index.md` y una carpeta que nadie activa. */

const root = resolve('src/astro/integration/builds/fixtures/indexes/site');
let site: BuiltSite;

beforeAll(async () => {
  site = await buildFixture(root);
}, 180_000);

async function page(file: string) {
  return parseHTML(await site.read(file)).document;
}

function text(node: { textContent: string | null } | null) {
  return node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function listing(document: Document) {
  return document.querySelector('main [data-listing]');
}

function cards(document: Document) {
  return [...document.querySelectorAll('[data-listing-card]')];
}

async function exists(file: string) {
  const parts = file.split('/');
  const name = parts.pop()!;
  const entries = await readdir(resolve(site.dist, ...parts)).catch(() => [] as string[]);
  return entries.includes(name);
}

describe('_index.md: título, entradilla y disposición (tarjetas)', () => {
  it('su cuerpo va en `.prose` y debajo, fuera de `.prose`, las tarjetas de su carpeta', async () => {
    const document = await page('tutoriales/index.html');
    const prose = document.querySelector('main .prose')!;
    expect(text(prose.querySelector('h1'))).toBe('Tutoriales');
    expect(text(prose)).toContain('Tutoriales paso a paso.');
    expect(listing(document)!.closest('.prose')).toBeNull();
    // Solo las de su página: sin entradas ocultas.
    expect(cards(document)).toHaveLength(2);
    expect(listing(document)!.querySelector('[hidden]')).toBeNull();
  });

  it('su seo: título y descripción del _index.md, indexable y canónica de sí misma', async () => {
    const document = await page('tutoriales/index.html');
    expect(text(document.querySelector('title'))).toBe('Tutoriales | Indexes');
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(
      'Tutoriales paso a paso, agrupados por nivel.',
    );
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      'https://example.dev/idx/tutoriales/',
    );
  });

  it('su traducción (_index.en.md) pone el título y la entradilla en inglés', async () => {
    const document = await page('en/tutoriales/index.html');
    expect(text(document.querySelector('main .prose h1'))).toBe('Tutorials');
    expect(text(document.querySelector('main .prose'))).toContain('Step-by-step tutorials.');
    expect(text(document.querySelector('[data-listing-card] [data-listing-path]'))).toBe(
      'Essentials › Getting started',
    );
    expect(document.querySelector('[data-listing-card] h2 a')!.getAttribute('href')).toBe(
      '/idx/en/tutoriales/instalacion/',
    );
  });

  it('nunca es una página propia: ni ruta `_index`, ni en el sitemap, ni en la barra lateral', async () => {
    expect(await exists('tutoriales/_index/index.html')).toBe(false);
    const sitemap = await site.read('sitemap.xml');
    expect(sitemap).not.toContain('_index');
    expect(sitemap).toContain('<loc>https://example.dev/idx/tutoriales/</loc>');
    const document = await page('tutoriales/instalacion/index.html');
    const sidebar = [...document.querySelectorAll('aside a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(sidebar.some((href) => href?.includes('_index'))).toBe(false);
  });

  it('un enlace a `_index.md` desde el Markdown lleva a la URL de la carpeta', async () => {
    const document = await page('index.html');
    const links = [...document.querySelectorAll('main .prose a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(links).toContain('/idx/tutoriales/');
  });
});

describe('paginación', () => {
  it('la página 1 en la carpeta y las demás bajo `page/` (/page/2/, /page/3/), también en inglés', async () => {
    for (const file of [
      'tutoriales/page/2/index.html',
      'tutoriales/page/3/index.html',
      'en/tutoriales/page/3/index.html',
      'guia/page/2/index.html',
    ]) {
      expect(await exists(file)).toBe(true);
    }
    expect(await exists('tutoriales/page/4/index.html')).toBe(false);
    expect(await exists('recetas/page/2/index.html')).toBe(false);
    // La forma anterior (`<carpeta>/<n>/`) ya no existe.
    expect(await exists('tutoriales/2/index.html')).toBe(false);
  });

  it('desde la página 2: el título y «Página 2 de 3», sin la entradilla, y noindex', async () => {
    const document = await page('tutoriales/page/2/index.html');
    const prose = document.querySelector('main .prose')!;
    expect(text(prose.querySelector('h1'))).toBe('Tutoriales');
    expect(text(prose)).toContain('Página 2 de 3');
    expect(text(prose)).not.toContain('Tutoriales paso a paso.');
    expect(text(document.querySelector('title'))).toBe('Tutoriales · Página 2 de 3 | Indexes');
    expect(document.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
    expect(document.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      'https://example.dev/idx/tutoriales/page/2/',
    );
    expect(document.querySelector('link[rel="prev"]')!.getAttribute('href')).toBe(
      'https://example.dev/idx/tutoriales/',
    );
    expect(document.querySelector('link[rel="next"]')!.getAttribute('href')).toBe(
      'https://example.dev/idx/tutoriales/page/3/',
    );
    expect(document.querySelector('[data-pagefind-body]')).toBeNull();
  });

  it('el paginador enlaza cada página y las de 2 en adelante no están en el sitemap', async () => {
    const document = await page('tutoriales/index.html');
    const pager = [...listing(document)!.querySelectorAll('nav a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(pager).toEqual(
      expect.arrayContaining(['/idx/tutoriales/page/2/', '/idx/tutoriales/page/3/']),
    );
    expect(await site.read('sitemap.xml')).not.toContain('/idx/tutoriales/page/2/');
  });
});

describe('portadas', () => {
  async function coverOf(slug: string) {
    for (const file of [
      'tutoriales/index.html',
      'tutoriales/page/2/index.html',
      'tutoriales/page/3/index.html',
    ]) {
      const card = cards(await page(file)).find(
        (item) => item.querySelector('h2 a')!.getAttribute('href') === `/idx/tutoriales/${slug}/`,
      );
      if (card) return card;
    }
    throw new Error(`Sin tarjeta para ${slug}`);
  }

  it('una imagen relativa pasa por astro:assets, con su alt y la de la librería debajo', async () => {
    const card = await coverOf('instalacion');
    const image = card.querySelector('img')!;
    expect(image.getAttribute('src')).toMatch(/^\/idx\/_astro\/instalacion\..+\.webp$/);
    expect(image.getAttribute('alt')).toBe('Terminal con la instalación');
    expect(card.querySelector('[data-cover-placeholder]')!.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('una imagen de public/ se sirve con la base y es decorativa sin `imageAlt`', async () => {
    const image = (await coverOf('primer-proyecto')).querySelector('img')!;
    expect(image.getAttribute('src')).toBe('/idx/portadas/primer-proyecto.png');
    expect(image.getAttribute('alt')).toBe('');
  });

  it('`image: false`: sin portada', async () => {
    expect((await coverOf('configuracion')).querySelector('[data-listing-cover]')).toBeNull();
  });

  it('una imagen que no existe: aviso en el build y la portada de la librería', async () => {
    const card = await coverOf('despliegue');
    expect(card.querySelector('img')).toBeNull();
    expect(card.querySelector('[data-cover-placeholder]')).not.toBeNull();
    expect(site.output).toContain('tutoriales/despliegue.md: index.image «./nada.png» no existe');
  });

  it('sin nada en la página manda la política (por defecto, la de la librería)', async () => {
    expect(
      (await coverOf('errores-comunes')).querySelector('[data-cover-placeholder]'),
    ).not.toBeNull();
  });
});

describe('carpeta sin _index.md que activa `folders` (tabla)', () => {
  it('título de su sección de `nav`, solo el listado y la descripción por defecto', async () => {
    const document = await page('guia/index.html');
    expect(text(document.querySelector('main .prose h1'))).toBe('Guía');
    expect(text(document.querySelector('main .prose'))).toBe('Guía');
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(
      'Todas las páginas de Guía.',
    );
    const rows = listing(document)!.querySelectorAll(
      'table.table-cards tbody tr[data-card]:not([hidden])',
    );
    expect(rows).toHaveLength(2);
  });

  it('en inglés, con el título de la sección y la descripción en inglés', async () => {
    const document = await page('en/guia/index.html');
    expect(text(document.querySelector('main .prose h1'))).toBe('Guide');
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(
      'All pages in Guide.',
    );
    expect(text(document.querySelector('thead'))).toContain('Title');
  });

  it('una carpeta que nada activa no tiene página', async () => {
    expect(await exists('sueltos/index.html')).toBe(false);
  });
});

describe('lista', () => {
  it('el árbol de la carpeta debajo del cuerpo del _index.md, sin paginar', async () => {
    const document = await page('recetas/index.html');
    const list = listing(document)!.querySelector('[data-listing-list]')!;
    expect([...list.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
      '/idx/recetas/pan/',
      '/idx/recetas/sopa/',
    ]);
    expect(listing(document)!.querySelector('nav')).toBeNull();
  });
});

describe('index.md gana a _index.md', () => {
  it('la carpeta con index.md se pinta como una página normal y avisa de su _index.md', async () => {
    const document = await page('notas/index.html');
    expect(text(document.querySelector('main .prose h1'))).toBe('Notas');
    expect(listing(document)).toBeNull();
    expect(text(document.querySelector('main'))).not.toContain('No debe salir');
    expect(site.output).toContain('notas/_index.md: se ignora');
  });

  it('con `generate` encendido, el build informa (sin avisar) de que el index.md sustituye al índice', () => {
    expect(site.output).toContain(
      'notas/index.md sustituye al índice generado de la carpeta notas.',
    );
  });
});

describe('selector «Por página»', () => {
  /** Ruta de `dist/` del `index.html` de una URL del sitio (sin la base `/idx/`). */
  function fileOf(href: string) {
    expect(href.startsWith('/idx/'), href).toBe(true);
    return `${href.slice('/idx/'.length)}index.html`;
  }

  /** Lo que pinta `<noscript>`: linkedom lo deja como texto, así que se vuelve a leer. */
  function noscriptHrefs(document: Document) {
    return [...document.querySelectorAll('[data-pagination-bar] noscript')].flatMap((noscript) =>
      [...parseHTML(`<div>${noscript.innerHTML}</div>`).document.querySelectorAll('a')].map(
        (link) => link.getAttribute('href')!,
      ),
    );
  }

  /** Cada `href` del paginador, cada `value` del `select` y cada enlace de `<noscript>`. */
  function linkedHrefs(document: Document) {
    const bar = document.querySelector('[data-pagination-bar]');
    if (!bar) return [];
    return [
      ...[...bar.querySelectorAll('nav a')].map((link) => link.getAttribute('href')!),
      ...[...bar.querySelectorAll('select[data-auto-navigate] option')].map((option) =>
        option.getAttribute('value')!,
      ),
      ...noscriptHrefs(document),
    ];
  }

  it('página 1: el select navega entre los tamaños del _index.md, con el actual elegido', async () => {
    const document = await page('tutoriales/index.html');
    const select = document.querySelector('select[data-auto-navigate]')!;
    const options = [...select.querySelectorAll('option')];
    expect(options.map((option) => [option.getAttribute('value'), text(option)])).toEqual([
      ['/idx/tutoriales/', '2'],
      ['/idx/tutoriales/per-page/4/', '4'],
    ]);
    expect(options[0]!.hasAttribute('selected')).toBe(true);
    expect(noscriptHrefs(document)).toEqual(['/idx/tutoriales/', '/idx/tutoriales/per-page/4/']);
  });

  it('cada tamaño es una ruta estática: /per-page/4/ trae cuatro entradas y pagina debajo', async () => {
    const document = await page('tutoriales/per-page/4/index.html');
    expect(cards(document)).toHaveLength(4);
    expect(document.querySelector('nav a[rel="next"]')!.getAttribute('href')).toBe(
      '/idx/tutoriales/per-page/4/page/2/',
    );
    expect(await exists('tutoriales/per-page/4/page/2/index.html')).toBe(true);
    expect(await exists('tutoriales/per-page/4/page/3/index.html')).toBe(false);
  });

  it('todo enlace del paginador y del selector existe en dist/', async () => {
    const pages = [
      'tutoriales/index.html',
      'tutoriales/page/2/index.html',
      'tutoriales/page/3/index.html',
      'tutoriales/per-page/4/index.html',
      'tutoriales/per-page/4/page/2/index.html',
      'en/tutoriales/index.html',
      'en/tutoriales/per-page/4/index.html',
      'guia/index.html',
      'guia/page/2/index.html',
    ];
    let checked = 0;
    for (const file of pages) {
      for (const href of linkedHrefs(await page(file))) {
        expect(await exists(fileOf(href)), `${file} → ${href}`).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('los otros tamaños: noindex, data-pagefind-ignore en el Article, canónica propia y fuera del sitemap', async () => {
    const document = await page('tutoriales/per-page/4/index.html');
    expect(document.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
    expect(document.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      'https://example.dev/idx/tutoriales/per-page/4/',
    );
    // El contenedor del `Article` (el que lleva los textos de copiar) queda fuera de Pagefind.
    expect(document.querySelector('[data-copy-label][data-pagefind-ignore]')).not.toBeNull();
    expect(await site.read('sitemap.xml')).not.toContain('per-page');
  });

  it('la tabla generada lleva las opciones por defecto con su tamaño', async () => {
    const document = await page('guia/index.html');
    const values = [...document.querySelectorAll('select[data-auto-navigate] option')].map(
      (option) => text(option),
    );
    expect(values).toEqual(['2', '10', '25', '50']);
  });

  it('la lista no lleva selector', async () => {
    expect((await page('recetas/index.html')).querySelector('[data-auto-navigate]')).toBeNull();
  });
});
