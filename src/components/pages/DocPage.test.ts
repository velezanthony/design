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
