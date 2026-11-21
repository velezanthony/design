import { describe, expect, it } from 'vitest';
import { resolveIndexes } from '../config/indexes';
import { contentFolders, generatedDescription, generatedTitle } from './generated-listings';

describe('contentFolders', () => {
  it('cada carpeta de la que cuelga alguna página, también las intermedias', () => {
    expect(contentFolders(['', 'guia', 'tutoriales/instalacion', 'a/b/c'])).toEqual([
      'tutoriales',
      'a',
      'a/b',
    ]);
  });
});

describe('generatedTitle y generatedDescription', () => {
  const nav = [
    { label: { es: 'Guía', en: 'Guide' }, dir: 'guia' },
    { label: 'Sin carpeta', sidebar: ['x'] },
  ];

  it('el título de la carpeta en `overrides` va primero, en el idioma pedido', () => {
    const indexes = resolveIndexes({
      overrides: { guia: { title: { es: 'Manual', en: 'Manual EN' } } },
    });
    expect(
      generatedTitle({
        folder: 'guia',
        locale: 'en',
        defaultLocale: 'es',
        indexes: indexes,
        nav: nav,
      }),
    ).toBe('Manual EN');
  });

  it('sin él, la etiqueta de la sección de `nav` con ese `dir`', () => {
    expect(
      generatedTitle({
        folder: 'guia',
        locale: 'en',
        defaultLocale: 'es',
        indexes: resolveIndexes({}),
        nav: nav,
      }),
    ).toBe('Guide');
  });

  it('sin sección, el nombre de la carpeta legible', () => {
    expect(
      generatedTitle({
        folder: 'notas-de-version',
        locale: 'es',
        defaultLocale: 'es',
        indexes: resolveIndexes({}),
        nav: nav,
      }),
    ).toBe('Notas de version');
    expect(
      generatedTitle({
        folder: 'a/mis_notas',
        locale: 'es',
        defaultLocale: 'es',
        indexes: resolveIndexes({}),
        nav: undefined,
      }),
    ).toBe('Mis notas');
  });

  it('la descripción solo sale de `overrides`', () => {
    const indexes = resolveIndexes({
      overrides: { guia: { description: { es: 'Todo.', en: 'All.' } } },
    });
    expect(generatedDescription('guia', 'en', 'es', indexes)).toBe('All.');
    expect(generatedDescription('otra', 'en', 'es', indexes)).toBeUndefined();
  });
});
