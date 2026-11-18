import { describe, expect, it } from 'vitest';
import { IssueKind, type Issue, type SeoPage, type SeoTree } from '../tree/types';
import { summarize } from './summary';

const issue = (kind: Issue['kind'], severity: Issue['severity']): Issue => ({
  kind,
  severity,
  slug: 'x',
  locale: 'en',
  message: '',
});
const page = (issues: Issue[], types: (string | string[])[] = []): SeoPage =>
  ({
    issues,
    schemas: types.map((type) => ({
      schema: { '@context': 'https://schema.org', '@type': type },
      source: 'site' as const,
    })),
  }) as unknown as SeoPage;

describe('summarize', () => {
  it('árbol vacío: todo a cero y con todas las claves', () => {
    const summary = summarize({ pages: [] });
    expect(summary.total).toBe(0);
    expect(Object.keys(summary.byKind).sort()).toEqual(Object.values(IssueKind).sort());
    expect(Object.values(summary.byKind).every((n) => n === 0)).toBe(true);
  });

  it('cuenta incidencias por tipo', () => {
    const tree: SeoTree = {
      pages: [
        page([issue('no-h1', 'error'), issue('title-too-long', 'warning')]),
        page([issue('title-too-long', 'warning')]),
        page([]),
      ],
    };
    const summary = summarize(tree);
    expect(summary.total).toBe(3);
    expect(summary.byKind['title-too-long']).toBe(2);
    expect(summary.byKind['no-h1']).toBe(1);
  });
});

describe('summarize: JSON-LD', () => {
  /** Una entrada con su slug e idioma: los schemas se cuentan por página, no por idioma. */
  const withSchemas = (slug: string, types: (string | string[])[], locale = 'en'): SeoPage =>
    ({ ...page([], types), slug, locale }) as SeoPage;

  it('árbol vacío: ninguna página con ni sin schemas', () => {
    expect(summarize({ pages: [] }).schemas).toEqual({
      withSchemas: 0,
      withoutSchemas: 0,
      types: [],
    });
  });

  it('cuenta páginas con y sin schemas y los @type usados, con las páginas de cada uno', () => {
    const tree: SeoTree = {
      pages: [
        withSchemas('a', ['Organization', ['Person', 'Thing']]),
        withSchemas('b', ['Organization']),
        withSchemas('c', []),
      ],
    };
    expect(summarize(tree).schemas).toMatchObject({
      withSchemas: 2,
      withoutSchemas: 1,
      types: [
        { type: 'Organization', pages: 2 },
        { type: 'Person', pages: 1 },
        { type: 'Thing', pages: 1 },
      ],
    });
  });

  it('una página con dos schemas del mismo @type cuenta una vez ese tipo', () => {
    const tree: SeoTree = { pages: [withSchemas('a', ['Thing', 'Thing'])] };
    expect(summarize(tree).schemas.types).toMatchObject([{ type: 'Thing', pages: 1 }]);
  });

  it('cuenta páginas, no idiomas: la misma página en dos idiomas es una', () => {
    const tree: SeoTree = {
      pages: [
        withSchemas('a', ['Article'], 'en'),
        withSchemas('a', ['Article'], 'es'),
        withSchemas('b', [], 'en'),
        withSchemas('b', [], 'es'),
      ],
    };
    expect(summarize(tree).schemas).toEqual({
      withSchemas: 1,
      withoutSchemas: 1,
      types: [{ type: 'Article', pages: 1, scope: 'pages' }],
    });
  });

  describe('alcance', () => {
    const scopes = (tree: SeoTree) =>
      Object.fromEntries(summarize(tree).schemas.types.map(({ type, scope }) => [type, scope]));

    it('en todas las páginas: todo el sitio', () => {
      const tree: SeoTree = {
        pages: [withSchemas('', ['Code']), withSchemas('a', ['Code']), withSchemas('b', ['Code'])],
      };
      expect(scopes(tree)).toEqual({ Code: 'site' });
    });

    it('solo en la portada (slug vacío): portada', () => {
      const tree: SeoTree = {
        pages: [withSchemas('', ['WebSite']), withSchemas('a', []), withSchemas('b', [])],
      };
      expect(scopes(tree)).toEqual({ WebSite: 'home' });
    });

    it('en algunas páginas: ni sitio ni portada', () => {
      const tree: SeoTree = {
        pages: [withSchemas('a', ['Article']), withSchemas('b', ['Article']), withSchemas('c', [])],
      };
      expect(scopes(tree)).toEqual({ Article: 'pages' });
    });

    it('una sola página en un solo sitio con una sola página: todo el sitio', () => {
      expect(scopes({ pages: [withSchemas('', ['WebSite'])] })).toEqual({ WebSite: 'site' });
    });
  });

  describe('salud', () => {
    const entry = (slug: string, issues: Issue[], locale = 'en'): SeoPage =>
      ({ ...page(issues), slug, locale }) as SeoPage;

    it('cuenta páginas sin errores ni avisos; las informativas no restan', () => {
      const tree: SeoTree = {
        pages: [
          entry('a', [issue('description-inherited', 'info')]),
          entry('b', [issue('no-h1', 'error'), issue('title-too-long', 'warning')]),
          entry('c', [issue('title-too-long', 'warning')]),
          entry('d', []),
        ],
      };
      expect(summarize(tree).health).toEqual({ healthy: 2, total: 4, percent: 50 });
    });

    it('una página con varias incidencias resta una sola vez', () => {
      const tree: SeoTree = {
        pages: [
          entry('a', [issue('no-h1', 'error'), issue('title-too-long', 'warning')]),
          entry('b', []),
        ],
      };
      expect(summarize(tree).health).toMatchObject({ healthy: 1, total: 2 });
    });

    it('cuenta páginas, no idiomas: basta un aviso en un idioma para que la página reste', () => {
      const tree: SeoTree = {
        pages: [
          entry('guia', [], 'en'),
          entry('guia', [issue('title-too-long', 'warning')], 'es'),
          entry('api', [issue('description-inherited', 'info')], 'en'),
          entry('api', [], 'es'),
        ],
      };
      expect(summarize(tree).health).toEqual({ healthy: 1, total: 2, percent: 50 });
    });

    it('el porcentaje se redondea al entero más cercano', () => {
      const pages = [
        ...Array.from({ length: 35 }, (_, i) => entry(`ok-${i}`, [])),
        ...Array.from({ length: 3 }, (_, i) => entry(`mal-${i}`, [issue('no-h1', 'error')])),
      ];
      expect(summarize({ pages }).health).toEqual({ healthy: 35, total: 38, percent: 92 });
    });

    it('sin páginas no hay nada roto: 100 %', () => {
      expect(summarize({ pages: [] }).health).toEqual({ healthy: 0, total: 0, percent: 100 });
    });
  });
});
