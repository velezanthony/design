import { describe, expect, it } from 'vitest';
import type { ListingTable } from '../../core/seo-on-page/pages/listing/model';
import { haveCellText, headCount } from './labels';

const matrix = (complete: number): ListingTable => ({
  view: 'matrix',
  rows: [],
  locales: ['en', 'es'],
  hreflang: true,
  complete,
});
const have = (lacks?: 'i18n' | 'og'): ListingTable => ({
  view: 'have',
  rows: [],
  columns: [],
  lacks,
});

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
