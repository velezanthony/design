import { describe, expect, it } from 'vitest';
import {
  ALL_SEVERITIES,
  DEFAULT_SEVERITIES,
  EMPTY_FILTERS,
  filtersFromUrl,
  parseFilters,
  parsePage,
  serializeFilters,
} from './url-filters';

const parse = (query: string) => parseFilters(new URLSearchParams(query));

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
    });
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
    };
    const copy = { ...filters, kinds: [...filters.kinds], severities: [...filters.severities] };
    expect(parseFilters(serializeFilters(copy))).toEqual(copy);
  });
});

describe('filtersFromUrl', () => {
  it('sin gravedad ni tipo en la URL aplica la gravedad por defecto (error y aviso)', () => {
    expect(filtersFromUrl(new URLSearchParams(''))).toEqual({
      filters: { ...EMPTY_FILTERS, severities: DEFAULT_SEVERITIES },
      defaulted: true,
    });
    expect(DEFAULT_SEVERITIES).toEqual(['error', 'warning']);
  });

  it('el idioma y el texto se conservan y no impiden el valor por defecto', () => {
    expect(filtersFromUrl(new URLSearchParams('locale=es&q=orm'))).toEqual({
      filters: { ...EMPTY_FILTERS, severities: DEFAULT_SEVERITIES, locales: ['es'], text: 'orm' },
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
