import { describe, expect, it } from 'vitest';
import { findEntry, pageKey, schemaTypes, slugLabel, slugsOf } from './keys';

describe('pageKey', () => {
  it('una página en un idioma; el mismo slug en otro idioma es otra clave', () => {
    expect(pageKey({ slug: 'a', locale: 'en' })).toBe(pageKey({ slug: 'a', locale: 'en' }));
    expect(pageKey({ slug: 'a', locale: 'en' })).not.toBe(pageKey({ slug: 'a', locale: 'es' }));
  });

  it('no se confunde aunque el slug contenga el idioma', () => {
    expect(pageKey({ slug: 'a-en', locale: 'es' })).not.toBe(
      pageKey({ slug: 'a', locale: 'en-es' }),
    );
  });
});

describe('slugsOf', () => {
  it('las páginas distintas, sin contar dos veces sus idiomas', () => {
    const entries = [
      { slug: 'a', locale: 'en' },
      { slug: 'a', locale: 'es' },
      { slug: 'b', locale: 'en' },
    ];
    expect([...slugsOf(entries)]).toEqual(['a', 'b']);
  });
});

describe('schemaTypes', () => {
  it('los @type de unos schemas, sin repetir; un @type puede ser una lista', () => {
    const schemas = [
      { schema: { '@type': 'Person' }, source: 'page' as const },
      { schema: { '@type': ['WebSite', 'Person'] }, source: 'site' as const },
    ];
    expect(schemaTypes(schemas)).toEqual(['Person', 'WebSite']);
  });
});

describe('slugLabel', () => {
  it('la portada, que no tiene slug, se llama «/»', () => {
    expect(slugLabel('')).toBe('/');
    expect(slugLabel('guide/intro')).toBe('guide/intro');
  });
});

describe('findEntry', () => {
  const pages = [
    { slug: 'a', locale: 'en' },
    { slug: 'a', locale: 'es' },
  ];

  it('busca la página por slug e idioma', () => {
    expect(findEntry(pages, 'a', 'es')).toBe(pages[1]);
  });

  it('sin esa combinación no hay entrada', () => {
    expect(findEntry(pages, 'b', 'en')).toBeUndefined();
  });
});
