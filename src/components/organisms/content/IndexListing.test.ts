import { describe, expect, it } from 'vitest';

import type { CoverView } from '../../../core/listing/covers';
import type { IndexView } from '../../../core/listing/view';
import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import { items } from '../../../testing/index-items';
import IndexListing from './IndexListing.astro';

function view(extra: Partial<IndexView<CoverView>> = {}): IndexView<CoverView> {
  return {
    layout: 'cards',
    sections: [],
    items,
    page: 2,
    pages: 3,
    total: 7,
    hrefs: ['/repo/tutoriales/', '/repo/tutoriales/2/', '/repo/tutoriales/3/'],
    headings: [],
    all: false,
    perPage: 1,
    perPageOptions: [1, 2],
    sizes: [],
    ...extra,
  };
}

async function listing(extra: Partial<IndexView<CoverView>> = {}) {
  return render(IndexListing, { index: view(extra), strings: stringsFor('es'), lang: 'es' });
}

describe('IndexListing', () => {
  it('pinta la disposición pedida', async () => {
    expect((await listing()).querySelector('[data-index-card]')).not.toBeNull();
    expect((await listing({ layout: 'table' })).querySelector('table')).not.toBeNull();
    const list = await listing({ layout: 'list', sections: [{ nodes: [] }], pages: 1, page: 1 });
    expect(list.querySelector('[data-index-list]')).not.toBeNull();
  });

  it('con varias páginas, el paginador con las URLs de cada una y los textos del idioma', async () => {
    const document = await listing();
    const nav = document.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Navegación entre páginas');
    expect(nav.querySelector('a[rel="prev"]')!.getAttribute('href')).toBe('/repo/tutoriales/');
    expect(nav.querySelector('a[rel="next"]')!.getAttribute('href')).toBe('/repo/tutoriales/3/');
    expect(nav.querySelector('[aria-current="page"]')!.getAttribute('href')).toBe(
      '/repo/tutoriales/2/',
    );
    expect(nav.querySelector('a[aria-label="Página 3"]')).not.toBeNull();
    expect(text(nav)).toContain('Anterior');
  });

  it('con una sola página no hay paginador', async () => {
    const document = await listing({ page: 1, pages: 1, hrefs: ['/repo/tutoriales/'] });
    expect(document.querySelector('nav')).toBeNull();
  });

  it('sin entradas, un aviso', async () => {
    const document = await listing({ items: [], total: 0, page: 1, pages: 1 });
    expect(text(document)).toBe('Aún no hay páginas aquí.');
  });
});

describe('IndexListing: selector «Por página»', () => {
  /* Página 1 con las tres entradas de 1 en 1 (rutas estáticas) y la opción de 2 en 2. */
  const pageOne: Partial<IndexView<CoverView>> = {
    page: 1,
    pages: 3,
    all: true,
    perPage: 1,
    perPageOptions: [1, 2],
    total: 3,
    sizes: [
      {
        perPage: 1,
        pages: 3,
        hrefs: ['/repo/tutoriales/', '/repo/tutoriales/2/', '/repo/tutoriales/3/'],
      },
      {
        perPage: 2,
        pages: 2,
        hrefs: ['/repo/tutoriales/?por=2', '/repo/tutoriales/?por=2&pagina=2'],
      },
    ],
  };

  it('oculto sin JavaScript, con su etiqueta visible y las opciones de la config', async () => {
    const document = await listing(pageOne);
    const field = document.querySelector('[data-index-per-page-field]')!;
    expect(field.hasAttribute('hidden')).toBe(true);
    const select = field.querySelector('select[data-index-per-page]')!;
    expect(text(document.querySelector(`label[for="${select.id}"]`))).toBe('Por página');
    expect(
      [...select.querySelectorAll('option')].map((option) => option.getAttribute('value')),
    ).toEqual(['1', '2']);
  });

  it('el contenedor lleva lo que el script necesita y una región que anuncia los cambios', async () => {
    const document = await listing(pageOne);
    const root = document.querySelector('[data-index-pager]')!;
    expect(root.getAttribute('data-per-page')).toBe('1');
    expect(root.getAttribute('data-options')).toBe('1,2');
    expect(root.getAttribute('data-total')).toBe('3');
    expect(root.getAttribute('data-all')).toBe('true');
    expect(root.getAttribute('data-folder')).toBe('/repo/tutoriales/');
    expect(root.getAttribute('data-showing')).toBe('Mostrando {from}–{to} de {total}');
    expect(root.getAttribute('tabindex')).toBe('-1');
    const status = root.querySelector('[data-index-status]')!;
    expect(status.getAttribute('aria-live')).toBe('polite');
    // El rango se ve también sin JavaScript; el script lo actualiza y la región lo anuncia.
    expect(text(status)).toBe('Mostrando 1–1 de 3');
  });

  it('página 1: todas las entradas, las de más ocultas; un paginador por tamaño y página', async () => {
    const document = await listing(pageOne);
    const cards = [...document.querySelectorAll('[data-index-item]')];
    expect(cards.map((card) => card.hasAttribute('hidden'))).toEqual([false, true, true]);
    const pagers = [...document.querySelectorAll('[data-index-pagination]')];
    expect(
      pagers.map((pager) => [pager.getAttribute('data-per'), pager.getAttribute('data-page')]),
    ).toEqual([
      ['1', '1'],
      ['1', '2'],
      ['1', '3'],
      ['2', '1'],
      ['2', '2'],
    ]);
    expect(pagers.map((pager) => pager.hasAttribute('hidden'))).toEqual([
      false,
      true,
      true,
      true,
      true,
    ]);
    const secondSize = pagers[3]!.querySelector('a[rel="next"]')!;
    expect(secondSize.getAttribute('href')).toBe('/repo/tutoriales/?por=2&pagina=2');
    // El del tamaño de la config enlaza las rutas estáticas, para quien no tiene JavaScript.
    expect(pagers[0]!.querySelector('a[rel="next"]')!.getAttribute('href')).toBe(
      '/repo/tutoriales/2/',
    );
  });

  it('desde la página 2: solo sus entradas y su paginador, y el selector vuelve a la carpeta', async () => {
    const document = await listing();
    expect(document.querySelectorAll('[data-index-item]')).toHaveLength(3);
    expect(document.querySelectorAll('[data-index-item][hidden]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-index-pagination]')).toHaveLength(1);
    expect(document.querySelector('[data-index-pager]')!.getAttribute('data-all')).toBe('false');
  });

  it('sin selector en la lista, con una sola opción o si todo cabe en la opción más pequeña', async () => {
    expect((await listing({ ...pageOne, perPageOptions: [1] })).querySelector('select')).toBeNull();
    const fits = await listing({ ...pageOne, perPageOptions: [12, 24], perPage: 12, pages: 1 });
    expect(fits.querySelector('select')).toBeNull();
    const list = await listing({ layout: 'list', sections: [{ nodes: [] }], pages: 1, page: 1 });
    expect(list.querySelector('select')).toBeNull();
  });

  it('el listado queda fuera de la búsqueda (repite lo que ya indexa cada página)', async () => {
    const document = await listing(pageOne);
    expect(
      document.querySelector('[data-index-listing]')!.hasAttribute('data-pagefind-ignore'),
    ).toBe(true);
  });
});

describe('IndexListing: fila de pie', () => {
  const pageOne: Partial<IndexView<CoverView>> = {
    page: 1,
    pages: 3,
    all: true,
    perPage: 1,
    perPageOptions: [1, 2],
    total: 3,
    sizes: [
      {
        perPage: 1,
        pages: 3,
        hrefs: ['/repo/tutoriales/', '/repo/tutoriales/2/', '/repo/tutoriales/3/'],
      },
      {
        perPage: 2,
        pages: 2,
        hrefs: ['/repo/tutoriales/?por=2', '/repo/tutoriales/?por=2&pagina=2'],
      },
    ],
  };

  it('debajo del listado, en una línea: el selector a la izquierda; el rango y el paginador a la derecha', async () => {
    const document = await listing(pageOne);
    const root = document.querySelector('[data-index-listing]')!;
    const bar = root.querySelector(':scope > [data-pagination-bar]')!;
    const children = [...root.children];
    expect(children.indexOf(bar)).toBe(children.length - 1);
    const [start, end] = [...bar.children];
    expect(start!.hasAttribute('data-index-per-page-field')).toBe(true);
    expect(end!.querySelector('[data-index-status]')).not.toBeNull();
    expect(end!.querySelectorAll('[data-index-pagination]')).toHaveLength(5);
    // Nada arriba: ni selector ni paginador antes de las tarjetas.
    expect(root.querySelectorAll('[data-index-per-page-field]')).toHaveLength(1);
  });

  it('desde la página 2, el rango de esa página', async () => {
    const document = await listing({ page: 2, pages: 3, perPage: 2, total: 5 });
    expect(text(document.querySelector('[data-index-status]'))).toBe('Mostrando 3–4 de 5');
  });

  it('sin selector (una sola opción) la fila sigue con el rango y el paginador estático', async () => {
    const document = await listing({ ...pageOne, perPageOptions: [1] });
    const bar = document.querySelector('[data-pagination-bar]')!;
    expect(bar.querySelector('select')).toBeNull();
    expect(text(bar.querySelector('[data-index-status]'))).toBe('Mostrando 1–1 de 3');
    expect(bar.querySelector('nav a[rel="next"]')!.getAttribute('href')).toBe(
      '/repo/tutoriales/2/',
    );
  });

  it('sin selector y con una sola página no hay fila', async () => {
    const document = await listing({ ...pageOne, perPageOptions: [9, 18], perPage: 9, pages: 1 });
    expect(document.querySelector('[data-pagination-bar]')).toBeNull();
  });
});
