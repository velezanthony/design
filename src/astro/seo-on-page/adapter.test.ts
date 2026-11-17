import { describe, expect, it, vi } from 'vitest';
import { mockedAstroContent } from '../../testing/astro-content';

const headings = vi.hoisted(() => ({
  bySlug: {} as Record<string, { depth: number; slug: string; text: string }[]>,
}));

/* `render` no lo trae el doble: se completa con los encabezados de cada página. */
vi.mock('astro:content', () => ({
  ...mockedAstroContent({
    docs: [
      ['en/index', { slug: '', locale: 'en', title: 'Home', sourcePath: 'index.md' }],
      [
        'es/guide',
        {
          slug: 'guide',
          locale: 'es',
          title: 'Guía',
          sourcePath: 'guide.es.md',
          seo: { description: 'Una guía' },
          translations: 'omit',
        },
      ],
    ],
  }),
  render: async (entry: { data: { slug: string } }) => ({
    headings: headings.bySlug[entry.data.slug] ?? [],
  }),
}));

import { loadSeoTree, seoInputOf } from './adapter';

const config = {
  name: 'Site',
  seo: { titleSuffix: 'Site' as const },
  locales: ['en', 'es'],
  defaultLocale: 'en',
  translations: { missing: 'link' as const },
  external: [],
  layout: { sidebar: 'open', toc: 'open', width: 'reading', toggles: true },
  privacy: { page: false },
  base: '/repo',
  site: 'https://x.dev',
  trailingSlash: 'always' as const,
  buildFormat: 'directory' as const,
};

describe('seoInputOf', () => {
  it('toma la política de URLs de la config de Astro', () => {
    const input = seoInputOf([], config as never);
    expect(input.url).toEqual({ base: '/repo', trailingSlash: 'always', defaultLocale: 'en' });
  });

  it('une los datos de la colección con sus encabezados, sin cuerpo ni order', () => {
    const input = seoInputOf(
      [
        {
          data: { slug: 'guide', locale: 'es', title: 'Guía', sourcePath: 'guide.es.md', order: 3 },
          headings: [{ depth: 1, slug: 'guia', text: 'Guía' }],
        },
      ],
      config as never,
    );
    expect(input.pages).toEqual([
      {
        slug: 'guide',
        locale: 'es',
        title: 'Guía',
        kind: 'native',
        sourcePath: 'guide.es.md',
        headings: [{ depth: 1, slug: 'guia', text: 'Guía' }],
      },
    ]);
  });

  it('la página externa llega como external (sus seo y translations viven en docs.config.mjs)', () => {
    const [external, native] = seoInputOf(
      [
        {
          data: {
            slug: 'changelog',
            locale: 'en',
            title: 'C',
            sourcePath: 'CHANGELOG.md',
            kind: 'external',
          },
          headings: [],
        },
        {
          data: { slug: 'a', locale: 'en', title: 'A', sourcePath: 'a.md', kind: 'native' },
          headings: [],
        },
      ],
      config as never,
    ).pages;
    expect(external!.kind).toBe('external');
    expect(native!.kind).toBe('native');
  });

  it('conserva seo y translations de la página', () => {
    const [page] = seoInputOf(
      [
        {
          data: {
            slug: 'a',
            locale: 'en',
            title: 'A',
            sourcePath: 'a.md',
            seo: { noindex: true },
            translations: 'omit',
          },
          headings: [],
        },
      ],
      config as never,
    ).pages;
    expect(page).toMatchObject({ seo: { noindex: true }, translations: 'omit' });
  });

  it('no arrastra al análisis los textos de interfaz ni lo propio de Astro (strings)', () => {
    const input = seoInputOf([], { ...config, strings: { en: {} } } as never);
    expect(input.config).not.toHaveProperty('strings');
  });
});

describe('loadSeoTree', () => {
  it('lee la colección docs, pide los encabezados al render y construye el árbol', async () => {
    headings.bySlug[''] = [{ depth: 1, slug: 'home', text: 'Home' }];
    headings.bySlug['guide'] = [
      { depth: 1, slug: 'guia', text: 'Guía' },
      { depth: 3, slug: 'salto', text: 'Salto' },
    ];
    const tree = await loadSeoTree(config as never);
    expect(tree.pages.map((page) => `${page.slug || '/'}:${page.locale}`)).toEqual([
      '/:en',
      'guide:es',
    ]);
    const guide = tree.pages[1]!;
    expect(guide.meta.title).toBe('Guía | Site');
    expect(guide.meta.description).toBe('Una guía');
    expect(guide.issues.map((issue) => issue.kind)).toContain('heading-skip');
  });
});
