import { resolve } from 'node:path';
import { parseHTML } from 'linkedom';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildFixture, type BuiltSite } from '../../../testing/build';

/* Índice generado (`::nav-tree`) en un sitio real (`fixtures/nav-tree`): español por defecto, inglés
   con reserva, y las páginas repartidas por los `sidebar` de dos secciones. */

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
    const document = await page('tutoriales/index.html');
    const content = prose(document);
    expect(content.querySelector('[data-docs-nav-tree]')).toBeNull();
    expect(content.querySelector('h2#esenciales')!.textContent).toContain('Esenciales');
    expect(content.querySelector('h2#avanzado')!.textContent).toContain('Avanzado');
    expect(content.querySelectorAll(':scope > ul.docs-nav-tree')).toHaveLength(2);
  });

  it('el índice de la página («En esta página») lista las secciones generadas', async () => {
    const document = await page('tutoriales/index.html');
    const toc = [...document.querySelectorAll('a[href^="#"]')].map((link) =>
      link.getAttribute('href'),
    );
    expect(toc).toContain('#esenciales');
    expect(toc).toContain('#avanzado');
  });

  it('grupos anidados en negrita y cada página con su título, su URL y su descripción', async () => {
    const content = prose(await page('tutoriales/index.html'));
    const [essentials] = [...content.querySelectorAll(':scope > ul.docs-nav-tree')];
    const labels = [...essentials!.querySelectorAll('strong')].map((node) => node.textContent);
    expect(labels).toEqual(['Primeros pasos', 'Astro', 'Vite']);
    expect(links(essentials!)).toEqual([
      '/tree/tutoriales/instalacion/',
      '/tree/tutoriales/configuracion/',
    ]);
    expect(essentials!.textContent).toContain('Instalación');
    expect(essentials!.textContent).toContain('Qué necesitas y cómo instalarlo.');
  });

  it('un enlace de otra página a una sección generada pasa la validación de anclas', async () => {
    const document = await page('index.html');
    expect(links(prose(document))).toContain('/tree/tutoriales/#avanzado');
  });

  it('`section` y `descriptions="false"`: una sola sección y solo títulos', async () => {
    const content = prose(await page('tutoriales/avanzado/index.html'));
    expect(content.querySelector('h2#avanzado')).not.toBeNull();
    expect(content.querySelector('h2#esenciales')).toBeNull();
    expect(links(content.querySelector('ul.docs-nav-tree')!)).toEqual([
      '/tree/tutoriales/despliegue/',
    ]);
  });
});

describe('`::nav-tree` en la ruta de reserva (`/en/tutoriales/`)', () => {
  it('las URLs siguen a la barra lateral: se queda en /en/, a la traducción o a la reserva', async () => {
    const document = await page('en/tutoriales/index.html');
    const content = prose(document);
    expect(links(content)).toEqual([
      '/tree/en/tutoriales/instalacion/',
      '/tree/en/tutoriales/configuracion/',
      '/tree/en/tutoriales/despliegue/',
    ]);
    // Cada página, en la barra lateral de su sección en inglés, apunta al mismo sitio.
    for (const slug of ['instalacion', 'configuracion', 'despliegue']) {
      const own = await page(`en/tutoriales/${slug}/index.html`);
      expect(links(own.querySelector('aside')!)).toContain(`/tree/en/tutoriales/${slug}/`);
    }
  });

  it('los textos son los del contenido original, como el resto de la página', async () => {
    const content = prose(await page('en/tutoriales/index.html'));
    expect(content.getAttribute('lang')).toBe('es');
    expect(content.querySelector('h2#esenciales')).not.toBeNull();
    expect(content.textContent).toContain('Primeros pasos');
    expect(content.textContent).toContain('Configuración avanzada');
  });
});

describe('sin `indexes` ni `_index.md`', () => {
  it('ningún listado generado ni páginas de paginación: el sitio queda como estaba', async () => {
    for (const file of ['tutoriales/index.html', 'en/tutoriales/index.html', 'index.html']) {
      expect((await page(file)).querySelector('[data-listing]')).toBeNull();
    }
    expect(await site.read('tutoriales/2/index.html').catch(() => undefined)).toBeUndefined();
  });
});
