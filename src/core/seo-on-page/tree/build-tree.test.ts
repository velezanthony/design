import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../config/resolve';
import { buildAvailability, pageUrl } from '../../i18n/availability';
import { buildHead } from '../../seo/head';
import { excludeNoindex, noindexUrls } from '../../seo/indexable';
import { resolveMeta, withImageSize } from '../../seo/meta';
import { buildSeoTree } from './build-tree';
import type { SeoInput, SeoPageInput } from './input';

const url = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' } as const;
const config = resolveConfig({
  name: 'Design',
  locales: ['en', 'es'],
  seo: { titleSuffix: 'Design', description: 'Docs of the design system for the whole portfolio.' },
});
const h = (depth: number, text: string) => ({ depth, slug: text.toLowerCase(), text });
const page = (extra: Partial<SeoPageInput> & Pick<SeoPageInput, 'slug' | 'locale'>) => ({
  title: extra.slug,
  kind: 'native' as const,
  sourcePath: `${extra.slug}.md`,
  headings: [h(1, 'Title'), h(2, 'Section')],
  ...extra,
});
const description = 'A description of exactly the right size that explains what this page covers.';

const input: SeoInput = {
  config,
  url,
  pages: [
    // Desordenadas a propósito: el árbol las ordena por slug e idioma.
    page({
      slug: 'guide',
      locale: 'en',
      title: 'Guide to the system',
      headings: [h(1, 'Guide'), h(2, 'Setup'), h(4, 'Deep')],
    }),
    page({ slug: 'install', locale: 'es', title: 'Instalar', seo: { description } }),
    page({ slug: 'install', locale: 'en', title: 'Install', seo: { description } }),
  ],
};

describe('buildSeoTree', () => {
  const tree = buildSeoTree(input);
  const find = (slug: string, locale: string) =>
    tree.pages.find((p) => p.slug === slug && p.locale === locale);

  it('ordena por slug y luego por idioma', () => {
    expect(tree.pages.map((p) => `${p.slug}:${p.locale}`)).toEqual([
      'guide:en',
      'install:en',
      'install:es',
    ]);
  });

  it('cada página lleva sus hechos: meta, encabezados e idiomas', () => {
    const install = find('install', 'es');
    expect(install).toMatchObject({
      slug: 'install',
      locale: 'es',
      title: 'Instalar',
      kind: 'native',
      sourcePath: 'install.md',
      meta: {
        title: 'Instalar | Design',
        descriptionSource: 'page',
        canonical: '/repo/es/install/',
        noindex: false,
      },
      locales: [
        { locale: 'en', status: 'present', url: '/repo/install/' },
        { locale: 'es', status: 'present', url: '/repo/es/install/' },
      ],
    });
    expect(install?.headings).toHaveLength(2);
  });

  it('la página sana no tiene incidencias', () => {
    expect(find('install', 'en')?.issues).toEqual([]);
  });

  it('guide: descripción heredada, traducción sin declarar y salto de encabezado', () => {
    const guide = find('guide', 'en');
    expect(guide?.meta.descriptionSource).toBe('site');
    expect(guide?.locales[1]).toEqual({
      locale: 'es',
      status: 'missing',
      policy: 'link',
      declared: false,
    });
    expect(guide?.issues.map((i) => [i.kind, i.severity])).toEqual([
      ['description-inherited', 'info'],
      ['heading-skip', 'warning'],
      ['translation-missing', 'warning'],
    ]);
  });

  it('no muta la entrada ni depende del orden en que llegan las páginas', () => {
    const copy = structuredClone(input);
    const reversed = buildSeoTree({ ...copy, pages: [...copy.pages].reverse() });
    expect(reversed).toEqual(tree);
    expect(copy).toEqual(input);
  });

  it('políticas en conflicto dentro de un grupo: error en sus páginas', () => {
    const conflicting = buildSeoTree({
      ...input,
      pages: [
        page({
          slug: 'a',
          locale: 'en',
          title: 'Conflicting group',
          translations: 'omit',
          seo: { description },
        }),
        page({
          slug: 'a',
          locale: 'es',
          title: 'Grupo en conflicto',
          translations: 'link',
          seo: { description },
        }),
      ],
    });
    expect(conflicting.pages.map((p) => p.issues.map((i) => i.kind))).toEqual([
      ['translation-policy-conflict'],
      ['translation-policy-conflict'],
    ]);
  });
});

describe('buildSeoTree usa las mismas funciones que el sitio', () => {
  const site = new URL('https://x.dev');
  const pages = [
    page({ slug: 'install', locale: 'en', title: 'Install', seo: { description } }),
    page({
      slug: 'install',
      locale: 'es',
      title: 'Instalar',
      seo: { description, titleSuffix: false, image: { src: '/og.png' } },
    }),
    page({ slug: 'guide', locale: 'en', title: 'Guide' }),
  ];
  const imageSizes = new Map([['/og.png', { width: 1200, height: 630 }]]);
  const tree = buildSeoTree({ config, url, pages, imageSizes });
  const content = (
    tags: ReturnType<typeof buildHead>,
    selector: (t: (typeof tags)[0]) => boolean,
  ) => tags.find(selector);

  it.each(pages.map((p) => [`${p.slug}:${p.locale}`, p] as const))(
    '%s: título, descripción, canonical y og:image coinciden con buildHead',
    (_name, p) => {
      const base = pages.map((q) => ({ ...q, body: '' }));
      const av = excludeNoindex(buildAvailability(base, url), noindexUrls(base, url));
      const resolved = withImageSize(resolveMeta(config.seo, p.seo, p, p.locale), imageSizes);
      const data = {
        kind: 'page',
        slug: p.slug,
        locale: p.locale,
        url: pageUrl(p.slug, p.locale, url),
      } as const;
      const tags = buildHead(resolved, data, av, site, config, url);

      const node = tree.pages.find((t) => t.slug === p.slug && t.locale === p.locale)?.meta;
      expect(node?.title).toBe(content(tags, (t) => t.tag === 'title')?.content);
      expect(node?.description).toBe(
        content(tags, (t) => t.attrs.name === 'description')?.attrs.content,
      );
      expect(new URL(node?.canonical ?? '', site).href).toBe(
        content(tags, (t) => t.attrs.rel === 'canonical')?.attrs.href,
      );
      expect(node?.ogTitle).toBe(
        content(tags, (t) => t.attrs.property === 'og:title')?.attrs.content,
      );
      expect(node?.ogImage?.width).toBe(
        Number(content(tags, (t) => t.attrs.property === 'og:image:width')?.attrs.content) ||
          undefined,
      );
    },
  );
});
