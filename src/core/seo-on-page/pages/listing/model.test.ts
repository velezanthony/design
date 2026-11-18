import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoTree } from '../../tree/types';
import { EMPTY_FILTERS, serializeFilters } from '../../queries/url-filters';
import type { PanelLinks } from '../links';
import { listingModel } from './model';

const links: PanelLinks = {
  pages: (filters = EMPTY_FILTERS, page, perPage) => {
    const query = serializeFilters(filters, page, perPage).toString();
    return query === '' ? '/t/' : `/t/?${query}`;
  },
  inspector: ({ slug, locale }) => `/i/?slug=${slug}&locale=${locale}`,
  overview: () => '/o/',
};

const issue = (severity: IssueSeverity, kind: IssueKind = IssueKind.NO_H1): Issue => ({
  kind,
  severity,
  slug: 'x',
  locale: 'en',
  message: kind,
});

/** 30 páginas con un aviso y una informativa y limpia: la vista por defecto oculta la limpia. */
const tree = (): SeoTree => ({
  pages: [
    ...Array.from({ length: 30 }, (_, index) =>
      seoPage({ slug: `p${String(index).padStart(2, '0')}`, issues: [issue(IssueSeverity.ERROR)] }),
    ),
    seoPage({ slug: 'info', issues: [issue(IssueSeverity.INFO, IssueKind.DESCRIPTION_INHERITED)] }),
  ],
});

const run = (query = '', locales = ['en', 'es']) =>
  listingModel({
    tree: tree(),
    params: new URLSearchParams(query),
    locales,
    defaultLocale: 'en',
    links,
  });

describe('listingModel', () => {
  it('sin filtros en la URL parte de error + aviso y avisa de que oculta lo informativo', () => {
    const model = run();
    expect(model.filters.severities).toEqual(['error', 'warning']);
    expect(model.defaulted).toBe(true);
    expect(model.showAllHref).toBe('/t/?severity=error&severity=warning&severity=info');
    expect(model.footer.count.total).toBe(30);
    expect(model.footer.count.overall).toBe(31);
  });

  it('con una gravedad en la URL manda lo escrito y no hay nada que mostrar aparte', () => {
    const model = run('severity=info');
    expect(model.defaulted).toBe(false);
    expect(model.showAllHref).toBeUndefined();
    expect(model.rows.map(({ slug }) => slug)).toEqual(['info']);
  });

  it('pagina: 25 por defecto, la segunda página trae el resto', () => {
    const first = run();
    expect(first.rows).toHaveLength(25);
    expect(first.perPage).toBe(25);
    expect(first.footer.pagination).toMatchObject({ page: 1, pages: 2 });
    expect(first.footer.count).toMatchObject({ from: 1, to: 25 });
    const second = run('page=2');
    expect(second.rows).toHaveLength(5);
    expect(second.footer.count).toMatchObject({ from: 26, to: 30 });
  });

  it('respeta el tamaño de página pedido y lo conserva en los enlaces', () => {
    const model = run('per=10');
    expect(model.rows).toHaveLength(10);
    expect(model.footer.pagination.pages).toBe(3);
    expect(model.footer.pagination.href(2)).toBe('/t/?page=2&per=10');
  });

  it('cada fila enlaza a su inspector', () => {
    expect(run().rows[0]).toMatchObject({ slug: 'p00', href: '/i/?slug=p00&locale=en' });
  });

  it('los enlaces de página llevan los filtros ESCRITOS: en la vista por defecto no añaden severity', () => {
    expect(run().footer.pagination.href(2)).toBe('/t/?page=2');
    expect(run('kind=no-h1').footer.pagination.href(2)).toBe('/t/?kind=no-h1&page=2');
    expect(run().footer.filters.severities).toEqual([]);
  });

  it('el formulario recibe los filtros efectivos, el tamaño, los idiomas y la ruta de la tabla', () => {
    const { form } = run('q=hola', ['en', 'fr']);
    expect(form).toEqual({
      filters: expect.objectContaining({ text: 'hola', severities: ['error', 'warning'] }),
      perPage: 25,
      locales: ['en', 'fr'],
      action: '/t/',
      kinds: expect.objectContaining({ summary: 'todos' }),
    });
  });

  it('acota una página pasada del final a la última', () => {
    expect(run('page=99').footer.pagination.page).toBe(2);
  });

  describe('una fila por página', () => {
    const entries = [
      seoPage({
        slug: 'a',
        locale: 'en',
        issues: [issue(IssueSeverity.WARNING, IssueKind.DUPLICATE_TITLE)],
      }),
      seoPage({
        slug: 'a',
        locale: 'es',
        issues: [issue(IssueSeverity.WARNING, IssueKind.DUPLICATE_TITLE)],
      }),
      seoPage({ slug: 'b', locale: 'en', issues: [issue(IssueSeverity.ERROR)] }),
      seoPage({ slug: 'c', locale: 'en' }),
    ];
    const group = (query = '') =>
      listingModel({
        tree: { pages: entries },
        params: new URLSearchParams(query),
        locales: ['en', 'es'],
        defaultLocale: 'en',
        links,
      });

    it('cuenta páginas (slugs), no entradas, en el recuento y en el total', () => {
      const { footer } = group();
      expect(footer.count).toMatchObject({ total: 2, overall: 3 });
    });

    it('ordena las filas de la peor gravedad a la mejor', () => {
      expect(group().rows.map(({ slug }) => slug)).toEqual(['b', 'a']);
    });

    it('un filtro de idioma elige páginas, pero la fila enseña todos sus idiomas', () => {
      const [row] = group('locale=es&severity=warning').rows;
      expect(row?.slug).toBe('a');
      expect(row?.locales.map(({ locale, present }) => [locale, present])).toEqual([
        ['en', true],
        ['es', true],
      ]);
    });

    it('pagina páginas, no entradas: 12 páginas en 2 idiomas con 10 por fila son 2 páginas', () => {
      const many = Array.from({ length: 12 }, (_, index) =>
        ['en', 'es'].map((locale) =>
          seoPage({
            slug: `p${index}`,
            locale,
            issues: [issue(IssueSeverity.WARNING, IssueKind.NO_H1)],
          }),
        ),
      ).flat();
      const { footer, rows } = listingModel({
        tree: { pages: many },
        params: new URLSearchParams('per=10'),
        locales: ['en', 'es'],
        defaultLocale: 'en',
        links,
      });
      expect(rows).toHaveLength(10);
      expect(footer.pagination.pages).toBe(2);
      expect(footer.count).toMatchObject({ total: 12, overall: 12 });
    });
  });

  describe('aviso común', () => {
    const everywhere = (kind: IssueKind, count: number): SeoTree => ({
      pages: Array.from({ length: count }, (_, index) =>
        seoPage({ slug: `p${index}`, issues: [issue(IssueSeverity.WARNING, kind)] }),
      ),
    });
    const common = (tree: SeoTree, query = '') =>
      listingModel({
        tree,
        params: new URLSearchParams(query),
        locales: ['en'],
        defaultLocale: 'en',
        links,
      });

    it('un tipo en todas las páginas filtradas sale una vez, no en las filas', () => {
      const model = common(everywhere(IssueKind.NO_H1, 3));
      expect(model.common.issues).toEqual([
        expect.objectContaining({ kind: IssueKind.NO_H1, pages: 3, entries: 3 }),
      ]);
      expect(model.rows.every((row) => row.issues.length === 0)).toBe(true);
    });

    it('lleva el enlace a la vista general, donde se explica cómo arreglarlo', () => {
      expect(common(everywhere(IssueKind.NO_H1, 2)).common.overviewHref).toBe('/o/');
    });

    it('en la vista por defecto (sin informativas) una informativa común no sale, ni en el aviso ni en las filas', () => {
      const tree: SeoTree = {
        pages: ['a', 'b'].map((slug) =>
          seoPage({
            slug,
            issues: [
              issue(IssueSeverity.WARNING, IssueKind.DUPLICATE_TITLE),
              issue(IssueSeverity.INFO, IssueKind.DESCRIPTION_INHERITED),
            ],
          }),
        ),
      };
      const model = common(tree);
      expect(model.common.issues.map((c) => c.kind)).toEqual([IssueKind.DUPLICATE_TITLE]);
      expect(model.rows.flatMap((row) => row.issues)).toEqual([]);
    });

    it('sin páginas no hay aviso', () => {
      expect(common({ pages: [] }).common.issues).toEqual([]);
    });

    it('se calcula sobre lo filtrado: un tipo no común en todo el sitio sí lo es en el filtro', () => {
      const tree: SeoTree = {
        pages: [
          seoPage({ slug: 'x1', issues: [issue(IssueSeverity.WARNING, IssueKind.NO_H1)] }),
          seoPage({ slug: 'x2', issues: [issue(IssueSeverity.WARNING, IssueKind.NO_H1)] }),
          seoPage({ slug: 'y1', issues: [issue(IssueSeverity.WARNING, IssueKind.HEADING_SKIP)] }),
        ],
      };
      expect(common(tree).common.issues).toEqual([]);
      expect(common(tree, 'q=x').common.issues).toEqual([
        expect.objectContaining({ kind: IssueKind.NO_H1, pages: 2 }),
      ]);
    });

    it('un tipo en todas las páginas menos una se queda en las filas', () => {
      const tree = everywhere(IssueKind.NO_H1, 3);
      tree.pages.push(
        seoPage({ slug: 'other', issues: [issue(IssueSeverity.WARNING, IssueKind.HEADING_SKIP)] }),
      );
      const model = common(tree);
      expect(model.common.issues).toEqual([]);
      expect(model.rows.every((row) => row.issues.length > 0)).toBe(true);
    });

    it('el tipo que el usuario filtró no se aparta: es justo lo que quiere ver', () => {
      const tree = everywhere(IssueKind.NO_H1, 3);
      // Otro tipo en el árbol: elegir solo `no-h1` es filtrar de verdad, no pedir «Todos».
      tree.pages[0]?.issues.push(issue(IssueSeverity.WARNING, IssueKind.HEADING_SKIP));
      const model = common(tree, 'kind=no-h1');
      expect(model.common.issues).toEqual([]);
      expect(
        model.rows.every((row) => row.issues.some(({ kind }) => kind === IssueKind.NO_H1)),
      ).toBe(true);
    });
  });

  describe('«Todos» en el tipo de problema', () => {
    const tree: SeoTree = {
      pages: [
        seoPage({ slug: 'a', issues: [issue(IssueSeverity.WARNING, IssueKind.NO_H1)] }),
        seoPage({ slug: 'b', issues: [issue(IssueSeverity.WARNING, IssueKind.HEADING_SKIP)] }),
      ],
    };
    const kinds = (query: string) =>
      listingModel({
        tree,
        params: new URLSearchParams(query),
        locales: ['en'],
        defaultLocale: 'en',
        links,
      });

    it('sin filtro de tipo está marcado «Todos»', () => {
      expect(kinds('').form.kinds.all.checked).toBe(true);
    });

    it('enviar el formulario con todos los tipos marcados es no filtrar por tipo', () => {
      const model = kinds('kind=no-h1&kind=heading-skip');
      expect(model.form.kinds.all.checked).toBe(true);
      expect(model.filters.kinds).toEqual([]);
      expect(model.defaulted).toBe(true);
      expect(model.footer.pagination.href(2)).toBe('/t/?page=2');
    });

    it('con un subconjunto sigue filtrando', () => {
      const model = kinds('kind=no-h1');
      expect(model.form.kinds.all.checked).toBe(false);
      expect(model.form.kinds.summary).toBe('1 de 2');
      expect(model.rows.map(({ slug }) => slug)).toEqual(['a']);
    });

    it('si el árbol no tiene incidencias, un tipo escrito a mano no se descarta', () => {
      const clean = listingModel({
        tree: { pages: [seoPage()] },
        params: new URLSearchParams('kind=no-h1'),
        locales: ['en'],
        defaultLocale: 'en',
        links,
      });
      expect(clean.filters.kinds).toEqual(['no-h1']);
    });
  });
});
