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

  describe('schemas', () => {
    const org = { '@type': 'Organization', name: 'Acme' };
    const person = { '@type': 'Person', name: 'Ada' };
    const withSchemas = resolveConfig({ name: 'Design', seo: { schema: [org] } });
    const schemaPages = [
      page({ slug: 'plain', locale: 'en' }),
      page({ slug: 'extra', locale: 'en', seo: { schema: [person] } }),
      page({ slug: 'off', locale: 'en', seo: { schema: false } }),
    ];
    const schemaTree = buildSeoTree({ config: withSchemas, url, pages: schemaPages });
    const published = (p: (typeof schemaPages)[number]) => {
      const base = schemaPages.map((q) => ({ ...q, body: '' }));
      const resolved = resolveMeta(withSchemas.seo, p.seo, p, p.locale);
      const data = {
        kind: 'page',
        slug: p.slug,
        locale: p.locale,
        url: pageUrl(p.slug, p.locale, url),
      } as const;
      return buildHead(resolved, data, buildAvailability(base, url), site, withSchemas, url)
        .filter((t) => t.tag === 'script')
        .map((t) => JSON.parse(t.content ?? ''));
    };

    it.each(schemaPages.map((p) => [p.slug, p] as const))(
      '%s: los schemas del árbol son los que buildHead publica, con su origen',
      (_name, p) => {
        const node = schemaTree.pages.find((t) => t.slug === p.slug)!;
        expect(node.schemas.map((entry) => entry.schema)).toEqual(published(p));
      },
    );

    it('cada schema dice si viene del sitio o de la página', () => {
      const origin = (slug: string) =>
        schemaTree.pages.find((t) => t.slug === slug)!.schemas.map((entry) => entry.source);
      expect(origin('plain')).toEqual(['site']);
      expect(origin('extra')).toEqual(['site', 'page']);
      expect(origin('off')).toEqual([]);
    });

    it('sin schemas en ningún sitio, la lista es vacía (no se impone ninguno)', () => {
      expect(buildSeoTree(input).pages.every((p) => p.schemas.length === 0)).toBe(true);
    });
  });

  it('todo problema lleva su arreglo, con el archivo real de la página', () => {
    const tree = buildSeoTree(input);
    const issues = tree.pages.flatMap((p) => p.issues.map((issue) => ({ page: p, issue })));
    expect(issues.length).toBeGreaterThan(0);
    for (const { issue } of issues) expect(issue.fix).toBeTruthy();
    const guide = tree.pages.find((p) => p.slug === 'guide' && p.locale === 'en')!;
    const skip = guide.issues.find((i) => i.kind === 'heading-skip');
    expect(skip!.fix).toContain('guide.md');
    const missing = guide.issues.find((i) => i.kind === 'translation-missing');
    expect(missing!.fix).toContain('guide.es.md');
  });

  it('una página externa recibe arreglos que apuntan a docs.config.mjs', () => {
    const external = buildSeoTree({
      ...input,
      pages: [
        page({
          slug: 'changelog',
          locale: 'en',
          title: 'Changelog',
          kind: 'external',
          sourcePath: 'CHANGELOG.md',
        }),
      ],
    });
    const fixes = external.pages[0]!.issues.map((issue) => issue.fix);
    expect(fixes.some((fix) => fix?.includes('external[].translations'))).toBe(true);
    expect(fixes.some((fix) => fix?.includes('external[].seo.description'))).toBe(true);
    expect(fixes.every((fix) => !fix?.includes('frontmatter'))).toBe(true);
  });
});

describe('buildSeoTree: enlaces, imágenes y tarjeta social', () => {
  const kindsOf = (tree: ReturnType<typeof buildSeoTree>, slug: string) =>
    tree.pages.find((p) => p.slug === slug)!.issues.map((issue) => issue.kind);
  const social = resolveConfig({
    name: 'Design',
    locales: ['en'],
    seo: { image: { src: '/og.png', alt: 'Card' } },
  });
  const solo = (extra: Partial<SeoPageInput> & Pick<SeoPageInput, 'slug'>) =>
    page({ locale: 'en', seo: { description }, ...extra });

  it('sin enlaces ni imágenes recogidos no se juzgan: ni huérfanas ni alt', () => {
    const tree = buildSeoTree({ config, url, pages: [solo({ slug: 'a' }), solo({ slug: 'b' })] });
    expect(kindsOf(tree, 'a')).not.toContain('orphan-page');
    expect(kindsOf(tree, 'a')).not.toContain('image-alt-missing');
  });

  it('una imagen sin alt del cuerpo llega al árbol como incidencia', () => {
    const tree = buildSeoTree({
      config,
      url,
      pages: [solo({ slug: 'a', links: [], images: [{ src: 'x.png', alt: '' }] })],
    });
    expect(kindsOf(tree, 'a')).toContain('image-alt-missing');
  });

  it('el grafo une el cuerpo y la navegación: con navegación, nadie es huérfana', () => {
    const tree = buildSeoTree({
      config,
      url,
      pages: [solo({ slug: 'a', links: [] }), solo({ slug: 'b', links: [] })],
    });
    expect(kindsOf(tree, 'a')).not.toContain('orphan-page');
    expect(kindsOf(tree, 'b')).not.toContain('orphan-page');
  });

  it('sin enlace en el cuerpo ni en la navegación (sola, fuera de las secciones de `nav`), es huérfana', () => {
    const sections = resolveConfig({
      name: 'Design',
      locales: ['en'],
      nav: [{ label: 'API', dir: 'api' }],
    });
    const tree = buildSeoTree({
      config: sections,
      url,
      pages: [solo({ slug: 'api/a', links: [] }), solo({ slug: 'solo', links: [] })],
    });
    expect(kindsOf(tree, 'solo')).toContain('orphan-page');
    // `api/a` la enlaza la cabecera desde `solo`.
    expect(kindsOf(tree, 'api/a')).not.toContain('orphan-page');
  });

  it('un enlace del cuerpo a una página noindex se avisa en la página que enlaza', () => {
    const tree = buildSeoTree({
      config,
      url,
      pages: [
        solo({ slug: 'a', links: [{ slug: 'secret', locale: 'en' }] }),
        solo({ slug: 'secret', links: [], seo: { description, noindex: true } }),
      ],
    });
    expect(kindsOf(tree, 'a')).toContain('link-to-noindex');
    expect(kindsOf(tree, 'secret')).not.toContain('link-to-noindex');
  });

  it('la imagen social con otra proporción se avisa con las dimensiones leídas', () => {
    const tree = buildSeoTree({
      config: social,
      url,
      pages: [solo({ slug: 'a' })],
      imageSizes: new Map([['/og.png', { width: 800, height: 800 }]]),
    });
    expect(kindsOf(tree, 'a')).toContain('og-image-size');
  });

  it('el canonical de cada versión es la suya: nunca sale este aviso con la URL que genera el sitio', () => {
    const tree = buildSeoTree(input);
    expect(tree.pages.flatMap((p) => p.issues).map((i) => i.kind)).not.toContain(
      'canonical-mismatch',
    );
  });
});
