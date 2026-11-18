import { describe, expect, it, vi } from 'vitest';
import { mockedAstroContent } from '../../../testing/astro-content';

const headings = vi.hoisted(() => ({
  bySlug: {} as Record<string, { depth: number; slug: string; text: string }[]>,
}));

/* Lo que el loader guarda en `rendered.metadata` de una entrada; sin él, la entrada viene «sin renderizar». */
const stored = vi.hoisted(() => ({ bySlug: {} as Record<string, Record<string, unknown>> }));

/* `render` no lo trae el doble: se completa con los encabezados de cada página. */
vi.mock('astro:content', async () => {
  const content = mockedAstroContent({
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
  });
  return {
    ...content,
    getCollection: async (name: 'docs') =>
      (await content.getCollection(name)).map((entry) =>
        stored.bySlug[entry.data.slug]
          ? { ...entry, rendered: { html: '', metadata: stored.bySlug[entry.data.slug] } }
          : entry,
      ),
    render: async (entry: { data: { slug: string } }) => ({
      headings: headings.bySlug[entry.data.slug] ?? [],
    }),
  };
});

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTENT_METADATA_KEY } from '../../../core/seo-on-page/nodes/content';
import { loadSeoTree, loadSiteFiles, seoInputOf } from './adapter';

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
  publicDir: 'file:///site/public/',
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

  it('pasa los enlaces y las imágenes del cuerpo cuando la entrada los trae', () => {
    const [page] = seoInputOf(
      [
        {
          data: { slug: 'a', locale: 'en', title: 'A', sourcePath: 'a.md' },
          headings: [],
          links: [{ slug: 'b', locale: 'en' }],
          images: [{ src: 'x.png', alt: '' }],
        },
      ],
      config as never,
    ).pages;
    expect(page).toMatchObject({
      links: [{ slug: 'b', locale: 'en' }],
      images: [{ src: 'x.png', alt: '' }],
    });
  });

  it('sin ellos no inventa listas vacías: «no se recogió» no es «no hay»', () => {
    const [page] = seoInputOf(
      [{ data: { slug: 'a', locale: 'en', title: 'A', sourcePath: 'a.md' }, headings: [] }],
      config as never,
    ).pages;
    expect(page).not.toHaveProperty('links');
    expect(page).not.toHaveProperty('images');
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

describe('loadSeoTree: páginas del cliente', () => {
  it('las páginas de src/pages/ que se le pasan entran en el árbol junto a la colección', async () => {
    const tree = await loadSeoTree(config as never, [
      {
        path: '/repo/cv/',
        pattern: '/cv',
        entrypoint: 'src/pages/cv.astro',
        head: { title: 'CV', noindex: false, alternates: [], headings: [], og: {}, jsonLd: [] },
      },
    ]);
    expect(tree.pages.find((page) => page.kind === 'client')).toMatchObject({
      slug: 'cv',
      sourcePath: 'src/pages/cv.astro',
    });
  });
});

describe('loadSeoTree: lo que el loader guardó del cuerpo', () => {
  it('lee de la entrada sus enlaces e imágenes y el árbol los juzga', async () => {
    const content = { links: [], images: [{ src: 'img/a.png', alt: '' }] };
    stored.bySlug['guide'] = {
      headings: [{ depth: 1, slug: 'g', text: 'G' }],
      [CONTENT_METADATA_KEY]: content,
    };
    try {
      const tree = await loadSeoTree(config as never);
      const guide = tree.pages.find((page) => page.slug === 'guide')!;
      expect(guide.images).toEqual(content.images);
      expect(guide.issues.map((issue) => issue.kind)).toContain('image-alt-missing');
    } finally {
      delete stored.bySlug['guide'];
    }
  });

  it('una entrada sin esos datos no se juzga (ni alt ni huérfanas)', async () => {
    const tree = await loadSeoTree(config as never);
    const kinds = tree.pages.flatMap((page) => page.issues.map((issue) => issue.kind));
    expect(kinds).not.toContain('image-alt-missing');
    expect(kinds).not.toContain('orphan-page');
  });
});

describe('loadSiteFiles', () => {
  const withPublic = async (files: string[], run: (publicDir: string) => Promise<void>) => {
    const dir = await mkdtemp(path.join(tmpdir(), 'seo-public-'));
    try {
      for (const file of files) await writeFile(path.join(dir, file), 'x');
      await run(pathToFileURL(`${dir}${path.sep}`).href);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
  const byId = (files: Awaited<ReturnType<typeof loadSiteFiles>>, id: string) =>
    files.find((file) => file.id === id);

  it('robots.txt y llms.txt salen de lo que hay en public/ del consumidor', async () => {
    await withPublic(['robots.txt'], async (publicDir) => {
      const files = await loadSiteFiles({ ...config, publicDir } as never);
      expect(byId(files, 'robots')?.state).toBe('present');
      expect(byId(files, 'llms')?.state).toBe('absent');
    });
  });

  it('el sitemap cuenta las URLs reales de la colección', async () => {
    await withPublic([], async (publicDir) => {
      const files = await loadSiteFiles({ ...config, publicDir } as never);
      expect(byId(files, 'sitemap')).toMatchObject({ urls: 2 });
    });
  });
});
