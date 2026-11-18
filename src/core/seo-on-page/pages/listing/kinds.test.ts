import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoPage } from '../../tree/types';
import { kindOptions, kindsWithIssues } from './kinds';

function issue(kind: IssueKind): Issue {
  return {
    kind,
    severity: IssueSeverity.WARNING,
    slug: 'x',
    locale: 'en',
    message: kind,
  };
}
function entry(slug: string, locale: string, ...kinds: IssueKind[]): SeoPage {
  return seoPage({ slug, locale, issues: kinds.map(issue) });
}

const { DUPLICATE_TITLE, NO_H1, TITLE_TOO_SHORT } = IssueKind;

describe('kindsWithIssues', () => {
  it('son los tipos que aparecen en alguna entrada del árbol', () => {
    const tree = { pages: [entry('a', 'en', NO_H1), entry('b', 'en', DUPLICATE_TITLE, NO_H1)] };
    expect(new Set(kindsWithIssues(tree))).toEqual(new Set([NO_H1, DUPLICATE_TITLE]));
  });

  it('sin incidencias no hay ninguno', () => {
    expect(kindsWithIssues({ pages: [entry('a', 'en')] })).toEqual([]);
  });
});

describe('kindOptions', () => {
  const tree = {
    pages: [
      entry('a', 'en', NO_H1, DUPLICATE_TITLE),
      entry('a', 'es', NO_H1),
      entry('b', 'en', DUPLICATE_TITLE),
      entry('c', 'en', TITLE_TOO_SHORT),
    ],
  };

  it('cuenta PÁGINAS por tipo, no entradas, y ordena de más a menos páginas (en empate, el orden del catálogo)', () => {
    const { withIssues } = kindOptions(tree, []);
    expect(withIssues.map(({ kind, count }) => [kind, count])).toEqual([
      [DUPLICATE_TITLE, 2],
      [TITLE_TOO_SHORT, 1],
      [NO_H1, 1],
    ]);
  });

  it('los tipos sin incidencias van aparte, sin contador', () => {
    const { without } = kindOptions(tree, []);
    expect(without).toHaveLength(Object.values(IssueKind).length - 3);
    expect(without).not.toContain(NO_H1);
  });

  it('sin filtro de tipo «Todos» está marcado y todos los tipos también', () => {
    const options = kindOptions(tree, []);
    expect(options.all).toEqual({ checked: true, count: 3 });
    expect(options.withIssues.every(({ checked }) => checked)).toBe(true);
  });

  it('con un filtro solo se marcan los elegidos y «Todos» no', () => {
    const options = kindOptions(tree, [NO_H1]);
    expect(options.all.checked).toBe(false);
    expect(options.withIssues.filter(({ checked }) => checked).map(({ kind }) => kind)).toEqual([
      NO_H1,
    ]);
  });
});
