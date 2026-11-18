import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../testing/seo-page';
import { IssueKind, IssueSeverity, type SeoTree } from '../tree/types';
import { JSON_SEPARATOR } from './report';
import { pageScope, siteScope } from './scope';
import { estimateSize } from './size';
import { reportTexts } from './texts';

const tree: SeoTree = {
  pages: [
    seoPage({
      slug: 'a',
      issues: [
        {
          kind: IssueKind.NO_H1,
          severity: IssueSeverity.ERROR,
          slug: 'a',
          locale: 'en',
          message: 'm',
        },
      ],
    }),
  ],
};
const ctx = {
  site: 'S',
  locales: ['en'],
  tree,
  kindLabels: Object.fromEntries(Object.values(IssueKind).map((kind) => [kind, kind])) as Record<
    IssueKind,
    string
  >,
};

describe('reportTexts', () => {
  const texts = reportTexts({ page: pageScope(tree, 'a'), site: siteScope(tree) }, ctx);

  it('trae un texto por alcance, con el nombre que se le dio', () => {
    expect(Object.keys(texts)).toEqual(['page', 'site']);
    expect(texts.page?.markdown).toContain('SEO on page — S · `a`');
    expect(texts.site?.markdown).toContain('SEO on page — S · todo el sitio');
  });

  it('el JSON va aparte del Markdown, para añadirlo solo si se pide', () => {
    expect(texts.page?.markdown).not.toContain('```json');
    expect(texts.page?.json.startsWith('```json')).toBe(true);
  });

  it('el tamaño sin JSON es el del Markdown, y con JSON el de ambos unidos', () => {
    const { markdown, json, size } = texts.page!;
    expect(size.plain).toContain(`${estimateSize(markdown).lines} líneas`);
    expect(size.withJson).toContain(
      `${estimateSize(markdown + JSON_SEPARATOR + json).lines} líneas`,
    );
    expect(estimateSize(markdown + JSON_SEPARATOR + json).bytes).toBeGreaterThan(
      estimateSize(markdown).bytes,
    );
  });

  it('el tamaño se dice como estimación', () => {
    expect(texts.page?.size.plain).toMatch(/≈\d+ tokens \(estimado\)$/);
  });
});
