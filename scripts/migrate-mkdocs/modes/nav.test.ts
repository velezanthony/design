import { describe, expect, it } from 'vitest';
import { navToSidebar, type NavEntry } from './nav.ts';

describe('navToSidebar', () => {
  const translations = { Guide: 'Guía' };

  it('convierte páginas en slugs: la portada es `index` y `x/index` colapsa a `x`', () => {
    const nav: NavEntry[] = [
      { Home: 'index.md' },
      { Overview: 'contributors/index.md' },
      { A: 'users/a.md' },
    ];
    expect(navToSidebar(nav, translations)).toEqual(['index', 'contributors', 'users/a']);
  });

  it('convierte las secciones en grupos con la etiqueta por idioma', () => {
    const nav: NavEntry[] = [{ Guide: [{ A: 'g/a.md' }, { Deep: [{ B: 'g/b.md' }] }] }];
    expect(navToSidebar(nav, translations)).toEqual([
      {
        label: { en: 'Guide', es: 'Guía' },
        items: ['g/a', { label: { en: 'Deep', es: 'Deep' }, items: ['g/b'] }],
      },
    ]);
  });

  it('acepta rutas sueltas sin título', () => {
    expect(navToSidebar(['a.md'], {})).toEqual(['a']);
  });
});
