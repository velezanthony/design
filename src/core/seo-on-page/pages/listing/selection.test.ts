import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoTree } from '../../tree/types';
import { selectListing } from './selection';

const issue = (severity: IssueSeverity, kind: IssueKind = IssueKind.NO_H1): Issue => ({
  kind,
  severity,
  slug: 'x',
  locale: 'en',
  message: kind,
});

const tree: SeoTree = {
  pages: [
    seoPage({ slug: 'a', locale: 'en', issues: [issue(IssueSeverity.ERROR)] }),
    seoPage({ slug: 'a', locale: 'es' }),
    seoPage({
      slug: 'b',
      locale: 'en',
      issues: [issue(IssueSeverity.INFO, IssueKind.DESCRIPTION_INHERITED)],
    }),
    seoPage({ slug: 'c', locale: 'en' }),
  ],
};

const select = (query = '') => selectListing(tree, new URLSearchParams(query));

describe('selectListing', () => {
  it('sin filtros parte de error + aviso: solo entran las páginas con algo accionable', () => {
    const { filters, defaulted, matching } = select();
    expect(filters.severities).toEqual(['error', 'warning']);
    expect(defaulted).toBe(true);
    expect(matching.map((entry) => `${entry.slug}/${entry.locale}`)).toEqual(['a/en']);
  });

  it('la selección trae TODOS los idiomas de las páginas que cumplen, no solo el que cumple', () => {
    const { selected } = select();
    expect(selected.map((entry) => `${entry.slug}/${entry.locale}`)).toEqual(['a/en', 'a/es']);
  });

  it('las vistas de inventario sin filtros enseñan todas las páginas', () => {
    expect(select('view=have').selected.map((entry) => entry.slug)).toEqual(['a', 'a', 'b', 'c']);
    expect(select('view=matrix').defaulted).toBe(false);
  });

  it('«Por idioma» cuenta entradas, el resto páginas', () => {
    expect(select('view=locale').byEntry).toBe(true);
    expect(select().byEntry).toBe(false);
  });

  it('lo escrito en la URL no incluye la gravedad que solo es el valor por defecto', () => {
    expect(select().written.severities).toEqual([]);
    expect(select('view=have').filters.severities).toEqual(['error', 'warning', 'info']);
    expect(select('view=have').written.severities).toEqual([]);
    expect(select('severity=info').written.severities).toEqual(['info']);
  });

  it('sin gravedad en la URL (solo tipos) no hay gravedades que respetar', () => {
    expect(select('kind=no-h1').severities).toBeUndefined();
    expect(select().severities).toEqual(['error', 'warning']);
  });

  it('pedir todos los tipos con incidencias equivale a no filtrar por tipo', () => {
    const query = 'kind=no-h1&kind=description-inherited';
    expect(select(query).defaulted).toBe(true);
  });
});
