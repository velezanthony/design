import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../testing/seo-page';
import {
  IssueKind,
  IssueSeverity,
  type Issue,
  type SeoTree,
} from '../../../core/seo-on-page/tree/types';
import { fixPrompts, inspectorReport, listingReport, overviewReport } from './report';

const found: Issue = {
  kind: IssueKind.NO_H1,
  severity: IssueSeverity.ERROR,
  slug: 'a',
  locale: 'en',
  message: 'No hay H1.',
};
const tree: SeoTree = {
  pages: [
    seoPage({ slug: 'a', locale: 'en', issues: [found] }),
    seoPage({ slug: 'a', locale: 'es' }),
    seoPage({ slug: 'b', locale: 'en' }),
  ],
};
const site = { name: 'Docs', locales: ['en', 'es'] };

describe('overviewReport', () => {
  it('ofrece todo el sitio y un idioma, y solo genera esos textos', () => {
    const model = overviewReport(tree, site);
    expect(model.options.map((option) => option.value)).toEqual(['site', 'locale']);
    expect(model.initial).toBe('site');
    expect(Object.keys(model.texts)).toEqual(['site', 'locale:en', 'locale:es']);
    expect(model.locales).toEqual(['en', 'es']);
  });

  it('con un solo idioma no ofrece «Un idioma»: sería el mismo informe', () => {
    const model = overviewReport(tree, { name: 'Docs', locales: ['en'] });
    expect(model.options.map((option) => option.value)).toEqual(['site']);
    expect(Object.keys(model.texts)).toEqual(['site']);
    expect(model.locales).toEqual([]);
  });

  it('dice cuántas páginas cubre', () => {
    expect(overviewReport(tree, site).options[0]?.sub).toBe('2 páginas · en y es');
  });
});

describe('listingReport', () => {
  it('el alcance «filtro actual» es el de la URL: mismas páginas que la tabla', () => {
    const model = listingReport(tree, new URLSearchParams(), site);
    expect(model.options[0]).toMatchObject({ value: 'filter', title: 'Filtro actual' });
    expect(model.options[0]?.sub).toBe('errores + avisos · 1 página');
    expect(model.texts.filter?.markdown).toContain('Alcance: errores + avisos · 1 página');
  });

  it('con `view=have&lacks=` el informe es el de lo que falta', () => {
    const model = listingReport(tree, new URLSearchParams('view=have&lacks=og'), site);
    expect(model.texts.filter?.markdown).toContain('## Páginas sin imagen OG propia');
  });

  it('con `lacks=` la tarjeta cuenta las páginas a las que les falta, no todas las filtradas', () => {
    const model = listingReport(tree, new URLSearchParams('view=have&lacks=h1'), site);
    expect(model.options[0]?.sub).toMatch(/ · 1 página$/);
  });

  it('un idioma sale del sitio entero, no del filtro', () => {
    const model = listingReport(tree, new URLSearchParams('q=zzz'), site);
    expect(model.texts['locale:en']?.markdown).toContain('solo `en`');
    // El filtro `q=zzz` no deja ninguna página, pero el idioma sigue viendo todo el sitio.
    expect(model.texts['locale:en']?.markdown).toContain('Sin H1');
  });
});

describe('inspectorReport', () => {
  it('ofrece esta página y un idioma', () => {
    const model = inspectorReport(tree, 'a', site);
    expect(model.options.map((option) => option.value)).toEqual(['page', 'locale']);
    expect(model.options[0]?.sub).toBe('a · en y es');
    expect(model.texts.page?.markdown).toContain('SEO on page — Docs · `a`');
  });
});

describe('fixPrompts', () => {
  it('un prompt por problema, en el mismo orden', () => {
    const prompts = fixPrompts(tree, site, tree.pages[0]!, [
      found,
      { ...found, kind: IssueKind.MULTIPLE_H1 },
    ]);
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain('Sin H1');
    expect(prompts[1]).toContain('Varios H1');
  });
});
