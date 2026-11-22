import { describe, expect, it } from 'vitest';
import { stringsFor } from '../../testing/strings';
import type { Listing, ListingEntry } from './entries';
import type { ListingOptions } from './options';
import type { ListingPosition } from './urls';
import { buildListingView, formatListingDate, type ListingHrefs } from './view';

function entry(index: number, extra: Partial<ListingEntry> = {}): ListingEntry {
  return {
    slug: `tutoriales/t${index}`,
    title: `T${index}`,
    href: `/repo/tutoriales/t${index}/`,
    path: ['Guía'],
    ...extra,
  };
}

function listingOf(count: number): Listing {
  const entries = Array.from({ length: count }, (_item, index) => entry(index + 1));
  return { sections: [{ nodes: entries }], entries };
}

const hrefs: ListingHrefs = {
  at: ({ perPage, page }: ListingPosition) => `/repo/tutoriales/${perPage}/${page}/`,
};

const table: ListingOptions = {
  folder: 'tutoriales',
  view: 'table',
  covers: true,
  pageSize: 12,
  perPageOptions: [12],
};

function view(
  options: ListingOptions,
  position: ListingPosition | undefined,
  listing: Listing = listingOf(18),
) {
  return buildListingView(
    {
      listing,
      options,
      ...(position && { position }),
      locale: 'es',
      strings: stringsFor('es'),
      title: 'Tutoriales',
    },
    hrefs,
  );
}

describe('formatListingDate', () => {
  it('fecha media en el idioma, en UTC', () => {
    expect(formatListingDate('2026-11-21T23:30:00+00:00', 'es')).toBe('21 nov 2026');
    expect(formatListingDate('2026-11-21T23:30:00+00:00', 'en')).toBe('Nov 21, 2026');
  });
});

describe('buildListingView: tabla y tarjetas', () => {
  it('18 entradas de 12 en 12, página 2: 6 entradas, rango 13–18, paginador y encabezado', () => {
    const result = view(table, { perPage: 12, page: 2 });
    if (result.layout === 'list') throw new Error('esperaba una tabla');
    expect(result.items).toHaveLength(6);
    expect(result.total).toBe(18);
    expect(result.range).toEqual({ from: 13, to: 18 });
    expect(result.pager).toEqual({
      page: 2,
      pages: 2,
      hrefs: ['/repo/tutoriales/12/1/', '/repo/tutoriales/12/2/'],
    });
    expect(result.pageHeading).toEqual({ title: 'Tutoriales', page: 'Página 2 de 2' });
  });

  it('la página 1 no lleva encabezado de página ni entradas de más', () => {
    const result = view(table, { perPage: 12, page: 1 });
    if (result.layout === 'list') throw new Error('esperaba una tabla');
    expect(result.items).toHaveLength(12);
    expect(result.pageHeading).toBeUndefined();
  });

  it('con una sola página no hay paginador', () => {
    const result = view(table, { perPage: 12, page: 1 }, listingOf(5));
    if (result.layout === 'list') throw new Error('esperaba una tabla');
    expect(result.pager).toBeUndefined();
  });

  it('con opciones [12, 24] da los tamaños, con la URL de su página 1 y el actual marcado', () => {
    const result = view({ ...table, perPageOptions: [12, 24] }, { perPage: 24, page: 1 });
    if (result.layout === 'list') throw new Error('esperaba una tabla');
    expect(result.sizes).toEqual([
      { size: 12, href: '/repo/tutoriales/12/1/', current: false },
      { size: 24, href: '/repo/tutoriales/24/1/', current: true },
    ]);
    expect(result.items).toHaveLength(18);
  });

  it('con una sola opción útil (todo cabe en la más pequeña) no hay selector', () => {
    expect(view(table, { perPage: 12, page: 1 })).not.toHaveProperty('sizes');
    const small = view(
      { ...table, perPageOptions: [12, 24] },
      { perPage: 12, page: 1 },
      listingOf(5),
    );
    expect(small).not.toHaveProperty('sizes');
  });

  it('las fechas llegan formateadas, el dibujo elegido y la portada decidida', () => {
    const listing: Listing = {
      sections: [],
      entries: [entry(1, { updated: '2026-11-21T10:00:00+00:00', cover: false })],
    };
    const result = view({ ...table, view: 'cards' }, { perPage: 12, page: 1 }, listing);
    if (result.layout === 'list') throw new Error('esperaba tarjetas');
    const [item] = result.items;
    expect(item!.updated).toEqual({ iso: '2026-11-21T10:00:00+00:00', label: '21 nov 2026' });
    expect(['grid', 'diagonal', 'dots']).toContain(item!.pattern);
    expect(item!.cover).toEqual({ kind: 'none' });
  });

  it('de la más reciente a la más antigua; lo que no tiene commit va delante', () => {
    const listing: Listing = {
      sections: [],
      entries: [
        entry(1, { updated: '2025-01-01T00:00:00+00:00' }),
        entry(2),
        entry(3, { updated: '2026-01-01T00:00:00+00:00' }),
      ],
    };
    const result = view(table, { perPage: 12, page: 1 }, listing);
    if (result.layout === 'list') throw new Error('esperaba una tabla');
    expect(result.items.map((item) => item.title)).toEqual(['T2', 'T3', 'T1']);
  });
});

describe('buildListingView: lista', () => {
  const list: ListingOptions = { folder: 'tutoriales', view: 'list', covers: true };

  it('no tiene entradas paginadas: sus secciones y los encabezados para el índice de la página', () => {
    const listing: Listing = {
      sections: [{ label: 'Esenciales', id: 'esenciales', nodes: [entry(1)] }],
      entries: [entry(1)],
    };
    const result = view(list, undefined, listing);
    expect(result).not.toHaveProperty('items');
    if (result.layout !== 'list') throw new Error('esperaba una lista');
    expect(result.empty).toBe(false);
    expect(result.headings).toEqual([{ depth: 2, slug: 'esenciales', text: 'Esenciales' }]);
    expect(result.sections[0]!.nodes[0]).toMatchObject({
      title: 'T1',
      href: '/repo/tutoriales/t1/',
    });
  });

  it('sin secciones está vacía', () => {
    const result = view(list, undefined, { sections: [], entries: [] });
    expect(result).toMatchObject({ layout: 'list', empty: true });
  });

  it('las fechas del árbol llegan formateadas', () => {
    const dated = entry(1, { updated: '2026-11-21T10:00:00+00:00' });
    const result = view(list, undefined, { sections: [{ nodes: [dated] }], entries: [dated] });
    if (result.layout !== 'list') throw new Error('esperaba una lista');
    expect(result.sections[0]!.nodes[0]).toMatchObject({
      updated: { iso: '2026-11-21T10:00:00+00:00', label: '21 nov 2026' },
    });
  });
});
