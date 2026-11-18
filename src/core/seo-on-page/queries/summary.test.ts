import { describe, expect, it } from 'vitest';
import { IssueKind, IssueSeverity, type Issue, type SeoPage, type SeoTree } from '../tree/types';
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
    expect(summary).toMatchObject({ total: 0, withProblems: 0, informativeOnly: 0, clean: 0 });
    expect(Object.keys(summary.byKind).sort()).toEqual(Object.values(IssueKind).sort());
    expect(Object.keys(summary.bySeverity).sort()).toEqual(Object.values(IssueSeverity).sort());
    expect(Object.values(summary.byKind).every((n) => n === 0)).toBe(true);
  });

  it('cuenta incidencias por tipo y gravedad', () => {
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
    expect(summary.bySeverity).toEqual({ error: 1, warning: 2, info: 0 });
  });

  it('separa problemas (error o aviso), solo informativas y limpias', () => {
    const tree: SeoTree = {
      pages: [
        page([issue('description-inherited', 'info'), issue('title-too-long', 'warning')]),
        page([issue('no-h1', 'error')]),
        page([issue('description-inherited', 'info')]),
        page([issue('description-too-short', 'info'), issue('translation-missing', 'info')]),
        page([]),
      ],
    };
    expect(summarize(tree)).toMatchObject({
      total: 5,
      withProblems: 2,
      informativeOnly: 2,
      clean: 1,
    });
  });
});

describe('summarize: JSON-LD', () => {
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
        page([], ['Organization', ['Person', 'Thing']]),
        page([], ['Organization']),
        page([]),
      ],
    };
    expect(summarize(tree).schemas).toEqual({
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
    const tree: SeoTree = { pages: [page([], ['Thing', 'Thing'])] };
    expect(summarize(tree).schemas.types).toEqual([{ type: 'Thing', pages: 1 }]);
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
