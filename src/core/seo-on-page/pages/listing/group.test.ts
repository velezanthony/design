import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity } from '../../tree/types';
import { groupBySlug, mainEntry, ownIssues } from './group';

function entry(slug: string, locale: string) {
  return seoPage({ slug, locale });
}
function issue(kind: IssueKind, severity: IssueSeverity) {
  return {
    kind,
    severity,
    slug: 'a',
    locale: 'en',
    message: '',
  };
}

describe('groupBySlug', () => {
  it('junta los idiomas de cada página, en el orden en que llegan', () => {
    const groups = groupBySlug([entry('a', 'en'), entry('b', 'en'), entry('a', 'es')]);
    expect([...groups].map(([slug, group]) => [slug, group.map(({ locale }) => locale)])).toEqual([
      ['a', ['en', 'es']],
      ['b', ['en']],
    ]);
  });
});

describe('mainEntry', () => {
  it('la del idioma por defecto', () => {
    expect(mainEntry([entry('a', 'es'), entry('a', 'en')], ['en', 'es'], 'en')?.locale).toBe('en');
  });

  it('sin ella, la del primer idioma de la config que la tenga', () => {
    expect(mainEntry([entry('a', 'fr'), entry('a', 'es')], ['en', 'es', 'fr'], 'en')?.locale).toBe(
      'es',
    );
  });
});

describe('ownIssues', () => {
  const page = seoPage({
    issues: [
      issue(IssueKind.NO_H1, IssueSeverity.ERROR),
      issue(IssueKind.DESCRIPTION_INHERITED, IssueSeverity.INFO),
      issue(IssueKind.TITLE_TOO_LONG, IssueSeverity.WARNING),
    ],
  });

  it('sin los tipos comunes a todas las páginas', () => {
    const kinds = ownIssues(page, [IssueKind.DESCRIPTION_INHERITED]).map(({ kind }) => kind);
    expect(kinds).toEqual([IssueKind.NO_H1, IssueKind.TITLE_TOO_LONG]);
  });

  it('y solo de las gravedades visibles, si se piden', () => {
    const kinds = ownIssues(page, [], [IssueSeverity.ERROR]).map(({ kind }) => kind);
    expect(kinds).toEqual([IssueKind.NO_H1]);
  });
});
