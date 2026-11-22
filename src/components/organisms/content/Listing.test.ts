import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

import type { CoverView } from '../../../core/listing/covers';
import type { ListingView } from '../../../core/listing/view';
import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import { items } from '../../../testing/listing-items';
import Listing from './Listing.astro';

type Paged = Extract<ListingView<CoverView>, { layout: 'table' | 'cards' }>;

function paged(extra: Partial<Paged> = {}): Paged {
  return {
    layout: 'cards',
    items,
    total: 7,
    range: { from: 4, to: 6 },
    pager: {
      page: 2,
      pages: 3,
      hrefs: ['/repo/tutoriales/', '/repo/tutoriales/page/2/', '/repo/tutoriales/page/3/'],
    },
    ...extra,
  };
}

async function listing(view: ListingView<CoverView>) {
  return render(Listing, { view, strings: stringsFor('es') });
}

describe('Listing', () => {
  it('pinta la disposición pedida: tarjetas con ListingCard, tabla y lista', async () => {
    const cards = await listing(paged());
    expect(cards.querySelectorAll('[data-listing-card]')).toHaveLength(items.length);
    expect((await listing(paged({ layout: 'table' }))).querySelector('table')).not.toBeNull();
    const list = await listing({
      layout: 'list',
      sections: [{ nodes: [{ slug: 'a', title: 'A', href: '/a/' }] }],
      headings: [],
      empty: false,
    });
    expect(list.querySelector('[data-listing-list]')).not.toBeNull();
  });

  it('el paginador enlaza exactamente los `href` del modelo, con los textos del idioma', async () => {
    const document = await listing(paged());
    const nav = document.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Navegación entre páginas');
    expect(nav.querySelector('a[rel="prev"]')!.getAttribute('href')).toBe('/repo/tutoriales/');
    expect(nav.querySelector('a[rel="next"]')!.getAttribute('href')).toBe(
      '/repo/tutoriales/page/3/',
    );
    expect(nav.querySelector('[aria-current="page"]')!.getAttribute('href')).toBe(
      '/repo/tutoriales/page/2/',
    );
    const linked = new Set([...nav.querySelectorAll('a')].map((link) => link.getAttribute('href')));
    expect([...linked].sort()).toEqual([...paged().pager!.hrefs].sort());
    expect(text(nav)).toContain('Anterior');
  });

  it('el rango del modelo, tal cual', async () => {
    expect(text(await listing(paged()))).toContain('Mostrando 4–6 de 7');
  });

  it('las opciones del selector son exactamente los `href` de `sizes`', async () => {
    const sizes = [
      { size: 1, href: '/repo/tutoriales/', current: false },
      { size: 2, href: '/repo/tutoriales/per-page/2/', current: true },
    ];
    const document = await listing(paged({ sizes }));
    const select = document.querySelector('[data-pagination-bar] select[data-auto-navigate]')!;
    expect(
      [...select.querySelectorAll('option')].map((option) => option.getAttribute('value')),
    ).toEqual(sizes.map((size) => size.href));
    const noscript = parseHTML(`<div>${document.querySelector('noscript')!.innerHTML}</div>`);
    expect(
      [...noscript.document.querySelectorAll('a')].map((link) => link.getAttribute('href')),
    ).toEqual(sizes.map((size) => size.href));
  });

  it('sin paginador ni selector no hay fila de pie', async () => {
    const document = await listing(paged({ pager: undefined }));
    expect(document.querySelector('[data-pagination-bar]')).toBeNull();
  });

  it('sin entradas, un aviso', async () => {
    const document = await listing(
      paged({ items: [], total: 0, range: { from: 0, to: 0 }, pager: undefined }),
    );
    expect(text(document)).toBe('Aún no hay páginas aquí.');
    const list = await listing({ layout: 'list', sections: [], headings: [], empty: true });
    expect(text(list)).toBe('Aún no hay páginas aquí.');
  });

  it('queda fuera de la búsqueda y sin entradas ocultas', async () => {
    const document = await listing(paged());
    expect(document.querySelector('[data-listing]')!.hasAttribute('data-pagefind-ignore')).toBe(
      true,
    );
    expect(document.querySelector('[hidden]')).toBeNull();
  });
});
