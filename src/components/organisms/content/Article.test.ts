import { describe, expect, it } from 'vitest';

import { render } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import Article from './Article.astro';

const headings = [
  { depth: 2, slug: 'a', text: 'A' },
  { depth: 2, slug: 'b', text: 'B' },
  { depth: 3, slug: 'c', text: 'C' },
];

function article(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return render(
    Article,
    { strings: stringsFor('es'), headings, ...props },
    { default: '<h2 id="a">A</h2>', ...slots },
  );
}

describe('Article: contenido', () => {
  it('es un <main> con los textos que lee bootArticle y element contenido en .prose', async () => {
    const doc = await article();
    const main = doc.querySelector('main')!;
    expect(main.getAttribute('data-copy-label')).toBe('Copiar');
    expect(main.getAttribute('data-diagram-fit-label')).not.toBeNull();
    expect(main.querySelector('.prose h2')).not.toBeNull();
  });

  it('puede ser un <div> cuando la página ya tiene su <main>', async () => {
    const doc = await article({ as: 'div' });
    expect(doc.querySelector('main')).toBeNull();
    expect(doc.querySelector('div[data-copy-label]')).not.toBeNull();
  });

  it('`id` y `class` van al contenedor', async () => {
    const main = (await article({ id: 'main-content', class: 'lg:py-8' })).querySelector('main')!;
    expect(main.getAttribute('id')).toBe('main-content');
    expect(main.getAttribute('class')).toBe('min-w-0 lg:py-8');
  });

  it('`contentLang` marca element idioma del contenido y `prose={false}` quita element estilo', async () => {
    const doc = await article({ contentLang: 'en', prose: false });
    const content = doc.querySelector('main > div')!;
    expect(content.getAttribute('lang')).toBe('en');
    expect(content.classList.contains('prose')).toBe(false);
  });

  it('Pagefind: sin `indexable` no marca; con él indexa o ignora', async () => {
    expect((await article()).querySelector('main')!.getAttributeNames()).not.toContain(
      'data-pagefind-body',
    );
    expect(
      (await article({ indexable: true })).querySelector('[data-pagefind-body]'),
    ).not.toBeNull();
    expect(
      (await article({ indexable: false })).querySelector('[data-pagefind-ignore]'),
    ).not.toBeNull();
  });

  it('`before` va antes del contenido y `after` después, dentro del contenedor', async () => {
    const doc = await article({}, { before: '<p id="b">b</p>', after: '<p id="z">z</p>' });
    const ids = [...doc.querySelectorAll('main > *')].map(
      (element) => element.id || element.className,
    );
    expect(ids).toEqual(['b', 'prose', 'z']);
  });
});

describe('Article: columna lateral', () => {
  it('con tres o más entradas lleva element índice', async () => {
    const doc = await article();
    expect(doc.querySelector('[data-toc-column] nav.toc')).not.toBeNull();
  });

  it('sin entradas suficientes no reserva columna', async () => {
    expect(
      (await article({ headings: headings.slice(0, 2) })).querySelector('[data-toc-column]'),
    ).toBeNull();
  });

  it('`toc={false}` quita element índice aunque haya encabezados', async () => {
    expect((await article({ toc: false })).querySelector('[data-toc-column]')).toBeNull();
  });

  it('`depth` recorta lo que lista element índice', async () => {
    const more = [...headings, { depth: 2, slug: 'd', text: 'D' }];
    expect(
      (await article({ headings: more, depth: 2 })).querySelectorAll('nav.toc li'),
    ).toHaveLength(3);
    expect(
      (await article({ headings: more, depth: 3 })).querySelectorAll('nav.toc li'),
    ).toHaveLength(4);
  });

  it('element aside va en la columna, antes del índice', async () => {
    const doc = await article({}, { aside: '<aside id="side">x</aside>' });
    const column = doc.querySelector('[data-toc-column]')!;
    const content = [...column.children].filter((element) => element.tagName !== 'SCRIPT');
    expect(content.map((element) => element.id || element.tagName.toLowerCase())).toEqual([
      'side',
      'nav',
    ]);
  });

  it('con aside y sin índice la columna existe igual', async () => {
    const doc = await article({ toc: false }, { aside: '<aside id="side">x</aside>' });
    const column = doc.querySelector('[data-toc-column]')!;
    expect(column.querySelector('#side')).not.toBeNull();
    expect(column.querySelector('nav.toc')).toBeNull();
  });

  it('`columnClass` llega a la columna', async () => {
    const doc = await article({ columnClass: 'hidden xl:block' });
    expect(doc.querySelector('[data-toc-column]')!.getAttribute('class')).toBe('hidden xl:block');
  });
});
