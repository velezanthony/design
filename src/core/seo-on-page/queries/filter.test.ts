import { describe, expect, it } from 'vitest';
import type { Issue, SeoPage, SeoTree } from '../tree/types';
import { filterPages, withoutNoindex } from './filter';
import { EMPTY_FILTERS } from './url-filters';

function issue(kind: Issue['kind'], severity: Issue['severity']): Issue {
  return {
    kind,
    severity,
    slug: 'x',
    locale: 'en',
    message: '',
  };
}
function page(slug: string, locale: string, title: string, issues: Issue[] = []): SeoPage {
  return { slug, locale, title, meta: { title: `${title} | Site` }, issues } as SeoPage;
}

const tree: SeoTree = {
  pages: [
    page('install', 'en', 'Install', [issue('title-too-short', 'warning')]),
    page('install', 'es', 'Instalar', [
      issue('no-h1', 'error'),
      issue('title-too-long', 'warning'),
    ]),
    page('guide/start', 'en', 'Getting started'),
  ],
};
function ids(filters = {}) {
  return filterPages(tree, { ...EMPTY_FILTERS, ...filters }).map(
    (treePage) => `${treePage.slug}:${treePage.locale}`,
  );
}

describe('filterPages', () => {
  it('sin filtros devuelve todas, en el mismo orden', () => {
    expect(ids()).toEqual(['install:en', 'install:es', 'guide/start:en']);
  });

  it('por tipo de problema', () => {
    expect(ids({ kinds: ['no-h1'] })).toEqual(['install:es']);
  });

  it('varios tipos: basta con uno', () => {
    expect(ids({ kinds: ['no-h1', 'title-too-short'] })).toEqual(['install:en', 'install:es']);
  });

  it('por gravedad', () => {
    expect(ids({ severities: ['error'] })).toEqual(['install:es']);
  });

  it('tipo y gravedad se cumplen sobre el MISMO problema', () => {
    // install:es tiene un error (no-h1) y un warning (title-too-long) pero ningún error title-too-long.
    expect(ids({ kinds: ['title-too-long'], severities: ['error'] })).toEqual([]);
  });

  it('las tres gravedades a la vez no restringen: entran también las páginas sin problemas', () => {
    expect(ids({ severities: ['error', 'warning', 'info'] })).toEqual([
      'install:en',
      'install:es',
      'guide/start:en',
    ]);
  });

  it('por idioma', () => {
    expect(ids({ locales: ['es'] })).toEqual(['install:es']);
  });

  it('por texto: slug o título, sin distinguir mayúsculas', () => {
    expect(ids({ text: 'GUIDE' })).toEqual(['guide/start:en']);
    expect(ids({ text: 'instal' })).toEqual(['install:en', 'install:es']);
    expect(ids({ text: 'getting' })).toEqual(['guide/start:en']);
  });

  it('los filtros se combinan con Y', () => {
    expect(ids({ locales: ['en'], text: 'install' })).toEqual(['install:en']);
  });
});

describe('withoutNoindex', () => {
  const noindexed = { ...page('draft', 'en', 'Draft'), meta: { title: 'Draft', noindex: true } };
  const mixed: SeoTree = { pages: [...tree.pages, noindexed as SeoPage] };

  it('con `hideNoindex` quita las páginas noindex del árbol', () => {
    const visible = withoutNoindex(mixed, { ...EMPTY_FILTERS, hideNoindex: true });
    expect(visible.pages.map((entry) => entry.slug)).not.toContain('draft');
    expect(visible.pages).toHaveLength(3);
  });

  it('sin él devuelve el mismo árbol', () => {
    expect(withoutNoindex(mixed, EMPTY_FILTERS)).toBe(mixed);
  });
});
