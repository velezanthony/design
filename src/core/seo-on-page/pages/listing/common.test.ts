import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoPage } from '../../tree/types';
import { commonIssues } from './common';

const INHERITED = IssueKind.DESCRIPTION_INHERITED;

function issue(kind: IssueKind, extra: Partial<Issue> = {}): Issue {
  return {
    kind,
    severity: IssueSeverity.INFO,
    slug: 'x',
    locale: 'en',
    message: kind,
    ...extra,
  };
}

function entry(slug: string, locale: string, ...issues: Issue[]): SeoPage {
  return seoPage({ slug, locale, issues });
}

describe('commonIssues', () => {
  it('sin páginas no hay aviso común', () => {
    expect(commonIssues([])).toEqual([]);
  });

  it('un tipo que afecta a todas las páginas se declara común, con páginas y entradas', () => {
    const common = commonIssues([
      entry('a', 'en', issue(INHERITED)),
      entry('a', 'es', issue(INHERITED)),
      entry('b', 'en', issue(INHERITED)),
    ]);
    expect(common).toEqual([{ kind: INHERITED, severity: 'info', pages: 2, entries: 3 }]);
  });

  it('solo cuentan las gravedades que se están viendo: sin informativas, no hay aviso informativo', () => {
    const entries = [entry('a', 'en', issue(INHERITED)), entry('b', 'en', issue(INHERITED))];
    expect(
      commonIssues(entries, { severities: [IssueSeverity.ERROR, IssueSeverity.WARNING] }),
    ).toEqual([]);
  });

  it('un tipo en todas menos una página sigue en las filas', () => {
    const common = commonIssues([
      entry('a', 'en', issue(INHERITED)),
      entry('b', 'en', issue(INHERITED)),
      entry('c', 'en'),
    ]);
    expect(common).toEqual([]);
  });

  it('con una sola página no hay nada «común»: sería repetir su única fila', () => {
    expect(commonIssues([entry('a', 'en', issue(INHERITED))])).toEqual([]);
  });

  it('una página cuenta una vez aunque tenga el problema en varios idiomas', () => {
    const common = commonIssues([
      entry('a', 'en', issue(INHERITED)),
      entry('a', 'es', issue(INHERITED)),
      entry('b', 'en'),
    ]);
    expect(common).toEqual([]);
  });

  it('no declara común el tipo que el usuario pidió expresamente', () => {
    const entries = [entry('a', 'en', issue(INHERITED)), entry('b', 'en', issue(INHERITED))];
    expect(commonIssues(entries, { ignore: [INHERITED] })).toEqual([]);
  });

  it('la gravedad es la peor de las incidencias del tipo', () => {
    const common = commonIssues([
      entry('a', 'en', issue(INHERITED)),
      entry('b', 'en', issue(INHERITED, { severity: IssueSeverity.WARNING })),
    ]);
    expect(common[0]?.severity).toBe('warning');
  });

  it('el arreglo solo se da si es el mismo en todas', () => {
    const same = commonIssues([
      entry('a', 'en', issue(INHERITED, { fix: 'Pon `seo.description`.' })),
      entry('b', 'en', issue(INHERITED, { fix: 'Pon `seo.description`.' })),
    ]);
    expect(same[0]?.fix).toBe('Pon `seo.description`.');
    const different = commonIssues([
      entry('a', 'en', issue(INHERITED, { fix: 'En a.md' })),
      entry('b', 'en', issue(INHERITED, { fix: 'En b.md' })),
    ]);
    expect(different[0]).not.toHaveProperty('fix');
  });

  it('lista varios tipos comunes, el más grave primero', () => {
    const common = commonIssues([
      entry('a', 'en', issue(INHERITED), issue(IssueKind.NO_H1, { severity: 'error' })),
      entry('b', 'en', issue(INHERITED), issue(IssueKind.NO_H1, { severity: 'error' })),
    ]);
    expect(common.map(({ kind }) => kind)).toEqual([IssueKind.NO_H1, INHERITED]);
  });
});
