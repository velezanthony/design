import { describe, expect, it } from 'vitest';
import {
  defaultStrings,
  localeNames,
  mergeUiStrings,
  siteStrings,
  translate,
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

  it('cubre los títulos de las alertas de GitHub y los textos de traducción ausente', () => {
    for (const key of [
      'admonition.important',
      'admonition.caution',
      'translation.badgeLabel',
      'translation.fallbackNotice',
    ] as const) {
      expect(uiKeys).toContain(key);
    }
  });

  it('cubre los textos de los organismos (barra lateral, aviso de cookies, pie)', () => {
    for (const key of ['sidebar.label', 'consent.label', 'consent.preferences'] as const) {
      expect(uiKeys).toContain(key);
    }
  });

  it('cada idioma incluido tiene nombre propio', () => {
    expect(localeNames).toEqual({ en: 'English', es: 'Español' });
  });
});

describe('translate', () => {
  const english = defaultStrings.en!;
  const strings = { ...english, 'edit.page': 'Edit {title} in {locale}' };

  it('devuelve el texto de la clave', () => {
    expect(translate(english, 'search.placeholder')).toBe(english['search.placeholder']);
  });

  it('interpola las variables', () => {
    expect(translate(strings, 'edit.page', { title: 'Install', locale: 'es' })).toBe(
      'Edit Install in es',
    );
  });

  it('una variable no pasada se deja tal cual', () => {
    expect(translate(strings, 'edit.page', { title: 'Install' })).toBe('Edit Install in {locale}');
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
    expect(merged.es?.['search.placeholder']).toBe('Buscar en Design');
    expect(merged.es?.['edit.page']).toBe(defaultStrings.es?.['edit.page']);
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
    expect(merged.es?.['edit.page']).toBe(defaultStrings.es?.['edit.page']);
  });

  it('el resultado sigue siendo completo', () => {
    const merged: Record<string, UiStrings> = mergeUiStrings(defaultStrings, {
      es: { 'edit.page': 'Editar aquí' },
    });
    expect(Object.keys(merged.es ?? {}).sort()).toEqual([...uiKeys].sort());
  });
});

describe('siteStrings', () => {
  it('solo los idiomas del sitio, con los textos del consumidor encima', () => {
    const strings = siteStrings({ es: { 'search.placeholder': 'Busca' } }, ['es']);
    expect(Object.keys(strings)).toEqual(['es']);
    expect(strings.es?.['search.placeholder']).toBe('Busca');
  });
});
