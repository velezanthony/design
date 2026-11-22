import { describe, expect, it, vi } from 'vitest';
import { mockedAstroContent } from '../../../testing/astro-content';

const headings = vi.hoisted(() => ({
  bySlug: {} as Record<string, { depth: number; slug: string; text: string }[]>,
}));

/* Lo que el loader guarda en `rendered.metadata` de una entrada; sin él, la entrada viene «sin renderizar». */
const stored = vi.hoisted(() => ({ bySlug: {} as Record<string, Record<string, unknown>> }));

const collectionReads = vi.hoisted(() => ({ count: 0 }));

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
    getCollection: async (name: 'docs') => {
      collectionReads.count += 1;
      return (await content.getCollection(name)).map((entry) =>
        stored.bySlug[entry.data.slug]
          ? { ...entry, rendered: { html: '', metadata: stored.bySlug[entry.data.slug] } }
          : entry,
      );
    },
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
import { getDocData, getDocs } from '../docs-collection';
import { loadPanel, loadSeoTree, loadSiteFiles, seoInputOf } from './adapter';

const config = {
  site: {
    name: 'Site',
    seo: { titleSuffix: 'Site' as const, sitemap: { include: [] } },
    layout: { sidebar: 'open', toc: 'open', width: 'reading', toggles: true },
    analytics: {},
  },
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    missing: 'link' as const,
    missingDeclared: false,
  },
  content: { dir: 'src/content/docs', exclude: [], external: [], folders: { declared: {} } },
  base: '/repo',
  siteUrl: 'https://x.dev',
  trailingSlash: 'always' as const,
  buildFormat: 'directory' as const,
  publicDir: 'file:///site/public/',
  root: 'file:///site/',
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
    const tree = await loadSeoTree(config as never, await getDocs());
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
    const tree = await loadSeoTree(config as never, await getDocs(), [
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
      const tree = await loadSeoTree(config as never, await getDocs());
      const guide = tree.pages.find((page) => page.slug === 'guide')!;
      expect(guide.images).toEqual(content.images);
      expect(guide.issues.map((issue) => issue.kind)).toContain('image-alt-missing');
    } finally {
      delete stored.bySlug['guide'];
    }
  });

  it('una entrada sin esos datos no se juzga (ni alt ni huérfanas)', async () => {
    const tree = await loadSeoTree(config as never, await getDocs());
    const kinds = tree.pages.flatMap((page) => page.issues.map((issue) => issue.kind));
    expect(kinds).not.toContain('image-alt-missing');
    expect(kinds).not.toContain('orphan-page');
  });
});

describe('loadSiteFiles', () => {
  async function withPublic(files: string[], run: (publicDir: string) => Promise<void>) {
    const directory = await mkdtemp(path.join(tmpdir(), 'seo-public-'));
    try {
      for (const file of files) await writeFile(path.join(directory, file), 'x');
      await run(pathToFileURL(`${directory}${path.sep}`).href);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  function byId(files: Awaited<ReturnType<typeof loadSiteFiles>>, id: string) {
    return files.find((file) => file.id === id);
  }

  it('robots.txt y llms.txt salen de lo que hay en public/ del consumidor', async () => {
    await withPublic(['robots.txt'], async (publicDir) => {
      const files = await loadSiteFiles({ ...config, publicDir } as never, await getDocData());
      expect(byId(files, 'robots')?.state).toBe('present');
      expect(byId(files, 'llms')?.state).toBe('absent');
    });
  });

  it('el sitemap cuenta las URLs reales de la colección', async () => {
    await withPublic([], async (publicDir) => {
      const files = await loadSiteFiles({ ...config, publicDir } as never, await getDocData());
      expect(byId(files, 'sitemap')).toMatchObject({ urls: 2 });
    });
  });

  it('también cuenta las páginas de src/pages/ que entran en el sitemap, como el endpoint de dev', async () => {
    const head = { noindex: false, alternates: [], headings: [], og: {}, jsonLd: [] };
    await withPublic([], async (publicDir) => {
      const files = await loadSiteFiles({ ...config, publicDir } as never, await getDocData(), [
        { path: '/repo/cv/', pattern: '/cv', entrypoint: 'src/pages/cv.astro', head },
        {
          path: '/repo/draft/',
          pattern: '/draft',
          entrypoint: 'src/pages/draft.astro',
          head: { ...head, noindex: true },
        },
      ]);
      expect(byId(files, 'sitemap')).toMatchObject({ urls: 3 });
    });
  });
});

describe('loadPanel', () => {
  it('lee la colección una sola vez por pantalla', async () => {
    collectionReads.count = 0;
    const panel = await loadPanel(config as never, 'http://localhost:4321');
    expect(collectionReads.count).toBe(1);
    expect(panel.docs.map((doc) => doc.slug)).toEqual(['', 'guide']);
    expect(panel.tree.pages).toHaveLength(2);
    // Los enlaces del panel los arma la ruta (`views/seo-on-page/hrefs`): `data/` no conoce `views/`.
    expect(panel).not.toHaveProperty('hrefs');
  });
});
