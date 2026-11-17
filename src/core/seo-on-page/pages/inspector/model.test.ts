import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../../testing/seo-page';
import { EMPTY_FILTERS, serializeFilters } from '../../queries/url-filters';
import { THRESHOLDS } from '../../thresholds';
import type { SeoPage, SeoTree } from '../../tree/types';
import type { PanelLinks } from '../links';
import { inspectorModel } from './model';

const links: PanelLinks = {
  pages: (filters = EMPTY_FILTERS) => `/p/${serializeFilters(filters).toString()}`,
  inspector: ({ slug, locale }) => `/i/?slug=${slug}&locale=${locale}`,
};

const run = (pages: SeoPage[], slug = 'guide', locale = 'en') => {
  const tree: SeoTree = { pages };
  return inspectorModel({
    tree,
    slug,
    locale,
    links,
    site: 'https://x.dev',
    asset: (src) => `/repo${src}`,
  });
};

describe('inspectorModel', () => {
  it('sin página con ese slug e idioma no hay modelo', () => {
    expect(run([seoPage()], 'otra')).toBeUndefined();
    expect(run([seoPage()], 'guide', 'es')).toBeUndefined();
  });

  it('lleva el slug y el idioma de la página inspeccionada', () => {
    expect(run([seoPage({ slug: '' })], '')).toMatchObject({ slug: '', locale: 'en' });
  });

  it('el encabezado enlaza a la tabla y a la página real', () => {
    expect(run([seoPage()])!.links).toEqual({ pages: '/p/', live: '/repo/guide/' });
  });

  it('lo publicado: título y descripción con su origen y longitud, canonical, noindex y archivo', () => {
    const page = seoPage();
    page.meta.noindex = true;
    expect(run([page])!.published).toEqual({
      title: 'Guide | Site',
      titleLength: 12,
      titleMax: THRESHOLDS.titleMax,
      description: 'A description of the guide.',
      descriptionSource: 'page',
      descriptionLength: 27,
      descriptionMax: THRESHOLDS.descriptionMax,
      canonical: '/repo/guide/',
      noindex: true,
      sourcePath: 'guide.md',
    });
  });

  it('las vistas previas llevan la URL absoluta y el host, y la imagen OG con su src resuelto', () => {
    const page = seoPage();
    page.meta.ogImage = { src: '/og.png', alt: 'logo', width: 10, height: 5 };
    const { previews } = run([page])!;
    expect(previews.serp).toEqual({
      title: 'Guide | Site',
      url: 'https://x.dev/repo/guide/',
      description: 'A description of the guide.',
      titleMax: THRESHOLDS.titleMax,
      descriptionMax: THRESHOLDS.descriptionMax,
    });
    expect(previews.og).toEqual({
      title: 'Guide',
      description: 'A description of the guide.',
      host: 'x.dev',
      image: { src: '/repo/og.png', alt: 'logo', width: 10, height: 5 },
    });
  });

  it('sin imagen OG no hay imagen en la tarjeta', () => {
    expect(run([seoPage()])!.previews.og.image).toBeUndefined();
  });

  it('los problemas enlazan al inspector de las páginas con las que chocan', () => {
    const page = seoPage({
      issues: [
        {
          kind: 'duplicate-title',
          severity: 'warning',
          slug: 'guide',
          locale: 'en',
          message: 'm',
          related: [{ slug: 'reference/guide', locale: 'en' }],
        },
        { kind: 'no-h1', severity: 'error', slug: 'guide', locale: 'en', message: 'n' },
      ],
    });
    const { issues } = run([page])!;
    expect(issues[0]!.related).toEqual([
      { slug: 'reference/guide', href: '/i/?slug=reference/guide&locale=en' },
    ]);
    expect(issues[1]!.related).toEqual([]);
    expect(issues[1]!.issue.message).toBe('n');
  });

  it('cada schema con sus @type (una lista o uno), su origen y el JSON formateado', () => {
    const page = seoPage({
      schemas: [
        { schema: { '@type': 'Organization', name: 'A' }, source: 'site' },
        { schema: { '@type': ['Person', 'Thing'] }, source: 'page' },
      ],
    });
    const { schemas } = run([page])!;
    expect(schemas.map((s) => [s.types, s.source])).toEqual([
      [['Organization'], 'site'],
      [['Person', 'Thing'], 'page'],
    ]);
    expect(schemas[0]!.json).toBe(JSON.stringify(page.schemas[0]!.schema, null, 2));
  });

  it('el esquema de encabezados marca los saltos de nivel', () => {
    const page = seoPage({
      headings: [
        { depth: 1, slug: 'a', text: 'Uno' },
        { depth: 2, slug: 'b', text: 'Dos' },
        { depth: 4, slug: 'c', text: 'Cuatro' },
      ],
    });
    expect(run([page])!.outline.map((item) => item.skipFrom)).toEqual([undefined, undefined, 2]);
  });

  describe('traducciones', () => {
    const en = seoPage({
      locale: 'en',
      locales: [
        { locale: 'en', status: 'present', url: '/repo/guide/' },
        { locale: 'es', status: 'present', url: '/repo/es/guide/' },
        { locale: 'fr', status: 'missing', policy: 'link', declared: true },
      ],
      issues: [],
    });
    const es = seoPage({
      locale: 'es',
      meta: { ...seoPage().meta, title: 'Guía | Site', description: undefined },
      issues: [{ kind: 'no-h1', severity: 'error', slug: 'guide', locale: 'es', message: 'm' }],
    });

    it('una tarjeta por idioma configurado, marcando la actual', () => {
      const { translations } = run([en, es])!;
      expect(translations.map((t) => [t.locale, t.current])).toEqual([
        ['en', true],
        ['es', false],
        ['fr', false],
      ]);
    });

    it('la presente con página resume su título, descripción y problemas, y enlaza a su inspector', () => {
      const card = run([en, es])!.translations[1]!;
      expect(card).toEqual({
        state: 'present',
        locale: 'es',
        current: false,
        url: '/repo/es/guide/',
        summary: { title: 'Guía | Site', description: undefined, problems: 1 },
        inspectHref: '/i/?slug=guide&locale=es',
      });
    });

    it('la propia no enlaza a sí misma', () => {
      const card = run([en, es])!.translations[0]!;
      expect(card).toMatchObject({ state: 'present', current: true, inspectHref: undefined });
    });

    it('la ausente lleva su política y si está declarada', () => {
      expect(run([en, es])!.translations[2]).toEqual({
        state: 'missing',
        locale: 'fr',
        current: false,
        policy: 'link',
        declared: true,
      });
    });

    it('una presente sin página en el árbol deja solo la URL', () => {
      const card = run([en])!.translations[1]!;
      expect(card).toMatchObject({ state: 'present', summary: undefined, url: '/repo/es/guide/' });
    });
  });
});
