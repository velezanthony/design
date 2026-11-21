import { describe, expect, it } from 'vitest';

import type { NavTreeNode } from '../../core/navigation/nav-tree';
import { renderDocument, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import DocPage from './DocPage.astro';

function props(extra: Record<string, unknown> = {}) {
  return {
    lang: 'es',
    head: [{ tag: 'title', attrs: {}, content: 'Artículos' }],
    siteName: 'Docs',
    homeHref: '/repo/',
    hrefs: {},
    strings: stringsFor('es'),
    sidebar: [],
    current: '/repo/articulos/',
    headings: [],
    indexable: true,
    baseUrl: '/repo/',
    year: 2026,
    ...extra,
  };
}

const navTrees: NavTreeNode[][] = [
  [
    {
      label: 'Herramientas',
      items: [{ label: 'Git', href: '/repo/git/', description: 'Errores.' }],
    },
  ],
  [],
  [{ label: 'AWS', href: '/repo/aws/' }],
];

/* El Markdown deja un hueco por árbol (`::nav-tree`); la página lo rellena en su sitio. */
const content =
  '<h1>Artículos</h1><h2 id="desarrollo">Desarrollo</h2>' +
  '<div data-docs-nav-tree="0" data-docs-nav-tree-descriptions="true"></div>' +
  '<h2 id="sistemas">Sistemas</h2>' +
  '<div data-docs-nav-tree="2" data-docs-nav-tree-descriptions="false"></div><p>Fin.</p>';

describe('DocPage: árboles de `::nav-tree`', () => {
  it('pinta el árbol de cada sección en su hueco, en orden y entre el resto del contenido', async () => {
    const document = await renderDocument(DocPage, props({ navTrees }), { default: content });
    const prose = document.querySelector('main .prose')!;
    expect([...prose.children].map((child) => child.tagName.toLowerCase())).toEqual([
      'h1',
      'h2',
      'ul',
      'h2',
      'ul',
      'p',
    ]);
    expect(prose.querySelector('[data-docs-nav-tree]')).toBeNull();
    const [development, systems] = [...prose.querySelectorAll('ul.docs-nav-tree')];
    expect(text(development!.querySelector('strong'))).toBe('Herramientas');
    expect(text(development!.querySelector(':scope > li > ul > li'))).toBe('Git — Errores.');
    expect(systems!.querySelector('a')!.getAttribute('href')).toBe('/repo/aws/');
  });

  it('cada hueco respeta si lleva descripciones', async () => {
    const trees: NavTreeNode[][] = [[], [], [{ label: 'AWS', href: '/a/', description: 'Nube.' }]];
    const document = await renderDocument(DocPage, props({ navTrees: trees }), {
      default: content,
    });
    expect(text(document.querySelector('main'))).not.toContain('Nube.');
  });

  it('sin `navTrees` el contenido pasa tal cual', async () => {
    const document = await renderDocument(DocPage, props(), { default: '<p>Hola</p>' });
    expect(text(document.querySelector('main .prose'))).toBe('Hola');
    expect(document.querySelector('main [data-docs-nav-tree]')).toBeNull();
  });
});

describe('DocPage: índice generado', () => {
  const index = {
    layout: 'cards',
    sections: [],
    items: [
      {
        slug: 'articulos/git',
        title: 'Git',
        href: '/repo/articulos/git/',
        path: ['Desarrollo'],
        cover: { kind: 'placeholder' },
      },
    ],
    page: 1,
    pages: 2,
    total: 3,
    hrefs: ['/repo/articulos/', '/repo/articulos/2/'],
    headings: [],
    all: false,
    perPage: 1,
    perPageOptions: [],
    sizes: [],
  };
  const body = '<h1>Artículos</h1><p>Notas técnicas.</p>';

  it('página 1: el cuerpo del _index.md en `.prose` y debajo el listado, fuera de `.prose`', async () => {
    const document = await renderDocument(DocPage, props({ index }), { default: body });
    const main = document.querySelector('main')!;
    const prose = main.querySelector('.prose')!;
    expect(text(prose.querySelector('h1'))).toBe('Artículos');
    expect(text(prose.querySelector('p'))).toBe('Notas técnicas.');
    const listing = main.querySelector('[data-index-listing]')!;
    expect(listing.closest('.prose')).toBeNull();
    expect(listing.querySelector('a[href="/repo/articulos/git/"]')).not.toBeNull();
    // Antes del pie del artículo (anterior/siguiente).
    const after = [...main.children];
    expect(after.indexOf(listing.parentElement!)).toBeGreaterThan(after.indexOf(prose));
  });

  it('desde la página 2: el título y «Página n de m» en lugar del cuerpo', async () => {
    const heading = { title: 'Artículos', page: 'Página 2 de 2' };
    const document = await renderDocument(
      DocPage,
      props({ index: { ...index, page: 2, heading } }),
      {
        default: body,
      },
    );
    const prose = document.querySelector('main .prose')!;
    expect(text(prose.querySelector('h1'))).toBe('Artículos');
    expect(text(prose.querySelector('p'))).toBe('Página 2 de 2');
    expect(text(prose)).not.toContain('Notas técnicas.');
  });

  it('las secciones de la lista entran en «En esta página»', async () => {
    const list = {
      ...index,
      layout: 'list',
      items: [],
      pages: 1,
      sections: [
        { label: 'Desarrollo', id: 'desarrollo', nodes: index.items },
        { label: 'Sistemas', id: 'sistemas', nodes: index.items },
        { label: 'Redes', id: 'redes', nodes: index.items },
      ],
      headings: [
        { depth: 2, slug: 'desarrollo', text: 'Desarrollo' },
        { depth: 2, slug: 'sistemas', text: 'Sistemas' },
        { depth: 2, slug: 'redes', text: 'Redes' },
      ],
    };
    const document = await renderDocument(DocPage, props({ index: list }), { default: body });
    expect(document.querySelector('[data-toc-column] a[href="#desarrollo"]')).not.toBeNull();
    expect(document.querySelector('h2#desarrollo')).not.toBeNull();
  });
});
