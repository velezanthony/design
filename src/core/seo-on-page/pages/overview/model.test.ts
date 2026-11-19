import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoPage, type SeoTree } from '../../tree/types';
import { EMPTY_FILTERS, serializeFilters } from '../../queries/url-filters';
import type { PanelLinks } from '../links';
import type { SiteFile } from '../../site-files';
import { overviewModel } from './model';

const links: PanelLinks = {
  pages: (filters = EMPTY_FILTERS, page, perPage, view) => {
    const query = serializeFilters(filters, page, perPage, view).toString();
    return query === '' ? '/t/' : `/t/?${query}`;
  },
  inspector: ({ slug, locale }) => `/i/?slug=${slug}&locale=${locale}`,
  overview: () => '/o/',
};

function issue(kind: IssueKind, severity: IssueSeverity): Issue {
  return {
    kind,
    severity,
    slug: 'guide',
    locale: 'en',
    message: kind,
  };
}

function tree(): SeoTree {
  return {
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
  };
}

function sitemap(urls: number): SiteFile {
  return {
    id: 'sitemap',
    path: '/sitemap.xml',
    state: 'generated',
    href: '/sitemap.xml',
    urls,
  };
}
function build(pages = tree().pages, files: SiteFile[] = [sitemap(pages.length)]) {
  return overviewModel(
    { pages },
    { locales: ['en', 'es'], defaultLocale: 'en', links, siteFiles: files },
  );
}

describe('overviewModel', () => {
  it('la salud cuenta las páginas sin errores ni avisos (la informativa cuenta como sana)', () => {
    expect(build().kpis.health).toEqual({ healthy: 2, total: 4, percent: 50 });
  });

  it('cuenta páginas (slugs) y entradas (página + idioma) por separado', () => {
    const pages = [
      seoPage({ slug: 'a' }),
      seoPage({ slug: 'a', locale: 'es' }),
      seoPage({ slug: 'b' }),
    ];
    expect(build(pages).kpis.pages).toEqual({ pages: 2, entries: 3 });
  });

  it('una entrada por idioma de la config, también el que no tiene ninguna', () => {
    const pages = [seoPage({ slug: 'a' }), seoPage({ slug: 'b' })];
    expect(build(pages).kpis.locales).toEqual([
      { locale: 'en', entries: 2 },
      { locale: 'es', entries: 0 },
    ]);
  });

  describe('con problemas', () => {
    it('cuenta páginas con error, páginas con aviso y las entradas con error o aviso', () => {
      const pages = [
        seoPage({ slug: 'a', issues: [issue(IssueKind.NO_H1, IssueSeverity.ERROR)] }),
        seoPage({ slug: 'b', issues: [issue(IssueKind.TITLE_TOO_LONG, IssueSeverity.WARNING)] }),
        seoPage({
          slug: 'b',
          locale: 'es',
          issues: [issue(IssueKind.TITLE_TOO_LONG, IssueSeverity.WARNING)],
        }),
        seoPage({
          slug: 'c',
          issues: [issue(IssueKind.DESCRIPTION_INHERITED, IssueSeverity.INFO)],
        }),
      ];
      expect(build(pages).kpis.problems).toMatchObject({
        pages: 2,
        errors: 1,
        warnings: 1,
        entries: 3,
      });
    });

    it('enlaza a la tabla de problemas; sin problemas no hay enlace', () => {
      expect(build().kpis.problems.href).toBe('/t/');
      expect(build([seoPage()]).kpis.problems.href).toBeUndefined();
    });
  });

  describe('informativas', () => {
    it('cuenta páginas y entradas con incidencias informativas y los tipos que son', () => {
      const pages = [
        seoPage({
          slug: 'a',
          issues: [issue(IssueKind.DESCRIPTION_INHERITED, IssueSeverity.INFO)],
        }),
        seoPage({
          slug: 'a',
          locale: 'es',
          issues: [issue(IssueKind.DESCRIPTION_INHERITED, IssueSeverity.INFO)],
        }),
        seoPage({ slug: 'b' }),
      ];
      expect(build(pages).kpis.info).toMatchObject({
        pages: 1,
        entries: 2,
        kinds: ['description-inherited'],
        href: '/t/?severity=info',
      });
    });

    it('sin informativas no hay enlace', () => {
      expect(build([seoPage()]).kpis.info.href).toBeUndefined();
    });
  });

  it('«qué arreglar» enlaza cada tipo a la tabla filtrada por él', () => {
    const [first] = build().priorities;
    expect(first).toMatchObject({ kind: 'no-h1', href: '/t/?kind=no-h1' });
  });

  it('los enlaces de pie: las páginas con problemas y todas (informativas incluidas)', () => {
    const { footer } = build();
    expect(footer).toEqual({
      problems: { pages: 2, href: '/t/' },
      all: '/t/?severity=error&severity=warning&severity=info',
    });
    expect(build([seoPage()]).footer.problems).toBeUndefined();
  });

  describe('tipos de problema', () => {
    it('lista los que tienen incidencias, con su certeza y enlace, y aparte los que no', () => {
      const { kinds } = build();
      expect(kinds.rows.map((row) => [row.kind, row.pages, row.certainty])).toEqual([
        ['no-h1', 2, 'rule'],
        ['title-too-long', 1, 'heuristic'],
        ['description-inherited', 1, 'rule'],
      ]);
      expect(kinds.rows[0]!.href).toBe('/t/?kind=no-h1');
      expect(kinds.clean).toHaveLength(Object.values(IssueKind).length - 3);
      expect(kinds.clean).not.toContain('no-h1');
    });
  });

  it('la cobertura enlaza a la vista matriz', () => {
    expect(build().coverage?.href).toBe('/t/?view=matrix');
  });

  it('con un solo idioma no hay tarjeta de cobertura', () => {
    const model = overviewModel(
      { pages: [seoPage()] },
      { locales: ['en'], defaultLocale: 'en', links, siteFiles: [sitemap(1)] },
    );
    expect(model.coverage).toBeUndefined();
  });

  describe('indexación', () => {
    it('las URLs del sitemap son las que informa el archivo', () => {
      const pages = [seoPage({ slug: 'a' }), seoPage({ slug: 'b' })];
      expect(build(pages, [sitemap(2)]).indexing.sitemapUrls).toBe(2);
    });

    it('cuenta los idiomas servidos de respaldo desde la matriz', () => {
      const fallback: SeoPage = seoPage({
        slug: 'a',
        locales: [
          { locale: 'en', status: 'present', url: '/a/' },
          { locale: 'es', status: 'missing', policy: 'fallback', declared: false },
        ],
      });
      expect(build([fallback]).indexing.reasons.fallback).toBe(1);
    });
  });

  it('pasa los archivos del sitio tal cual', () => {
    const files = [sitemap(2)];
    expect(build(undefined, files).files).toBe(files);
  });

  it('resume los schemas por página con su alcance', () => {
    const withSchema = seoPage({
      slug: 'e',
      schemas: [{ schema: { '@type': 'Organization' }, source: 'site' }],
    });
    const { schemas } = build([...tree().pages, withSchema]);
    expect(schemas).toEqual({
      withSchemas: 1,
      withoutSchemas: 4,
      types: [{ type: 'Organization', pages: 1, scope: 'pages' }],
    });
  });
});
