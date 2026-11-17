import { describe, expect, it } from 'vitest';
import type { Issue, SeoPage, SeoTree } from '../tree/types';
import { filterPages } from './filter';
import { EMPTY_FILTERS } from './url-filters';

const issue = (kind: Issue['kind'], severity: Issue['severity']): Issue => ({
  kind,
  severity,
  slug: 'x',
  locale: 'en',
  message: '',
});
const page = (slug: string, locale: string, title: string, issues: Issue[] = []): SeoPage =>
  ({ slug, locale, title, meta: { title: `${title} | Site` }, issues }) as SeoPage;

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
const ids = (filters = {}) =>
  filterPages(tree, { ...EMPTY_FILTERS, ...filters }).map((p) => `${p.slug}:${p.locale}`);

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
