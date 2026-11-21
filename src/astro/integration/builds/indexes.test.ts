import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseHTML } from 'linkedom';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture, type BuiltSite } from '../../../testing/build';

/* Índices generados en un sitio real (`fixtures/indexes`): `_index.md` con tarjetas y su traducción,
   una carpeta que genera `indexes` (tabla), una lista, un `index.md` que gana a su `_index.md` y una
   carpeta que nadie activa. */

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
  return document.querySelector('main [data-index-listing]');
}

function cards(document: Document) {
  return [...document.querySelectorAll('[data-index-card]')];
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
    // Sin JavaScript se ven las dos primeras; las demás van ocultas para el selector «Por página».
    expect(cards(document).filter((card) => !card.hasAttribute('hidden'))).toHaveLength(2);
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
    expect(text(document.querySelector('[data-index-card] [data-index-path]'))).toBe(
      'Essentials › Getting started',
    );
    expect(document.querySelector('[data-index-card] h2 a')!.getAttribute('href')).toBe(
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
  it('la página 1 en la carpeta y las demás en /2/ y /3/, también en inglés', async () => {
    for (const file of [
      'tutoriales/2/index.html',
      'tutoriales/3/index.html',
      'en/tutoriales/3/index.html',
      'guia/2/index.html',
    ]) {
      expect(await exists(file)).toBe(true);
    }
    expect(await exists('tutoriales/4/index.html')).toBe(false);
    expect(await exists('recetas/2/index.html')).toBe(false);
  });

  it('desde la página 2: el título y «Página 2 de 3», sin la entradilla, y noindex', async () => {
    const document = await page('tutoriales/2/index.html');
    const prose = document.querySelector('main .prose')!;
    expect(text(prose.querySelector('h1'))).toBe('Tutoriales');
    expect(text(prose)).toContain('Página 2 de 3');
    expect(text(prose)).not.toContain('Tutoriales paso a paso.');
    expect(text(document.querySelector('title'))).toBe('Tutoriales · Página 2 de 3 | Indexes');
    expect(document.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
    expect(document.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      'https://example.dev/idx/tutoriales/2/',
    );
    expect(document.querySelector('link[rel="prev"]')!.getAttribute('href')).toBe(
      'https://example.dev/idx/tutoriales/',
    );
    expect(document.querySelector('link[rel="next"]')!.getAttribute('href')).toBe(
      'https://example.dev/idx/tutoriales/3/',
    );
    expect(document.querySelector('[data-pagefind-body]')).toBeNull();
  });

  it('el paginador enlaza cada página y las de 2 en adelante no están en el sitemap', async () => {
    const document = await page('tutoriales/index.html');
    const pager = [...listing(document)!.querySelectorAll('nav a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(pager).toEqual(expect.arrayContaining(['/idx/tutoriales/2/', '/idx/tutoriales/3/']));
    expect(await site.read('sitemap.xml')).not.toContain('/idx/tutoriales/2/');
  });
});

describe('portadas', () => {
  async function coverOf(slug: string) {
    for (const file of [
      'tutoriales/index.html',
      'tutoriales/2/index.html',
      'tutoriales/3/index.html',
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
    expect((await coverOf('configuracion')).querySelector('[data-index-cover]')).toBeNull();
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

describe('carpeta sin _index.md que activa `indexes` (tabla)', () => {
  it('título de su sección de `nav`, entradilla de `overrides` y la tabla paginada', async () => {
    const document = await page('guia/index.html');
    expect(text(document.querySelector('main .prose h1'))).toBe('Guía');
    expect(text(document.querySelector('main .prose'))).toContain('Todo lo de la guía.');
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(
      'Todo lo de la guía.',
    );
    const rows = listing(document)!.querySelectorAll(
      'table.table-cards tbody tr[data-card]:not([hidden])',
    );
    expect(rows).toHaveLength(2);
  });

  it('en inglés, con los textos de la config en inglés', async () => {
    const document = await page('en/guia/index.html');
    expect(text(document.querySelector('main .prose h1'))).toBe('Guide');
    expect(text(document.querySelector('main .prose'))).toContain('Everything in the guide.');
    expect(text(document.querySelector('thead'))).toContain('Title');
  });

  it('una carpeta que nada activa no tiene página', async () => {
    expect(await exists('sueltos/index.html')).toBe(false);
  });
});

describe('lista', () => {
  it('el árbol de la carpeta debajo del cuerpo del _index.md, sin paginar', async () => {
    const document = await page('recetas/index.html');
    const list = listing(document)!.querySelector('[data-index-list]')!;
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
});

describe('selector «Por página»', () => {
  it('página 1: oculto sin JavaScript, con las opciones del _index.md y todas las entradas', async () => {
    const document = await page('tutoriales/index.html');
    const root = document.querySelector('[data-index-pager]')!;
    expect(root.getAttribute('data-options')).toBe('2,4');
    expect(root.getAttribute('data-per-page')).toBe('2');
    expect(root.getAttribute('data-all')).toBe('true');
    expect(root.querySelector('[data-index-per-page-field]')!.hasAttribute('hidden')).toBe(true);
    const items = [...root.querySelectorAll('[data-index-item]')];
    expect(items).toHaveLength(5);
    expect(items.filter((item) => !item.hasAttribute('hidden'))).toHaveLength(2);
  });

  it('un paginador por tamaño: el de la config con las rutas estáticas, el otro con la query', async () => {
    const document = await page('tutoriales/index.html');
    const visible = [...document.querySelectorAll('[data-index-pagination]')].filter(
      (pager) => !pager.hasAttribute('hidden'),
    );
    expect(visible.map((pager) => pager.getAttribute('data-per'))).toEqual(['2']);
    expect(visible[0]!.querySelector('a[rel="next"]')!.getAttribute('href')).toBe(
      '/idx/tutoriales/2/',
    );
    const other = document.querySelector('[data-index-pagination][data-per="4"][data-page="1"]')!;
    expect(other.querySelector('a[rel="next"]')!.getAttribute('href')).toBe(
      '/idx/tutoriales/?por=4&pagina=2',
    );
  });

  it('las rutas estáticas no cambian: /2/ trae solo sus dos entradas y su paginador', async () => {
    const document = await page('tutoriales/2/index.html');
    const root = document.querySelector('[data-index-pager]')!;
    expect(root.getAttribute('data-all')).toBe('false');
    expect(root.querySelectorAll('[data-index-item]')).toHaveLength(2);
    expect(root.querySelectorAll('[data-index-item][hidden]')).toHaveLength(0);
    expect(root.querySelectorAll('[data-index-pagination]')).toHaveLength(1);
  });

  it('la tabla generada por `indexes` lleva las opciones por defecto con su tamaño', async () => {
    const document = await page('guia/index.html');
    expect(document.querySelector('[data-index-pager]')!.getAttribute('data-options')).toBe(
      '2,10,25,50',
    );
  });

  it('la lista no lleva selector', async () => {
    expect((await page('recetas/index.html')).querySelector('[data-index-pager]')).toBeNull();
  });
});
