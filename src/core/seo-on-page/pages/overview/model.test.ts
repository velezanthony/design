import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoTree } from '../../tree/types';
import { EMPTY_FILTERS, serializeFilters } from '../../queries/url-filters';
import type { PanelLinks } from '../links';
import { overviewModel } from './model';

const links: PanelLinks = {
  pages: (filters = EMPTY_FILTERS, page, perPage) => {
    const query = serializeFilters(filters, page, perPage).toString();
    return query === '' ? '/t/' : `/t/?${query}`;
  },
  inspector: ({ slug, locale }) => `/i/?slug=${slug}&locale=${locale}`,
};

const issue = (kind: IssueKind, severity: IssueSeverity): Issue => ({
  kind,
  severity,
  slug: 'guide',
  locale: 'en',
  message: kind,
});

const tree = (): SeoTree => ({
  pages: [
    seoPage({ slug: 'a', issues: [issue(IssueKind.NO_H1, IssueSeverity.ERROR)] }),
    seoPage({
      slug: 'b',
      issues: [
        issue(IssueKind.NO_H1, IssueSeverity.ERROR),
        issue(IssueKind.TITLE_TOO_LONG, IssueSeverity.WARNING),
      ],
    }),
    seoPage({ slug: 'c', issues: [issue(IssueKind.DESCRIPTION_INHERITED, IssueSeverity.INFO)] }),
    seoPage({ slug: 'd' }),
  ],
});

describe('overviewModel', () => {
  it('separa páginas con problemas, solo informativas y sin nada', () => {
    expect(overviewModel(tree(), links).totals).toEqual({
      total: 4,
      withProblems: 2,
      informativeOnly: 1,
      clean: 1,
    });
  });

  it('la salud cuenta las páginas sin errores ni avisos (la informativa cuenta como sana)', () => {
    expect(overviewModel(tree(), links).health).toEqual({ healthy: 2, total: 4, percent: 50 });
  });

  it('lleva a la tabla de problemas (su vista por defecto) y a la de todo', () => {
    const { links: targets } = overviewModel(tree(), links);
    expect(targets.problems).toBe('/t/');
    expect(targets.all).toBe('/t/?severity=error&severity=warning&severity=info');
  });

  it('una fila por gravedad, en orden, con su recuento; solo enlaza la que tiene incidencias', () => {
    const { bySeverity } = overviewModel(tree(), links);
    expect(bySeverity.map((row) => [row.severity, row.count])).toEqual([
      ['error', 2],
      ['warning', 1],
      ['info', 1],
    ]);
    expect(bySeverity[0]!.href).toBe('/t/?severity=error');
    expect(overviewModel({ pages: [seoPage()] }, links).bySeverity.map((r) => r.href)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('una fila por tipo de problema, también los de cero (sin enlace)', () => {
    const { byKind } = overviewModel(tree(), links);
    expect(byKind.map((row) => row.kind)).toEqual(Object.values(IssueKind));
    const noH1 = byKind.find((row) => row.kind === 'no-h1')!;
    expect(noH1).toEqual({ kind: 'no-h1', count: 2, href: '/t/?kind=no-h1' });
    const none = byKind.find((row) => row.kind === 'title-too-short')!;
    expect(none).toEqual({ kind: 'title-too-short', count: 0, href: undefined });
  });

  it('resume los schemas: con, sin y los @type usados', () => {
    const withSchema = seoPage({
      slug: 'e',
      schemas: [{ schema: { '@type': 'Organization' }, source: 'site' }],
    });
    const { schemas } = overviewModel({ pages: [...tree().pages, withSchema] }, links);
    expect(schemas).toEqual({
      withSchemas: 1,
      withoutSchemas: 4,
      types: [{ type: 'Organization', pages: 1 }],
    });
  });
});
