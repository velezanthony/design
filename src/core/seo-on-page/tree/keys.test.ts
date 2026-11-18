import { describe, expect, it } from 'vitest';
import { pageKey, schemaTypes, slugsOf } from './keys';

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
