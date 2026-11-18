import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import type { MissingTranslation } from '../../../i18n/translation-policy';
import { HaveColumn } from '../../queries/url-filters';
import { IssueKind, IssueSeverity, type SeoLocaleEntry, type SeoPage } from '../../tree/types';
import { haveCounts, haveRows, lacking, type HaveRow } from './have';

const meta = (extra: Partial<SeoPage['meta']>) => ({ ...seoPage().meta, ...extra });
const present = (locale: string): SeoLocaleEntry => ({ locale, status: 'present', url: '/' });
const missing = (locale: string, policy: MissingTranslation): SeoLocaleEntry => ({
  locale,
  status: 'missing',
  policy,
  declared: true,
});

const rows = (entries: SeoPage[], locales = ['en', 'es']) =>
  haveRows(entries, {
    locales,
    defaultLocale: 'en',
    inspector: ({ slug, locale }) => `/i/?slug=${slug}&locale=${locale}`,
  });
/** Las celdas de una única página con estos hechos. */
const cells = (extra: Partial<SeoPage>, locales = ['en']) =>
  rows([seoPage({ locales: locales.map(present), ...extra })], locales)[0]!.cells;

describe('haveRows: una celda por columna', () => {
  it('descripción: propia, del sitio o falta', () => {
    const state = (descriptionSource: 'page' | 'site' | 'none') =>
      cells({ meta: meta({ descriptionSource }) }).desc.state;
    expect(state('page')).toBe('own');
    expect(state('site')).toBe('site');
    expect(state('none')).toBe('missing');
  });

  it('imagen OG: propia, del sitio o falta', () => {
    const state = (ogImageSource: 'page' | 'site' | 'none') =>
      cells({ meta: meta({ ogImageSource }) }).og.state;
    expect(state('page')).toBe('own');
    expect(state('site')).toBe('site');
    expect(state('none')).toBe('missing');
  });

  it('schema: propio (con su tipo), del sitio o falta', () => {
    const own = cells({
      schemas: [{ source: 'page', schema: { '@type': 'Article' } }],
    }).schema;
    expect(own).toEqual({ state: 'own', detail: 'Article' });
    const site = cells({ schemas: [{ source: 'site', schema: { '@type': 'WebSite' } }] }).schema;
    expect(site.state).toBe('site');
    expect(cells({ schemas: [] }).schema.state).toBe('missing');
  });

  it('un schema propio gana a uno del sitio en la misma página', () => {
    const { schema } = cells({
      schemas: [
        { source: 'site', schema: { '@type': 'WebSite' } },
        { source: 'page', schema: { '@type': ['Article', 'TechArticle'] } },
      ],
    });
    expect(schema).toEqual({ state: 'own', detail: 'Article, TechArticle' });
  });

  it('H1 único: cumple salvo que falte o sobre (lo dicen los problemas del análisis)', () => {
    const issue = (kind: IssueKind) => ({
      kind,
      severity: IssueSeverity.ERROR,
      slug: 'x',
      locale: 'en',
      message: kind,
    });
    expect(cells({}).h1.state).toBe('ok');
    expect(cells({ issues: [issue(IssueKind.NO_H1)] }).h1.state).toBe('missing');
    expect(cells({ issues: [issue(IssueKind.MULTIPLE_H1)] }).h1.state).toBe('missing');
  });

  it('indexable: noindex es «no»', () => {
    expect(cells({}).index.state).toBe('ok');
    expect(cells({ meta: meta({ noindex: true }) }).index.state).toBe('no');
  });

  describe('traducida', () => {
    const state = (policy: MissingTranslation) =>
      cells({ locales: [present('en'), missing('es', policy)] }, ['en', 'es']).i18n;

    it('con todos los idiomas cumple', () => {
      expect(cells({}, ['en', 'es']).i18n.state).toBe('ok');
    });

    it('un idioma ausente con política de enlace es una falta y dice cuál', () => {
      expect(state('link')).toEqual({ state: 'missing', detail: 'es' });
    });

    it('un idioma servido de respaldo es parcial y dice cuál', () => {
      expect(state('fallback')).toEqual({ state: 'partial', detail: 'es' });
    });

    it('una omisión por política es intencionada: cumple', () => {
      expect(state('omit').state).toBe('ok');
    });

    it('la falta pesa más que el respaldo', () => {
      const { i18n } = cells(
        { locales: [present('en'), missing('es', 'fallback'), missing('fr', 'link')] },
        ['en', 'es', 'fr'],
      );
      expect(i18n).toEqual({ state: 'missing', detail: 'fr' });
    });
  });
});

describe('haveRows: una fila por página', () => {
  it('agrega los idiomas: basta que uno no tenga lo suyo para que la página no lo tenga', () => {
    const [row] = rows([
      seoPage({ slug: 'a', locale: 'en', meta: meta({ descriptionSource: 'page' }) }),
      seoPage({ slug: 'a', locale: 'es', meta: meta({ descriptionSource: 'site' }) }),
    ]);
    expect(row?.cells.desc.state).toBe('site');
  });

  it('la falta de un idioma pesa más que lo heredado de otro', () => {
    const [row] = rows([
      seoPage({ slug: 'a', locale: 'en', meta: meta({ descriptionSource: 'none' }) }),
      seoPage({ slug: 'a', locale: 'es', meta: meta({ descriptionSource: 'site' }) }),
    ]);
    expect(row?.cells.desc.state).toBe('missing');
  });

  it('conserva el orden de las páginas y enlaza al inspector del idioma por defecto', () => {
    const result = rows([
      seoPage({ slug: 'b', locale: 'es' }),
      seoPage({ slug: 'a', locale: 'en' }),
    ]);
    expect(result.map(({ slug }) => slug)).toEqual(['b', 'a']);
    expect(result[1]?.href).toBe('/i/?slug=a&locale=en');
  });
});

describe('haveCounts y lacking', () => {
  const pages: HaveRow[] = rows([
    seoPage({ slug: 'a', meta: meta({ descriptionSource: 'page', ogImageSource: 'site' }) }),
    seoPage({ slug: 'b', meta: meta({ descriptionSource: 'site', ogImageSource: 'site' }) }),
    seoPage({ slug: 'c', meta: meta({ descriptionSource: 'none', ogImageSource: 'page' }) }),
  ]);

  it('cuenta las páginas que tienen lo suyo (propio o cumple) frente al total', () => {
    const counts = haveCounts(pages);
    expect(counts.desc).toEqual({ good: 1, total: 3 });
    expect(counts.og).toEqual({ good: 1, total: 3 });
    expect(counts.h1).toEqual({ good: 3, total: 3 });
  });

  it('sin páginas, todo a cero', () => {
    expect(haveCounts([]).desc).toEqual({ good: 0, total: 0 });
  });

  it('lacking deja las páginas que no lo tienen propio: heredado, falta, parcial o «no»', () => {
    expect(lacking(pages, HaveColumn.DESCRIPTION).map(({ slug }) => slug)).toEqual(['b', 'c']);
    expect(lacking(pages, HaveColumn.H1)).toEqual([]);
  });

  it('sin columna no filtra', () => {
    expect(lacking(pages, undefined)).toBe(pages);
  });
});
