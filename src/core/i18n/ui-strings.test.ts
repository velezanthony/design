import { describe, expect, it } from 'vitest';
import {
  defaultStrings,
  localeNames,
  mergeUiStrings,
  t,
  uiKeys,
  type UiStrings,
} from './ui-strings';

describe('catálogo', () => {
  it('toda clave existe en todos los idiomas incluidos (completitud)', () => {
    for (const [locale, strings] of Object.entries(defaultStrings)) {
      expect(Object.keys(strings).sort(), locale).toEqual([...uiKeys].sort());
    }
  });

  it('ningún texto está vacío', () => {
    for (const strings of Object.values(defaultStrings)) {
      for (const value of Object.values(strings)) expect(value.trim()).not.toBe('');
    }
  });

  it('cubre los títulos de las alertas de GitHub y los textos de traducción ausente y 404', () => {
    for (const key of [
      'admonition.important',
      'admonition.caution',
      'translation.badgeLabel',
      'translation.fallbackNotice',
      'notFound.title',
      'notFound.body',
      'notFound.home',
      'notFound.description',
    ] as const) {
      expect(uiKeys).toContain(key);
    }
  });

  it('cubre los textos de los organismos (barra lateral, aviso de cookies, pie)', () => {
    for (const key of ['sidebar.label', 'consent.label', 'consent.preferences'] as const) {
      expect(uiKeys).toContain(key);
    }
  });

  it('cubre los textos de la página de privacidad', () => {
    for (const key of ['privacy.eyebrow', 'privacy.updated', 'privacy.description'] as const) {
      expect(uiKeys).toContain(key);
    }
  });

  it('cada idioma incluido tiene nombre propio', () => {
    expect(localeNames).toEqual({ en: 'English', es: 'Español' });
  });
});

describe('t', () => {
  const strings = { ...defaultStrings.en, 'edit.page': 'Edit {title} in {locale}' };

  it('devuelve el texto de la clave', () => {
    expect(t(defaultStrings.en, 'search.placeholder')).toBe(
      defaultStrings.en['search.placeholder'],
    );
  });

  it('interpola las variables', () => {
    expect(t(strings, 'edit.page', { title: 'Install', locale: 'es' })).toBe('Edit Install in es');
  });

  it('una variable no pasada se deja tal cual', () => {
    expect(t(strings, 'edit.page', { title: 'Install' })).toBe('Edit Install in {locale}');
  });
});

describe('mergeUiStrings', () => {
  it('sin overrides devuelve el catálogo tal cual', () => {
    expect(mergeUiStrings(defaultStrings, undefined)).toEqual(defaultStrings);
  });

  it('sustituye solo la clave declarada en ese idioma', () => {
    const merged = mergeUiStrings(defaultStrings, {
      es: { 'search.placeholder': 'Buscar en Design' },
    });
    expect(merged.es['search.placeholder']).toBe('Buscar en Design');
    expect(merged.es['edit.page']).toBe(defaultStrings.es['edit.page']);
    expect(merged.en).toEqual(defaultStrings.en);
  });

  it('no muta la entrada', () => {
    const before = structuredClone(defaultStrings);
    mergeUiStrings(defaultStrings, { en: { 'search.placeholder': 'x' } });
    expect(defaultStrings).toEqual(before);
  });

  it('ignora un idioma que no está en el catálogo base', () => {
    const merged = mergeUiStrings(defaultStrings, { fr: { 'search.placeholder': 'x' } });
    expect(Object.keys(merged)).toEqual(Object.keys(defaultStrings));
  });

  it('un override `undefined` no borra el texto del paquete', () => {
    const merged = mergeUiStrings(defaultStrings, { es: { 'edit.page': undefined } });
    expect(merged.es['edit.page']).toBe(defaultStrings.es['edit.page']);
  });

  it('el resultado sigue siendo completo', () => {
    const merged: Record<string, UiStrings> = mergeUiStrings(defaultStrings, {
      es: { 'notFound.title': 'Nada por aquí' },
    });
    expect(Object.keys(merged.es).sort()).toEqual([...uiKeys].sort());
  });
});
