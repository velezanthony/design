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
  listingModel({ tree: tree(), params: new URLSearchParams(query), locales, links });

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
    expect(model.rows.map(({ page }) => page.slug)).toEqual(['info']);
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
    expect(run().rows[0]).toMatchObject({
      page: { slug: 'p00' },
      href: '/i/?slug=p00&locale=en',
    });
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
    });
  });

  it('acota una página pasada del final a la última', () => {
    expect(run('page=99').footer.pagination.page).toBe(2);
  });
});
