import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue } from '../../tree/types';
import { severityCounts } from './severities';

const issue = (severity: IssueSeverity, kind: IssueKind = IssueKind.NO_H1): Issue => ({
  kind,
  severity,
  slug: 'x',
  locale: 'en',
  message: kind,
});

describe('severityCounts', () => {
  const pages = [
    seoPage({
      slug: 'a',
      locale: 'en',
      issues: [issue('warning'), issue('warning', IssueKind.DUPLICATE_TITLE)],
    }),
    seoPage({ slug: 'a', locale: 'es', issues: [issue('warning'), issue('info')] }),
    seoPage({ slug: 'b', locale: 'en', issues: [issue('info')] }),
    seoPage({ slug: 'c', locale: 'en' }),
  ];

  it('cuenta PÁGINAS (slugs) con alguna incidencia de cada gravedad: una por página aunque se repita', () => {
    expect(severityCounts(pages).error.pages).toBe(0);
    expect(severityCounts(pages).warning.pages).toBe(1);
    expect(severityCounts(pages).info.pages).toBe(2);
  });

  it('cuenta ENTRADAS (página + idioma) con alguna incidencia de cada gravedad', () => {
    expect(severityCounts(pages).warning.entries).toBe(2);
    expect(severityCounts(pages).info.entries).toBe(2);
  });

  it('un árbol sin incidencias da ceros', () => {
    expect(severityCounts([seoPage()]).warning).toEqual({ pages: 0, entries: 0 });
  });
});
