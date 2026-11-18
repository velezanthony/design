import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../testing/seo-page';
import { selectListing } from '../pages/listing/selection';
import { IssueKind, IssueSeverity, type Issue, type SeoTree } from '../tree/types';
import { filterScope, localeScope, pageScope, siteScope } from './scope';

const issue = (severity: IssueSeverity, kind: IssueKind = IssueKind.NO_H1): Issue => ({
  kind,
  severity,
  slug: 'x',
  locale: 'en',
  message: kind,
});

const tree: SeoTree = {
  pages: [
    seoPage({ slug: '', locale: 'en' }),
    seoPage({ slug: 'a', locale: 'en', issues: [issue(IssueSeverity.ERROR)] }),
    seoPage({ slug: 'a', locale: 'es' }),
    seoPage({
      slug: 'b',
      locale: 'es',
      issues: [issue(IssueSeverity.INFO, IssueKind.DESCRIPTION_INHERITED)],
    }),
  ],
};

const ids = (entries: { slug: string; locale: string }[]) =>
  entries.map((entry) => `${entry.slug || '/'}:${entry.locale}`);

describe('pageScope', () => {
  it('son todos los idiomas de la página, y es de una sola página', () => {
    const scope = pageScope(tree, 'a');
    expect(ids(scope.entries)).toEqual(['a:en', 'a:es']);
    expect(scope.single).toBe(true);
    expect(scope.id).toBe('page:a');
  });

  it('la portada se nombra «/»', () => {
    expect(pageScope(tree, '').title).toBe('`/`');
  });

  it('una página que no existe no tiene entradas', () => {
    expect(pageScope(tree, 'zzz').entries).toEqual([]);
  });
});

describe('localeScope', () => {
  it('son las entradas de ese idioma en todo el sitio', () => {
    const scope = localeScope(tree, 'es');
    expect(ids(scope.entries)).toEqual(['a:es', 'b:es']);
    expect(scope.single).toBe(false);
    expect(scope.id).toBe('locale:es');
    expect(scope.title).toBe('solo `es`');
  });
});

describe('siteScope', () => {
  it('son todas las entradas, sin filtrar nada', () => {
    const scope = siteScope(tree);
    expect(scope.entries).toHaveLength(4);
    expect(scope.severities).toBeUndefined();
  });
});

describe('filterScope', () => {
  const scope = (query: string) =>
    filterScope(selectListing(tree, new URLSearchParams(query)), 'lo que sea');

  it('es lo que enseña la tabla: las páginas que cumplen, con todos sus idiomas', () => {
    const result = scope('');
    expect(ids(result.entries)).toEqual(['a:en', 'a:es']);
    expect(result.severities).toEqual(['error', 'warning']);
    expect(result.id).toBe('filter');
    expect(result.label).toBe('lo que sea');
  });

  it('en «Por idioma» son solo las entradas que cumplen', () => {
    expect(ids(scope('view=locale').entries)).toEqual(['a:en']);
  });

  it('un filtro por tipo limita también los problemas del informe', () => {
    expect(scope('kind=no-h1').kinds).toEqual(['no-h1']);
    expect(scope('').kinds).toBeUndefined();
  });

  it('con `lacks` recuerda la columna', () => {
    const result = scope('view=have&lacks=desc');
    expect(result.lacks).toBe('desc');
    expect(ids(result.entries)).toEqual(['/:en', 'a:en', 'a:es', 'b:es']);
  });

  it('`lacks` sin vista «Qué tiene» se descarta, como en la tabla', () => {
    expect(scope('lacks=desc').lacks).toBeUndefined();
  });
});
