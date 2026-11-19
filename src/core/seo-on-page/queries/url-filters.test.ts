import { describe, expect, it } from 'vitest';
import { ACTIONABLE_SEVERITIES, ALL_SEVERITIES } from '../severity';
import { PAGE_SIZE } from './paginate';
import {
  EMPTY_FILTERS,
  filterFields,
  filtersFromUrl,
  parseFilters,
  parsePage,
  parsePerPage,
  parseView,
  serializeFilters,
} from './url-filters';

function parse(query: string) {
  return parseFilters(new URLSearchParams(query));
}

describe('parseFilters', () => {
  it('sin parámetros: filtros vacíos', () => {
    expect(parse('')).toEqual(EMPTY_FILTERS);
  });

  it('lee kind, severity y locale (repetidos) y q', () => {
    expect(parse('kind=no-h1&kind=title-too-long&severity=error&locale=es&q=guide')).toEqual({
      kinds: ['no-h1', 'title-too-long'],
      severities: ['error'],
      locales: ['es'],
      text: 'guide',
      hideNoindex: false,
    });
  });

  it('`noindex=hide` oculta las noindex; cualquier otro valor las deja ver', () => {
    expect(parse('noindex=hide').hideNoindex).toBe(true);
    expect(parse('noindex=show').hideNoindex).toBe(false);
    expect(parse('noindex=').hideNoindex).toBe(false);
  });

  it('ignora valores desconocidos y duplicados sin fallar', () => {
    expect(parse('kind=nope&kind=no-h1&kind=no-h1&severity=fatal&locale=')).toEqual({
      ...EMPTY_FILTERS,
      kinds: ['no-h1'],
    });
  });
});

describe('serializeFilters', () => {
  it('filtros vacíos: cadena vacía', () => {
    expect(serializeFilters(EMPTY_FILTERS).toString()).toBe('');
  });

  it('ida y vuelta sin pérdida', () => {
    const filters = {
      kinds: ['no-h1', 'duplicate-title'] as const,
      severities: ['warning', 'error'] as const,
      locales: ['es', 'pt-BR'],
      text: 'a & b=c ñ',
      hideNoindex: true,
    };
    const copy = { ...filters, kinds: [...filters.kinds], severities: [...filters.severities] };
    expect(parseFilters(serializeFilters(copy))).toEqual(copy);
  });
});

describe('serializeFilters: noindex', () => {
  it('solo se escribe cuando se ocultan, y no cuenta como gravedad ni tipo', () => {
    expect(serializeFilters({ ...EMPTY_FILTERS, hideNoindex: true }).toString()).toBe(
      'noindex=hide',
    );
    expect(filtersFromUrl(new URLSearchParams('noindex=hide')).defaulted).toBe(true);
  });
});

describe('filtersFromUrl', () => {
  it('sin gravedad ni tipo en la URL aplica la gravedad por defecto (error y aviso)', () => {
    expect(filtersFromUrl(new URLSearchParams(''))).toEqual({
      filters: { ...EMPTY_FILTERS, severities: ACTIONABLE_SEVERITIES },
      defaulted: true,
    });
    expect(ACTIONABLE_SEVERITIES).toEqual(['error', 'warning']);
  });

  it('el idioma y el texto se conservan y no impiden el valor por defecto', () => {
    expect(filtersFromUrl(new URLSearchParams('locale=es&q=orm'))).toEqual({
      filters: {
        ...EMPTY_FILTERS,
        severities: ACTIONABLE_SEVERITIES,
        locales: ['es'],
        text: 'orm',
      },
      defaulted: true,
    });
  });

  it('una gravedad explícita manda sobre el valor por defecto', () => {
    expect(filtersFromUrl(new URLSearchParams('severity=info'))).toEqual({
      filters: { ...EMPTY_FILTERS, severities: ['info'] },
      defaulted: false,
    });
  });

  it('un tipo explícito también lo desactiva (el tipo manda, vea la gravedad que vea)', () => {
    expect(filtersFromUrl(new URLSearchParams('kind=description-inherited'))).toEqual({
      filters: { ...EMPTY_FILTERS, kinds: ['description-inherited'] },
      defaulted: false,
    });
  });

  it('una gravedad desconocida cuenta como no escrita: vuelve el valor por defecto', () => {
    expect(filtersFromUrl(new URLSearchParams('severity=fatal')).defaulted).toBe(true);
  });

  it('«todas» se pide con las tres gravedades y ya no es el valor por defecto', () => {
    const query = serializeFilters({ ...EMPTY_FILTERS, severities: ALL_SEVERITIES }).toString();
    expect(query).toBe('severity=error&severity=warning&severity=info');
    expect(filtersFromUrl(new URLSearchParams(query))).toEqual({
      filters: { ...EMPTY_FILTERS, severities: ALL_SEVERITIES },
      defaulted: false,
    });
  });
});

describe('parsePage', () => {
  it.each([
    ['', 1],
    ['page=', 1],
    ['page=abc', 1],
    ['page=0', 1],
    ['page=-2', 1],
    ['page=2.5', 1],
    ['page=1', 1],
    ['page=3', 3],
    ['page=3&page=5', 3],
  ])('«%s» es la página %i', (query, expected) => {
    expect(parsePage(new URLSearchParams(query))).toBe(expected);
  });
});

describe('serializeFilters: página', () => {
  it('la página 1 es la de por defecto y no se escribe', () => {
    expect(serializeFilters(EMPTY_FILTERS, 1).toString()).toBe('');
    expect(serializeFilters(EMPTY_FILTERS).toString()).toBe('');
  });

  it('a partir de la 2 va al final, tras los filtros, y vuelve con parsePage', () => {
    const filters = { ...EMPTY_FILTERS, severities: ['info' as const], text: 'orm' };
    const params = serializeFilters(filters, 3);
    expect(params.toString()).toBe('severity=info&q=orm&page=3');
    expect(parsePage(params)).toBe(3);
    expect(parseFilters(params)).toEqual(filters);
  });
});

describe('parsePerPage', () => {
  it.each([
    ['', PAGE_SIZE],
    ['per=10', 10],
    ['per=25', 25],
    ['per=50', 50],
    ['per=100', 100],
    ['per=999', PAGE_SIZE],
    ['per=0', PAGE_SIZE],
    ['per=-10', PAGE_SIZE],
    ['per=abc', PAGE_SIZE],
    ['per=10.5', PAGE_SIZE],
    ['per=', PAGE_SIZE],
    ['per=010', PAGE_SIZE],
  ])('%s -> %s', (query, expected) => {
    expect(parsePerPage(new URLSearchParams(query))).toBe(expected);
  });
});

describe('serializeFilters: filas por página', () => {
  it('el tamaño por defecto no se escribe', () => {
    expect(serializeFilters(EMPTY_FILTERS, 1, PAGE_SIZE).toString()).toBe('');
  });

  it('otro tamaño va al final, tras la página, y vuelve con parsePerPage', () => {
    const params = serializeFilters({ ...EMPTY_FILTERS, text: 'a' }, 2, 50);
    expect(params.toString()).toBe('q=a&page=2&per=50');
    expect(parsePerPage(params)).toBe(50);
  });

  it('un tamaño que no está permitido tampoco se escribe', () => {
    expect(serializeFilters(EMPTY_FILTERS, 1, 7).toString()).toBe('');
  });
});

describe('filterFields', () => {
  it('sin filtros no hay campos', () => {
    expect(filterFields(EMPTY_FILTERS)).toEqual([]);
  });

  it('emite exactamente lo que escribe serializeFilters, en su mismo orden', () => {
    const filters = {
      kinds: ['no-h1' as const],
      severities: ['error' as const],
      locales: ['es'],
      text: 'a b',
      hideNoindex: false,
    };
    const fields = filterFields(filters);
    expect(fields).toEqual([
      { name: 'kind', value: 'no-h1' },
      { name: 'severity', value: 'error' },
      { name: 'locale', value: 'es' },
      { name: 'q', value: 'a b' },
    ]);
    const params = new URLSearchParams(fields.map(({ name, value }) => [name, value]));
    expect(parseFilters(params)).toEqual(filters);
  });

  it('nunca incluye la página ni el tamaño: los pone quien envía el formulario', () => {
    const names = filterFields({ ...EMPTY_FILTERS, text: 'x' }).map((field) => field.name);
    expect(names).not.toContain('page');
    expect(names).not.toContain('per');
  });
});

describe('parseView', () => {
  function view(query: string) {
    return parseView(new URLSearchParams(query));
  }

  it('sin `view` es la vista por página', () => {
    expect(view('')).toEqual({ view: 'page' });
  });

  it('reconoce las cuatro vistas', () => {
    expect(view('view=locale')).toEqual({ view: 'locale' });
    expect(view('view=matrix')).toEqual({ view: 'matrix' });
    expect(view('view=have')).toEqual({ view: 'have' });
    expect(view('view=page')).toEqual({ view: 'page' });
  });

  it('un valor desconocido cae a la vista por página', () => {
    expect(view('view=grid')).toEqual({ view: 'page' });
    expect(view('view=')).toEqual({ view: 'page' });
    expect(view('view=HAVE')).toEqual({ view: 'page' });
  });

  it('`lacks` solo vale en «Qué tiene» y con una columna conocida', () => {
    expect(view('view=have&lacks=og')).toEqual({ view: 'have', lacks: 'og' });
    expect(view('view=have&lacks=nope')).toEqual({ view: 'have' });
    expect(view('view=matrix&lacks=og')).toEqual({ view: 'matrix' });
    expect(view('lacks=og')).toEqual({ view: 'page' });
  });
});

describe('serializeFilters: vista', () => {
  it('la vista por página no se escribe: la URL canónica no cambia', () => {
    expect(serializeFilters(EMPTY_FILTERS, 1, PAGE_SIZE, { view: 'page' }).toString()).toBe('');
  });

  it('escribe la vista y, en «Qué tiene», la columna que falta', () => {
    expect(serializeFilters(EMPTY_FILTERS, 1, PAGE_SIZE, { view: 'locale' }).toString()).toBe(
      'view=locale',
    );
    expect(
      serializeFilters(EMPTY_FILTERS, 1, PAGE_SIZE, { view: 'have', lacks: 'i18n' }).toString(),
    ).toBe('view=have&lacks=i18n');
  });

  it('no escribe `lacks` fuera de «Qué tiene»', () => {
    expect(
      serializeFilters(EMPTY_FILTERS, 1, PAGE_SIZE, { view: 'matrix', lacks: 'og' }).toString(),
    ).toBe('view=matrix');
  });

  it('va junto a los filtros y la página, y ida y vuelta conserva la vista', () => {
    const query = serializeFilters({ ...EMPTY_FILTERS, text: 'orm' }, 2, 50, {
      view: 'have',
      lacks: 'desc',
    });
    expect(query.toString()).toBe('q=orm&view=have&lacks=desc&page=2&per=50');
    expect(parseView(query)).toEqual({ view: 'have', lacks: 'desc' });
  });
});

describe('filterFields: vista', () => {
  it('lleva la vista como un campo más, para que cambiar el tamaño no la deshaga', () => {
    expect(filterFields(EMPTY_FILTERS, { view: 'have', lacks: 'og' })).toEqual([
      { name: 'view', value: 'have' },
      { name: 'lacks', value: 'og' },
    ]);
  });
});
