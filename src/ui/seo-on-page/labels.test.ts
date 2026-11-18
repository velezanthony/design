import { describe, expect, it } from 'vitest';
import type { ListingTable } from '../../core/seo-on-page/pages/listing/model';
import { EMPTY_FILTERS } from '../../core/seo-on-page/queries/url-filters';
import {
  haveCellText,
  headCount,
  issueHelp,
  issueMeasure,
  KINDS_LABELS,
  reportFilterText,
  resultsCountText,
} from './labels';

function matrix(complete: number): ListingTable {
  return {
    view: 'matrix',
    rows: [],
    locales: ['en', 'es'],
    hreflang: true,
    complete,
  };
}
function have(lacks?: 'i18n' | 'og'): ListingTable {
  return {
    view: 'have',
    rows: [],
    columns: [],
    lacks,
  };
}

describe('headCount', () => {
  it('por página cuenta páginas, con su singular', () => {
    expect(headCount({ view: 'page', rows: [] }, 38)).toBe('38 páginas');
    expect(headCount({ view: 'page', rows: [] }, 1)).toBe('1 página');
  });

  it('por idioma cuenta entradas página + idioma', () => {
    expect(headCount({ view: 'locale', rows: [] }, 75)).toBe('75 entradas página + idioma');
    expect(headCount({ view: 'locale', rows: [] }, 1)).toBe('1 entrada página + idioma');
  });

  it('la matriz dice cuántos idiomas y cuántas páginas están completas', () => {
    expect(headCount(matrix(37), 38)).toBe('38 páginas × 2 idiomas · 37 completas');
    expect(headCount(matrix(1), 2)).toBe('2 páginas × 2 idiomas · 1 completa');
  });

  it('«Qué tiene» sin columna cuenta páginas; con ella dice qué les falta', () => {
    expect(headCount(have(), 38)).toBe('38 páginas');
    expect(headCount(have('i18n'), 2)).toBe('2 páginas sin todas las traducciones');
    expect(headCount(have('og'), 1)).toBe('1 página sin imagen OG propia');
  });
});

describe('haveCellText', () => {
  it('lo propio lleva el género de la columna', () => {
    expect(haveCellText('desc', { state: 'own' })).toBe('propia');
    expect(haveCellText('schema', { state: 'own' })).toBe('propio');
  });

  it('lo propio con detalle dice el detalle (el tipo del schema)', () => {
    expect(haveCellText('schema', { state: 'own', detail: 'WebSite' })).toBe('WebSite');
  });

  it('las columnas de sí o no dicen «sí»', () => {
    expect(haveCellText('h1', { state: 'own' })).toBe('sí');
    expect(haveCellText('index', { state: 'ok' })).toBe('sí');
  });

  it('una falta o un respaldo dicen en qué idioma', () => {
    expect(haveCellText('i18n', { state: 'missing', detail: 'es' })).toBe('falta es');
    expect(haveCellText('i18n', { state: 'partial', detail: 'es' })).toBe('respaldo es');
  });

  it('lo heredado, lo que falta y noindex van en palabras', () => {
    expect(haveCellText('desc', { state: 'site' })).toBe('del sitio');
    expect(haveCellText('og', { state: 'missing' })).toBe('falta');
    expect(haveCellText('index', { state: 'no' })).toBe('noindex');
  });
});

describe('reportFilterText', () => {
  function text(filters: Partial<typeof EMPTY_FILTERS>, view = { view: 'page' } as const) {
    return reportFilterText({ ...EMPTY_FILTERS, ...filters }, view);
  }

  it('sin filtros son todas las páginas', () => {
    expect(text({})).toBe('todas las páginas');
  });

  it('las gravedades se dicen en plural, unidas con «+»', () => {
    expect(text({ severities: ['error', 'warning'] })).toBe('errores + avisos');
  });

  it('las tres gravedades son pedir todo: no se mencionan', () => {
    expect(text({ severities: ['error', 'warning', 'info'] })).toBe('todas las páginas');
  });

  it('los tipos se nombran como el panel los llama', () => {
    expect(text({ kinds: ['duplicate-title', 'no-h1'] })).toBe('tipo Título duplicado, Sin H1');
  });

  it('el idioma y la búsqueda se dicen, y la búsqueda sin espacios sobrantes', () => {
    expect(text({ locales: ['es'], text: '  api ' })).toBe('idioma es · búsqueda «api»');
  });

  it('lo que falta en «Qué tiene» va al final', () => {
    expect(text({ severities: ['info'] }, { view: 'have', lacks: 'desc' } as never)).toBe(
      'informativos · sin descripción propia',
    );
  });
});

describe('resultsCountText', () => {
  it('sin resultados dice cuántas hay en total', () => {
    expect(resultsCountText(0, 0, 0, 151, 'páginas')).toBe('0 de 151 páginas');
  });

  it('sin filtrar da el rango y el total', () => {
    expect(resultsCountText(1, 25, 151, 151, 'páginas')).toBe('1–25 de 151 páginas');
  });

  it('filtrado añade cuántas hay en total', () => {
    expect(resultsCountText(1, 10, 75, 151, 'entradas')).toBe('1–10 de 75 entradas · 151 en total');
  });

  it('por defecto cuenta páginas', () => {
    expect(resultsCountText(1, 2, 2, 2)).toBe('1–2 de 2 páginas');
  });
});

describe('issueHelp', () => {
  it('sin arreglo es solo el mensaje', () => {
    expect(issueHelp({ message: 'Falta el título' })).toBe('Falta el título');
  });

  it('con arreglo lo añade sin las comillas de código', () => {
    expect(issueHelp({ message: 'Falta', fix: 'Añade `<title>`' })).toBe(
      'Falta\nCómo arreglarlo: Añade <title>',
    );
  });
});

describe('issueMeasure', () => {
  it('da lo medido contra su límite solo si hay ambos', () => {
    expect(issueMeasure({ value: 72, limit: 60 })).toBe('72 / 60');
    expect(issueMeasure({ value: 72 })).toBeUndefined();
    expect(issueMeasure({ limit: 60 })).toBeUndefined();
  });
});

describe('KINDS_LABELS.count', () => {
  it('dice cuántos tipos hay marcados de los totales', () => {
    expect(KINDS_LABELS.count(3, 12)).toBe('· 3 de 12');
  });
});
