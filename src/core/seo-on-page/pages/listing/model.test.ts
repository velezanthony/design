import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoTree } from '../../tree/types';
import { EMPTY_FILTERS, serializeFilters } from '../../queries/url-filters';
import type { PanelLinks } from '../links';
import { listingModel, type ListingModel } from './model';

const links: PanelLinks = {
  pages: (filters = EMPTY_FILTERS, page, perPage, view) => {
    const query = serializeFilters(filters, page, perPage, view).toString();
    return query === '' ? '/t/' : `/t/?${query}`;
  },
  inspector: ({ slug, locale }) => `/i/?slug=${slug}&locale=${locale}`,
  overview: () => '/o/',
};

function issue(severity: IssueSeverity, kind: IssueKind = IssueKind.NO_H1): Issue {
  return {
    kind,
    severity,
    slug: 'x',
    locale: 'en',
    message: kind,
  };
}

/** 30 páginas con un aviso y una informativa y limpia: la vista por defecto oculta la limpia. */
function tree(): SeoTree {
  return {
    pages: [
      ...Array.from({ length: 30 }, (_, index) =>
        seoPage({
          slug: `p${String(index).padStart(2, '0')}`,
          issues: [issue(IssueSeverity.ERROR)],
        }),
      ),
      seoPage({
        slug: 'info',
        issues: [issue(IssueSeverity.INFO, IssueKind.DESCRIPTION_INHERITED)],
      }),
    ],
  };
}

/** Las filas de la vista por página, que es la de por defecto y la que casi todo mira. */
function rowsOf(model: ListingModel) {
  if (model.table.view !== 'page')
    throw new Error(`se esperaba la vista por página, no ${model.table.view}`);
  return model.table.rows;
}

function run(query = '', locales = ['en', 'es']) {
  return listingModel({
    tree: tree(),
    params: new URLSearchParams(query),
    locales,
    defaultLocale: 'en',
    links,
  });
}

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
    expect(rowsOf(model).map(({ slug }) => slug)).toEqual(['info']);
  });

  it('pagina: 25 por defecto, la segunda página trae el resto', () => {
    const first = run();
    expect(rowsOf(first)).toHaveLength(25);
    expect(first.perPage).toBe(25);
    expect(first.footer.pagination).toMatchObject({ page: 1, pages: 2 });
    expect(first.footer.count).toMatchObject({ from: 1, to: 25 });
    const second = run('page=2');
    expect(rowsOf(second)).toHaveLength(5);
    expect(second.footer.count).toMatchObject({ from: 26, to: 30 });
  });

  it('respeta el tamaño de página pedido y lo conserva en los enlaces', () => {
    const model = run('per=10');
    expect(rowsOf(model)).toHaveLength(10);
    expect(model.footer.pagination.pages).toBe(3);
    expect(model.footer.pagination.href(2)).toBe('/t/?page=2&per=10');
  });

  it('cada fila enlaza a su inspector', () => {
    expect(rowsOf(run())[0]).toMatchObject({ slug: 'p00', href: '/i/?slug=p00&locale=en' });
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
      kinds: expect.objectContaining({ all: expect.objectContaining({ checked: true }) }),
      view: { view: 'page' },
      clear: '/t/',
      severityCounts: { error: 30, warning: 0, info: 1 },
    });
  });

  it('acota una página pasada del final a la última', () => {
    expect(run('page=99').footer.pagination.page).toBe(2);
  });

  it.each(['matrix', 'have'])(
    'la vista %s es un inventario: sin filtros en la URL lista todas las páginas, también las limpias',
    (view) => {
      const model = run(`view=${view}`);
      expect(model.footer.count.total).toBe(31);
      expect(model.defaulted).toBe(false);
      expect(model.showAllHref).toBeUndefined();
    },
  );

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
    function group(query = '') {
      return listingModel({
        tree: { pages: entries },
        params: new URLSearchParams(query),
        locales: ['en', 'es'],
        defaultLocale: 'en',
        links,
      });
    }

    it('cuenta páginas (slugs), no entradas, en el recuento y en el total', () => {
      const { footer } = group();
      expect(footer.count).toMatchObject({ total: 2, overall: 3 });
    });

    it('ordena las filas de la peor gravedad a la mejor', () => {
      expect(rowsOf(group()).map(({ slug }) => slug)).toEqual(['b', 'a']);
    });

    it('un filtro de idioma elige páginas, pero la fila enseña todos sus idiomas', () => {
      const [row] = rowsOf(group('locale=es&severity=warning'));
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
      const model = listingModel({
        tree: { pages: many },
        params: new URLSearchParams('per=10'),
        locales: ['en', 'es'],
        defaultLocale: 'en',
        links,
      });
      expect(rowsOf(model)).toHaveLength(10);
      expect(model.footer.pagination.pages).toBe(2);
      expect(model.footer.count).toMatchObject({ total: 12, overall: 12 });
    });
  });

  describe('aviso común', () => {
    function everywhere(kind: IssueKind, count: number): SeoTree {
      return {
        pages: Array.from({ length: count }, (_, index) =>
          seoPage({ slug: `p${index}`, issues: [issue(IssueSeverity.WARNING, kind)] }),
        ),
      };
    }
    function common(tree: SeoTree, query = '') {
      return listingModel({
        tree,
        params: new URLSearchParams(query),
        locales: ['en'],
        defaultLocale: 'en',
        links,
      });
    }

    it('un tipo en todas las páginas filtradas sale una vez, no en las filas', () => {
      const model = common(everywhere(IssueKind.NO_H1, 3));
      expect(model.common.issues).toEqual([
        expect.objectContaining({ kind: IssueKind.NO_H1, pages: 3, entries: 3 }),
      ]);
      expect(rowsOf(model).every((row) => row.issues.length === 0)).toBe(true);
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
      expect(rowsOf(model).flatMap((row) => row.issues)).toEqual([]);
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
      expect(rowsOf(model).every((row) => row.issues.length > 0)).toBe(true);
    });

    it('el tipo que el usuario filtró no se aparta: es justo lo que quiere ver', () => {
      const tree = everywhere(IssueKind.NO_H1, 3);
      // Otro tipo en el árbol: elegir solo `no-h1` es filtrar de verdad, no pedir «Todos».
      tree.pages[0]?.issues.push(issue(IssueSeverity.WARNING, IssueKind.HEADING_SKIP));
      const model = common(tree, 'kind=no-h1');
      expect(model.common.issues).toEqual([]);
      expect(
        rowsOf(model).every((row) => row.issues.some(({ kind }) => kind === IssueKind.NO_H1)),
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
    function kinds(query: string) {
      return listingModel({
        tree,
        params: new URLSearchParams(query),
        locales: ['en'],
        defaultLocale: 'en',
        links,
      });
    }

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
      expect(rowsOf(model).map(({ slug }) => slug)).toEqual(['a']);
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

describe('listingModel: vistas', () => {
  const entries = [
    seoPage({
      slug: 'a',
      locale: 'en',
      locales: [
        { locale: 'en', status: 'present', url: '/a/' },
        { locale: 'es', status: 'present', url: '/es/a/' },
      ],
      issues: [issue(IssueSeverity.WARNING, IssueKind.DUPLICATE_TITLE)],
    }),
    seoPage({
      slug: 'a',
      locale: 'es',
      locales: [
        { locale: 'en', status: 'present', url: '/a/' },
        { locale: 'es', status: 'present', url: '/es/a/' },
      ],
      issues: [issue(IssueSeverity.WARNING, IssueKind.DUPLICATE_TITLE)],
    }),
    seoPage({
      slug: 'b',
      locale: 'en',
      locales: [
        { locale: 'en', status: 'present', url: '/b/' },
        { locale: 'es', status: 'missing', policy: 'link', declared: false },
      ],
      meta: { ...seoPage().meta, ogImageSource: 'page' },
      issues: [issue(IssueSeverity.WARNING, IssueKind.TRANSLATION_MISSING)],
    }),
  ];
  function at(query: string) {
    return listingModel({
      tree: { pages: entries },
      params: new URLSearchParams(query),
      locales: ['en', 'es'],
      defaultLocale: 'en',
      links,
    });
  }

  it('sin `view` es la vista por página y un valor desconocido también', () => {
    expect(at('').table.view).toBe('page');
    expect(at('view=grid').table.view).toBe('page');
    expect(at('').view).toEqual({ view: 'page' });
  });

  it('el selector enlaza a cada vista conservando los filtros y volviendo a la página 1', () => {
    const { views } = at('q=a&page=2&per=10');
    expect(views.map(({ view, href }) => [view, href])).toEqual([
      ['page', '/t/?q=a&per=10'],
      ['locale', '/t/?q=a&view=locale&per=10'],
      ['matrix', '/t/?q=a&view=matrix&per=10'],
      ['have', '/t/?q=a&view=have&per=10'],
    ]);
    expect(views.filter(({ current }) => current).map(({ view }) => view)).toEqual(['page']);
  });

  it('«Limpiar» vuelve a la tabla sin filtros pero en la misma vista y con el mismo tamaño', () => {
    expect(at('q=a&severity=info&page=2&per=10&view=locale').form.clear).toBe(
      '/t/?view=locale&per=10',
    );
    expect(at('q=a&view=have&lacks=og').form.clear).toBe('/t/?view=have&lacks=og');
  });

  it('marca como actual la vista pedida', () => {
    expect(
      at('view=matrix')
        .views.filter(({ current }) => current)
        .map(({ view }) => view),
    ).toEqual(['matrix']);
  });

  it('la paginación y «mostrar lo informativo» conservan la vista', () => {
    const model = at('view=locale&per=10');
    expect(model.footer.pagination.href(2)).toBe('/t/?view=locale&page=2&per=10');
    expect(model.showAllHref).toBe(
      '/t/?severity=error&severity=warning&severity=info&view=locale&per=10',
    );
    expect(model.footer.view).toEqual({ view: 'locale' });
    expect(model.form.view).toEqual({ view: 'locale' });
  });

  describe('Por idioma', () => {
    it('una fila por entrada y el recuento cuenta entradas', () => {
      const model = at('view=locale');
      if (model.table.view !== 'locale') throw new Error('vista');
      expect(model.table.rows.map(({ slug, locale }) => `${slug}/${locale}`)).toEqual([
        'a/en',
        'a/es',
        'b/en',
      ]);
      expect(model.footer.count).toMatchObject({ total: 3, overall: 3 });
    });

    it('un filtro de idioma deja solo las entradas de ese idioma', () => {
      const model = at('view=locale&locale=es');
      if (model.table.view !== 'locale') throw new Error('vista');
      expect(model.table.rows.map(({ locale }) => locale)).toEqual(['es']);
    });

    it('las fichas de gravedad cuentan entradas', () => {
      expect(at('view=locale').form.severityCounts.warning).toBe(3);
      expect(at('view=page').form.severityCounts.warning).toBe(2);
    });
  });

  describe('Matriz de idiomas', () => {
    it('una fila por página y cuántas están completas', () => {
      const model = at('view=matrix');
      if (model.table.view !== 'matrix') throw new Error('vista');
      expect(model.table.rows.map(({ slug }) => slug)).toEqual(['b', 'a']);
      expect(model.table.complete).toBe(1);
      expect(model.table.locales).toEqual(['en', 'es']);
      expect(model.footer.count).toMatchObject({ total: 2, overall: 2 });
    });

    it('pagina páginas', () => {
      const model = at('view=matrix&per=10');
      expect(model.footer.pagination.pages).toBe(1);
    });
  });

  describe('Qué tiene', () => {
    function have(query: string) {
      const model = at(`view=have&${query}`);
      if (model.table.view !== 'have') throw new Error('vista');
      return { model, table: model.table };
    }

    it('una fila por página, con las columnas y sus recuentos', () => {
      const { table } = have('');
      expect(table.rows.map(({ slug }) => slug)).toEqual(['a', 'b']);
      expect(table.columns.map(({ column }) => column)).toEqual([
        'desc',
        'schema',
        'og',
        'h1',
        'i18n',
        'index',
      ]);
      expect(table.columns.find(({ column }) => column === 'og')).toMatchObject({
        good: 1,
        total: 2,
      });
    });

    it('cada cabecera enlaza a quedarse con las páginas que no lo tienen, y otra vez a quitarlo', () => {
      const off = have('').table.columns.find(({ column }) => column === 'i18n');
      expect(off).toMatchObject({ pressed: false, href: '/t/?view=have&lacks=i18n' });
      const on = have('lacks=i18n').table.columns.find(({ column }) => column === 'i18n');
      expect(on).toMatchObject({ pressed: true, href: '/t/?view=have' });
    });

    it('cambiar de columna sustituye la anterior y vuelve a la página 1', () => {
      const other = have('lacks=i18n&page=2').table.columns.find(({ column }) => column === 'og');
      expect(other?.href).toBe('/t/?view=have&lacks=og');
    });

    it('con `lacks` solo quedan las páginas que no lo tienen propio, y el recuento es de ellas', () => {
      const { table, model } = have('lacks=i18n');
      expect(table.rows.map(({ slug }) => slug)).toEqual(['b']);
      expect(table.lacks).toBe('i18n');
      expect(model.footer.count).toMatchObject({ total: 1, overall: 2 });
    });

    it('los recuentos de las columnas son de las páginas filtradas, no de las que quedan con `lacks`', () => {
      const { table } = have('lacks=i18n');
      expect(table.columns.find(({ column }) => column === 'i18n')).toMatchObject({
        good: 1,
        total: 2,
      });
    });

    it('un filtro del formulario reduce los recuentos', () => {
      const { table } = have('q=b');
      expect(table.columns[0]).toMatchObject({ total: 1 });
    });

    it('la paginación conserva `lacks`', () => {
      expect(have('lacks=i18n').model.footer.pagination.href(2)).toBe(
        '/t/?view=have&lacks=i18n&page=2',
      );
    });

    it('no enseña el aviso de lo común: la columna de descripción ya lo dice', () => {
      const same: SeoTree = {
        pages: ['x', 'y'].map((slug) =>
          seoPage({ slug, issues: [issue(IssueSeverity.WARNING, IssueKind.NO_H1)] }),
        ),
      };
      function model(view: string) {
        return listingModel({
          tree: same,
          params: new URLSearchParams(view),
          locales: ['en'],
          defaultLocale: 'en',
          links,
        });
      }
      expect(model('view=page').common.issues).toHaveLength(1);
      expect(model('view=have').common.issues).toEqual([]);
      expect(model('view=matrix').common.issues).toEqual([]);
    });
  });
});
