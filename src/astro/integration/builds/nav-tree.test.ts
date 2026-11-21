import { resolve } from 'node:path';
import { parseHTML } from 'linkedom';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture, type BuiltSite } from '../../../testing/build';

/* Índice generado (`::nav-tree`) en un sitio real (`fixtures/nav-tree`): español por defecto, inglés
   con reserva, y los artículos repartidos por los `sidebar` de dos secciones. */

const root = resolve('src/astro/integration/builds/fixtures/nav-tree/site');
let site: BuiltSite;

beforeAll(async () => {
  site = await buildFixture(root);
}, 180_000);

async function page(file: string) {
  return parseHTML(await site.read(file)).document;
}

function prose(document: Document) {
  return document.querySelector('main .prose')!;
}

function links(element: Element) {
  return [...element.querySelectorAll('a')].map((link) => link.getAttribute('href'));
}

describe('`::nav-tree` en la página real', () => {
  it('cada sección es un h2 con ancla y debajo su árbol, sin huecos sin rellenar', async () => {
    const document = await page('articulos/index.html');
    const content = prose(document);
    expect(content.querySelector('[data-docs-nav-tree]')).toBeNull();
    expect(content.querySelector('h2#desarrollo')!.textContent).toContain('Desarrollo');
    expect(content.querySelector('h2#sistemas')!.textContent).toContain('Sistemas');
    expect(content.querySelectorAll(':scope > ul.docs-nav-tree')).toHaveLength(2);
  });

  it('el índice de la página («En esta página») lista las secciones generadas', async () => {
    const document = await page('articulos/index.html');
    const toc = [...document.querySelectorAll('a[href^="#"]')].map((link) =>
      link.getAttribute('href'),
    );
    expect(toc).toContain('#desarrollo');
    expect(toc).toContain('#sistemas');
  });

  it('grupos anidados en negrita y cada artículo con su título, su URL y su descripción', async () => {
    const content = prose(await page('articulos/index.html'));
    const [development] = [...content.querySelectorAll(':scope > ul.docs-nav-tree')];
    const labels = [...development!.querySelectorAll('strong')].map((node) => node.textContent);
    expect(labels).toEqual(['Herramientas', 'Python', 'Django']);
    expect(links(development!)).toEqual(['/tree/articulos/git/', '/tree/articulos/django/']);
    expect(development!.textContent).toContain('Deshacer errores en Git');
    expect(development!.textContent).toContain('Qué comando usar para deshacer cada error.');
  });

  it('un enlace de otra página a una sección generada pasa la validación de anclas', async () => {
    const document = await page('index.html');
    expect(links(prose(document))).toContain('/tree/articulos/#sistemas');
  });

  it('`section` y `descriptions="false"`: una sola sección y solo títulos', async () => {
    const content = prose(await page('articulos/sistemas/index.html'));
    expect(content.querySelector('h2#sistemas')).not.toBeNull();
    expect(content.querySelector('h2#desarrollo')).toBeNull();
    expect(links(content.querySelector('ul.docs-nav-tree')!)).toEqual(['/tree/articulos/docker/']);
  });
});

describe('`::nav-tree` en la ruta de reserva (`/en/articulos/`)', () => {
  it('las URLs siguen a la barra lateral: se queda en /en/, a la traducción o a la reserva', async () => {
    const document = await page('en/articulos/index.html');
    const content = prose(document);
    expect(links(content)).toEqual([
      '/tree/en/articulos/git/',
      '/tree/en/articulos/django/',
      '/tree/en/articulos/docker/',
    ]);
    // Cada artículo, en la barra lateral de su sección en inglés, apunta al mismo sitio.
    for (const article of ['git', 'django', 'docker']) {
      const own = await page(`en/articulos/${article}/index.html`);
      expect(links(own.querySelector('aside')!)).toContain(`/tree/en/articulos/${article}/`);
    }
  });

  it('los textos son los del contenido original, como el resto de la página', async () => {
    const content = prose(await page('en/articulos/index.html'));
    expect(content.getAttribute('lang')).toBe('es');
    expect(content.querySelector('h2#desarrollo')).not.toBeNull();
    expect(content.textContent).toContain('Herramientas');
    expect(content.textContent).toContain('Consultas N+1 en Django');
  });
});

describe('sin `indexes` ni `_index.md`', () => {
  it('ningún listado generado ni páginas de paginación: el sitio queda como estaba', async () => {
    for (const file of ['articulos/index.html', 'en/articulos/index.html', 'index.html']) {
      expect((await page(file)).querySelector('[data-index-listing]')).toBeNull();
    }
    expect(await site.read('articulos/2/index.html').catch(() => undefined)).toBeUndefined();
  });
});
