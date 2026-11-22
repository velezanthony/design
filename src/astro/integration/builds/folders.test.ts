import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseHTML } from 'linkedom';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture, type BuiltSite } from '../../../testing/build';

/* Índices generados por carpeta en un sitio real (`fixtures/folders`), con la forma del sitio del
   autor: `generate` heredado de `articulos` por las carpetas intermedias, una rama apagada, un
   `_index.md` con `noindex` y un `index.md` que gana a la generación. */

const root = resolve('src/astro/integration/builds/fixtures/folders/site');
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

async function exists(file: string) {
  const parts = file.split('/');
  const name = parts.pop()!;
  const entries = await readdir(resolve(site.dist, ...parts)).catch(() => [] as string[]);
  return entries.includes(name);
}

function description(document: Document) {
  return document.querySelector('meta[name="description"]')?.getAttribute('content');
}

function sidebar(document: Document) {
  return document.querySelector(
    'nav[aria-label="Documentación"], nav[aria-label="Documentation"]',
  )!;
}

/** La etiqueta de un grupo de la barra lateral: su enlace o, sin página, su texto. */
function groupLabel(document: Document, label: string) {
  return [...sidebar(document).querySelectorAll('li > a, li > span')].find(
    (node) => text(node) === label,
  );
}

function robots(document: Document) {
  return document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
}

describe('carpetas intermedias con `generate` heredado', () => {
  it.each([
    ['articulos/sistemas', 'Sistemas', 'la sección sin `dir` cuyas páginas cuelgan de ella'],
    ['articulos/sistemas/ci-cd', 'CI/CD', 'su grupo declarado'],
    ['articulos/sistemas/cloud', 'Cloud', 'el nombre de la carpeta: «Cloud» solo envuelve a «AWS»'],
    ['articulos/sistemas/cloud/aws', 'AWS', 'el grupo más interior'],
    ['articulos/desarrollo', 'Desarrollo', 'su sección'],
    ['articulos/desarrollo/python', 'Python', 'su grupo declarado'],
  ])('%s tiene su página con el título «%s» (%s)', async (folder, title) => {
    const document = await page(`${folder}/index.html`);
    expect(text(document.querySelector('main .prose h1'))).toBe(title);
    expect(document.querySelector('main [data-listing]')).not.toBeNull();
  });

  it('solo el listado, con la descripción por defecto, indexable y en el sitemap', async () => {
    const document = await page('articulos/sistemas/index.html');
    expect(text(document.querySelector('main .prose'))).toBe('Sistemas');
    expect(description(document)).toBe('Todas las páginas de Sistemas.');
    expect(robots(document)).not.toContain('noindex');
    expect(await site.read('sitemap.xml')).toContain('/fo/articulos/sistemas/</loc>');
  });

  it('en inglés, con los textos de la navegación en inglés', async () => {
    const document = await page('en/articulos/sistemas/index.html');
    expect(text(document.querySelector('main .prose h1'))).toBe('Systems');
    expect(description(document)).toBe('All pages in Systems.');
  });

  it('una carpeta generada no es una entrada del listado de su padre', async () => {
    const document = await page('articulos/sistemas/index.html');
    const links = [...document.querySelectorAll('[data-listing-card] a')].map((link) =>
      link.getAttribute('href'),
    );
    expect(links).toContain('/fo/articulos/sistemas/contenedores/docker/');
    for (const folder of ['ci-cd', 'cloud', 'cloud/aws', 'contenedores']) {
      expect(links).not.toContain(`/fo/articulos/sistemas/${folder}/`);
    }
  });
});

describe('una rama con `generate: false`', () => {
  it('no tiene página, aunque su padre genere', async () => {
    expect(await exists('articulos/borradores/index.html')).toBe(false);
    expect(await exists('articulos/borradores/z/index.html')).toBe(true);
  });
});

describe('`_index.md` de una carpeta generada', () => {
  it('pone el H1, la entradilla y el `seo`, y se traduce con `_index.en.md`', async () => {
    const es = await page('articulos/index.html');
    expect(text(es.querySelector('main .prose h1'))).toBe('Artículos');
    expect(text(es.querySelector('main .prose'))).toContain('Lo que escribo.');
    expect(description(es)).toBe('Todos los artículos.');
    const en = await page('en/articulos/index.html');
    expect(text(en.querySelector('main .prose h1'))).toBe('Articles');
    expect(description(en)).toBe('Every article.');
  });

  /* Decisión del autor: una carpeta se sale del índice con el `seo.noindex` de su `_index.md`, como
     cualquier página, y vale para el índice y para todas sus rutas de paginación. */
  it('`seo.noindex` deja fuera del índice la carpeta y todas sus rutas de paginación', async () => {
    for (const file of [
      'articulos/privado/index.html',
      'articulos/privado/page/2/index.html',
      'articulos/privado/per-page/10/index.html',
      'en/articulos/privado/index.html',
    ]) {
      expect(robots(await page(file)), file).toContain('noindex');
    }
    const sitemap = await site.read('sitemap.xml');
    expect(sitemap).not.toContain('/fo/articulos/privado/</loc>');
    expect(sitemap).not.toContain('/fo/articulos/privado/page/');
  });
});

describe('`index.md` con `generate` encendido', () => {
  it('se sirve el `index.md`, sin listado', async () => {
    const document = await page('guia/index.html');
    expect(text(document.querySelector('main .prose h1'))).toBe('Mi guía');
    expect(text(document.querySelector('main'))).toContain('Portada escrita a mano.');
    expect(document.querySelector('main [data-listing]')).toBeNull();
  });

  it('el log del build lo informa una vez', () => {
    const line = 'guia/index.md sustituye al índice generado de la carpeta guia.';
    expect(site.output.split(line)).toHaveLength(2);
  });
});

/* Las carpetas son categorías: la etiqueta de un grupo lleva a la página de su carpeta si existe. */
describe('grupos enlazados a la página de su carpeta', () => {
  it('en la barra de un artículo, los grupos declarados enlazan su carpeta generada', async () => {
    const document = await page('articulos/sistemas/contenedores/docker/index.html');
    expect(groupLabel(document, 'CI/CD')?.getAttribute('href')).toBe(
      '/fo/articulos/sistemas/ci-cd/',
    );
    expect(groupLabel(document, 'AWS')?.getAttribute('href')).toBe(
      '/fo/articulos/sistemas/cloud/aws/',
    );
    expect(groupLabel(document, 'Contenedores')?.getAttribute('href')).toBe(
      '/fo/articulos/sistemas/contenedores/',
    );
  });

  it('«Cloud» solo envuelve a «AWS»: no es dueño de ninguna carpeta y sigue siendo texto', async () => {
    const document = await page('articulos/sistemas/contenedores/docker/index.html');
    expect(groupLabel(document, 'Cloud')?.tagName).toBe('SPAN');
  });

  it('los grupos con `_index.md` y con `index.md` también enlazan', async () => {
    const document = await page('articulos/borradores/z/index.html');
    expect(groupLabel(document, 'Privado')?.getAttribute('href')).toBe('/fo/articulos/privado/');
    expect(groupLabel(document, 'Notas sueltas')?.getAttribute('href')).toBe(
      '/fo/articulos/notas/',
    );
  });

  it('sin página índice, la etiqueta del grupo es texto', async () => {
    const document = await page('articulos/borradores/z/index.html');
    expect(groupLabel(document, 'Borradores')?.tagName).toBe('SPAN');
  });

  it('en la página de la carpeta, y en su página 2, el enlace del grupo lleva aria-current', async () => {
    for (const file of ['articulos/privado/index.html', 'articulos/privado/page/2/index.html']) {
      const link = groupLabel(await page(file), 'Privado');
      expect(link?.getAttribute('aria-current'), file).toBe('page');
    }
    const elsewhere = groupLabel(await page('articulos/borradores/z/index.html'), 'Privado');
    expect(elsewhere?.hasAttribute('aria-current')).toBe(false);
  });
});
