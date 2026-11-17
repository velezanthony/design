import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, parseFilters, serializeFilters } from './url-filters';

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
